/**
 * AQWELIA Wave A2 — THE single RevenueCat lifecycle manager (native).
 *
 * This module is the ONLY place that ever calls Purchases.configure and the
 * ONLY owner of the SDK lifecycle. Everything else (hooks, sign-out wrapper,
 * BillingClient) delegates here. There is intentionally NO second initializer.
 *
 * Wave A2 (Round 4) — CLIENT / SERVER BOUNDARY:
 *   - This module is loaded on the browser. It MUST NOT import Prisma, @/lib/db,
 *     next-auth server, server-only, or any server secret. The billing ACCESS
 *     ENVIRONMENT is NEVER computed here — it is received from the server in the
 *     POST /api/billing/identity response (billingAccessEnvironment) and stored.
 *   - `ready` requires: SDK identity confirmed AND server identity bound AND a
 *     valid server-provided billing access environment.
 *   - Every billing operation captures an identity EPOCH at start and verifies
 *     (before the SDK call, after the SDK call, and before accepting server
 *     convergence) that the epoch / userId / environment are unchanged. A
 *     logout or account switch during an operation makes the operation return
 *     pending/error fail-closed — a result started under A is never accepted
 *     under B.
 *
 * Lifecycle (documented strategy):
 *
 *   First login
 *     session loads → setIdentity(userId):
 *       1. configure the SDK once;
 *       2. Purchases.logIn({ appUserID: userId }) → sdkIdentityConfirmed;
 *       3. POST /api/billing/identity (bind BillingIdentity server-side) →
 *          serverIdentityBound + billingAccessEnvironment (server-provided);
 *       4. only then state = ready.
 *
 *   Logout
 *     clearIdentity() BEFORE NextAuth signOut: Purchases.logOut() → clears
 *     sdkConfirmedUserId, serverBound, billingAccessEnvironment, expectedUserId;
 *     increments the epoch. Fail-closed: even if logOut throws, the previous
 *     identity is never reused.
 *
 *   Account switch A → B
 *     Transitions are serialized through a FIFO queue; clearIdentity()/setIdentity(B)
 *     increment the epoch so any in-flight A billing operation is invalidated.
 *
 *   App restart
 *     The SDK is configured again on the next setIdentity; identity + server
 *     environment are re-converged (idempotent).
 *
 *   Session still loading
 *     The hook only calls setIdentity once a userId is present; while loading
 *     the bridge stays idle and every billing operation is blocked (fail-closed).
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
  plansFromEntitlements,
} from './entitlement-resolution'
import { awaitRevenueCatSourceConvergence } from './revenuecat-identity-guard'
import type { BillingEnvironment } from './billing-types'

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
  /** Server-provided billing access environment (never client-computed). */
  billingAccessEnvironment: BillingEnvironment | null
  error: string | null
  sdkConfigureCount: number
}

export class RevenueCatIdentityNotReadyError extends Error {
  constructor() {
    super('RevenueCat identity is not confirmed (SDK + server) for the current user')
    this.name = 'RevenueCatIdentityNotReadyError'
  }
}

/** Fail-closed result for an operation invalidated by an identity change. */
export interface IdentityChangedError {
  kind: 'identity_changed'
  message: string
}

interface BindResult {
  ok: boolean
  environment: BillingEnvironment | null
  reason?: string
}

export class RevenueCatManager {
  private state: RevenueCatManagerState = 'idle'
  private expectedUserId: string | null = null
  private sdkConfirmedUserId: string | null = null
  private serverBound = false
  private billingAccessEnvironment: BillingEnvironment | null = null
  private error: string | null = null
  private initialized = false
  private sdkConfigureCount = 0
  private queue: Promise<void> = Promise.resolve()
  /** Incremented on every identity transition (login/logout/switch). */
  private epoch = 0

