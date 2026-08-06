/**
 * AQWELIA Wave A2 (Round 6) — server-only restore UI, settings server
 * authority, multi-provider management targets, web/native purchase contract.
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
import { billing } from '@/lib/billing'
import { resolveSubscriptionManagementTargets } from '@/lib/billing/management-targets'
import type { SubscriptionSourceLike } from '@/lib/billing/management-targets'

function subscriptionResponse(planId: string, sources: SubscriptionSourceLike[]) {
  return new Response(
    JSON.stringify({
      plan: { id: planId },
      subscription: { userId: 'user-x', active: sources.length > 0, plan: planId, provider: sources[0]?.provider ?? null, environment: 'production' },
      access: { hasValidAccess: sources.length > 0, grantedPlans: sources.map((s) => s.provider === 'stripe' ? 'oasis' : 'spa365') },
      sources: sources.map((s, i) => ({ id: `src_${i}`, plan: s.provider === 'stripe' ? 'oasis' : 'spa365', status: 'active', expiresAt: null, ...s })),
      allPlans: [],
    }),
    { status: 200 },
  )
}

function stubFetch(opts: {
  subscription?: () => { planId: string; sources: SubscriptionSourceLike[] }
}) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/billing/identity')) {
      return new Response(JSON.stringify({ ok: true, billingAccessEnvironment: 'production' }), { status: 200 })
    }
    if (url.includes('/api/subscription')) {
      const sub = opts.subscription ? opts.subscription() : { planId: 'decouverte', sources: [] }
      return subscriptionResponse(sub.planId, sub.sources)
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }))
}

describe('R6 — paywall restore: server is the only authority', () => {
  it('pending restore does NOT set currentPlanId from CustomerInfo', async () => {
    stubFetch({ subscription: () => ({ planId: 'wellness', sources: [{ provider: 'stripe', store: 'web', environment: 'production' }] }) })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.restorePurchases.mockResolvedValueOnce({
      entitlements: { all: { spa365: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString() } } },
    })
    const result = await manager.restorePurchases()
    // RC spa365 restored locally, but no RC source projected server-side yet →
    // pending. The UI must keep the server plan (wellness Stripe).
    expect(result.state).toBe('pending')
    expect(result.serverConverged).toBe(false)
    // Structural: the paywall pending branch must not call setCurrentPlanId.
    const paywall = readFileSync(join(PROJECT_ROOT, 'src/components/aquamind/module-paywall.tsx'), 'utf8')
    const pendingSection = paywall.split("result.state === 'pending' || result.serverConverged === false")[1] || ''
    expect(pendingSection).not.toMatch(/setCurrentPlanId\(/)
    expect(pendingSection).not.toMatch(/setSubscription\(/)
    expect(pendingSection).toContain("t('restorePending')")
    expect(pendingSection).toContain('await load()')
  })

  it('converged restore: plan displayed comes from /api/subscription, not entitlements', async () => {
    // Server projects wellness (Stripe) + spa365 (RC).
    stubFetch({
      subscription: () => ({
        planId: 'wellness',
        sources: [
          { provider: 'stripe', store: 'web', environment: 'production' },
          { provider: 'revenuecat', store: 'ios', environment: 'production' },
        ],
      }),
    })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.restorePurchases.mockResolvedValueOnce({
      entitlements: { all: { spa365: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString() } } },
    })
    const result = await manager.restorePurchases()
    expect(result.state).toBe('converged')
    expect(result.serverConverged).toBe(true)
    // The paywall converged branch reloads and uses the SERVER plan.
    const paywall = readFileSync(join(PROJECT_ROOT, 'src/components/aquamind/module-paywall.tsx'), 'utf8')
    const convergedSection = paywall.split("result.state === 'pending' || result.serverConverged === false")[1] || ''
    expect(convergedSection).toContain('await load()')
    expect(convergedSection).toContain("t('restored')")
    expect(convergedSection).toContain('currentPlanId')
    // pickDisplayEntitlement is no longer imported in the paywall.
    expect(paywall).not.toMatch(/pickDisplayEntitlement/)
  })

  it('none restore → no purchase toast, no mutation', async () => {
    stubFetch({ subscription: () => ({ planId: 'decouverte', sources: [] }) })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.restorePurchases.mockResolvedValueOnce({ entitlements: { all: {} } })
    const result = await manager.restorePurchases()
    expect(result.state).toBe('none')
    expect(result.restored).toBe(false)
    const paywall = readFileSync(join(PROJECT_ROOT, 'src/components/aquamind/module-paywall.tsx'), 'utf8')
    const noneBranch = paywall.split("result.state === 'none' || !result.restored")[1] || ''
    expect(noneBranch).toContain("t('noPurchase')")
  })
})

describe('R6 — settings page: server projection only', () => {
  it('initial plan load uses /api/subscription, never billing.getActivePlan()', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/app/settings/page.tsx'), 'utf8')
    // No runtime call to billing.getActivePlan() as a display authority.
    const importBlock = src.split('\n').filter((l) => /^\s*(import|await |const |fetch)/.test(l)).join('\n')
    expect(src).not.toMatch(/billing\.getActivePlan\(\)/)
    expect(src).toContain("fetch('/api/subscription', { credentials: 'include' })")
    expect(src).toContain("setActivePlan((data as any)?.plan?.id || 'decouverte')")
  })

  it('pending restore does NOT setActivePlan from local entitlements', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/app/settings/page.tsx'), 'utf8')
    const pendingSection = src.split("result.state === 'pending' || result.serverConverged === false")[1] || ''
    expect(pendingSection).not.toMatch(/pickDisplayEntitlement/)
    expect(pendingSection).not.toMatch(/result\.entitlements/)
    expect(pendingSection).toContain("t('restorePending')")
    // setActivePlan only from the reloaded server response.
    expect(pendingSection).toContain("data?.plan?.id")
  })

  it('converged restore sets active plan from response.plan.id', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/app/settings/page.tsx'), 'utf8')
    const converged = src.split("// state === 'converged'")[1] || ''
    expect(converged).toContain("fetch('/api/subscription', { credentials: 'include' })")
    expect(converged).toContain("serverPlan = (data as any)?.plan?.id")
    expect(converged).toContain('setActivePlan(serverPlan)')
    // pickDisplayEntitlement is gone from the settings page.
    expect(src).not.toMatch(/pickDisplayEntitlement/)
  })

  it('settings imports the management-targets helper, not getEntitlements for display', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/app/settings/page.tsx'), 'utf8')
    expect(src).toContain('resolveSubscriptionManagementTargets')
    expect(src).toContain("fetch('/api/subscription', { credentials: 'include' })")
    // handleManage no longer uses billing.getEntitlements().
    expect(src).not.toMatch(/const entitlements = await billing\.getEntitlements\(\)/)
  })
})

describe('R6 — multi-provider subscription management targets (pure)', () => {
  it('no valid source → no target (no active subscription)', () => {
    expect(resolveSubscriptionManagementTargets([])).toEqual([])
    expect(resolveSubscriptionManagementTargets([{ provider: null, store: null, environment: null }])).toEqual([])
  })

  it('only Stripe/web → stripe portal', () => {
    expect(resolveSubscriptionManagementTargets([{ provider: 'stripe', store: 'web', environment: 'production' }])).toEqual(['stripe'])
  })

  it('only RevenueCat iOS → apple management', () => {
    expect(resolveSubscriptionManagementTargets([{ provider: 'revenuecat', store: 'ios', environment: 'production' }])).toEqual(['apple'])
  })

  it('only RevenueCat Android → google management', () => {
    expect(resolveSubscriptionManagementTargets([{ provider: 'revenuecat', store: 'android', environment: 'production' }])).toEqual(['google'])
  })

  it('Stripe + RevenueCat → both targets, no arbitrary pick', () => {
    const targets = resolveSubscriptionManagementTargets([
      { provider: 'revenuecat', store: 'ios', environment: 'production' },
      { provider: 'stripe', store: 'web', environment: 'production' },
    ])
    expect(targets).toEqual(['stripe', 'apple'])
  })

  it('sandbox source is never administrable unless explicitly allowed', () => {
    expect(resolveSubscriptionManagementTargets([{ provider: 'revenuecat', store: 'ios', environment: 'sandbox' }])).toEqual([])
    expect(resolveSubscriptionManagementTargets([{ provider: 'revenuecat', store: 'ios', environment: 'sandbox' }], { allowSandbox: true })).toEqual(['apple'])
  })

  it('deterministic order (stripe, apple, google) regardless of input order', () => {
    const a = resolveSubscriptionManagementTargets([
      { provider: 'revenuecat', store: 'android', environment: 'production' },
      { provider: 'revenuecat', store: 'ios', environment: 'production' },
      { provider: 'stripe', store: 'web', environment: 'production' },
    ])
    const b = resolveSubscriptionManagementTargets([
      { provider: 'stripe', store: 'web', environment: 'production' },
      { provider: 'revenuecat', store: 'ios', environment: 'production' },
      { provider: 'revenuecat', store: 'android', environment: 'production' },
    ])
    expect(a).toEqual(['stripe', 'apple', 'google'])
    expect(b).toEqual(['stripe', 'apple', 'google'])
  })
})

describe('R6 — web/native purchase contract', () => {
  it('stripeWebClient.purchase returns redirected, never confirmed', async () => {
    const { stripeWebClient } = await import('@/lib/billing/stripe-web')
    // Mock api.post to return a checkout URL.
    const apiMock = await import('@/lib/api-client')
    const spy = vi.spyOn(apiMock.api, 'post').mockResolvedValue({ url: 'https://checkout.stripe.com/xyz' } as never)
    const win = { location: { href: '' } } as unknown as Window & typeof globalThis
    const originalLocation = globalThis.window
    vi.stubGlobal('window', win)
    const result = await stripeWebClient.purchase('oasis_yearly')
    expect(result.success).toBe(true)
    expect(result.state).toBe('redirected')
    expect(result.serverConverged).toBe(false)
    // A Checkout URL creation is NOT a confirmed purchase.
    expect(result.state).not.toBe('converged')
    expect(result.state).not.toBe('pending')
    expect((win as any).location.href).toBe('https://checkout.stripe.com/xyz')
    spy.mockRestore()
    if (originalLocation) vi.stubGlobal('window', originalLocation)
  })

  it('PurchaseResult contract documents native vs checkout invariants', () => {
    const types = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/types.ts'), 'utf8')
    expect(types).toContain("state: 'converged' | 'pending' | 'redirected' | 'cancelled' | 'failed'")
    expect(types).toContain('redirected')
    expect(types).toContain('WEB / CHECKOUT invariants')
  })

  it('billing facade exposes manageSubscriptionForTarget', () => {
    const idx = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/index.ts'), 'utf8')
    expect(idx).toContain('manageSubscriptionForTarget')
  })
})

describe('R6 — playwright exact version pin', () => {
  it('@playwright/test and playwright are both exactly 1.62.0', () => {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8'))
    expect(pkg.devDependencies['@playwright/test']).toBe('1.62.0')
    expect(pkg.devDependencies['playwright']).toBe('1.62.0')
    const lock = readFileSync(join(PROJECT_ROOT, 'bun.lock'), 'utf8')
    expect(lock).toContain('"@playwright/test": "1.62.0"')
    expect(lock).toContain('"playwright": "1.62.0"')
  })
})
