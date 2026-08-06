/**
 * AQWELIA Wave A2 (Round 1) — THE single RevenueCat lifecycle manager (native).
 *
 * This module is the ONLY place that ever calls Purchases.configure and the
 * ONLY owner of the SDK lifecycle. Everything else (hooks, sign-out wrapper,
 * BillingClient) delegates here. There is intentionally NO second initializer.
 *
 * Lifecycle (documented strategy):
 *
 *   First login
 *     session loads → setIdentity(userId):
 *       1. configure the SDK once;
 *       2. Purchases.logIn({ appUserID: userId }) → sdkIdentityConfirmed;
 *       3. POST /api/billing/identity (bind BillingIdentity server-side)
 *          → serverIdentityBound;
 *       4. only then state = ready.
 *     No getCustomerInfo / getEntitlements / getProducts / purchase /
 *     restorePurchases may run before BOTH sdkIdentityConfirmed AND
 *     serverIdentityBound are true.
 *
 *   Logout
 *     sign-out wrapper calls clearIdentity() BEFORE the NextAuth signOut:
 *       Purchases.logOut() → sdkIdentityConfirmed=false, serverIdentityBound
 *       =false, expectedUserId=null, state=idle. Fail-closed: even if logOut
 *       throws, the previous identity is never reused.
 *
 *   Account switch A → B
 *     Transitions are serialized through a FIFO queue: setIdentity(B) is
 *     enqueued after clearIdentity(), so a fast A → logout → B never leaves
 *     concurrent logIn/logOut calls.
 *
 *   App restart
 *     The SDK is configured again on the next setIdentity (initialized=false).
 *     The session hook re-establishes the identity and re-binds the server
 *     identity (idempotent upsert), so the ready state is re-converged.
 *
 *   Session still loading
 *     The hook only calls setIdentity once a userId is present. While the
 *     session is loading, the bridge stays idle and every billing operation is
 *     blocked (fail-closed).
 *
 * The SDK is mocked in tests; on web this module is a no-op (native only).
 */

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor'
import { isNative, getPlatform } from '@/lib/platform'
import type { Product, Entitlement, PurchaseResult, PlanId, RestoreResult } from './types'
import { getPlanFromRCProductId, DURATION_TO_PROVIDER } from './plans'
import {
  pickDisplayEntitlement,
  hasActiveEntitlement,
} from './entitlement-resolution'
import { awaitServerConvergence } from './revenuecat-identity-guard'

const RC_API_KEYS = {
  ios: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || '',
  android: process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY || '',
}

export type RevenueCatManagerState = 'idle' | 'ready' | 'transitioning' | 'error'

export interface RevenueCatManagerSnapshot {
  state: RevenueCatManagerState
  expectedUserId: string | null
  sdkConfirmedUserId: string | null
  sdkIdentityConfirmed: boolean
  serverIdentityBound: boolean
  error: string | null
  sdkConfigureCount: number
}

export class RevenueCatIdentityNotReadyError extends Error {
  constructor() {
    super('RevenueCat identity is not confirmed (SDK + server) for the current user')
    this.name = 'RevenueCatIdentityNotReadyError'
  }
}

export class RevenueCatManager {
  private state: RevenueCatManagerState = 'idle'
  private expectedUserId: string | null = null
  private sdkConfirmedUserId: string | null = null
  private serverBound = false
  private error: string | null = null
  private initialized = false
  private sdkConfigureCount = 0
  private queue: Promise<void> = Promise.resolve()

  snapshot(): RevenueCatManagerSnapshot {
    return {
      state: this.state,
      expectedUserId: this.expectedUserId,
      sdkConfirmedUserId: this.sdkConfirmedUserId,
      sdkIdentityConfirmed: this.sdkConfirmedUserId !== null,
      serverIdentityBound: this.serverBound,
      error: this.error,
      sdkConfigureCount: this.sdkConfigureCount,
    }
  }

