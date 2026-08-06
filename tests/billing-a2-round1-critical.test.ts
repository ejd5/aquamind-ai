/**
 * AQWELIA Wave A2 Round 1 — critical behavioral tests.
 *
 * Covers (executable, not string-scan-only):
 *   1. configure executed exactly once;
 *   2. no second RevenueCat initializer;
 *   3. session A → SDK identity A → server binding A → ready;
 *   4. server binding failed → purchase blocked;
 *   5. webhook immediately after login finds BillingIdentity;
 *   6. webhook received before binding → retryable (non-200, no reservation);
 *   7. new delivery after binding is processed exactly once;
 *   8. anonymous app_user_id + known canonical alias is resolved;
 *   9. alias A + alias B belonging to two Users → quarantine;
 *  10. environment absent/invalid is NOT production by default;
 *  11. sandbox purchase never unlocks Production;
 *  12. production subscription unlocks Production;
 *  13. Stripe + RevenueCat union only within the same environment;
 *  14. internal retry never uses an externalUserId as User.id;
 *  15. retry verifies the User exists;
 *  16. transaction ownership scoping (provider + environment);
 *  17. User deletion cascades BillingIdentity (SQLite + PostgreSQL migration);
 *  18. concurrent BillingIdentity upsert produces no 500;
 *  19. A → logout/switch → B never reuses A;
 *  20. no purchase/restore without SDK + server identity confirmed;
 *  +  legacy subscription preflight: ambiguous rows block the deploy.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

// ────────────────────────────────────────────────────────────────────────────
// Mock native platform + RevenueCat SDK (never contacts a real provider).
// ────────────────────────────────────────────────────────────────────────────
const mockState = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY = 'test-ios-key'
  process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY = 'test-android-key'
  process.env.REVENUECAT_WEBHOOK_SECRET = 'rc_wh_test_ci_only'
  const sdkCalls: string[] = []
  const mockPurchases = {
    configure: vi.fn(async () => undefined),
    setLogLevel: vi.fn(async () => undefined),
    logIn: vi.fn(async ({ appUserID }: { appUserID: string }) => {
      sdkCalls.push(`logIn:${appUserID}`)
      return { customerInfo: {} }
    }),
    logOut: vi.fn(async () => {
      sdkCalls.push('logOut')
      return { customerInfo: {} }
    }),
    getCustomerInfo: vi.fn(async () => ({})),
    getOfferings: vi.fn(async () => ({ all: {} })),
    purchasePackage: vi.fn(async () => ({ customerInfo: {} })),
    restorePurchases: vi.fn(async () => ({})),
  }
  return { mockPurchases, sdkCalls }
})

const { mockPurchases, sdkCalls } = mockState

vi.mock('@/lib/platform', () => ({
  isNative: () => true,
  getPlatform: () => 'ios',
}))

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: mockState.mockPurchases,
  LOG_LEVEL: { INFO: 1 },
}))

// ── Server binding + subscription fetch mocks ───────────────────────────────
let fetchMock: ReturnType<typeof vi.fn>
beforeAll(() => {
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/api/billing/identity')) {
      return new Response(JSON.stringify({ ok: true, billingAccessEnvironment: 'production' }), { status: 200 })
    }
    if (url.includes('/api/subscription')) {
      return new Response(JSON.stringify({ subscription: { userId: 'x', active: true } }), { status: 200 })
    }
    return new Response(JSON.stringify({ ok: true, billingAccessEnvironment: 'production' }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterAll(() => {
  vi.unstubAllGlobals()
})

// Import AFTER the mocks.
import {
  createIdentityBridge,
  revenueCatIdentityBridge,
  identityQueueDrained,
  RevenueCatIdentityNotReadyError,
} from '@/lib/billing/revenuecat-identity'
import { revenueCatManager } from '@/lib/billing/revenuecat-manager'
import { requireConfirmedRevenueCatIdentity } from '@/lib/billing/revenuecat-identity-guard'
import { billing } from '@/lib/billing'
import {
  isRevenueCatAnonymous,
  parseRevenueCatEnvironment,
  getBillingAccessEnvironment,
  resolveBillingIdentityUserId,
  upsertBillingIdentity,
  billingUserExists,
  resolveRevenueCatIdentity,
} from '@/lib/billing/identity'
import { handleRevenueCatEvent } from '@/lib/billing/providers/revenuecat-event'
import { applyTransition } from '@/lib/billing/transition'
import { loadUserEntitlements, pickBestValidRow } from '@/lib/billing/entitlement-projection'
import { retryDueBillingEvents } from '@/lib/billing/retry'
import { POST as revenueCatWebhook } from '@/app/api/revenuecat/webhook/route'

function webhookRequest(event: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/revenuecat/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({ event }),
  })
}

function validEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Date.now()
  return {
    id: `r1_evt_${now}_${Math.floor(Math.random() * 1e6)}`,
    type: 'INITIAL_PURCHASE',
    app_user_id: 'user-x',
    original_transaction_id: `r1_orig_${now}`,
    product_id: 'aqwelia_wellness_monthly',
    purchased_at_ms: now,
    event_timestamp_ms: now,
    expiration_at_ms: now + 30 * 86400000,
    period_type: 'NORMAL',
    store: 'APP_STORE',
    environment: 'PRODUCTION',
    ...overrides,
  }
}

describe('R1 — single SDK lifecycle', () => {
  beforeEach(() => {
    sdkCalls.length = 0
    mockPurchases.logIn.mockClear()
    mockPurchases.logOut.mockClear()
    mockPurchases.configure.mockClear()
  })

  it('configure is executed exactly once across repeated setIdentity calls', async () => {
    const manager = createIdentityBridge()
    await manager.setIdentity('u1')
    await manager.setIdentity('u1')
    await manager.setIdentity('u1')
    expect(mockPurchases.configure).toHaveBeenCalledTimes(1)
    expect(manager.snapshot().sdkConfigureCount).toBe(1)
  })

  it('no second RevenueCat initializer exists (Purchases.configure only in the manager)', () => {
    const files = [
      'src/lib/billing/revenuecat-manager.ts',
      'src/lib/billing/revenuecat.ts',
      'src/lib/billing/revenuecat-identity.ts',
      'src/lib/billing/revenuecat-identity-guard.ts',
    ]
    for (const file of files) {
      const src = readFileSync(join(PROJECT_ROOT, file), 'utf8')
      const realCalls = (src.match(/Purchases\.configure\(/g) || []).length
      const sdkImports = (src.match(/from\s*['"]@revenuecat\/purchases-capacitor['"]/g) || []).length
      if (file.includes('revenuecat-manager.ts')) {
        expect(realCalls).toBeGreaterThanOrEqual(1)
        expect(sdkImports).toBeGreaterThanOrEqual(1)
      } else {
        expect(realCalls).toBe(0)
        expect(sdkImports).toBe(0)
      }
    }
  })

  it('session A → SDK identity A → server binding A → ready', async () => {
    const manager = createIdentityBridge()
    const snap = await manager.setIdentity('user-A')
    expect(snap.sdkIdentityConfirmed).toBe(true)
    expect(snap.serverIdentityBound).toBe(true)
    expect(snap.state).toBe('ready')
    expect(manager.isReady('user-A')).toBe(true)
    expect(await manager.requireReady()).toBe('user-A')
  })

  it('server binding failed → state error, purchase/restore blocked', async () => {
    fetchMock.mockImplementationOnce(async (input: RequestInfo | URL) => {
      if (String(input).includes('/api/billing/identity')) {
        return new Response(JSON.stringify({ error: 'boom' }), { status: 500 })
      }
      return new Response(JSON.stringify({ ok: true, billingAccessEnvironment: 'production' }), { status: 200 })
    })
    const manager = createIdentityBridge()
    const snap = await manager.setIdentity('user-fail-bind')
    expect(snap.serverIdentityBound).toBe(false)
    expect(snap.state).toBe('error')
    expect(manager.isReady('user-fail-bind')).toBe(false)
    await expect(manager.purchase('aqwelia_wellness_monthly')).rejects.toThrow(/identity is not confirmed/)
    await expect(manager.restorePurchases()).rejects.toThrow(/identity is not confirmed/)
    await expect(manager.requireReady()).rejects.toThrow(/identity is not confirmed/)
  })
})

describe('R1 — webhook canonical resolution', () => {
  const prefix = `r1-webhook-${Date.now()}`
  let prodUser: string
  let sandboxUser: string

  beforeAll(async () => {
    prodUser = (await db.user.create({ data: { email: `${prefix}-prod@aqwelia.test`, passwordHash: 'x' } })).id
    sandboxUser = (await db.user.create({ data: { email: `${prefix}-sandbox@aqwelia.test`, passwordHash: 'x' } })).id
  })

  afterAll(async () => {
    await db.billingEvent.deleteMany({ where: { eventId: { startsWith: prefix } } })
    await db.billingIdentity.deleteMany({ where: { userId: { in: [prodUser, sandboxUser] } } })
    await db.subscription.deleteMany({ where: { userId: { in: [prodUser, sandboxUser] } } })
    await db.user.deleteMany({ where: { id: { in: [prodUser, sandboxUser] } } })
  })

  it('webhook received immediately after login finds the BillingIdentity', async () => {
    await upsertBillingIdentity({ provider: 'revenuecat', externalUserId: prodUser, userId: prodUser })
    const resolution = await resolveRevenueCatIdentity({ app_user_id: prodUser })
    expect(resolution.ok).toBe(true)
    if (resolution.ok) expect(resolution.userId).toBe(prodUser)
  })

  it('webhook received before binding → retryable 503, no event reservation', async () => {
    const event = validEvent({ id: `${prefix}_prebind`, app_user_id: 'not-yet-bound' })
    const res = await revenueCatWebhook(webhookRequest(event))
    expect(res.status).toBe(503)
    const stored = await db.billingEvent.findMany({ where: { eventId: `${prefix}_prebind` } })
    expect(stored).toHaveLength(0)
  })

  it('new delivery after binding is processed exactly once', async () => {
    await upsertBillingIdentity({ provider: 'revenuecat', externalUserId: prodUser, userId: prodUser })
    const event = validEvent({ id: `${prefix}_postbind`, app_user_id: prodUser })
    const r1 = await revenueCatWebhook(webhookRequest(event))
    expect(r1.status).toBe(200)
    const r2 = await revenueCatWebhook(webhookRequest(event))
    expect(r2.status).toBe(200)
    const body2 = await r2.json()
    expect(body2.skipped).toBe(true)
    const subs = await db.subscription.findMany({
      where: { userId: prodUser, providerSubscriptionId: event.original_transaction_id as string },
    })
    expect(subs).toHaveLength(1)
    await db.subscription.deleteMany({ where: { providerSubscriptionId: event.original_transaction_id as string } })
  })

  it('anonymous app_user_id + known canonical alias is resolved', async () => {
    await upsertBillingIdentity({ provider: 'revenuecat', externalUserId: 'canon-1', userId: prodUser })
    const resolution = await resolveRevenueCatIdentity({
      app_user_id: '$RCAnonymousID:zzz',
      aliases: ['canon-1'],
    })
    expect(resolution.ok).toBe(true)
    if (resolution.ok) expect(resolution.userId).toBe(prodUser)
  })

  it('alias A + alias B belonging to two Users → identity_conflict quarantine', async () => {
    await upsertBillingIdentity({ provider: 'revenuecat', externalUserId: 'alias-a', userId: prodUser })
    await upsertBillingIdentity({ provider: 'revenuecat', externalUserId: 'alias-b', userId: sandboxUser })
    const resolution = await resolveRevenueCatIdentity({ app_user_id: 'alias-a', aliases: ['alias-b'] })
    expect(resolution.ok).toBe(false)
    if (!resolution.ok) expect(resolution.code).toBe('identity_conflict')
    // Route: quarantine recorded as ignored (200), never transferred.
    const event = validEvent({
      id: `${prefix}_conflict`,
      app_user_id: 'alias-a',
      aliases: ['alias-b'],
      original_transaction_id: `${prefix}_conflict_orig`,
    })
    const res = await revenueCatWebhook(webhookRequest(event))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ignored).toBe(true)
    expect(body.reason).toBe('identity_conflict')
    const subs = await db.subscription.findMany({ where: { providerSubscriptionId: `${prefix}_conflict_orig` } })
    expect(subs).toHaveLength(0)
  })

  it('environment absent or invalid is NOT production by default (rejected)', async () => {
    expect(parseRevenueCatEnvironment(undefined)).toBeNull()
    expect(parseRevenueCatEnvironment(null)).toBeNull()
    expect(parseRevenueCatEnvironment('')).toBeNull()
    expect(parseRevenueCatEnvironment('bogus')).toBeNull()
    expect(parseRevenueCatEnvironment('production')).toBe('production')
    expect(parseRevenueCatEnvironment('SANDBOX')).toBe('sandbox')
    // Route: missing environment → 400, no reservation.
    const event = validEvent({ id: `${prefix}_noenv`, environment: undefined as unknown as string })
    const res = await revenueCatWebhook(webhookRequest(event))
    expect(res.status).toBe(400)
    const stored = await db.billingEvent.findMany({ where: { eventId: `${prefix}_noenv` } })
    expect(stored).toHaveLength(0)
  })

  it('transaction ownership is scoped by provider + exact environment', async () => {
    const prodSub = await db.subscription.create({
      data: {
        userId: prodUser, plan: 'wellness', status: 'active', active: true,
        provider: 'revenuecat', environment: 'production',
        providerSubscriptionId: `${prefix}_owner_orig`,
        lastProviderEventAt: new Date(Date.now() - 1000),
      },
    })
    const sandboxSub = await db.subscription.create({
      data: {
        userId: sandboxUser, plan: 'spa365', status: 'active', active: true,
        provider: 'revenuecat', environment: 'sandbox',
        providerSubscriptionId: `${prefix}_owner_orig`,
        lastProviderEventAt: new Date(Date.now() - 1000),
      },
    })
    const now = Date.now()
    const res = await handleRevenueCatEvent(
      validEvent({ original_transaction_id: `${prefix}_owner_orig`, event_timestamp_ms: now }),
      prodUser,
      `${prefix}_owner_evt`,
      new Date(now),
      'production',
    )
    expect(res).toEqual({ result: 'processed' })
    const prodAfter = await db.subscription.findUnique({ where: { id: prodSub.id } })
    const sandboxAfter = await db.subscription.findUnique({ where: { id: sandboxSub.id } })
    // The production event updated the production row…
    expect(prodAfter?.status).toBe('active')
    expect(prodAfter?.lastProviderEventAt?.getTime()).toBe(now)
    // …and never touched the sandbox row.
    expect(sandboxAfter?.status).toBe('active')
    expect(sandboxAfter?.lastProviderEventAt?.getTime()).not.toBe(now)
    await db.subscription.deleteMany({ where: { id: { in: [prodSub.id, sandboxSub.id] } } })
  })
})

describe('R1 — sandbox / production access isolation', () => {
  const prefix = `r1-env-${Date.now()}`
  let user: string

  beforeAll(async () => {
    user = (await db.user.create({ data: { email: `${prefix}@aqwelia.test`, passwordHash: 'x' } })).id
  })

  afterAll(async () => {
    await db.subscription.deleteMany({ where: { userId: user } })
    await db.billingIdentity.deleteMany({ where: { userId: user } })
    await db.user.deleteMany({ where: { id: user } })
  })

  it('getBillingAccessEnvironment is fail-closed (production default)', () => {
    // Real production (Vercel Production): only production, sandbox never.
    expect(getBillingAccessEnvironment({ deploymentEnv: 'production', allowSandbox: 'true' })).toBe('production')
    // Vercel Staging is NODE_ENV=production but AQWELIA_DEPLOYMENT_ENV=staging:
    // sandbox only when explicitly enabled.
    expect(getBillingAccessEnvironment({ deploymentEnv: 'staging' })).toBe('production')
    expect(getBillingAccessEnvironment({ deploymentEnv: 'staging', allowSandbox: true })).toBe('sandbox')
    // Development: sandbox only when explicitly enabled.
    expect(getBillingAccessEnvironment({ deploymentEnv: 'development', allowSandbox: 'true' })).toBe('sandbox')
    expect(getBillingAccessEnvironment({ deploymentEnv: 'development' })).toBe('production')
    // Absent or invalid configuration → fail-closed production, never sandbox.
    expect(getBillingAccessEnvironment({ deploymentEnv: '' })).toBe('production')
    expect(getBillingAccessEnvironment({ deploymentEnv: 'bogus', allowSandbox: 'true' })).toBe('production')
    expect(getBillingAccessEnvironment({})).toBe('production')
  })

  it('a sandbox subscription never grants rights in Production', async () => {
    await db.subscription.deleteMany({ where: { userId: user } })
    await applyTransition({
      userId: user, planId: 'wellness', status: 'active', store: 'ios',
      provider: 'revenuecat', environment: 'sandbox',
      providerSubscriptionId: `${prefix}_sandbox`,
      providerEventId: `${prefix}_e1`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    const prod = await loadUserEntitlements(user, 'production')
    expect(prod.hasValidAccess).toBe(false)
    expect(prod.best).toBeNull()
  })

  it('a production subscription grants rights in Production', async () => {
    await applyTransition({
      userId: user, planId: 'oasis', status: 'active', store: 'web',
      provider: 'stripe', environment: 'production',
      stripeSubscriptionId: `${prefix}_stripe`, providerSubscriptionId: `${prefix}_stripe`,
      providerEventId: `${prefix}_e2`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    const prod = await loadUserEntitlements(user, 'production')
    expect(prod.hasValidAccess).toBe(true)
    expect(prod.best?.plan).toBe('oasis')
  })

  it('Stripe + RevenueCat union only within the same environment', async () => {
    await db.subscription.deleteMany({ where: { userId: user } })
    // Production: Stripe oasis + RevenueCat wellness (both grant).
    await applyTransition({
      userId: user, planId: 'oasis', status: 'active', store: 'web',
      provider: 'stripe', environment: 'production',
      stripeSubscriptionId: `${prefix}_s1`, providerSubscriptionId: `${prefix}_s1`,
      providerEventId: `${prefix}_e3`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    await applyTransition({
      userId: user, planId: 'wellness', status: 'active', store: 'ios',
      provider: 'revenuecat', environment: 'production',
      providerSubscriptionId: `${prefix}_r1`,
      providerEventId: `${prefix}_e4`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    // Sandbox: RevenueCat spa365 (must be ignored in the production projection).
    await applyTransition({
      userId: user, planId: 'spa365', status: 'active', store: 'ios',
      provider: 'revenuecat', environment: 'sandbox',
      providerSubscriptionId: `${prefix}_r2`,
      providerEventId: `${prefix}_e5`, providerEventAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })
    const prod = await loadUserEntitlements(user, 'production')
    // Union happens only within production: oasis + wellness, NOT spa365.
    expect(prod.hasValidAccess).toBe(true)
    expect(prod.best?.plan).toBe('wellness')
    expect(prod.rows).toHaveLength(2)
    expect(prod.rows.every((r) => r.environment === 'production')).toBe(true)
    const sandbox = await loadUserEntitlements(user, 'sandbox')
    expect(sandbox.best?.plan).toBe('spa365')
  })
})

describe('R1 — internal retry identity safety', () => {
  const prefix = `r1-retry-${Date.now()}`
  let user: string

  beforeAll(async () => {
    user = (await db.user.create({ data: { email: `${prefix}@aqwelia.test`, passwordHash: 'x' } })).id
    // The local test DB is persistent across runs; stale failed RevenueCat rows
    // would otherwise consume the retry limit before our rows are reached.
    await db.billingEvent.deleteMany({
      where: { source: 'revenuecat', result: 'failed', nextRetryAt: { lte: new Date() } },
    })
  })

  afterAll(async () => {
    await db.billingEvent.deleteMany({ where: { eventId: { startsWith: prefix } } })
    await db.subscription.deleteMany({ where: { userId: user } })
    await db.billingIdentity.deleteMany({ where: { userId: user } })
    await db.user.deleteMany({ where: { id: user } })
  })

  async function failedRow(suffix: string, overrides: Record<string, unknown>) {
    const eventId = `${prefix}_${suffix}`
    return db.billingEvent.create({
      data: {
        eventId,
        source: 'revenuecat',
        environment: 'production',
        eventType: 'RENEWAL',
        result: 'failed',
        attemptCount: 1,
        nextRetryAt: new Date(Date.now() - 1000),
        payload: JSON.stringify({
          type: 'RENEWAL',
          app_user_id: 'external-identity-xyz',
          original_transaction_id: `${prefix}_${suffix}_orig`,
          product_id: 'aqwelia_wellness_monthly',
          event_timestamp_ms: Date.now(),
          expiration_at_ms: Date.now() + 86400000,
        }),
        ...overrides,
      },
    })
  }

  it('never uses an externalUserId (payload app_user_id) as the AQWELIA userId', async () => {
    // No userId stored on the row → the retry must NOT derive one from the
    // payload and must NOT create a subscription.
    await failedRow('no_user', {})
    const summary = await retryDueBillingEvents(50)
    expect(summary.skipped).toBeGreaterThanOrEqual(1)
    const subs = await db.subscription.findMany({ where: { providerSubscriptionId: `${prefix}_no_user_orig` } })
    expect(subs).toHaveLength(0)
    const row = await db.billingEvent.findUnique({
      where: { source_environment_eventId: { source: 'revenuecat', environment: 'production', eventId: `${prefix}_no_user` } },
    })
    // A retry without identity proof must not have been executed/processed.
    expect(row?.result).toBe('failed')
    expect(row?.attemptCount).toBe(1)
  })

  it('verifies the resolved User exists before retrying a transition', async () => {
    await failedRow('ghost_user', { userId: 'ghost-user-id-that-does-not-exist' })
    const before = await db.subscription.count({ where: { userId: user } })
    const summary = await retryDueBillingEvents(50)
    expect(summary.skipped).toBeGreaterThanOrEqual(1)
    const subs = await db.subscription.findMany({ where: { providerSubscriptionId: `${prefix}_ghost_user_orig` } })
    expect(subs).toHaveLength(0)
    expect(await db.subscription.count({ where: { userId: user } })).toBe(before)
  })

  it('retries a resolved-user row through the same webhook contract', async () => {
    await upsertBillingIdentity({ provider: 'revenuecat', externalUserId: user, userId: user })
    await failedRow('resolved', { userId: user })
    const summary = await retryDueBillingEvents(50)
    expect(summary.processed).toBeGreaterThanOrEqual(1)
    const subs = await db.subscription.findMany({ where: { providerSubscriptionId: `${prefix}_resolved_orig` } })
    expect(subs).toHaveLength(1)
  })
})

describe('R1 — identity bridge A → logout → B and gate enforcement', () => {
  beforeEach(() => {
    sdkCalls.length = 0
    mockPurchases.logIn.mockClear()
    mockPurchases.logOut.mockClear()
  })

  it('A → logout/switch → B never reuses A', async () => {
    const manager = createIdentityBridge()
    await manager.setIdentity('A')
    expect(manager.isReady('A')).toBe(true)
    await manager.clearIdentity()
    expect(manager.isReady('A')).toBe(false)
    expect(manager.snapshot().sdkConfirmedUserId).toBeNull()
    await manager.setIdentity('B')
    expect(manager.isReady('B')).toBe(true)
    expect(manager.isReady('A')).toBe(false)
    expect(manager.snapshot().sdkConfirmedUserId).toBe('B')
    expect(sdkCalls).toEqual(['logIn:A', 'logOut', 'logIn:B'])
  })

  it('no purchase or restore without SDK + server identity confirmed', async () => {
    const manager = createIdentityBridge()
    // Fresh manager: nothing confirmed → blocked.
    await expect(manager.purchase('aqwelia_wellness_monthly')).rejects.toThrow(/identity is not confirmed/)
    await expect(manager.restorePurchases()).rejects.toThrow(/identity is not confirmed/)
    await expect(manager.getEntitlements()).rejects.toThrow(/identity is not confirmed/)
    // The singleton also blocks before any identity.
    await revenueCatIdentityBridge.clearIdentity()
    await expect(billing.purchase('aqwelia_wellness_monthly')).rejects.toThrow(/identity is not confirmed/)
    await expect(billing.restorePurchases()).rejects.toThrow(/identity is not confirmed/)
  })

  it('billing operations run only when the singleton is fully ready', async () => {
    await revenueCatIdentityBridge.setIdentity('ready-user')
    expect(revenueCatIdentityBridge.isReady('ready-user')).toBe(true)
    await identityQueueDrained()
    expect(revenueCatManager.snapshot().serverIdentityBound).toBe(true)
    mockPurchases.getOfferings.mockResolvedValueOnce({
      all: {
        default: { availablePackages: [{ product: { identifier: 'aqwelia_wellness_monthly', price: '9.99', priceString: '9.99 €', currencyCode: 'EUR' } }] },
      },
    })
    const products = await billing.getProducts()
    expect(products).toHaveLength(1)
    expect(products[0].id).toBe('aqwelia_wellness_monthly')
    await revenueCatIdentityBridge.clearIdentity()
  })
})

describe('R1 — migration parity + cascade + concurrent upsert + preflight', () => {
  it('User deletion cascades BillingIdentity in SQLite', async () => {
    const user = (await db.user.create({ data: { email: `r1-cascade-${Date.now()}@aqwelia.test`, passwordHash: 'x' } })).id
    await upsertBillingIdentity({ provider: 'revenuecat', externalUserId: `ext-cascade-${user}`, userId: user })
    expect(await db.billingIdentity.count({ where: { userId: user } })).toBe(1)
    await db.user.delete({ where: { id: user } })
    expect(await db.billingIdentity.count({ where: { userId: user } })).toBe(0)
  })

  it('PostgreSQL migration enforces the BillingIdentity FK with cascade', () => {
    const dirs = readdirSync(join(PROJECT_ROOT, 'prisma/postgresql/migrations'))
      .filter((d) => d.endsWith('wave_a2_billing_identity'))
    const sql = readFileSync(join(PROJECT_ROOT, `prisma/postgresql/migrations/${dirs[0]}/migration.sql`), 'utf8')
    expect(sql).toContain('FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE')
    // SQLite migration carries the same FK.
    const sqliteDirs = readdirSync(join(PROJECT_ROOT, 'prisma/migrations'))
      .filter((d) => d.endsWith('wave_a2_billing_identity'))
    const sqliteSql = readFileSync(join(PROJECT_ROOT, `prisma/migrations/${sqliteDirs[0]}/migration.sql`), 'utf8')
    expect(sqliteSql).toContain('FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE')
  })

  it('concurrent BillingIdentity upsert never produces a 500 / conflict for the same user', async () => {
    const user = (await db.user.create({ data: { email: `r1-race-${Date.now()}@aqwelia.test`, passwordHash: 'x' } })).id
    try {
      const results = await Promise.all(
        Array.from({ length: 8 }, () => upsertBillingIdentity({ provider: 'revenuecat', externalUserId: 'race-ext', userId: user })),
      )
      expect(results.every((r) => r.ok)).toBe(true)
      expect(await db.billingIdentity.count({ where: { userId: user, externalUserId: 'race-ext' } })).toBe(1)
    } finally {
      await db.billingIdentity.deleteMany({ where: { userId: user } })
      await db.user.deleteMany({ where: { id: user } })
    }
  })

  it('preflight classifies legacy subscriptions and blocks ambiguous rows', () => {
    const tmpDb = `/tmp/aqwelia-preflight-${Date.now()}.db`
    // Build a small SQLite DB via prisma db push + seed.
    execFileSync('bun', ['run', 'db:push'], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, DATABASE_URL: `file:${tmpDb}` },
      stdio: 'ignore',
    })
    const seed = `import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ datasources: { db: { url: 'file:${tmpDb}' } } });
const u = await db.user.create({ data: { email: 'preflight-${Date.now()}@aqwelia.test', passwordHash: 'x' } });
await db.subscription.create({ data: { userId: u.id, plan: 'oasis', status: 'active', stripeSubscriptionId: 'sub_s', providerSubscriptionId: 'sub_s' } });
await db.subscription.create({ data: { userId: u.id, plan: 'wellness', status: 'active', providerSubscriptionId: 'rc_1' } });
await db.subscription.create({ data: { userId: u.id, plan: 'spa365', status: 'active' } });
await db.\$disconnect();`
    execFileSync('bun', ['-e', seed], { cwd: PROJECT_ROOT, stdio: 'ignore' })
    // Ambiguous row (neither Stripe nor RC id) must block.
    let threw = false
    try {
      execFileSync('node', ['scripts/preflight-subscription-provider.mjs'], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, DATABASE_URL: `file:${tmpDb}` },
        stdio: 'ignore',
      })
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
    // Remove the ambiguous row → preflight passes.
    execFileSync('bun', ['-e', `import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ datasources: { db: { url: 'file:${tmpDb}' } } });
await db.subscription.deleteMany({ where: { providerSubscriptionId: null, stripeSubscriptionId: null } });
await db.\$disconnect();`], { cwd: PROJECT_ROOT, stdio: 'ignore' })
    let passed = false
    try {
      execFileSync('node', ['scripts/preflight-subscription-provider.mjs'], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, DATABASE_URL: `file:${tmpDb}` },
        stdio: 'ignore',
      })
      passed = true
    } catch {
      passed = false
    }
    expect(passed).toBe(true)
    execFileSync('rm', ['-f', tmpDb])
  })
})
