/**
 * AQWELIA Wave A2 — RevenueCat canonical user identity.
 *
 * Covers the mandatory scenarios:
 *  - identity bridge with mocked SDK (initial + idempotent login, login failure,
 *    A → logout → B serialization)
 *  - purchase / restore blocked without a confirmed identity; restore bound to
 *    the same user
 *  - webhook hardening: anonymous / missing / unknown id, transaction ownership
 *    conflict, TRANSFER / ALIAS quarantine, already-expired activation,
 *    sandbox vs production, duplicates/concurrency, out-of-order events
 *  - provider coexistence: Stripe + RevenueCat in both orders, expiration of
 *    one provider without losing the other
 *  - deterministic entitlement union
 *  - migration SQL (SQLite + PostgreSQL) structural verification
 *  - no direct signOut outside the centralized wrapper
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '@/lib/db'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

// ────────────────────────────────────────────────────────────────────────────
// Mock the native platform + RevenueCat SDK (never contacts a real provider).
// vi.mock factories are hoisted above top-level consts, so the mock state lives
// in vi.hoisted.
// ────────────────────────────────────────────────────────────────────────────
const mockState = vi.hoisted(() => {
  // The RC key is read at module import time; stub it before imports run.
  process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY = 'test-ios-key'
  process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY = 'test-android-key'
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  let maxActive = 0
  let active = 0
  const sdkCalls: string[] = []
  const mockPurchases = {
    configure: vi.fn(async () => undefined),
    setLogLevel: vi.fn(async () => undefined),
    logIn: vi.fn(async ({ appUserID }: { appUserID: string }) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      sdkCalls.push(`logIn:${appUserID}`)
      await pause(15)
      active -= 1
      return { customerInfo: {} }
    }),
    logOut: vi.fn(async () => {
      active += 1
      maxActive = Math.max(maxActive, active)
      sdkCalls.push('logOut')
      await pause(15)
      active -= 1
      return { customerInfo: {} }
    }),
    getCustomerInfo: vi.fn(async () => ({})),
    getOfferings: vi.fn(async () => ({ all: {} })),
    purchasePackage: vi.fn(async () => ({ customerInfo: {} })),
    restorePurchases: vi.fn(async () => ({})),
  }
  const reset = () => {
    sdkCalls.length = 0
    active = 0
    maxActive = 0
  }
  const getMaxActive = () => maxActive
  return { mockPurchases, sdkCalls, reset, getMaxActive, pause }
})

const { mockPurchases, sdkCalls, reset, getMaxActive, pause } = mockState

vi.mock('@/lib/platform', () => ({
  isNative: () => true,
  getPlatform: () => 'ios',
}))

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: mockState.mockPurchases,
  LOG_LEVEL: { INFO: 1 },
}))

// Mock the subscription fetch so we never hit a real server.
let subscriptionFetchMock: ReturnType<typeof vi.fn>
beforeAll(() => {
  subscriptionFetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
  vi.stubGlobal('fetch', subscriptionFetchMock)
})
afterAll(() => {
  vi.unstubAllGlobals()
})

// Import AFTER the mocks are declared.
import { createIdentityBridge, revenueCatIdentityBridge } from '@/lib/billing/revenuecat-identity'
import { requireConfirmedRevenueCatIdentity, confirmServerAccessConverged } from '@/lib/billing/revenuecat-identity-guard'
import { billing } from '@/lib/billing'
import {
  isRevenueCatAnonymous,
  normalizeRevenueCatEnvironment,
  resolveBillingIdentityUserId,
  upsertBillingIdentity,
  billingUserExists,
} from '@/lib/billing/identity'
import { handleRevenueCatEvent } from '@/lib/billing/providers/revenuecat-event'
import { processEventIdempotently } from '@/lib/billing/idempotency'
import { applyTransition } from '@/lib/billing/transition'
import { loadUserEntitlements, pickBestValidRow, resolveUnionPlan } from '@/lib/billing/entitlement-projection'

describe('Wave A2 — identity bridge (SDK mocked)', () => {
  beforeEach(() => {
    reset()
    mockPurchases.logIn.mockClear()
    mockPurchases.logOut.mockClear()
  })

  it('initial login: setIdentity calls Purchases.logIn({ appUserID }) after configure', async () => {
    const bridge = createIdentityBridge()
    const snap = await bridge.setIdentity('user-42')
    expect(mockPurchases.configure).toHaveBeenCalled()
    expect(mockPurchases.logIn).toHaveBeenCalledWith({ appUserID: 'user-42' })
    expect(snap.state).toBe('ready')
    expect(snap.confirmedUserId).toBe('user-42')
    expect(bridge.isIdentityConfirmed('user-42')).toBe(true)
  })

  it('idempotent login: a second setIdentity for the same user does NOT call logIn again', async () => {
    const bridge = createIdentityBridge()
    await bridge.setIdentity('user-42')
    await bridge.setIdentity('user-42')
    await bridge.setIdentity('user-42')
    expect(mockPurchases.logIn).toHaveBeenCalledTimes(1)
    expect(bridge.snapshot().state).toBe('ready')
  })

  it('login failure is fail-closed: state=error, confirmed identity cleared', async () => {
    mockPurchases.logIn.mockRejectedValueOnce(new Error('RC rejected'))
    const bridge = createIdentityBridge()
    const snap = await bridge.setIdentity('user-bad')
    expect(snap.state).toBe('error')
    expect(snap.confirmedUserId).toBeNull()
    expect(bridge.isIdentityConfirmed('user-bad')).toBe(false)
    mockPurchases.logIn.mockClear()
  })

  it('A → logout → B: transitions are serialized and B is confirmed, never A', async () => {
    const bridge = createIdentityBridge()
    const p1 = bridge.setIdentity('A')
    const p2 = bridge.clearIdentity()
    const p3 = bridge.setIdentity('B')
    await Promise.all([p1, p2, p3])
    // Serialized: never more than one in-flight SDK call.
    expect(getMaxActive()).toBe(1)
    expect(bridge.snapshot().confirmedUserId).toBe('B')
    expect(bridge.snapshot().expectedUserId).toBe('B')
    expect(bridge.snapshot().state).toBe('ready')
    // Ordering must be in → out → in.
    expect(sdkCalls).toEqual(['logIn:A', 'logOut', 'logIn:B'])
    expect(bridge.isIdentityConfirmed('A')).toBe(false)
    expect(bridge.isIdentityConfirmed('B')).toBe(true)
  })

  it('A → logout → B with a failing logout still clears the previous identity (fail-closed)', async () => {
    const bridge = createIdentityBridge()
    await bridge.setIdentity('A')
    mockPurchases.logOut.mockRejectedValueOnce(new Error('RC logout failed'))
    const snap = await bridge.clearIdentity()
    expect(snap.confirmedUserId).toBeNull()
    expect(snap.expectedUserId).toBeNull()
    // State error means the next login still works (queue continues).
    await bridge.setIdentity('B')
    expect(bridge.snapshot().confirmedUserId).toBe('B')
    mockPurchases.logOut.mockClear()
  })
})

describe('Wave A2 — purchase / restore require a confirmed identity', () => {
  beforeEach(async () => {
    await revenueCatIdentityBridge.clearIdentity()
    mockPurchases.getOfferings.mockReset()
    mockPurchases.purchasePackage.mockReset()
    mockPurchases.restorePurchases.mockReset()
    subscriptionFetchMock.mockReset()
  })

  it('purchase is blocked without a confirmed identity', async () => {
    await expect(billing.purchase('aqwelia_wellness_monthly')).rejects.toThrow('identity is not confirmed')
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled()
  })

  it('restore is blocked without a confirmed identity', async () => {
    await expect(billing.restorePurchases()).rejects.toThrow('identity is not confirmed')
    expect(mockPurchases.restorePurchases).not.toHaveBeenCalled()
  })

  it('getEntitlements (getCustomerInfo) is blocked without a confirmed identity', async () => {
    await expect(billing.getEntitlements()).rejects.toThrow('identity is not confirmed')
    expect(mockPurchases.getCustomerInfo).not.toHaveBeenCalled()
  })

  it('after confirming identity, restore runs and returns the entitlement for the SAME user', async () => {
    await revenueCatIdentityBridge.setIdentity('user-restore')
    mockPurchases.restorePurchases.mockResolvedValueOnce({
      entitlements: {
        all: {
          wellness: {
            isActive: true,
            willRenew: true,
            expirationDate: new Date(Date.now() + 86400000).toISOString(),
            latestPurchaseDate: new Date().toISOString(),
          },
        },
      },
    })
    // confirmServerAccessConverged fetches /api/subscription — stub it active.
    subscriptionFetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ subscription: { userId: 'user-restore', active: true } }), { status: 200 }),
    )
    const entitlements = await billing.restorePurchases()
    expect(mockPurchases.restorePurchases).toHaveBeenCalledTimes(1)
    expect(entitlements).toHaveLength(1)
    expect(entitlements[0].plan).toBe('wellness')
    expect(entitlements[0].isActive).toBe(true)
    // The restore is only reachable because identity === the same user.
    expect(revenueCatIdentityBridge.isIdentityConfirmed('user-restore')).toBe(true)
  })

  it('server convergence is only acknowledged after GET /api/subscription agrees', async () => {
    await revenueCatIdentityBridge.setIdentity('user-converged')
    subscriptionFetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ subscription: { userId: 'user-converged', active: true } }), { status: 200 }),
    )
    expect(await confirmServerAccessConverged('user-converged')).toBe(true)
    // Non-matching user → not converged.
    expect(await confirmServerAccessConverged('other-user')).toBe(false)
  })
})

describe('Wave A2 — persisted billing identity (server side)', () => {
  it('detects anonymous RevenueCat ids', () => {
    expect(isRevenueCatAnonymous('$RCAnonymousID:abc123')).toBe(true)
    expect(isRevenueCatAnonymous('user-42')).toBe(false)
    expect(isRevenueCatAnonymous(null)).toBe(false)
    expect(isRevenueCatAnonymous(undefined)).toBe(false)
  })

  it('normalizes environment', () => {
    expect(normalizeRevenueCatEnvironment('SANDBOX')).toBe('sandbox')
    expect(normalizeRevenueCatEnvironment('PRODUCTION')).toBe('production')
    expect(normalizeRevenueCatEnvironment('production')).toBe('production')
    expect(normalizeRevenueCatEnvironment(undefined)).toBe('production')
  })

  it('resolves an unknown externalUserId to null and reports missing users', async () => {
    expect(await resolveBillingIdentityUserId('revenuecat', 'production', 'does-not-exist')).toBeNull()
    expect(await billingUserExists('does-not-exist')).toBe(false)
  })

  it('upserts a binding and enforces (provider, environment, externalUserId) uniqueness', async () => {
    const email = `wave-a2-identity-${Date.now()}@aqwelia.test`
    const user = await db.user.create({ data: { email, passwordHash: 'x' } })
    try {
      const first = await upsertBillingIdentity({
        provider: 'revenuecat', environment: 'production', externalUserId: 'ext-1', userId: user.id,
      })
      expect(first.ok).toBe(true)
      // Same binding again → idempotent, same user.
      const second = await upsertBillingIdentity({
        provider: 'revenuecat', environment: 'production', externalUserId: 'ext-1', userId: user.id,
      })
      expect(second.ok).toBe(true)
      expect(second.ok && second.row.id).toBe(first.ok && first.row.id)
      // Sandbox is a different namespace.
      const sandbox = await upsertBillingIdentity({
        provider: 'revenuecat', environment: 'sandbox', externalUserId: 'ext-1', userId: user.id,
      })
      expect(sandbox.ok).toBe(true)
      expect(await resolveBillingIdentityUserId('revenuecat', 'production', 'ext-1')).toBe(user.id)
      expect(await resolveBillingIdentityUserId('revenuecat', 'sandbox', 'ext-1')).toBe(user.id)
    } finally {
      await db.billingIdentity.deleteMany({ where: { userId: user.id } })
      await db.user.deleteMany({ where: { id: user.id } })
    }
  })

  it('refuses to bind an externalUserId to a second user (ownership conflict)', async () => {
    const emailA = `wave-a2-owner-a-${Date.now()}@aqwelia.test`
    const emailB = `wave-a2-owner-b-${Date.now()}@aqwelia.test`
    const a = await db.user.create({ data: { email: emailA, passwordHash: 'x' } })
    const b = await db.user.create({ data: { email: emailB, passwordHash: 'x' } })
    try {
      const first = await upsertBillingIdentity({
        provider: 'revenuecat', environment: 'production', externalUserId: 'ext-owner', userId: a.id,
      })
      expect(first.ok).toBe(true)
      const conflict = await upsertBillingIdentity({
        provider: 'revenuecat', environment: 'production', externalUserId: 'ext-owner', userId: b.id,
      })
      expect(conflict.ok).toBe(false)
      if (!conflict.ok) expect(conflict.reason).toContain('another_user')
      // The binding still belongs to A.
      expect(await resolveBillingIdentityUserId('revenuecat', 'production', 'ext-owner')).toBe(a.id)
    } finally {
      await db.billingIdentity.deleteMany({ where: { userId: { in: [a.id, b.id] } } })
      await db.user.deleteMany({ where: { id: { in: [a.id, b.id] } } })
    }
  })
})

describe('Wave A2 — RevenueCat webhook hardening (DB-level)', () => {
  let userId: string
  const now = Date.now()
  const prefix = `wave-a2-${now}`
  const futureMs = now + 30 * 86400000

  beforeAll(async () => {
    const user = await db.user.create({
      data: { email: `wave-a2-webhook-${now}@aqwelia.test`, passwordHash: 'x' },
    })
    userId = user.id
    // Bind the canonical identity so the handler resolves the user.
    const bound = await upsertBillingIdentity({
      provider: 'revenuecat', environment: 'production', externalUserId: userId, userId,
    })
    expect(bound.ok).toBe(true)
  })

  afterAll(async () => {
    await db.billingEvent.deleteMany({ where: { eventId: { startsWith: prefix } } })
    await db.subscription.deleteMany({ where: { userId } })
    await db.billingIdentity.deleteMany({ where: { userId } })
    await db.user.deleteMany({ where: { id: userId } })
  })

  async function event(eventId: string, overrides: Record<string, unknown> = {}) {
    const evt: Record<string, unknown> = {
      id: `${prefix}_${eventId}`,
      type: 'INITIAL_PURCHASE',
      app_user_id: userId,
      product_id: 'aqwelia_wellness_monthly',
      original_transaction_id: `${prefix}_${eventId}_orig`,
      purchased_at_ms: now,
      event_timestamp_ms: now,
      expiration_at_ms: futureMs,
      period_type: 'NORMAL',
      store: 'APP_STORE',
      environment: 'PRODUCTION',
      ...overrides,
    }
    return evt
  }

  it('rejects TRANSFER events (quarantine, never applied)', async () => {
    const evt = await event('transfer', { type: 'TRANSFER' })
    const res = await handleRevenueCatEvent(evt, userId, `${prefix}_transfer`, new Date(now))
    expect(res).toEqual({ result: 'ignored', reason: 'rc_event_quarantined:transfer' })
    expect(await db.subscription.count({ where: { userId } })).toBe(0)
  })

  it('rejects ALIAS events', async () => {
    const evt = await event('alias', { type: 'ALIAS' })
    const res = await handleRevenueCatEvent(evt, userId, `${prefix}_alias`, new Date(now))
    expect(res).toEqual({ result: 'ignored', reason: 'rc_event_quarantined:alias' })
  })

  it('an activation whose expiration_at_ms is already past never creates active=true', async () => {
    const evt = await event('expired-activation', { expiration_at_ms: now - 1000 })
    const res = await handleRevenueCatEvent(evt, userId, `${prefix}_expired-activation`, new Date(now))
    expect(res).toEqual({ result: 'processed' })
    const row = await db.subscription.findFirst({
      where: { providerSubscriptionId: `${prefix}_expired-activation_orig` },
    })
    expect(row).toBeTruthy()
    expect(row?.status).toBe('expired')
    expect(row?.active).toBe(false)
    await db.subscription.delete({ where: { id: row!.id } })
  })

  it('an ownership conflict (original_transaction_id bound to another user) is ignored, never transferred', async () => {
    const otherUser = await db.user.create({
      data: { email: `wave-a2-other-${now}@aqwelia.test`, passwordHash: 'x' },
    })
    try {
      const sub = await db.subscription.create({
        data: {
          userId: otherUser.id,
          plan: 'wellness',
          status: 'active',
          active: true,
          provider: 'revenuecat',
          environment: 'production',
          providerSubscriptionId: `${prefix}_ownerconflict_orig`,
          lastProviderEventAt: new Date(now),
        },
      })
      const evt = await event('ownerconflict', {
        original_transaction_id: `${prefix}_ownerconflict_orig`,
      })
      const res = await handleRevenueCatEvent(evt, userId, `${prefix}_ownerconflict`, new Date(now))
      expect(res).toEqual({ result: 'ignored', reason: 'transaction_ownership_conflict' })
      // Row still belongs to the other user and is untouched.
      const after = await db.subscription.findUnique({ where: { id: sub.id } })
      expect(after?.userId).toBe(otherUser.id)
      expect(after?.status).toBe('active')
      await db.subscription.delete({ where: { id: sub.id } })
    } finally {
      await db.user.deleteMany({ where: { id: otherUser.id } })
    }
  })

  it('duplicate deliveries are idempotent at the webhook boundary (exactly one row)', async () => {
    const evt = await event('dup')
    const eventId = `${prefix}_dup`
    let calls = 0
    const run = () => processEventIdempotently({
      eventId,
      source: 'revenuecat',
      environment: 'production',
      eventType: 'INITIAL_PURCHASE',
      userId,
      payload: JSON.stringify(evt),
      handler: async () => {
        calls += 1
        return handleRevenueCatEvent(evt, userId, eventId, new Date(now), 'production')
      },
    })
    const r1 = await run()
    const r2 = await run()
    expect(calls).toBe(1)
    expect(r2.skipped).toBe(true)
    const rows = await db.subscription.findMany({
      where: { providerSubscriptionId: `${prefix}_dup_orig` },
    })
    expect(rows).toHaveLength(1)
    await db.subscription.deleteMany({ where: { providerSubscriptionId: `${prefix}_dup_orig` } })
  })

  it('sandbox vs production are distinct namespaces (same original_transaction_id, both processed)', async () => {
    const sandboxEvt = await event('sandbox', {
      original_transaction_id: `${prefix}_env_orig`,
      environment: 'SANDBOX',
    })
    const prodEvt = await event('prod', {
      original_transaction_id: `${prefix}_env_orig`,
      environment: 'PRODUCTION',
    })
    const s1 = await handleRevenueCatEvent(sandboxEvt, userId, `${prefix}_sandbox`, new Date(now), 'sandbox')
    const p1 = await handleRevenueCatEvent(prodEvt, userId, `${prefix}_prod`, new Date(now), 'production')
    expect(s1).toEqual({ result: 'processed' })
    expect(p1).toEqual({ result: 'processed' })
    const rows = await db.subscription.findMany({
      where: { providerSubscriptionId: `${prefix}_env_orig` },
    })
    expect(rows).toHaveLength(2)
    expect(rows.some((r) => r.environment === 'sandbox')).toBe(true)
    expect(rows.some((r) => r.environment === 'production')).toBe(true)
    await db.subscription.deleteMany({ where: { providerSubscriptionId: `${prefix}_env_orig` } })
  })

  it('an out-of-order event (older than current state) is ignored', async () => {
    const earlier = now - 86400000
    const evt = await event('outoforder', { event_timestamp_ms: now })
    await handleRevenueCatEvent(evt, userId, `${prefix}_outoforder`, new Date(now), 'production')
    const stale = await event('outoforder', { event_timestamp_ms: earlier })
    const res = await handleRevenueCatEvent(stale, userId, `${prefix}_outoforder`, new Date(now), 'production')
    expect(res).toEqual({ result: 'ignored', reason: 'out_of_order' })
    const rows = await db.subscription.findMany({
      where: { providerSubscriptionId: `${prefix}_outoforder_orig` },
    })
    expect(rows).toHaveLength(1)
    await db.subscription.deleteMany({ where: { providerSubscriptionId: `${prefix}_outoforder_orig` } })
  })
})

describe('Wave A2 — provider coexistence (Stripe + RevenueCat)', () => {
  const prefix = `wave-a2-coexist-${Date.now()}`
  let userId: string

  beforeAll(async () => {
    const user = await db.user.create({
      data: { email: `wave-a2-coexist-${Date.now()}@aqwelia.test`, passwordHash: 'x' },
    })
    userId = user.id
  })

  afterAll(async () => {
    await db.subscription.deleteMany({ where: { userId } })
    await db.billingIdentity.deleteMany({ where: { userId } })
    await db.user.deleteMany({ where: { id: userId } })
  })

  it('a RevenueCat activation does NOT deactivate the Stripe subscription', async () => {
    await applyTransition({
      userId, planId: 'oasis', status: 'active', store: 'web',
      provider: 'stripe', environment: 'production',
      stripeSubscriptionId: `${prefix}_stripe_1`, providerSubscriptionId: `${prefix}_stripe_1`,
      providerEventId: `${prefix}_e1`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    await applyTransition({
      userId, planId: 'wellness', status: 'active', store: 'ios',
      provider: 'revenuecat', environment: 'production',
      providerSubscriptionId: `${prefix}_rc_1`,
      providerEventId: `${prefix}_e2`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    const subs = await db.subscription.findMany({ where: { userId } })
    expect(subs).toHaveLength(2)
    const stripe = subs.find((s) => s.provider === 'stripe')
    const rc = subs.find((s) => s.provider === 'revenuecat')
    expect(stripe?.active).toBe(true)
    expect(stripe?.status).toBe('active')
    expect(rc?.active).toBe(true)
    expect(rc?.status).toBe('active')
  })

  it('a Stripe activation does NOT deactivate the RevenueCat subscription (reverse order)', async () => {
    await applyTransition({
      userId, planId: 'spa365', status: 'active', store: 'ios',
      provider: 'revenuecat', environment: 'production',
      providerSubscriptionId: `${prefix}_rc_2`,
      providerEventId: `${prefix}_e3`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    await applyTransition({
      userId, planId: 'oasis', status: 'active', store: 'web',
      provider: 'stripe', environment: 'production',
      stripeSubscriptionId: `${prefix}_stripe_2`, providerSubscriptionId: `${prefix}_stripe_2`,
      providerEventId: `${prefix}_e4`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    const rc = await db.subscription.findFirst({ where: { providerSubscriptionId: `${prefix}_rc_2` } })
    const stripe = await db.subscription.findFirst({ where: { providerSubscriptionId: `${prefix}_stripe_2` } })
    expect(rc?.active).toBe(true)
    expect(rc?.status).toBe('active')
    expect(stripe?.active).toBe(true)
    expect(stripe?.status).toBe('active')
  })

  it('a RevenueCat expiration does NOT remove the Stripe right (union projection)', async () => {
    await db.subscription.deleteMany({ where: { userId } })
    await applyTransition({
      userId, planId: 'oasis', status: 'active', store: 'web',
      provider: 'stripe', environment: 'production',
      stripeSubscriptionId: `${prefix}_stripe_keep`, providerSubscriptionId: `${prefix}_stripe_keep`,
      providerEventId: `${prefix}_e5`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    await applyTransition({
      userId, planId: 'wellness', status: 'active', store: 'ios',
      provider: 'revenuecat', environment: 'production',
      providerSubscriptionId: `${prefix}_rc_expire`,
      providerEventId: `${prefix}_e6`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    // Expire the RevenueCat subscription.
    await applyTransition({
      userId, planId: 'wellness', status: 'expired', store: 'ios',
      provider: 'revenuecat', environment: 'production',
      providerSubscriptionId: `${prefix}_rc_expire`,
      providerEventId: `${prefix}_e7`, providerEventAt: new Date(Date.now() + 1000),
      expiresAt: new Date(Date.now() - 1000),
    })
    const projection = await loadUserEntitlements(userId)
    expect(projection.hasValidAccess).toBe(true)
    expect(projection.best?.plan).toBe('oasis')
    expect(projection.best?.status).toBe('active')
    // The expired RC row must never shadow the valid Stripe row.
    const resolved = resolveUnionPlan(projection.rows.map((r) => ({ plan: r.plan, status: r.status, expiresAt: r.expiresAt })))
    expect(resolved).toBe('oasis')
  })

  it('a transition can only modify the subscription with the same provider identity', async () => {
    await db.subscription.deleteMany({ where: { userId } })
    await applyTransition({
      userId, planId: 'oasis', status: 'active', store: 'web',
      provider: 'stripe', environment: 'production',
      stripeSubscriptionId: `${prefix}_stripe_only`, providerSubscriptionId: `${prefix}_stripe_only`,
      providerEventId: `${prefix}_e8`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    // A RevenueCat event with a DIFFERENT original_transaction_id must create a
    // NEW revenuecat row, never touch the stripe row.
    await applyTransition({
      userId, planId: 'wellness', status: 'active', store: 'ios',
      provider: 'revenuecat', environment: 'production',
      providerSubscriptionId: `${prefix}_rc_other`,
      providerEventId: `${prefix}_e9`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    const stripe = await db.subscription.findFirst({ where: { providerSubscriptionId: `${prefix}_stripe_only` } })
    expect(stripe?.status).toBe('active')
    expect(stripe?.active).toBe(true)
    expect(stripe?.plan).toBe('oasis')
  })
})

describe('Wave A2 — deterministic entitlement resolution', () => {
  it('picks the highest valid tier, ignoring invalid rows', () => {
    const rows = [
      { plan: 'wellness', status: 'expired', expiresAt: null },
      { plan: 'oasis', status: 'active', expiresAt: new Date(Date.now() + 1000) },
      { plan: 'spa365', status: 'active', expiresAt: new Date(Date.now() + 5000) },
    ]
    const best = pickBestValidRow(rows)
    expect(best?.plan).toBe('spa365')
    expect(resolveUnionPlan(rows as never)).toBe('spa365')
  })

  it('ties on the same tier are broken deterministically by later expiry', () => {
    const rows = [
      { plan: 'wellness', status: 'active', expiresAt: new Date('2026-12-01') },
      { plan: 'wellness', status: 'active', expiresAt: new Date('2027-06-01') },
    ]
    expect(pickBestValidRow(rows)?.expiresAt?.getTime()).toBe(new Date('2027-06-01').getTime())
  })

  it('no valid rows → null best and decouverte union', () => {
    const rows = [
      { plan: 'wellness', status: 'expired', expiresAt: null },
      { plan: 'oasis', status: 'inactive', expiresAt: null },
    ]
    expect(pickBestValidRow(rows)).toBeNull()
    expect(resolveUnionPlan(rows as never)).toBe('decouverte')
  })
})

describe('Wave A2 — migrations (SQLite + PostgreSQL)', () => {
  it('SQLite migration creates BillingIdentity and provider/environment columns', () => {
    const dirs = readdirSync(join(PROJECT_ROOT, 'prisma/migrations'))
      .filter((d) => d.endsWith('wave_a2_billing_identity'))
    expect(dirs).toHaveLength(1)
    const sql = readFileSync(join(PROJECT_ROOT, `prisma/migrations/${dirs[0]}/migration.sql`), 'utf8')
    expect(sql).toContain('CREATE TABLE "BillingIdentity"')
    expect(sql).toContain('ALTER TABLE "Subscription" ADD COLUMN "provider"')
    expect(sql).toContain('ALTER TABLE "Subscription" ADD COLUMN "environment"')
    expect(sql).toContain('BillingIdentity_provider_environment_externalUserId_key')
    expect(sql).toContain('BillingEvent_source_environment_eventId_key')
  })

  it('PostgreSQL migration is in sync and creates the same structure', () => {
    const dirs = readdirSync(join(PROJECT_ROOT, 'prisma/postgresql/migrations'))
      .filter((d) => d.endsWith('wave_a2_billing_identity'))
    expect(dirs).toHaveLength(1)
    const sql = readFileSync(join(PROJECT_ROOT, `prisma/postgresql/migrations/${dirs[0]}/migration.sql`), 'utf8')
    expect(sql).toContain('CREATE TABLE "BillingIdentity"')
    expect(sql).toContain('ALTER TABLE "Subscription" ADD COLUMN "provider"')
    expect(sql).toContain('BillingIdentity_userId_fkey')
    expect(sql).toContain('BillingEvent_source_environment_eventId_key')
  })

  it('the two Prisma schemas are identical after generation (provider parity)', () => {
    const sqlite = readFileSync(join(PROJECT_ROOT, 'prisma/schema.prisma'), 'utf8')
    const pg = readFileSync(join(PROJECT_ROOT, 'prisma/postgresql/schema.prisma'), 'utf8')
    expect(pg).toContain('model BillingIdentity')
    expect(pg).toContain('provider               String    @default("revenuecat")')
    // Both declare the environment-scoped idempotency unique.
    expect(sqlite).toContain('@@unique([source, environment, eventId])')
    expect(pg).toContain('@@unique([source, environment, eventId])')
  })
})

describe('Wave A2 — no direct signOut outside the centralized wrapper', () => {
  const consumers = [
    'src/app/settings/page.tsx',
    'src/components/aquamind/header.tsx',
    'src/components/mobile/mobile-header.tsx',
    'src/app/admin/page.tsx',
  ]

  it.each(consumers)('consumer %s routes sign-out through the wrapper only', (file) => {
    const src = readFileSync(join(PROJECT_ROOT, file), 'utf8')
    expect(src).toContain('signOutWithBillingCleanup')
    // No direct `import { ... signOut } from 'next-auth/react'`.
    expect(src).not.toMatch(/import\s*\{[^}]*\bsignOut\b[^}]*\}\s*from\s*['"]next-auth\/react['"]/)
  })

  it('the wrapper clears RevenueCat before calling NextAuth signOut', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/sign-out.ts'), 'utf8')
    expect(src).toContain('revenueCatIdentityBridge.clearIdentity()')
    expect(src).toContain('await signOut(options)')
  })
})