  snapshot(): RevenueCatManagerSnapshot {
    return {
      state: this.state,
      expectedUserId: this.expectedUserId,
      sdkConfirmedUserId: this.sdkConfirmedUserId,
      sdkIdentityConfirmed: this.sdkConfirmedUserId !== null,
      serverIdentityBound: this.serverBound,
      billingAccessEnvironment: this.billingAccessEnvironment,
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
   * in the codebase.
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
   * Binds the canonical identity server-side. Returns the SERVER-PROVIDED
   * billing access environment. A binding without a valid environment is a
   * FAIL-CLOSED failure (the manager never reaches ready).
   */
  private async bindServerIdentity(userId: string): Promise<BindResult> {
    try {
      const res = await fetch('/api/billing/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'revenuecat', externalUserId: userId, userId }),
      })
      if (!res.ok) return { ok: false, environment: null, reason: 'binding_http_error' }
      const body = (await res.json()) as { ok?: boolean; billingAccessEnvironment?: unknown }
      if (body.ok !== true) return { ok: false, environment: null, reason: 'binding_not_ok' }
      const env = body.billingAccessEnvironment
      if (env !== 'sandbox' && env !== 'production') {
        // A binding without a valid server environment must stay fail-closed.
        return { ok: false, environment: null, reason: 'missing_billing_access_environment' }
      }
      return { ok: true, environment: env }
    } catch {
      return { ok: false, environment: null, reason: 'binding_network_error' }
    }
  }

  /**
   * Establishes the identity after authentication. Ready is reached ONLY when
   * the SDK identity is confirmed AND the server identity is bound AND a valid
   * server-provided billing access environment is stored.
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
        this.billingAccessEnvironment !== null &&
        this.state === 'ready'
      ) {
        return this.snapshot()
      }
      this.epoch += 1
      this.state = 'transitioning'
      this.error = null
      this.expectedUserId = userId
      this.serverBound = false
      this.billingAccessEnvironment = null
      try {
        await this.ensureInitialized()
        await Purchases.logIn({ appUserID: userId })
        this.sdkConfirmedUserId = userId
        // Server binding happens immediately after the SDK identity is
        // confirmed — it must NOT wait for any entitlement to exist.
        const bound = await this.bindServerIdentity(userId)
        if (!bound.ok || !bound.environment) {
          this.error = bound.reason || 'server identity binding failed'
          this.state = 'error'
          this.sdkConfirmedUserId = null
          this.serverBound = false
          this.billingAccessEnvironment = null
          return this.snapshot()
        }
        this.serverBound = true
        this.billingAccessEnvironment = bound.environment
        this.state = 'ready'
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        this.state = 'error'
        // Fail-closed: never reuse a previous user's identity.
        if (this.sdkConfirmedUserId !== userId) this.sdkConfirmedUserId = null
        this.serverBound = false
        this.billingAccessEnvironment = null
      }
      return this.snapshot()
    })
  }

  /**
   * Clears the identity on sign-out. Always runs BEFORE the NextAuth signOut.
   * Fail-closed: on error the previous identity is still cleared. Increments
   * the epoch so any in-flight billing operation is invalidated.
   */
  async clearIdentity(): Promise<RevenueCatManagerSnapshot> {
    if (!isNative()) {
      this.epoch += 1
      this.expectedUserId = null
      this.sdkConfirmedUserId = null
      this.serverBound = false
      this.billingAccessEnvironment = null
      this.state = 'idle'
      return this.snapshot()
    }
    return this.enqueue(async () => {
      this.epoch += 1
      this.state = 'transitioning'
      this.expectedUserId = null
      try {
        if (this.initialized) {
          await Purchases.logOut()
        }
        this.sdkConfirmedUserId = null
        this.serverBound = false
        this.billingAccessEnvironment = null
        this.state = 'idle'
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        this.state = 'error'
        this.sdkConfirmedUserId = null
        this.serverBound = false
        this.billingAccessEnvironment = null
        this.expectedUserId = null
      }
      return this.snapshot()
    })
  }

  /**
   * Blocks until the transition queue is drained, then requires a fully ready
   * identity (SDK confirmed + server bound + server environment). Throws
   * fail-closed otherwise.
   */
  async requireReady(): Promise<string> {
    await this.queue
    if (!isNative()) return 'web'
    if (this.state !== 'ready' || !this.sdkConfirmedUserId || !this.serverBound || !this.billingAccessEnvironment) {
      throw new RevenueCatIdentityNotReadyError()
    }
    return this.sdkConfirmedUserId
  }

  isReady(userId: string): boolean {
    return (
      this.state === 'ready' &&
      this.expectedUserId === userId &&
      this.sdkConfirmedUserId === userId &&
      this.serverBound &&
      this.billingAccessEnvironment !== null
    )
  }

  isIdentityClear(): boolean {
    return this.sdkConfirmedUserId === null && this.expectedUserId === null
  }

  /**
   * Captures the identity lease (epoch + user + environment) at the start of a
   * billing operation. Returns null when not fully ready.
   */
  private captureLease(): { epoch: number; userId: string; environment: BillingEnvironment } | null {
    if (this.state !== 'ready' || !this.sdkConfirmedUserId || !this.billingAccessEnvironment) return null
    return {
      epoch: this.epoch,
      userId: this.sdkConfirmedUserId,
      environment: this.billingAccessEnvironment,
    }
  }

  /**
   * Verifies the identity lease is still current. Returns null when unchanged,
   * or a fail-closed error description when the identity changed during the
   * operation.
   */
  private verifyLease(lease: { epoch: number; userId: string; environment: BillingEnvironment }): IdentityChangedError | null {
    if (this.epoch !== lease.epoch) return { kind: 'identity_changed', message: 'identity changed during operation' }
    if (this.sdkConfirmedUserId !== lease.userId) return { kind: 'identity_changed', message: 'identity changed during operation' }
    if (this.billingAccessEnvironment !== lease.environment) return { kind: 'identity_changed', message: 'environment changed during operation' }
    return null
  }

  // ── Billing operations (all blocked until ready, epoch-protected) ─────────

  /**
   * Wave A2 (Round 2) — canonical offering + strict dedup.
   */
  async getProducts(): Promise<Product[]> {
    if (!isNative()) return []
    await this.requireReady()
    const lease = this.captureLease()
    if (!lease) return []
    try {
      const result = await Purchases.getOfferings()
      if (this.verifyLease(lease)) return []
      return collectCanonicalProducts(result)
    } catch {
      return []
    }
  }

  async getEntitlements(): Promise<Entitlement[]> {
    if (!isNative()) return []
    await this.requireReady()
    const lease = this.captureLease()
    if (!lease) return []
    try {
      const info = await Purchases.getCustomerInfo()
      if (this.verifyLease(lease)) return []
      return mapCustomerInfoToEntitlements(info)
    } catch {
      return []
    }
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    if (!isNative()) return { success: false, error: 'Not on native' }
    await this.requireReady()
    const lease = this.captureLease()
    if (!lease) {
      return { success: false, error: 'RevenueCat identity is not confirmed (SDK + server) for the current user' }
    }
    try {
      // Wave A2 (Round 3): resolve the expected plan from the canonical product id.
      const mapped = getPlanFromRCProductId(productId)
      if (!mapped) {
        return { success: false, error: 'Product not found' }
      }
      const expectedPlan: PlanId = mapped.plan

      const result = await Purchases.getOfferings()
      const targetPackage = findPackageById(result, productId)
      if (!targetPackage) return { success: false, error: 'Product not found' }
      // Verify after the offering read (identity may have changed).
      if (this.verifyLease(lease)) {
        return { success: false, error: 'Identity changed during purchase', userCancelled: false }
      }
      const purchaseResult = await Purchases.purchasePackage({ aPackage: targetPackage })
      if (this.verifyLease(lease)) {
        // A result started under A must never be accepted under B.
        return { success: false, error: 'Identity changed during purchase', userCancelled: false }
      }
      const entitlements = mapCustomerInfoToEntitlements(purchaseResult?.customerInfo)
      const success = hasActiveEntitlement(entitlements)
      const display = pickDisplayEntitlement(entitlements)
      if (!success) {
        return { success: false, error: 'No active entitlement after purchase' }
      }

      // Wave A2 (Round 3/4): convergence requires the EXPECTED RevenueCat source
      // (userId + plan + provider + server-provided environment).
      const { converged } = await awaitRevenueCatSourceConvergence({
        userId: lease.userId,
        provider: 'revenuecat',
        environment: lease.environment,
        expectedPlans: [expectedPlan],
      })
      // Verify once more before accepting convergence.
      if (this.verifyLease(lease)) {
        return { success: false, error: 'Identity changed during purchase', userCancelled: false }
      }
      return { success, entitlement: display ?? undefined, serverConverged: converged }
    } catch (err: any) {
      if (err?.userCancelled) return { success: false, userCancelled: true }
      return { success: false, error: err?.message || 'Purchase failed' }
    }
  }

  /**
   * Wave A2 (Round 3/4) — restore follows the same contract as purchase, with
   * an ALL-REQUIRED expected-plans rule and the same epoch protection.
   */
  async restorePurchases(): Promise<RestoreResult> {
    if (!isNative()) return { entitlements: [], restored: false, serverConverged: false, state: 'none' }
    await this.requireReady()
    const lease = this.captureLease()
    if (!lease) {
      return { entitlements: [], restored: false, serverConverged: false, state: 'none' }
    }
    try {
      const info = await Purchases.restorePurchases()
      if (this.verifyLease(lease)) {
        return { entitlements: [], restored: false, serverConverged: false, state: 'none' }
      }
      const entitlements = mapCustomerInfoToEntitlements(info)
      const restored = hasActiveEntitlement(entitlements)
      if (!restored) {
        return { entitlements, restored: false, serverConverged: false, state: 'none' }
      }
      const expectedPlans = plansFromEntitlements(entitlements)
      const { converged } = await awaitRevenueCatSourceConvergence({
        userId: lease.userId,
        provider: 'revenuecat',
        environment: lease.environment,
        expectedPlans,
      })
      if (this.verifyLease(lease)) {
        return { entitlements: [], restored: false, serverConverged: false, state: 'none' }
      }
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
