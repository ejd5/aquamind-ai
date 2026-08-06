/**
 * AQWELIA Wave A2 (Round 7) — restore toast uses the reloaded server projection,
 * real multi-provider chooser, target-based routing independent of platform.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

// ── Mock native + RevenueCat SDK (for manager-level tests) ──────────────────
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
import { manageSubscriptionTarget } from '@/lib/billing/manage-subscription-router'
import { resolveSubscriptionManagementTargets } from '@/lib/billing/management-targets'

describe('R7 — restore toast uses the reloaded server projection (structural)', () => {
  it('load() returns the server projection and the restore toast uses projection.plan.id', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/components/aquamind/module-paywall.tsx'), 'utf8')
    // load() returns the projection.
    expect(src).toContain('const load = useCallback(async (): Promise<SubscriptionApiResponse | null>')
    expect(src).toContain('return projection ?? null')
    // Restore converged uses projection.plan.id, never stale currentPlanId.
    const restoreSection = src.split("const projection = await load()")[1] || ''
    expect(restoreSection).toContain('projection?.plan?.id')
    expect(restoreSection).not.toMatch(/currentPlanId\s*\|\|\s*'oasis'/)
    expect(restoreSection).not.toMatch(/result\.entitlements/)
    // Missing server plan → no fake success.
    expect(restoreSection).toContain("if (!serverPlan) {")
    expect(restoreSection).toContain("t('restorePending')")
  })

  it('converged purchase toast also uses the reloaded server plan', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/components/aquamind/module-paywall.tsx'), 'utf8')
    // The converged branch must reload and use projection.plan?.id, not the
    // stale local planId or just purchasedPlan.
    const branch = src.split("if (result.serverConverged === true && result.state === 'converged')")[1] || ''
    expect(branch).toContain('const projection = await load()')
    expect(branch).toContain('projection?.plan?.id')
    expect(branch).not.toMatch(/result\.purchasedPlan\s*\?\?\s*planId/)
    // The activation toast uses serverPlan.
    expect(branch).toContain("t('subscriptionActivatedDesc', { plan: serverPlan })")
  })
})

describe('R7 — multi-provider chooser (structural + behavioral logic)', () => {
  it('settings no longer auto-opens targets[0] when several targets', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/app/settings/page.tsx'), 'utf8')
    // No `const first = targets[0]` (the removed auto-pick) anywhere.
    expect(src).not.toMatch(/const first = targets\[0\]/)
    // The multi-target branch opens the chooser. The only manageSubscriptionForTarget
    // call in handleManage is inside the targets.length===1 branch.
    const singleCall = src.indexOf('await billing.manageSubscriptionForTarget(targets[0])')
    const singleRegion = src.slice(Math.max(0, singleCall - 120), singleCall + 80)
    expect(singleRegion).toContain('targets.length === 1')
    // The chooser open (setManageTargets(targets)) is NOT inside the single-call region.
    const chooserOpen = src.indexOf('setManageTargets(targets)')
    expect(singleRegion).not.toContain('setManageTargets(targets)')
    expect(chooserOpen).toBeGreaterThan(singleCall)
    // No other direct call to manageSubscriptionForTarget with an index or literal
    // outside the single-call site.
    const callSites = src.match(/manageSubscriptionForTarget\(/g) || []
    // handleManage single-call + openManageTarget(target) + 3 Dialog onClick uses.
    expect(callSites.length).toBeGreaterThanOrEqual(2)
  })

  it('renders a distinct button per target (stripe/apple/google) and a cancel', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/app/settings/page.tsx'), 'utf8')
    expect(src).toContain("manageTargets?.includes('stripe')")
    expect(src).toContain("manageTargets?.includes('apple')")
    expect(src).toContain("manageTargets?.includes('google')")
    expect(src).toContain("openManageTarget('stripe')")
    expect(src).toContain("openManageTarget('apple')")
    expect(src).toContain("openManageTarget('google')")
    expect(src).toContain("t('manageStripe')")
    expect(src).toContain("t('manageApple')")
    expect(src).toContain("t('manageGoogle')")
    expect(src).toContain("t('cancel')")
    expect(src).toContain('Dialog')
  })

  it('i18n keys exist in all 7 locales', () => {
    for (const locale of ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']) {
      const json = JSON.parse(readFileSync(join(PROJECT_ROOT, `src/i18n/locales/${locale}.json`), 'utf8'))
      expect(json.settings.manageStripe, locale).toBeTruthy()
      expect(json.settings.manageApple, locale).toBeTruthy()
      expect(json.settings.manageGoogle, locale).toBeTruthy()
      expect(json.settings.cancel, locale).toBeTruthy()
    }
  })

  it('management-targets keeps deterministic order (stripe, apple, google)', () => {
    const targets = resolveSubscriptionManagementTargets([
      { provider: 'revenuecat', store: 'android', environment: 'production' },
      { provider: 'revenuecat', store: 'ios', environment: 'production' },
      { provider: 'stripe', store: 'web', environment: 'production' },
    ])
    expect(targets).toEqual(['stripe', 'apple', 'google'])
  })

  it('sandbox sources stay blocked by default', () => {
    expect(resolveSubscriptionManagementTargets([{ provider: 'revenuecat', store: 'ios', environment: 'sandbox' }])).toEqual([])
  })
})

describe('R7 — target-based routing (independent of platform)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('web + apple → opens the official Apple URL (window.open), never aqwelia.app/account', async () => {
    const opened: string[] = []
    await manageSubscriptionTarget('apple', {
      isNative: () => false,
      openWindow: (url) => { opened.push(url) },
    })
    expect(opened).toEqual(['https://apps.apple.com/account/subscriptions'])
    expect(opened[0]).not.toContain('aqwelia.app/account')
  })

  it('web + google → opens the official Google URL, never aqwelia.app/account', async () => {
    const opened: string[] = []
    await manageSubscriptionTarget('google', {
      isNative: () => false,
      openWindow: (url) => { opened.push(url) },
    })
    expect(opened).toEqual(['https://play.google.com/store/account/subscriptions'])
    expect(opened[0]).not.toContain('aqwelia.app/account')
  })

  it('web + stripe → calls the Stripe portal and navigates to a valid URL', async () => {
    const navigated: string[] = []
    let portalCalls = 0
    await manageSubscriptionTarget('stripe', {
      isNative: () => false,
      openWindow: (url) => navigated.push(url),
      postStripePortal: async () => { portalCalls += 1; return { url: 'https://billing.stripe.com/p/session' } },
    })
    expect(portalCalls).toBe(1)
    expect(navigated).toEqual(['https://billing.stripe.com/p/session'])
  })

  it('web + stripe without a portal URL → throws (never silent success)', async () => {
    await expect(manageSubscriptionTarget('stripe', {
      isNative: () => false,
      postStripePortal: async () => null,
    })).rejects.toThrow('Stripe portal URL missing')
  })

  it('native + stripe → calls the Stripe portal (Browser.open on native)', async () => {
    const opened: string[] = []
    let portalCalls = 0
    await manageSubscriptionTarget('stripe', {
      isNative: () => true,
      openBrowser: async (url) => { opened.push(url) },
      postStripePortal: async () => { portalCalls += 1; return { url: 'https://billing.stripe.com/p/session' } },
    })
    expect(portalCalls).toBe(1)
    expect(opened).toEqual(['https://billing.stripe.com/p/session'])
  })

  it('native + apple → Browser.open the official Apple URL', async () => {
    const opened: string[] = []
    await manageSubscriptionTarget('apple', {
      isNative: () => true,
      openBrowser: async (url) => { opened.push(url) },
    })
    expect(opened).toEqual(['https://apps.apple.com/account/subscriptions'])
  })

  it('native + google → Browser.open the official Google URL', async () => {
    const opened: string[] = []
    await manageSubscriptionTarget('google', {
      isNative: () => true,
      openBrowser: async (url) => { opened.push(url) },
    })
    expect(opened).toEqual(['https://play.google.com/store/account/subscriptions'])
  })

  it('no apple/google target ever redirects to aqwelia.app/account', async () => {
    // Behavioral proof: web+apple and web+google open the official store URLs.
    for (const [target, expected] of [
      ['apple', 'https://apps.apple.com/account/subscriptions'],
      ['google', 'https://play.google.com/store/account/subscriptions'],
    ] as const) {
      const opened: string[] = []
      await manageSubscriptionTarget(target, {
        isNative: () => false,
        openWindow: (url) => { opened.push(url) },
      })
      expect(opened).toEqual([expected])
      expect(opened[0]).not.toContain('aqwelia.app/account')
    }
    const facade = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/index.ts'), 'utf8')
    // The facade delegates to the router, not to getBillingClient().
    expect(facade).toContain('manageSubscriptionTarget')
    expect(facade).not.toMatch(/manageSubscriptionForTarget:.*getBillingClient\(\)/)
  })
})

describe('R7 — preserved contracts', () => {
  it('restore pending still never mutates from CustomerInfo (paywall)', () => {
    const paywall = readFileSync(join(PROJECT_ROOT, 'src/components/aquamind/module-paywall.tsx'), 'utf8')
    const pending = paywall.split("result.state === 'pending' || result.serverConverged === false")[1]?.split('// state === \'converged\'')[0] || ''
    expect(pending).not.toMatch(/setCurrentPlanId\(/)
    expect(pending).not.toMatch(/setSubscription\(/)
  })

  it('server projection remains the only authority; checkout stays redirected', () => {
    const types = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/types.ts'), 'utf8')
    expect(types).toContain("state: 'converged' | 'pending' | 'redirected' | 'cancelled' | 'failed'")
    const stripe = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/stripe-web.ts'), 'utf8')
    expect(stripe).toContain("state: 'redirected'")
  })
})

describe('R7 — manager restore behavior (SDK mocked)', () => {
  function stubFetch(subscription: { planId: string; sources: { provider: string; store?: string | null; environment?: string }[] }) {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/identity')) return new Response(JSON.stringify({ ok: true, billingAccessEnvironment: 'production' }), { status: 200 })
      if (url.includes('/api/subscription')) {
        return new Response(JSON.stringify({
          plan: { id: subscription.planId },
          subscription: { userId: 'user-x', active: subscription.sources.length > 0, plan: subscription.planId },
          access: { hasValidAccess: subscription.sources.length > 0, grantedPlans: subscription.sources.map(() => 'spa365') },
          sources: subscription.sources.map((s, i) => ({ id: `src_${i}`, plan: 'spa365', status: 'active', expiresAt: null, ...s })),
          allPlans: [],
        }), { status: 200 })
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }))
  }

  beforeEach(() => {
    vi.unstubAllGlobals()
    mockPurchases.restorePurchases.mockReset()
  })

  it('restore converged returns state converged with server RC source', async () => {
    stubFetch({ planId: 'wellness', sources: [{ provider: 'revenuecat', store: 'ios', environment: 'production' }] })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.restorePurchases.mockResolvedValueOnce({
      entitlements: { all: { spa365: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString() } } },
    })
    const result = await manager.restorePurchases()
    expect(result.state).toBe('converged')
    expect(result.serverConverged).toBe(true)
  })

  it('restore pending (server only Stripe, no RC source) stays pending', async () => {
    stubFetch({ planId: 'wellness', sources: [{ provider: 'stripe', store: 'web', environment: 'production' }] })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.restorePurchases.mockResolvedValueOnce({
      entitlements: { all: { spa365: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString() } } },
    })
    const result = await manager.restorePurchases()
    expect(result.state).toBe('pending')
    expect(result.serverConverged).toBe(false)
  })
})
