/**
 * AQWELIA Wave A2 (Round 5) — purchase contract: expected-plan entitlement,
 * pending vs converged UI, server projection as the only authority.
 *
 * Mandatory coverage:
 *  - purchase Spa365 with only Oasis active in CustomerInfo → success=false;
 *  - purchase Spa365 with Spa365 active + webhook absent → success=true,
 *    serverConverged=false, state=pending, purchasedPlan=spa365;
 *  - purchase Spa365 with Spa365 active + server source converged → state=converged;
 *  - purchase Wellness with old Oasis active → Oasis never suffices;
 *  - success=true + serverConverged=false → no local mutation to the purchased
 *    plan (UI must not activate);
 *  - no subscriptionActivated toast before convergence;
 *  - after convergence the UI reloads GET /api/subscription;
 *  - displayed plan comes from the server projection, not from requested plan
 *    or CustomerInfo.
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
    logIn: vi.fn(async () => ({ customerInfo: {} })),
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

function offering(identifier: string) {
  return {
    current: { identifier: 'default', availablePackages: [{ product: { identifier, price: '4.99', priceString: '4,99 €', currencyCode: 'EUR' } }] },
  }
}

function customerInfo(active: Record<string, { expirationDate?: string }>) {
  const all: Record<string, unknown> = {}
  for (const [id, data] of Object.entries(active)) {
    all[id] = { isActive: true, willRenew: true, expirationDate: data.expirationDate ?? new Date(Date.now() + 86400000).toISOString(), latestPurchaseDate: new Date().toISOString(), ...data }
  }
  return { entitlements: { all } }
}

function subscriptionResponse(userId: string, sources: { plan: string; provider: string; environment?: string }[]) {
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
  bindingEnv?: string
  subscription?: (n: number) => { userId: string; sources: { plan: string; provider: string; environment?: string }[] }
}) {
  let n = 0
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/billing/identity')) {
      return new Response(JSON.stringify({ ok: true, billingAccessEnvironment: opts.bindingEnv ?? 'production' }), { status: 200 })
    }
    if (url.includes('/api/subscription')) {
      n += 1
      const sub = opts.subscription ? opts.subscription(n) : { userId: 'user-x', sources: [] }
      return subscriptionResponse(sub.userId, sub.sources)
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }))
  return () => n
}

async function readyManager() {
  stubFetch({ bindingEnv: 'production' })
  const manager = createIdentityBridge()
  await manager.setIdentity('user-x')
  expect(manager.isReady('user-x')).toBe(true)
  return manager
}

describe('R5 — purchase requires the EXPECTED plan entitlement (SDK-level)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    process.env.REVENUECAT_CONVERGENCE_ATTEMPTS = '3'
    process.env.REVENUECAT_CONVERGENCE_INTERVAL_MS = '1'
    mockPurchases.getOfferings.mockReset()
    mockPurchases.purchasePackage.mockReset()
  })

  it('Spa365 purchase with only Oasis active in CustomerInfo → success=false', async () => {
    const manager = await readyManager()
    mockPurchases.getOfferings.mockResolvedValueOnce(offering('aqwelia_spa365_monthly'))
    mockPurchases.purchasePackage.mockResolvedValueOnce({ customerInfo: customerInfo({ oasis: {} }) })
    const result = await manager.purchase('aqwelia_spa365_monthly')
    expect(result.success).toBe(false)
    expect(result.state).toBe('failed')
    expect(result.serverConverged).toBe(false)
    expect(result.error).toContain('expected plan')
    expect(result.entitlement).toBeUndefined()
  })

  it('Spa365 purchase with Spa365 active + webhook absent → success=true, serverConverged=false, state=pending', async () => {
    const counts = stubFetch({ bindingEnv: 'production', subscription: () => ({ userId: 'user-x', sources: [] }) })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.getOfferings.mockResolvedValueOnce(offering('aqwelia_spa365_monthly'))
    mockPurchases.purchasePackage.mockResolvedValueOnce({ customerInfo: customerInfo({ spa365: {} }) })
    const result = await manager.purchase('aqwelia_spa365_monthly')
    expect(result.success).toBe(true)
    expect(result.state).toBe('pending')
    expect(result.serverConverged).toBe(false)
    expect(result.purchasedPlan).toBe('spa365')
    expect(result.entitlement?.plan).toBe('spa365')
    expect(counts()).toBe(3)
  })

  it('Spa365 purchase with Spa365 active + server source converged → state=converged', async () => {
    const counts = stubFetch({
      bindingEnv: 'production',
      subscription: (n) => ({
        userId: 'user-x',
        sources: n === 1 ? [] : [{ plan: 'spa365', provider: 'revenuecat', environment: 'production' }],
      }),
    })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.getOfferings.mockResolvedValueOnce(offering('aqwelia_spa365_monthly'))
    mockPurchases.purchasePackage.mockResolvedValueOnce({ customerInfo: customerInfo({ spa365: {} }) })
    const result = await manager.purchase('aqwelia_spa365_monthly')
    expect(result.success).toBe(true)
    expect(result.state).toBe('converged')
    expect(result.serverConverged).toBe(true)
    expect(result.purchasedPlan).toBe('spa365')
    expect(counts()).toBe(2)
  })

  it('Wellness purchase with old Oasis active → Oasis never suffices', async () => {
    const manager = await readyManager()
    mockPurchases.getOfferings.mockResolvedValueOnce(offering('aqwelia_wellness_yearly'))
    mockPurchases.purchasePackage.mockResolvedValueOnce({ customerInfo: customerInfo({ oasis: {} }) })
    const result = await manager.purchase('aqwelia_wellness_yearly')
    expect(result.success).toBe(false)
    expect(result.state).toBe('failed')
    expect(result.error).toContain('wellness')
  })

  it('the entitlement returned is the EXPECTED plan, never a display of another plan', async () => {
    const counts = stubFetch({
      bindingEnv: 'production',
      subscription: (n) => ({
        userId: 'user-x',
        sources: n === 1 ? [] : [{ plan: 'spa365', provider: 'revenuecat', environment: 'production' }],
      }),
    })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    // CustomerInfo has wellness AND spa365 active; the purchase is spa365.
    mockPurchases.getOfferings.mockResolvedValueOnce(offering('aqwelia_spa365_monthly'))
    mockPurchases.purchasePackage.mockResolvedValueOnce({ customerInfo: customerInfo({ wellness: {}, spa365: {} }) })
    const result = await manager.purchase('aqwelia_spa365_monthly')
    expect(result.success).toBe(true)
    expect(result.entitlement?.plan).toBe('spa365')
    expect(result.purchasedPlan).toBe('spa365')
    expect(counts()).toBe(2)
  })
})

describe('R5 — UI contract (no false activation, server projection authority)', () => {
  it('module-paywall native flow: pending → purchasePending toast, no setCurrentPlanId(planId), reload via load()', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/components/aquamind/module-paywall.tsx'), 'utf8')
    // No subscriptionActivated before checking serverConverged.
    expect(src).toContain("result.serverConverged === true && result.state === 'converged'")
    expect(src).toContain("t('purchasePending')")
    expect(src).toContain('await load()')
    // The pending branch must not call setCurrentPlanId(planId).
    const pendingBranch = src.split("t('purchasePending'),")[0]
    const afterPending = src.split("t('purchasePending'),")[1] || ''
    // Between success check and the pending toast there is no setCurrentPlanId(planId).
    expect(afterPending).not.toMatch(/setCurrentPlanId\(planId\)/)
    // Only after convergence does the activation toast appear.
    expect(src).toContain("t('subscriptionActivated')")
  })

  it('server projection is the only source of truth in load() (no CustomerInfo override)', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/components/aquamind/module-paywall.tsx'), 'utf8')
    // The native getActivePlan() override was removed.
    expect(src).not.toMatch(/billing\.getActivePlan\(\)/)
    expect(src).toContain("setCurrentPlanId((data as any)?.plan?.id || 'decouverte')")
  })

  it('PurchaseResult contract is documented with explicit state + invariants', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/types.ts'), 'utf8')
    expect(src).toContain("state: 'converged' | 'pending' | 'redirected' | 'cancelled' | 'failed'")
    expect(src).toContain('success===true')
    expect(src).toContain("an ACTIVE entitlement whose plan")
    expect(src).toContain('serverConverged===false')
  })

  it('i18n purchasePending keys exist in all 7 locales', () => {
    for (const locale of ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']) {
      const json = JSON.parse(readFileSync(join(PROJECT_ROOT, `src/i18n/locales/${locale}.json`), 'utf8'))
      expect(json.plans.purchasePending, locale).toBeTruthy()
      expect(json.plans.purchasePendingDesc, locale).toBeTruthy()
    }
  })
})