  /** Enqueues an operation, guaranteeing no two transitions overlap. */
  private enqueue<T>(op: () => Promise<T>): Promise<T> {
    const run = this.queue.then(op)
    this.queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  /**
   * Configures the SDK exactly once. This is the ONLY Purchases.configure call
   * in the codebase. Never reached through getProducts/getCustomerInfo/...
   * before an identity is set (setIdentity runs it first).
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return
    if (!isNative()) return
    const platform = getPlatform()
    const apiKey = platform === 'ios' ? RC_API_KEYS.ios : RC_API_KEYS.android
    if (!apiKey) throw new Error('RevenueCat API key not configured')
    await Purchases.configure({ apiKey })
    await Purchases.setLogLevel({ level: LOG_LEVEL.INFO })
    this.initialized = true
    this.sdkConfigureCount += 1
  }

  /**
   * Binds the canonical identity server-side (BillingIdentity). Must succeed
   * before the bridge can ever become ready. Returns true on success.
   */
  private async bindServerIdentity(userId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/billing/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'revenuecat', externalUserId: userId, userId }),
      })
      if (!res.ok) return false
      const body = (await res.json()) as { ok?: boolean }
      return body.ok === true
    } catch {
      return false
    }
  }

  /**
   * Establishes the identity after authentication. Ready is reached ONLY when
   * the SDK identity is confirmed AND the server identity is bound.
   */
  async setIdentity(userId: string): Promise<RevenueCatManagerSnapshot> {
    if (!isNative() || !userId) {
      this.expectedUserId = userId || null
      return this.snapshot()
    }
    return this.enqueue(async () => {
      // Already fully ready for the same user → idempotent.
      if (
        this.expectedUserId === userId &&
        this.sdkConfirmedUserId === userId &&
        this.serverBound &&
        this.state === 'ready'
      ) {
        return this.snapshot()
      }
      this.state = 'transitioning'
      this.error = null
      this.expectedUserId = userId
      this.serverBound = false
      try {
        await this.ensureInitialized()
        await Purchases.logIn({ appUserID: userId })
        this.sdkConfirmedUserId = userId
        // Server binding happens immediately after the SDK identity is
        // confirmed — it must NOT wait for any entitlement to exist.
        const bound = await this.bindServerIdentity(userId)
        if (!bound) {
          this.error = 'server identity binding failed'
          this.state = 'error'
          this.sdkConfirmedUserId = null
          this.serverBound = false
          return this.snapshot()
        }
        this.serverBound = true
        this.state = 'ready'
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        this.state = 'error'
        // Fail-closed: never reuse a previous user's identity.
        if (this.sdkConfirmedUserId !== userId) this.sdkConfirmedUserId = null
        this.serverBound = false
      }
      return this.snapshot()
    })
  }

  /**
   * Clears the identity on sign-out. Always runs BEFORE the NextAuth signOut.
   * Fail-closed: on error the previous identity is still cleared.
   */
  async clearIdentity(): Promise<RevenueCatManagerSnapshot> {
    if (!isNative()) {
      this.expectedUserId = null
      this.sdkConfirmedUserId = null
      this.serverBound = false
      this.state = 'idle'
      return this.snapshot()
    }
    return this.enqueue(async () => {
      this.state = 'transitioning'
      this.expectedUserId = null
      try {
        if (this.initialized) {
          await Purchases.logOut()
        }
        this.sdkConfirmedUserId = null
        this.serverBound = false
        this.state = 'idle'
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        this.state = 'error'
        this.sdkConfirmedUserId = null
        this.serverBound = false
        this.expectedUserId = null
      }
      return this.snapshot()
    })
  }

  /**
   * Blocks until the transition queue is drained, then requires a fully ready
   * identity (SDK confirmed + server bound). Throws fail-closed otherwise.
   */
  async requireReady(): Promise<string> {
    await this.queue
    if (!isNative()) return 'web'
    if (this.state !== 'ready' || !this.sdkConfirmedUserId || !this.serverBound) {
      throw new RevenueCatIdentityNotReadyError()
    }
    return this.sdkConfirmedUserId
  }

  isReady(userId: string): boolean {
    return (
      this.state === 'ready' &&
      this.expectedUserId === userId &&
      this.sdkConfirmedUserId === userId &&
      this.serverBound
    )
  }

  isIdentityClear(): boolean {
    return this.sdkConfirmedUserId === null && this.expectedUserId === null
  }

  // ── Billing operations (all blocked until ready) ─────────────────────────

  /**
   * Wave A2 (Round 2) — canonical offering + strict dedup.
   * Uses the CURRENT RevenueCat offering when present (canonical), otherwise
   * iterates all offerings. Every package is validated against the canonical
   * product IDs in plans.ts and deduplicated strictly by product identifier;
   * the result is sorted deterministically. No duplicates, no blind
   * aggregation.
   */
  async getProducts(): Promise<Product[]> {
    if (!isNative()) return []
    await this.requireReady()
    try {
      const result = await Purchases.getOfferings()
      return collectCanonicalProducts(result)
    } catch {
      return []
    }
  }

  async getEntitlements(): Promise<Entitlement[]> {
    if (!isNative()) return []
    await this.requireReady()
    try {
      const info = await Purchases.getCustomerInfo()
      return mapCustomerInfoToEntitlements(info)
    } catch {
      return []
    }
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    if (!isNative()) return { success: false, error: 'Not on native' }
    await this.requireReady()
    try {
      const result = await Purchases.getOfferings()
      const targetPackage = findPackageById(result, productId)
      if (!targetPackage) return { success: false, error: 'Product not found' }
      const purchaseResult = await Purchases.purchasePackage({ aPackage: targetPackage })
      const entitlements = mapCustomerInfoToEntitlements(purchaseResult?.customerInfo)
      const success = hasActiveEntitlement(entitlements)
      const display = pickDisplayEntitlement(entitlements)
      // Wave A2 (Round 2): same convergence contract as restore — refresh
      // CustomerInfo (done above), then read GET /api/subscription (bounded).
      const userId = this.sdkConfirmedUserId
      const { converged } = userId ? await awaitServerConvergence(userId) : { converged: false }
      return { success, entitlement: display ?? undefined, serverConverged: success ? converged : false }
    } catch (err: any) {
      if (err?.userCancelled) return { success: false, userCancelled: true }
      return { success: false, error: err?.message || 'Purchase failed' }
    }
  }

  /**
   * Wave A2 (Round 2) — restore follows the SAME contract as purchase:
   *   1. identity SDK confirmed (requireReady);
   *   2. server binding confirmed (ready implies it);
   *   3. Purchases.restorePurchases() + refreshed CustomerInfo;
   *   4. bounded read of GET /api/subscription;
   *   5. explicit serverConverged / pending — never a definitive active from
   *      local CustomerInfo alone.
   */
  async restorePurchases(): Promise<RestoreResult> {
    if (!isNative()) return { entitlements: [], restored: false, serverConverged: false, state: 'none' }
    await this.requireReady()
    try {
      const info = await Purchases.restorePurchases()
      const entitlements = mapCustomerInfoToEntitlements(info)
      const restored = hasActiveEntitlement(entitlements)
      if (!restored) {
        return { entitlements, restored: false, serverConverged: false, state: 'none' }
      }
      const userId = this.sdkConfirmedUserId
      const { converged } = userId ? await awaitServerConvergence(userId) : { converged: false }
      return {
        entitlements,
        restored: true,
        serverConverged: converged,
        state: converged ? 'converged' : 'pending',
      }
    } catch {
      return { entitlements: [], restored: false, serverConverged: false, state: 'none' }
    }
  }

  async getActivePlan(): Promise<PlanId> {
    if (!isNative()) return 'decouverte'
    const entitlements = await this.getEntitlements()
    return pickDisplayEntitlement(entitlements)?.plan ?? 'decouverte'
  }
}

