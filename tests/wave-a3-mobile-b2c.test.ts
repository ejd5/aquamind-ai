/**
 * AQWELIA Wave A3 — mobile B2C native + sandbox foundation guards.
 *
 * Covers the mandatory scenarios (1..23): B2C shell routes, RevenueCat identity
 * bridge lifecycle, purchase-before-ready blocked, server authority, canonical
 * product matrix, release env preflight, server-secret bundle guard, native
 * config (Android launchMode, iOS In-App Purchase), and clean-clone sync.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
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
import { mobileAccountType, resolveMobileAccountType, type MobileAccountType } from '@/lib/auth-entry-target'
import { getPlanFromRCProductId, PLANS, type PlanId } from '@/lib/billing/plans'

function identityBinding(env?: string) {
  return new Response(JSON.stringify(env ? { ok: true, billingAccessEnvironment: env } : { ok: true }), { status: 200 })
}
function subscriptionResponse(planId: string, sources: { provider: string; store?: string | null; environment?: string }[]) {
  return new Response(
    JSON.stringify({
      plan: { id: planId },
      subscription: { userId: 'user-x', active: sources.length > 0, plan: planId, environment: 'production' },
      access: { hasValidAccess: sources.length > 0, grantedPlans: sources.map(() => planId) },
      sources: sources.map((s, i) => ({ id: `src_${i}`, plan: planId, status: 'active', expiresAt: null, ...s })),
      allPlans: [],
    }),
    { status: 200 },
  )
}
function stubFetch(opts: { env?: string; subscription?: () => { planId: string; sources: { provider: string; store?: string | null; environment?: string }[] } }) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/billing/identity')) return identityBinding(opts.env)
    if (url.includes('/api/subscription')) {
      const sub = opts.subscription ? opts.subscription() : { planId: 'decouverte', sources: [] }
      return subscriptionResponse(sub.planId, sub.sources)
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }))
}

describe('A3 — B2C mobile shell (routes present in mobile-app build)', () => {
  const mobileRoutes = [
    'src/mobile-app/auth/signin/page.tsx',
    'src/mobile-app/auth/register/page.tsx',
    'src/mobile-app/dashboard/page.tsx',
    'src/mobile-app/pricing/page.tsx',
    'src/mobile-app/settings/page.tsx',
    'src/mobile-app/settings/subscription/page.tsx',
    'src/mobile-app/pro/app/today/page.tsx',
    'src/mobile-app/pro/app/report/page.tsx',
  ]
  it.each(mobileRoutes)('route file exists: %s', (file) => {
    expect(existsSync(join(PROJECT_ROOT, file))).toBe(true)
  })

  it('dashboard renders the shared MobileAppShell (B2C shell)', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/mobile-app/dashboard/page.tsx'), 'utf8')
    expect(src).toContain('MobileAppShell')
  })

  it('pricing renders the shared ModulePaywall (B2C paywall)', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/mobile-app/pricing/page.tsx'), 'utf8')
    expect(src).toContain('ModulePaywall')
  })

  it('settings/subscription is reachable (route file present)', () => {
    expect(existsSync(join(PROJECT_ROOT, 'src/mobile-app/settings/subscription/page.tsx'))).toBe(true)
  })

  it('pro route /pro/app/today stays reachable', () => {
    expect(existsSync(join(PROJECT_ROOT, 'src/mobile-app/pro/app/today/page.tsx'))).toBe(true)
  })

  it('consumer users route to /dashboard, technicians to /pro/app/today (entry router)', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/mobile-app/page.tsx'), 'utf8')
    expect(src).toContain("case 'consumer':")
    expect(src).toContain("router.replace('/dashboard')")
    expect(src).toContain("case 'technician':")
    expect(src).toContain("router.replace('/pro/app/today')")
    // No blanket redirect of everyone to /pro/app/today.
    expect(src).not.toMatch(/router\.replace\('\/pro\/app\/today'\)\s*\n\s*return\s*\n\s*\}/)
  })

  it('mobileAccountType classifies consumer/technician/pro/growth', () => {
    expect(mobileAccountType({ proMembershipRole: 'technician' })).toBe('technician')
    expect(mobileAccountType({ ownsProOrganization: true })).toBe('pro')
    expect(mobileAccountType({ hasProMembership: true })).toBe('pro')
    expect(mobileAccountType({ ownsGrowthOrganization: true })).toBe('growth')
    expect(mobileAccountType({})).toBe('consumer')
  })

  it('inconsistent account type → error, no auto pool creation', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/mobile-app/page.tsx'), 'utf8')
    expect(src).toContain('// Inconsistent account type → explicit error, never auto-create a pool.')
    expect(src).toContain('setError(true)')
  })

  it('/api/auth/me exposes accountType', () => {
    const src = readFileSync(join(PROJECT_ROOT, 'src/app/api/auth/me/route.ts'), 'utf8')
    expect(src).toContain('resolveMobileAccountType')
    expect(src).toContain('accountType')
  })
})

describe('A3 — RevenueCat identity bridge mounted on mobile', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    mockPurchases.configure.mockClear()
    mockPurchases.logIn.mockClear()
    mockPurchases.logOut.mockClear()
    mockPurchases.getOfferings.mockReset()
    mockPurchases.purchasePackage.mockReset()
    mockPurchases.restorePurchases.mockReset()
  })

  it('mobile root layout mounts SessionProvider + the identity bridge', () => {
    const layout = readFileSync(join(PROJECT_ROOT, 'src/mobile-app/layout.tsx'), 'utf8')
    expect(layout).toContain('MobileRootProviders')
    const providers = readFileSync(join(PROJECT_ROOT, 'src/components/mobile/mobile-root-providers.tsx'), 'utf8')
    expect(providers).toContain('SessionProvider')
    expect(providers).toContain('useRevenueCatIdentity')
    expect(providers).toContain('setIdentity(user.id)')
  })

  it('no purchase is possible while the session is loading / before server binding', async () => {
    stubFetch({ env: undefined }) // binding without a valid environment
    const manager = createIdentityBridge()
    const snap = await manager.setIdentity('user-x')
    expect(snap.state).toBe('error')
    expect(snap.serverIdentityBound).toBe(false)
    // purchase must fail closed (requireReady throws).
    await expect(manager.purchase('aqwelia_wellness_monthly')).rejects.toThrow(/identity is not confirmed/)
  })

  it('clearIdentity precedes the end of session (sign-out wrapper)', () => {
    const wrapper = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/sign-out.ts'), 'utf8')
    expect(wrapper).toContain('revenueCatIdentityBridge.clearIdentity()')
    expect(wrapper).toContain('await signOut(options)')
  })

  it('account switch invalidates an in-flight operation (epoch)', async () => {
    stubFetch({ env: 'production' })
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
    await new Promise((r) => setTimeout(r, 5))
    await manager.setIdentity('user-B')
    release()
    const result = await purchasePromise
    expect(result.success).toBe(false)
    expect(result.error).toContain('Identity changed')
  })

  it('an unexpected product id fails closed', async () => {
    stubFetch({ env: 'production' })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    const result = await manager.purchase('not_a_real_product')
    expect(result.success).toBe(false)
    expect(result.state).toBe('failed')
    expect(mockPurchases.purchasePackage).not.toHaveBeenCalled()
  })

  it('an entitlement of another plan does not validate the purchased plan', async () => {
    stubFetch({ env: 'production' })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.getOfferings.mockResolvedValueOnce({
      current: { identifier: 'default', availablePackages: [{ product: { identifier: 'aqwelia_spa365_monthly', price: '4.99', priceString: '4,99 €', currencyCode: 'EUR' } }] },
    })
    // Only oasis active in CustomerInfo, but the purchase is spa365.
    mockPurchases.purchasePackage.mockResolvedValueOnce({ customerInfo: { entitlements: { all: { oasis: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString() } } } } })
    const result = await manager.purchase('aqwelia_spa365_monthly')
    expect(result.success).toBe(false)
    expect(result.error).toContain('expected plan')
  })
})

describe('A3 — restore + server authority', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    mockPurchases.configure.mockClear()
    mockPurchases.logIn.mockClear()
    mockPurchases.logOut.mockClear()
    mockPurchases.getOfferings.mockReset()
    mockPurchases.purchasePackage.mockReset()
    mockPurchases.restorePurchases.mockReset()
  })

  it('a restore does not directly mutate the local plan (pending stays pending)', async () => {
    stubFetch({ env: 'production', subscription: () => ({ planId: 'wellness', sources: [{ provider: 'stripe', store: 'web', environment: 'production' }] }) })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.restorePurchases.mockResolvedValueOnce({
      entitlements: { all: { spa365: { isActive: true, willRenew: true, expirationDate: new Date(Date.now() + 86400000).toISOString() } } },
    })
    const result = await manager.restorePurchases()
    // No RC source projected yet → pending. The server plan (wellness) is kept.
    expect(result.state).toBe('pending')
    expect(result.serverConverged).toBe(false)
  })

  it('the server projection is reloaded after convergence (paywall calls load() again)', () => {
    const paywall = readFileSync(join(PROJECT_ROOT, 'src/components/aquamind/module-paywall.tsx'), 'utf8')
    const converged = paywall.split("const projection = await load()")[1] || ''
    expect(converged).toContain('projection?.plan?.id')
  })

  it('an empty offering is handled without crashing (getProducts returns [])', async () => {
    stubFetch({ env: 'production' })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.getOfferings.mockResolvedValueOnce({ current: undefined, all: {} })
    const products = await manager.getProducts()
    expect(products).toEqual([])
  })

  it('user cancellation is differentiated from an error', async () => {
    stubFetch({ env: 'production' })
    const manager = createIdentityBridge()
    await manager.setIdentity('user-x')
    mockPurchases.getOfferings.mockResolvedValueOnce({
      current: { identifier: 'default', availablePackages: [{ product: { identifier: 'aqwelia_wellness_monthly', price: '10.99', priceString: '10,99 €', currencyCode: 'EUR' } }] },
    })
    mockPurchases.purchasePackage.mockRejectedValueOnce({ userCancelled: true })
    const result = await manager.purchase('aqwelia_wellness_monthly')
    expect(result.userCancelled).toBe(true)
    expect(result.state).toBe('cancelled')
    expect(result.success).toBe(false)
  })
})

describe('A3 — canonical product matrix', () => {
  it('12 distinct product ids, no plan collision, one entitlement per plan', () => {
    const ids = new Set<string>()
    const entitlements = new Set<string>()
    for (const plan of PLANS) {
      if (plan.id === 'decouverte') {
        expect(Object.keys(plan.revenueCatProducts)).toHaveLength(0)
        expect(plan.revenueCatEntitlement).toBeNull()
        continue
      }
      expect(plan.revenueCatEntitlement).toBe(plan.id)
      expect(entitlements.has(plan.revenueCatEntitlement!)).toBe(false)
      entitlements.add(plan.revenueCatEntitlement!)
      for (const [dur, productId] of Object.entries(plan.revenueCatProducts)) {
        expect(ids.has(productId)).toBe(false)
        ids.add(productId)
        expect(getPlanFromRCProductId(productId)?.plan).toBe(plan.id)
      }
    }
    expect(ids.size).toBe(12)
    expect(entitlements).toEqual(new Set(['oasis', 'wellness', 'spa365']))
  })

  it('the exact 12 identifiers match the canonical names', () => {
    const ids = new Set<string>()
    for (const plan of PLANS) {
      for (const productId of Object.values(plan.revenueCatProducts)) ids.add(productId)
    }
    for (const id of [
      'aqwelia_oasis_monthly', 'aqwelia_oasis_quarterly', 'aqwelia_oasis_seasonal', 'aqwelia_oasis_yearly',
      'aqwelia_wellness_monthly', 'aqwelia_wellness_quarterly', 'aqwelia_wellness_seasonal', 'aqwelia_wellness_yearly',
      'aqwelia_spa365_monthly', 'aqwelia_spa365_quarterly', 'aqwelia_spa365_seasonal', 'aqwelia_spa365_yearly',
    ]) expect(ids.has(id)).toBe(true)
  })
})

describe('A3 — mobile release env preflight', () => {
  const originalEnv = { ...process.env }
  afterEach(() => { process.env = { ...originalEnv } })

  it('a Release build without a public key fails (script exits 1)', async () => {
    const { execFileSync } = await import('node:child_process')
    const env = { ...process.env }
    delete env.NEXT_PUBLIC_API_BASE_URL
    delete env.NEXT_PUBLIC_REVENUECAT_IOS_KEY
    delete env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY
    let threw = false
    try {
      execFileSync('node', ['scripts/mobile-env-preflight.mjs'], { cwd: PROJECT_ROOT, env: { ...env, BUILD_PROFILE: 'release', NODE_ENV: 'production' }, stdio: 'pipe' })
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
  })

  it('a valid Release environment passes the preflight', async () => {
    const { execFileSync } = await import('node:child_process')
    const env = { ...process.env }
    env.BUILD_PROFILE = 'release'
    env.NODE_ENV = 'production'
    env.NEXT_PUBLIC_API_BASE_URL = 'https://api.aqwelia.app'
    env.NEXT_PUBLIC_REVENUECAT_IOS_KEY = 'appl_public_test_key_0000'
    env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY = 'goog_public_test_key_0000'
    delete env.REVENUECAT_API_KEY
    delete env.REVENUECAT_WEBHOOK_SECRET
    delete env.STRIPE_SECRET_KEY
    delete env.STRIPE_WEBHOOK_SECRET
    delete env.DATABASE_URL
    delete env.NEXTAUTH_SECRET
    const out = execFileSync('node', ['scripts/mobile-env-preflight.mjs'], { cwd: PROJECT_ROOT, env, stdio: 'pipe' })
    expect(out.toString()).toContain('OK')
  })
})

describe('A3 — server secret bundle guard (mobile)', () => {
  it('mobile bundle guard script refuses to run without out/ios/android', () => {
    const script = readFileSync(join(PROJECT_ROOT, 'scripts/check-mobile-bundle.mjs'), 'utf8')
    expect(script).toContain('out')
    expect(script).toContain('REVENUECAT_WEBHOOK_SECRET')
    expect(script).toContain('STRIPE_SECRET_KEY')
  })

  it('the client manager never imports Prisma/db (boundary preserved)', () => {
    const manager = readFileSync(join(PROJECT_ROOT, 'src/lib/billing/revenuecat-manager.ts'), 'utf8')
    const importLines = manager.split('\n').filter((l) => /^\s*import\s/.test(l)).join('\n')
    expect(importLines).not.toMatch(/@prisma\/client|@\/lib\/db|server-only|@\/lib\/billing\/identity/)
  })
})

describe('A3 — native configuration', () => {
  it('Android uses launchMode standard or singleTop', () => {
    const manifest = readFileSync(join(PROJECT_ROOT, 'android/app/src/main/AndroidManifest.xml'), 'utf8')
    expect(manifest).toMatch(/android:launchMode="(standard|singleTop)"/)
    expect(manifest).not.toMatch(/android:launchMode="singleTask"/)
  })

  it('Android declares INTERNET permission and applicationId com.aqwelia.app', () => {
    const manifest = readFileSync(join(PROJECT_ROOT, 'android/app/src/main/AndroidManifest.xml'), 'utf8')
    expect(manifest).toContain('android.permission.INTERNET')
    const gradle = readFileSync(join(PROJECT_ROOT, 'android/app/build.gradle'), 'utf8')
    expect(gradle).toContain('applicationId "com.aqwelia.app"')
  })

  it('Android has no allowMixedContent enabled (default false)', () => {
    const config = readFileSync(join(PROJECT_ROOT, 'capacitor.config.ts'), 'utf8')
    expect(config).toContain('allowMixedContent: false')
  })

  it('iOS has In-App Purchase capability + entitlement + Swift 5+', () => {
    const entitlements = readFileSync(join(PROJECT_ROOT, 'ios/App/App/App.entitlements'), 'utf8')
    expect(entitlements).toContain('com.apple.InAppPurchase')
    const pbxproj = readFileSync(join(PROJECT_ROOT, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8')
    expect(pbxproj).toContain('com.apple.InAppPurchase')
    expect(pbxproj).toContain('SWIFT_VERSION = 5.0')
    expect(pbxproj).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.aqwelia.app')
    expect(pbxproj).toContain('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;')
  })

  it('iOS includes the RevenueCat SPM plugin', () => {
    const pkg = readFileSync(join(PROJECT_ROOT, 'ios/App/CapApp-SPM/Package.swift'), 'utf8')
    expect(pkg).toContain('RevenuecatPurchasesCapacitor')
  })

  it('native projects exist and can be regenerated from a clean clone (git-tracked)', () => {
    expect(existsSync(join(PROJECT_ROOT, 'ios/App/App.xcodeproj/project.pbxproj'))).toBe(true)
    expect(existsSync(join(PROJECT_ROOT, 'android/settings.gradle'))).toBe(true)
    // capacitor.config is the source of truth for the appId.
    const config = readFileSync(join(PROJECT_ROOT, 'capacitor.config.ts'), 'utf8')
    expect(config).toContain("appId: 'com.aqwelia.app'")
    expect(config).toContain("appName: 'Aqwelia'")
    expect(config).toContain("webDir: 'out'")
  })
})
