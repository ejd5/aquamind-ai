/**
 * AQWELIA Wave A2 (Round 4) — client/server boundary, server-provided billing
 * environment, epoch-protected billing operations.
 *
 * Mandatory coverage:
 *  - purchase A starts then clearIdentity → operation invalidated (no accept
 *    under B);
 *  - purchase A starts then setIdentity B → invalidated;
 *  - restore A starts then logout → invalidated;
 *  - convergence A then receives a valid projection of B → false (identity
 *    changed, never accepted under B);
 *  - same plan/provider/environment but userId B → false;
 *  - binding returns sandbox → manager ready with sandbox;
 *  - binding returns production → manager ready with production;
 *  - binding without environment → manager NEVER ready;
 *  - logout resets environment / userId / binding to null;
 *  - no Prisma/db in the client RevenueCat graph (structural + import-graph
 *    proof);
 *  - server binding response carries billingAccessEnvironment.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

// ── Mock native + RevenueCat SDK ────────────────────────────────────────────
const sdkState = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY = 'test-ios-key'
  process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY = 'test-android-key'
  process.env.REVENUECAT_CONVERGENCE_ATTEMPTS = '3'
  process.env.REVENUECAT_CONVERGENCE_INTERVAL_MS = '1'
  const mockPurchases = {
    configure: vi.fn(async () => undefined),
    setLogLevel: vi.fn(async () => undefined),
    logIn: vi.fn(async ({ appUserID }: { appUserID: string }) => ({ customerInfo: {} })),
    logOut: vi.fn(async () => ({ customerInfo: {} })),
    getCustomerInfo: vi.fn(async () => ({})),
    getOfferings: vi.fn(async (): Promise<any> => ({ current: undefined, all: {} })),
    purchasePackage: vi.fn(async () => ({ customerInfo: {} })),
    restorePurchases: vi.fn(async () => ({})),
  }
  return { mockPurchases }
})
const { mockPurchases } = sdkState

vi.mock('@/lib/platform', () => ({
  isNative: () => true,
  getPlatform: () => 'ios',
}))

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: sdkState.mockPurchases,
  LOG_LEVEL: { INFO: 1 },
}))

import { createIdentityBridge } from '@/lib/billing/revenuecat-identity'
import { revenueCatManager } from '@/lib/billing/revenuecat-manager'
import { subscriptionConvergesForExpectedSource, type SubscriptionConvergencePayload } from '@/lib/billing/revenuecat-identity-guard'
import { getBillingAccessEnvironment } from '@/lib/billing/identity'

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function identityBindingResponse(env?: string | null) {
  return new Response(
    JSON.stringify(env ? { ok: true, billingAccessEnvironment: env } : { ok: true }),
    { status: 200 },
  )
}

function subscriptionBody(
  userId: string,
  sources: { plan: string; provider: string; environment?: string }[],
) {
  return new Response(
    JSON.stringify({
      subscription: { userId, active: sources.length > 0, plan: sources[0]?.plan ?? null, provider: sources[0]?.provider ?? null, environment: sources[0]?.environment ?? 'production' },
      plan: { id: sources[0]?.plan ?? 'decouverte' },
      access: { hasValidAccess: sources.length > 0, grantedPlans: sources.map((s) => s.plan) },
      sources: sources.map((s, i) => ({ id: `src_${i}`, plan: s.plan, provider: s.provider, environment: s.environment ?? 'production', store: s.provider === 'stripe' ? 'web' : 'ios', status: 'active', expiresAt: null })),
    }),
    { status: 200 },
  )
}

function stubFetch(opts: {
  bindingEnv?: string | null
  subscription?: (n: number) => { userId: string; sources: { plan: string; provider: string; environment?: string }[] }
}) {
  let n = 0
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/billing/identity')) {
      return identityBindingResponse(opts.bindingEnv)
    }
    if (url.includes('/api/subscription')) {
      n += 1
      const sub = opts.subscription ? opts.subscription(n) : { userId: 'user-x', sources: [] }
      return subscriptionBody(sub.userId, sub.sources)
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }))
  return () => n
}

describe('R4 — server-provided billing environment', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    mockPurchases.getOfferings.mockReset()
    mockPurchases.purchasePackage.mockReset()
    mockPurchases.restorePurchases.mockReset()
  })

  it('binding returns production → manager ready with production', async () => {
    stubFetch({ bindingEnv: 'production' })
    const manager = createIdentityBridge()
    const snap = await manager.setIdentity('user-x')
    expect(snap.serverIdentityBound).toBe(true)
    expect(snap.billingAccessEnvironment).toBe('production')
    expect(snap.state).toBe('ready')
    expect(manager.isReady('user-x')).toBe(true)
  })

  it('binding returns sandbox → manager ready with sandbox', async () => {
    stubFetch({ bindingEnv: 'sandbox' })
    const manager = createIdentityBridge()
    const snap = await manager.setIdentity('user-x')
    expect(snap.billingAccessEnvironment).toBe('sandbox')
    expect(snap.state).toBe('ready')
    expect(manager.isReady('user-x')).toBe(true)
  })

  it('binding WITHOUT an environment → manager NEVER ready (fail-closed)', async () => {
    stubFetch({ bindingEnv: null })
    const manager = createIdentityBridge()
    const snap = await manager.setIdentity('user-x')
    expect(snap.serverIdentityBound).toBe(false)
    expect(snap.billingAccessEnvironment).toBeNull()
    expect(snap.state).toBe('error')
    expect(manager.isReady('user-x')).toBe(false)
  })

  it('logout resets environment, userId and binding to null', async () => {
    stubFetch({ bindingEnv: 'production' })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    expect(manager.isReady('user-x')).toBe(true)
    const cleared = await manager.clearIdentity()
    expect(cleared.sdkConfirmedUserId).toBeNull()
    expect(cleared.serverIdentityBound).toBe(false)
    expect(cleared.billingAccessEnvironment).toBeNull()
    expect(cleared.expectedUserId).toBeNull()
    expect(manager.isReady('user-x')).toBe(false)
  })

  it('server binding response carries billingAccessEnvironment (route contract)', () => {
    const route = readFileSync(join(PROJECT_ROOT, 'src/app/api/billing/identity/route.ts'), 'utf8')
    expect(route).toContain('getBillingAccessEnvironment()')
    expect(route).toContain('billingAccessEnvironment')
  })
})

describe('R4 — epoch protection: purchase / restore vs identity changes', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    process.env.REVENUECAT_CONVERGENCE_ATTEMPTS = '3'
    process.env.REVENUECAT_CONVERGENCE_INTERVAL_MS = '1'
    mockPurchases.getOfferings.mockReset()
    mockPurchases.purchasePackage.mockReset()
    mockPurchases.restorePurchases.mockReset()
  })

  it('purchase A starts then clearIdentity → operation invalidated (fail-closed)', async () => {
    stubFetch({ bindingEnv: 'production' })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-A')
    expect(manager.isReady('user-A')).toBe(true)

    // Make purchasePackage block until logout runs, then resolve.
    let release: () => void = () => undefined
    const gate = new Promise<void>((r) => { release = r })
    mockPurchases.purchasePackage.mockImplementationOnce(async () => {
      await gate
      return { customerInfo: { entitlements: { all: { spa365: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString() } } } } }
    })
    mockPurchases.getOfferings.mockResolvedValueOnce({
      current: { identifier: 'default', availablePackages: [{ product: { identifier: 'aqwelia_spa365_monthly', price: '4.99', priceString: '4,99 €', currencyCode: 'EUR' } }] },
    })

    const purchasePromise = manager.purchase('aqwelia_spa365_monthly')
    await pause(10)
    // Logout mid-purchase.
    await manager.clearIdentity()
    release()
    const result = await purchasePromise
    // A result started under A is never accepted under B (idle).
    expect(result.success).toBe(false)
    expect(result.error).toContain('Identity changed')
  })

  it('purchase A starts then setIdentity B → operation invalidated', async () => {
    stubFetch({ bindingEnv: 'production' })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-A')
    let release: () => void = () => undefined
    const gate = new Promise<void>((r) => { release = r })
    mockPurchases.purchasePackage.mockImplementationOnce(async () => {
      await gate
      return { customerInfo: { entitlements: { all: { spa365: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString() } } } } }
    })
    mockPurchases.getOfferings.mockResolvedValueOnce({
      current: { identifier: 'default', availablePackages: [{ product: { identifier: 'aqwelia_spa365_monthly', price: '4.99', priceString: '4,99 €', currencyCode: 'EUR' } }] },
    })
    const purchasePromise = manager.purchase('aqwelia_spa365_monthly')
    await pause(10)
    // Switch A → B mid-purchase (setIdentity increments the epoch).
    await manager.setIdentity('user-B')
    expect(manager.isReady('user-B')).toBe(true)
    release()
    const result = await purchasePromise
    expect(result.success).toBe(false)
    expect(result.error).toContain('Identity changed')
    // B must never see A's result.
    expect(manager.snapshot().sdkConfirmedUserId).toBe('user-B')
  })

  it('restore A starts then logout → invalidated (pending/error fail-closed)', async () => {
    stubFetch({ bindingEnv: 'production' })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-A')
    let release: () => void = () => undefined
    const gate = new Promise<void>((r) => { release = r })
    mockPurchases.restorePurchases.mockImplementationOnce(async () => {
      await gate
      return { entitlements: { all: { oasis: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString() } } } }
    })
    const restorePromise = manager.restorePurchases()
    await pause(10)
    await manager.clearIdentity()
    release()
    const result = await restorePromise
    expect(result.restored).toBe(false)
    expect(result.state).toBe('none')
    // Never accepted under a cleared identity.
    expect(manager.snapshot().sdkConfirmedUserId).toBeNull()
  })

  it('convergence A then a valid projection of B → false (never accepted under B)', async () => {
    stubFetch({ bindingEnv: 'production' })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-A')
    // First poll: correct A source. Then the identity switches to B and the
    // projection shows B's valid RevenueCat source.
    let n = 0
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/identity')) return identityBindingResponse('production')
      if (url.includes('/api/subscription')) {
        n += 1
        if (n === 1) return subscriptionBody('user-A', [{ plan: 'spa365', provider: 'revenuecat', environment: 'production' }])
        return subscriptionBody('user-B', [{ plan: 'spa365', provider: 'revenuecat', environment: 'production' }])
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }))
    let release: () => void = () => undefined
    const gate = new Promise<void>((r) => { release = r })
    mockPurchases.purchasePackage.mockImplementationOnce(async () => {
      await gate
      return { customerInfo: { entitlements: { all: { spa365: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString() } } } } }
    })
    mockPurchases.getOfferings.mockResolvedValueOnce({
      current: { identifier: 'default', availablePackages: [{ product: { identifier: 'aqwelia_spa365_monthly', price: '4.99', priceString: '4,99 €', currencyCode: 'EUR' } }] },
    })
    const purchasePromise = manager.purchase('aqwelia_spa365_monthly')
    await pause(10)
    await manager.setIdentity('user-B')
    release()
    const result = await purchasePromise
    // Even if B's projection becomes valid, A's purchase must not be accepted.
    expect(result.success).toBe(false)
    expect(result.error).toContain('Identity changed')
  })

  it('same plan/provider/environment but userId B → false', () => {
    const body: SubscriptionConvergencePayload = {
      subscription: { userId: 'user-B', active: true, plan: 'spa365', provider: 'revenuecat', environment: 'production', store: 'ios' },
      plan: { id: 'spa365' },
      access: { hasValidAccess: true, grantedPlans: ['spa365'] },
      sources: [{ plan: 'spa365', provider: 'revenuecat', environment: 'production', store: 'ios', status: 'active', expiresAt: null }],
    }
    expect(subscriptionConvergesForExpectedSource(body, { userId: 'user-A', provider: 'revenuecat', environment: 'production', expectedPlans: ['spa365'] })).toBe(false)
    // Correct userId → true.
    expect(subscriptionConvergesForExpectedSource(body, { userId: 'user-B', provider: 'revenuecat', environment: 'production', expectedPlans: ['spa365'] })).toBe(true)
  })
})

describe('R4 — client/server boundary (no Prisma in the RevenueCat client graph)', () => {
  const clientFiles = [
    'src/lib/billing/revenuecat-manager.ts',
    'src/lib/billing/revenuecat-identity.ts',
    'src/lib/billing/revenuecat.ts',
    'src/lib/billing/revenuecat-identity-guard.ts',
    'src/lib/billing/billing-types.ts',
    'src/lib/billing/entitlement-resolution.ts',
    'src/hooks/use-revenuecat-identity.ts',
    'src/lib/billing/sign-out.ts',
  ]

  it('no client RevenueCat module imports @/lib/db, Prisma, or server-only', () => {
    // Match only import statements (comments may mention these words).
    for (const file of clientFiles) {
      const src = readFileSync(join(PROJECT_ROOT, file), 'utf8')
      const importLines = src.split('\n').filter((l) => /^\s*import\s/.test(l)).join('\n')
      expect(importLines).not.toMatch(/@prisma\/client|prisma-client|server-only|next-auth\/server/)
      expect(importLines).not.toMatch(/from\s*['"]@\/lib\/db['"]/)
      expect(importLines).not.toMatch(/from\s*['"]\.\.?\/identity['"]/)
      expect(importLines).not.toMatch(/from\s*['"]@\/lib\/billing\/identity['"]/)
    }
  })

  it('revenuecat-manager never imports identity.ts (server module with db)', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/revenuecat-manager.ts'), 'utf8')
    expect(src).not.toMatch(/from\s*['"]\.\/identity['"]/)
    expect(src).not.toMatch(/from\s*['"]@\/lib\/billing\/identity['"]/)
    // The environment is a server-provided value, not computed client-side.
    expect(src).toContain('billingAccessEnvironment')
    expect(src).not.toContain('AQWELIA_DEPLOYMENT_ENV')
    expect(src).not.toContain('BILLING_ALLOW_SANDBOX')
    expect(src).not.toContain('getBillingAccessEnvironment')
  })

  it('billing-types.ts (client-safe) has no imports at all', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/billing-types.ts'), 'utf8')
    expect(src).not.toMatch(/^import /m)
  })

  it('the client graph is closed: billing-types is the only shared module', () => {
    // Verify the direct import edges of the client manager.
    const manager = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/revenuecat-manager.ts'), 'utf8')
    const guard = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/revenuecat-identity-guard.ts'), 'utf8')
    for (const src of [manager, guard]) {
      const importLines = src.split('\n').filter((l) => /^\s*import\s/.test(l)).join('\n')
      expect(importLines).not.toMatch(/@\/lib\/db|@\/lib\/auth|server-only|@prisma\/client/)
    }
    // The manager imports the client-safe types module for BillingEnvironment.
    expect(manager).toContain("from './billing-types'")
  })

  it('getBillingAccessEnvironment remains server-only (not referenced by the client)', () => {
    const guard = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/revenuecat-identity-guard.ts'), 'utf8')
    const facade = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/revenuecat-identity.ts'), 'utf8')
    const hook = readFileSync(join(PROJECT_ROOT, 'src/hooks/use-revenuecat-identity.ts'), 'utf8')
    for (const src of [guard, facade, hook]) {
      expect(src).not.toContain('getBillingAccessEnvironment')
      expect(src).not.toMatch(/from\s*['"]@\/lib\/billing\/identity['"]/)
    }
  })

  it('the server environment module still resolves (identity.ts exports getBillingAccessEnvironment)', () => {
    // getBillingAccessEnvironment is a server function — smoke-test its contract.
    expect(getBillingAccessEnvironment({ deploymentEnv: 'production', allowSandbox: 'true' })).toBe('production')
    expect(getBillingAccessEnvironment({ deploymentEnv: 'staging', allowSandbox: 'true' })).toBe('sandbox')
    expect(getBillingAccessEnvironment({ deploymentEnv: 'staging' })).toBe('production')
    expect(getBillingAccessEnvironment({ deploymentEnv: '' })).toBe('production')
    expect(getBillingAccessEnvironment({ deploymentEnv: 'bogus', allowSandbox: 'true' })).toBe('production')
  })

  it('bundle guard script exists and targets the client chunks (executable after build)', () => {
    const script = readFileSync(join(PROJECT_ROOT, 'scripts/check-client-bundle.mjs'), 'utf8')
    expect(script).toContain('.next/static/chunks')
    expect(script).toContain('@prisma/client')
    expect(script).toContain('server-only')
    expect(script).toContain('AQWELIA_DEPLOYMENT_ENV')
    // Structural proof the manager graph is clean regardless of a build.
    const manager = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/revenuecat-manager.ts'), 'utf8')
    expect(manager).not.toMatch(/@prisma\/client/)
    expect(manager).not.toMatch(/node:sqlite/)
  })
})
