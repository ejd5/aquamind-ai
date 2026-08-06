/**
 * AQWELIA Wave A2 (Round 2) — true capability union + deterministic
 * entitlements + server convergence.
 *
 * Mandatory coverage:
 *  - Oasis (Stripe) + Spa365 (RevenueCat) and the reverse order;
 *  - Wellness + Spa365;
 *  - expiration of one provider → no loss of the other's rights;
 *  - multiple active entitlements in every order → deterministic resolution;
 *  - restore with delayed webhook → pending then converged (bounded);
 *  - restore / purchase without server convergence → explicit pending;
 *  - duplicate offering / several offerings with the same product → dedup;
 *  - projection keeps provider / store / environment coherent.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '@/lib/db'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

// ── Mock native + RevenueCat SDK ────────────────────────────────────────────
const mockState = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY = 'test-ios-key'
  process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY = 'test-android-key'
  process.env.REVENUECAT_CONVERGENCE_ATTEMPTS = '4'
  process.env.REVENUECAT_CONVERGENCE_INTERVAL_MS = '5'
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
    getOfferings: vi.fn(async (): Promise<any> => ({ current: undefined, all: {} })),
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

// Import AFTER mocks.
import {
  combineLimits,
  unionCanAccess,
  getPlan,
} from '@/lib/billing/plans'
import { loadUserEntitlements } from '@/lib/billing/entitlement-projection'
import { pickDisplayEntitlement, resolveActiveEntitlements, plansFromEntitlements } from '@/lib/billing/entitlement-resolution'
import { createIdentityBridge } from '@/lib/billing/revenuecat-identity'
import { billing } from '@/lib/billing'
import { applyTransition } from '@/lib/billing/transition'
import { awaitServerConvergence } from '@/lib/billing/revenuecat-identity-guard'
import { revenueCatManager } from '@/lib/billing/revenuecat-manager'
import type { Entitlement } from '@/lib/billing/types'

function activeEnt(plan: 'oasis' | 'wellness' | 'spa365', order: number): Entitlement {
  return {
    id: plan,
    plan,
    isActive: true,
    willRenew: true,
    store: 'ios',
    purchasedAt: new Date(Date.now() + order),
  }
}

describe('R2 — true capability union (server projection)', () => {
  const prefix = `r2-union-${Date.now()}`
  let user: string

  beforeAll(async () => {
    user = (await db.user.create({ data: { email: `${prefix}@aqwelia.test`, passwordHash: 'x' } })).id
  })

  afterAll(async () => {
    await db.subscription.deleteMany({ where: { userId: user } })
    await db.billingIdentity.deleteMany({ where: { userId: user } })
    await db.user.deleteMany({ where: { id: user } })
  })

  async function seed(oasisProvider: 'stripe' | 'revenuecat', spaProvider: 'stripe' | 'revenuecat', expireSpa = false) {
    await db.subscription.deleteMany({ where: { userId: user } })
    const oasisSub = oasisProvider === 'stripe'
      ? { provider: 'stripe' as const, environment: 'production', stripeSubscriptionId: `${prefix}_oasis`, providerSubscriptionId: `${prefix}_oasis` }
      : { provider: 'revenuecat' as const, environment: 'production', providerSubscriptionId: `${prefix}_oasis` }
    const spaSub = spaProvider === 'stripe'
      ? { provider: 'stripe' as const, environment: 'production', stripeSubscriptionId: `${prefix}_spa`, providerSubscriptionId: `${prefix}_spa` }
      : { provider: 'revenuecat' as const, environment: 'production', providerSubscriptionId: `${prefix}_spa` }
    const now = Date.now()
    await applyTransition({
      userId: user, planId: 'oasis', status: 'active', store: 'web',
      ...oasisSub, providerEventId: `${prefix}_eo`, providerEventAt: new Date(now),
      expiresAt: new Date(now + 30 * 86400000),
    })
    await applyTransition({
      userId: user, planId: 'spa365', status: expireSpa ? 'expired' : 'active', store: 'ios',
      ...spaSub, providerEventId: `${prefix}_es`, providerEventAt: new Date(now + 1000),
      expiresAt: expireSpa ? new Date(now - 1000) : new Date(now + 30 * 86400000),
    })
  }

  it('Oasis Stripe + Spa365 RevenueCat → BOTH rights preserved', async () => {
    await seed('stripe', 'revenuecat')
    const p = await loadUserEntitlements(user, 'production')
    expect(p.hasValidAccess).toBe(true)
    expect(p.grantedPlans).toContain('oasis')
    expect(p.grantedPlans).toContain('spa365')
    expect(p.grantedPlans).not.toContain('wellness')
    // Oasis pool rights kept:
    expect(p.effectiveLimits.pdfReport).toBe(true)
    expect(p.effectiveLimits.proMode).toBe(true)
    expect(p.effectiveLimits.weatherEnabled).toBe(true)
    // Spa365 spa rights kept:
    expect(p.effectiveLimits.spaSupport).toBe(true)
    expect(p.effectiveLimits.maxSpas).toBe(1)
    // Both granted plans appear in grantedFeatures.
    const oasisFeature = getPlan('oasis')!.features[0]
    const spaFeature = getPlan('spa365')!.features[0]
    expect(p.grantedFeatures).toContain(oasisFeature)
    expect(p.grantedFeatures).toContain(spaFeature)
    // Sources keep provider/environment/store.
    const oasisSource = p.sources.find((s) => s.plan === 'oasis')!
    const spaSource = p.sources.find((s) => s.plan === 'spa365')!
    expect(oasisSource.provider).toBe('stripe')
    expect(oasisSource.store).toBe('web')
    expect(spaSource.provider).toBe('revenuecat')
    expect(spaSource.store).toBe('ios')
    expect(p.sources.every((s) => s.environment === 'production')).toBe(true)
  })

  it('Spa365 Stripe + Oasis RevenueCat (reverse order) → both rights preserved', async () => {
    await seed('revenuecat', 'stripe')
    const p = await loadUserEntitlements(user, 'production')
    expect(p.grantedPlans).toContain('oasis')
    expect(p.grantedPlans).toContain('spa365')
    expect(p.effectiveLimits.spaSupport).toBe(true)
    expect(p.effectiveLimits.pdfReport).toBe(true)
    const oasisSource = p.sources.find((s) => s.plan === 'oasis')!
    const spaSource = p.sources.find((s) => s.plan === 'spa365')!
    expect(oasisSource.provider).toBe('revenuecat')
    expect(spaSource.provider).toBe('stripe')
  })

  it('Wellness + Spa365 → combined max limits', async () => {
    await db.subscription.deleteMany({ where: { userId: user } })
    const now = Date.now()
    await applyTransition({
      userId: user, planId: 'wellness', status: 'active', store: 'web',
      provider: 'stripe', environment: 'production',
      stripeSubscriptionId: `${prefix}_w`, providerSubscriptionId: `${prefix}_w`,
      providerEventId: `${prefix}_ew`, providerEventAt: new Date(now),
      expiresAt: new Date(now + 30 * 86400000),
    })
    await applyTransition({
      userId: user, planId: 'spa365', status: 'active', store: 'ios',
      provider: 'revenuecat', environment: 'production',
      providerSubscriptionId: `${prefix}_w_spa`,
      providerEventId: `${prefix}_ews`, providerEventAt: new Date(now + 1000),
      expiresAt: new Date(now + 30 * 86400000),
    })
    const p = await loadUserEntitlements(user, 'production')
    expect(p.grantedPlans).toContain('wellness')
    expect(p.grantedPlans).toContain('spa365')
    expect(p.effectiveLimits.maxPools).toBe(2)
    expect(p.effectiveLimits.maxSpas).toBe(1)
    expect(p.effectiveLimits.multiPool).toBe(true)
    expect(p.effectiveLimits.spaSupport).toBe(true)
  })

  it('expiration of one provider does NOT lose the other provider rights', async () => {
    await seed('stripe', 'revenuecat', true)
    const p = await loadUserEntitlements(user, 'production')
    expect(p.hasValidAccess).toBe(true)
    expect(p.grantedPlans).toEqual(['oasis'])
    expect(p.grantedPlans).not.toContain('spa365')
    // Oasis rights intact:
    expect(p.effectiveLimits.pdfReport).toBe(true)
    expect(p.effectiveLimits.proMode).toBe(true)
    expect(p.effectiveLimits.weatherEnabled).toBe(true)
    // Spa right expired → gone:
    expect(p.effectiveLimits.spaSupport).toBe(false)
    expect(p.effectiveLimits.maxSpas).toBe(0)
  })
})

describe('R2 — union feature gates', () => {
  it('Oasis + Spa365 union: spa AND pool features all allowed', () => {
    const limits = combineLimits([getPlan('oasis')!, getPlan('spa365')!])
    expect(unionCanAccess(limits, true, 'spa_support').allowed).toBe(true)
    expect(unionCanAccess(limits, true, 'pdf_report').allowed).toBe(true)
    expect(unionCanAccess(limits, true, 'pro_mode').allowed).toBe(true)
    expect(unionCanAccess(limits, true, 'weather_advanced').allowed).toBe(true)
    expect(unionCanAccess(limits, true, 'smart_reminders').allowed).toBe(true)
    expect(unionCanAccess(limits, true, 'multi_pool').allowed).toBe(false)
    expect(unionCanAccess(limits, true, 'history_extended').allowed).toBe(true)
  })

  it('expired union (no valid access) denies paid features', () => {
    const limits = combineLimits([getPlan('oasis')!, getPlan('spa365')!])
    expect(unionCanAccess(limits, false, 'pdf_report').allowed).toBe(false)
    expect(unionCanAccess(limits, false, 'spa_support').allowed).toBe(false)
    expect(unionCanAccess(limits, false, 'weather_advanced').allowed).toBe(false)
  })

  it('photo scan quota uses the union maximum', () => {
    const limits = combineLimits([getPlan('oasis')!, getPlan('spa365')!])
    expect(unionCanAccess(limits, true, 'photo_scan', { photoScansThisMonth: 999999 }).allowed).toBe(false)
    expect(unionCanAccess(limits, true, 'photo_scan', { photoScansThisMonth: 0 }).allowed).toBe(true)
  })

  it('guidesAccess takes the most permissive level', () => {
    const withSpa = combineLimits([getPlan('oasis')!, getPlan('spa365')!])
    // spa365 has 'all', oasis has 'all_plus_video' → all_plus_video.
    expect(withSpa.guidesAccess).toBe('all_plus_video')
    const spaOnly = combineLimits([getPlan('spa365')!])
    expect(spaOnly.guidesAccess).toBe('all')
    expect(unionCanAccess(spaOnly, true, 'guides_premium').allowed).toBe(true)
  })
})

describe('R2 — deterministic entitlement resolution', () => {
  it('same active set → identical display plan in every order', () => {
    const orders = [
      [activeEnt('oasis', 1), activeEnt('wellness', 2), activeEnt('spa365', 3)],
      [activeEnt('spa365', 1), activeEnt('wellness', 2), activeEnt('oasis', 3)],
      [activeEnt('wellness', 1), activeEnt('oasis', 2), activeEnt('spa365', 3)],
    ]
    const results = orders.map((o) => ({
      display: pickDisplayEntitlement(o)?.plan,
      active: plansFromEntitlements(o),
    }))
    const display = results[0].display
    const active = results[0].active
    for (const r of results) {
      expect(r.display).toBe(display)
      expect(r.active).toEqual(active)
    }
    // Wellness (highest price) is the deterministic display plan.
    expect(display).toBe('wellness')
    expect(active).toEqual(['wellness', 'oasis', 'spa365'])
  })

  it('resolveActiveEntitlements drops inactive and is deterministic', () => {
    const set = [
      { ...activeEnt('oasis', 1), isActive: false },
      activeEnt('spa365', 2),
      activeEnt('wellness', 3),
    ]
    const r = resolveActiveEntitlements(set)
    expect(r.map((e) => e.plan)).toEqual(['wellness', 'spa365'])
    expect(resolveActiveEntitlements([...set].reverse()).map((e) => e.plan)).toEqual(['wellness', 'spa365'])
  })
})

describe('R2 — restore / purchase server convergence (bounded)', () => {
  beforeEach(() => {
    sdkCalls.length = 0
    mockPurchases.restorePurchases.mockReset()
    mockPurchases.purchasePackage.mockReset()
    mockPurchases.getOfferings.mockReset()
    vi.unstubAllGlobals()
    process.env.REVENUECAT_CONVERGENCE_ATTEMPTS = '4'
    process.env.REVENUECAT_CONVERGENCE_INTERVAL_MS = '5'
  })

  function subscriptionResponse(active: boolean, userId = 'user-x') {
    return new Response(
      JSON.stringify({
        subscription: active ? { userId, active: true } : null,
        plan: active ? { id: 'oasis' } : { id: 'decouverte' },
      }),
      { status: 200 },
    )
  }

  it('restore with delayed webhook → pending then converges (bounded poll)', async () => {
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/api/billing/identity')) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      if (url.includes('/api/subscription')) {
        calls += 1
        // First call inactive, subsequent active.
        return subscriptionResponse(calls > 1)
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }))
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.restorePurchases.mockResolvedValueOnce({
      entitlements: { all: { oasis: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString(), latestPurchaseDate: new Date().toISOString() } } },
    })
    const result = await manager.restorePurchases()
    expect(result.restored).toBe(true)
    expect(result.serverConverged).toBe(true)
    expect(result.state).toBe('converged')
    expect(calls).toBeGreaterThanOrEqual(2)
  })

  it('restore without server convergence → explicit pending (not active)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/identity')) return new Response(JSON.stringify({ ok: true }), { status: 200 })
      if (url.includes('/api/subscription')) return subscriptionResponse(false)
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }))
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.restorePurchases.mockResolvedValueOnce({
      entitlements: { all: { wellness: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString() } } },
    })
    const result = await manager.restorePurchases()
    expect(result.restored).toBe(true)
    expect(result.serverConverged).toBe(false)
    expect(result.state).toBe('pending')
  })

  it('restore with nothing to restore → state none', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/identity')) return new Response(JSON.stringify({ ok: true }), { status: 200 })
      if (url.includes('/api/subscription')) return subscriptionResponse(false)
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }))
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.restorePurchases.mockResolvedValueOnce({ entitlements: { all: {} } })
    const result = await manager.restorePurchases()
    expect(result.restored).toBe(false)
    expect(result.state).toBe('none')
  })

  it('purchase with delayed convergence → serverConverged true after bounded poll', async () => {
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/identity')) return new Response(JSON.stringify({ ok: true }), { status: 200 })
      if (url.includes('/api/subscription')) {
        calls += 1
        return subscriptionResponse(calls > 1)
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }))
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.getOfferings.mockResolvedValueOnce({
      current: { identifier: 'default', availablePackages: [{ product: { identifier: 'aqwelia_oasis_monthly', price: '6.99', priceString: '6,99 €', currencyCode: 'EUR' } }] },
    })
    mockPurchases.purchasePackage.mockResolvedValueOnce({
      customerInfo: { entitlements: { all: { oasis: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString() } } } },
    })
    const result = await manager.purchase('aqwelia_oasis_monthly')
    expect(result.success).toBe(true)
    expect(result.entitlement?.plan).toBe('oasis')
    expect(result.serverConverged).toBe(true)
  })

  it('awaitServerConvergence is bounded (no infinite loop)', async () => {
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1
      return subscriptionResponse(false)
    }))
    const { converged } = await awaitServerConvergence('user-x', { attempts: 3, intervalMs: 1 })
    expect(converged).toBe(false)
    expect(calls).toBe(3)
  })
})

describe('R2 — canonical offering dedup', () => {
  beforeEach(() => {
    mockPurchases.getOfferings.mockReset()
  })

  function pkg(id: string) {
    return { product: { identifier: id, price: '6.99', priceString: '6,99 €', currencyCode: 'EUR' } }
  }

  it('dedups strictly by product identifier across multiple offerings', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/identity')) return new Response(JSON.stringify({ ok: true }), { status: 200 })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }))
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.getOfferings.mockResolvedValueOnce({
      current: undefined,
      all: {
        a: { identifier: 'a', availablePackages: [pkg('aqwelia_oasis_monthly'), pkg('aqwelia_wellness_yearly')] },
        b: { identifier: 'b', availablePackages: [pkg('aqwelia_oasis_monthly'), pkg('aqwelia_spa365_seasonal')] },
      },
    })
    const products = await manager.getProducts()
    const ids = products.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length) // no duplicates
    expect(ids).toContain('aqwelia_oasis_monthly')
    expect(ids).toContain('aqwelia_wellness_yearly')
    expect(ids).toContain('aqwelia_spa365_seasonal')
    expect(products.filter((p) => p.id === 'aqwelia_oasis_monthly')).toHaveLength(1)
    // Deterministic order.
    const sorted = [...ids].sort((a, b) => a.localeCompare(b))
    expect(ids).toEqual(sorted)
    // Unknown / non-canonical product is dropped.
    expect(ids).not.toContain('not_a_real_product')
  })

  it('prefers the current/canonical offering when present', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/identity')) return new Response(JSON.stringify({ ok: true }), { status: 200 })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }))
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.getOfferings.mockResolvedValueOnce({
      current: { identifier: 'default', availablePackages: [pkg('aqwelia_oasis_monthly'), pkg('aqwelia_wellness_yearly')] },
      all: {
        default: { availablePackages: [pkg('aqwelia_oasis_monthly'), pkg('aqwelia_wellness_yearly')] },
        old: { availablePackages: [pkg('aqwelia_spa365_seasonal')] },
      },
    })
    const products = await manager.getProducts()
    const ids = products.map((p) => p.id)
    // Only the current offering's products are returned.
    expect(ids).toEqual(['aqwelia_oasis_monthly', 'aqwelia_wellness_yearly'])
  })
})