/** Shared singleton used by the app. */
export const revenueCatManager = new RevenueCatManager()

/** Blocks until the identity transition queue is drained. */
export async function identityQueueDrained(): Promise<void> {
  await revenueCatManager['queue']
}

/**
 * Convenience: establishes the identity for the current session user (null →
 * clear).
 */
export async function syncRevenueCatIdentity(
  userId: string | null | undefined,
): Promise<RevenueCatManagerSnapshot> {
  if (!userId) return revenueCatManager.clearIdentity()
  return revenueCatManager.setIdentity(userId)
}

/** Unit-test seam: fresh manager instances for deterministic tests. */
export function createRevenueCatManager(): RevenueCatManager {
  return new RevenueCatManager()
}

function mapPackageToProduct(pkg: any): Product | null {
  try {
    const id = pkg?.product?.identifier || ''
    const mapped = getPlanFromRCProductId(id)
    if (!mapped) return null
    return {
      id,
      plan: mapped.plan,
      duration: DURATION_TO_PROVIDER[mapped.duration],
      price: parseFloat(pkg?.product?.price || '0') || 0,
      priceString: pkg?.product?.priceString || '',
      currency: pkg?.product?.currencyCode || 'EUR',
    }
  } catch {
    return null
  }
}

/**
 * Wave A2 (Round 2) — canonical offering strategy:
 *   - prefer result.current (the current/canonical RevenueCat offering) when it
 *     exists; otherwise iterate result.all in a deterministic order;
 *   - validate every package against the canonical product IDs in plans.ts;
 *   - deduplicate STRICTLY by product identifier (first occurrence wins);
 *   - sort deterministically by product id.
 */
function collectCanonicalProducts(result: any): Product[] {
  const byId = new Map<string, Product>()
  const offerings = result?.current
    ? [result.current]
    : Object.values(result?.all || {}).sort((a, b) =>
        String((a as any)?.identifier ?? '').localeCompare(String((b as any)?.identifier ?? '')),
      )
  for (const offering of offerings) {
    const packages = (offering as any)?.availablePackages || []
    for (const pkg of packages) {
      const product = mapPackageToProduct(pkg)
      if (product && !byId.has(product.id)) byId.set(product.id, product)
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
}

/** Deterministic package lookup across the canonical offering set. */
function findPackageById(result: any, productId: string): any | null {
  const offerings = result?.current
    ? [result.current]
    : Object.values(result?.all || {})
  for (const offering of offerings) {
    const packages = (offering as any)?.availablePackages || []
    for (const pkg of packages) {
      if (pkg?.product?.identifier === productId) return pkg
    }
  }
  return null
}

function mapCustomerInfoToEntitlements(info: any): Entitlement[] {
  const entitlements: Entitlement[] = []
  const platform = getPlatform() as 'ios' | 'android'
  try {
    const all = info?.entitlements?.all || {}
    for (const [id, data] of Object.entries(all)) {
      if (id !== 'oasis' && id !== 'wellness' && id !== 'spa365') continue
      const d = data as any
      entitlements.push({
        id: id as 'oasis' | 'wellness' | 'spa365',
        plan: id as PlanId,
        isActive: !!d?.isActive,
        willRenew: !!d?.willRenew,
        expiresAt: d?.expirationDate ? new Date(d.expirationDate) : undefined,
        purchasedAt: d?.latestPurchaseDate ? new Date(d.latestPurchaseDate) : undefined,
        store: platform,
        originalPurchaseDate: d?.originalPurchaseDate ? new Date(d.originalPurchaseDate) : undefined,
      })
    }
  } catch {}
  return entitlements
}
