import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('AQWELIA Wave A4 mobile auth and cookie hardening', () => {
  it('declares Staging, Launch R1 and Production backend hosts as iOS App-Bound Domains', () => {
    const plist = read('ios/App/App/Info.plist')

    expect(plist).toContain('<key>WKAppBoundDomains</key>')
    expect(plist).toContain('<string>aqwelia-staging.vercel.app</string>')
    expect(plist).toContain('<string>aqwelia-staging-git-release-aqwelia-launch-ejd5s-projects.vercel.app</string>')
    expect(plist).toContain('<string>aqwelia-production.vercel.app</string>')
    expect(plist).not.toContain('aqwelia-staging-git-fix-wave-a4-mobile-au-2b2425-ejd5s-projects.vercel.app')
  })

  it('keeps native credential sign-in and the shared API client cookie-authenticated', () => {
    const signin = read('src/mobile-app/auth/signin/page.tsx')
    const apiClient = read('src/lib/api-client.ts')

    expect(signin).toContain("credentials: 'include'")
    expect(apiClient).toContain("credentials: 'include'")
  })

  it('adds cookies by default when a local API request is bridged to the HTTPS backend', () => {
    const bridge = read('src/lib/mobile-api-fetch.ts')

    expect(bridge).toContain('const wasRewritten = resolved !== input')
    expect(bridge).toContain("credentials: 'include' as const")
    expect(bridge).toContain('init?.credentials === undefined')
    expect(bridge).toContain("new Request(apiUrl(path), input)")
  })

  it('routes static mobile registration to a hosted credentials-only Turnstile flow', () => {
    const register = read('src/mobile-app/auth/register/page.tsx')
    const hosted = read('src/app/auth/mobile-register/page.tsx')

    expect(register).toContain("import { Browser } from '@capacitor/browser'")
    expect(register).toContain("const MOBILE_HOSTED_REGISTER_PATH = '/auth/mobile-register'")
    expect(register).toContain('apiUrl(MOBILE_HOSTED_REGISTER_PATH)')
    expect(register).toContain("/^https:\\/\\//i.test(url)")
    expect(register).not.toContain("fetch('/api/auth/register'")
    expect(register).not.toContain("signIn('credentials'")

    expect(hosted).toContain('TurnstileWidget')
    expect(hosted).toContain("fetch('/api/auth/register'")
    expect(hosted).toContain("window.location.assign(COMPLETE_PATH)")
    expect(hosted).toContain("const COMPLETE_PATH = '/auth/mobile-complete'")
    expect(hosted).not.toContain('signIn(')
    expect(hosted).not.toContain('handleOAuth')
    expect(hosted).not.toContain('signInWithGoogle')
    expect(hosted).not.toContain('signInWithApple')
  })

  it('returns secure hosted registration to the installed native app without transporting credentials', () => {
    const completion = read('src/app/auth/mobile-complete/page.tsx')
    const deepLink = read('src/components/mobile/mobile-deep-link-bridge.tsx')
    const providers = read('src/components/mobile/mobile-root-providers.tsx')
    const signin = read('src/mobile-app/auth/signin/page.tsx')
    const androidManifest = read('android/app/src/main/AndroidManifest.xml')
    const iosPlist = read('ios/App/App/Info.plist')

    expect(completion).toContain("const AQWELIA_APP_RETURN_URL = 'aqwelia://auth/complete'")
    expect(deepLink).toContain("App.addListener('appUrlOpen'")
    expect(deepLink).toContain('App.getLaunchUrl()')
    expect(deepLink).toContain('Browser.close()')
    expect(deepLink).toContain("window.location.assign('/auth/signin?registered=1')")
    expect(deepLink).not.toContain('token=')
    expect(deepLink).not.toContain('password=')
    expect(providers).toContain('<MobileDeepLinkBridge />')
    expect(signin).toContain("params.get('registered') === '1'")
    expect(signin).toContain("t('registered')")

    expect(androidManifest).toContain('android:scheme="aqwelia"')
    expect(androidManifest).toContain('android:host="auth"')
    expect(androidManifest).toContain('android:pathPrefix="/complete"')
    expect(iosPlist).toContain('<key>CFBundleURLTypes</key>')
    expect(iosPlist).toContain('<string>aqwelia</string>')
  })

  it('uses RevenueCat offering prices and ids as the only native paywall authority', () => {
    const paywall = read('src/components/aquamind/module-paywall.tsx')

    expect(paywall).toContain('const products = await billing.getProducts()')
    expect(paywall).toContain("return storeProductFor(plan.id)?.priceString || '—'")
    expect(paywall).toContain('const result = await billing.purchase(storeProduct.id)')
    expect(paywall).toContain("!native && duration !== 'month'")
    expect(paywall).toContain('const storeUnavailable = native && !storeProduct?.priceString')
    expect(paywall).not.toContain('const productId = `aqwelia_${planId}_${DURATION_TO_PROVIDER[duration]}`')
  })

  it('keeps the canonical subscription projection network-only and never falls back to stale cache', () => {
    const cache = read('src/lib/offline/api-cache.ts')

    expect(cache).toContain('export async function apiGetFresh<T>')
    expect(cache).toContain("subscription: () => apiGetFresh('/api/subscription?v2')")
    expect(cache).not.toContain("subscription: () => apiGetCached('/api/subscription?v2'")
    expect(cache).not.toContain('subscription: 60 * 60 * 1000')
  })

  it('ships a sandbox-only diagnostic surface without exposing secret key values', () => {
    const subscription = read('src/mobile-app/settings/subscription/page.tsx')
    const diagnosticsPath = 'src/mobile-app/settings/subscription/diagnostics/page.tsx'
    const diagnostics = read(diagnosticsPath)

    expect(existsSync(join(root, diagnosticsPath))).toBe(true)
    expect(subscription).toContain("process.env.NEXT_PUBLIC_MOBILE_SANDBOX_DIAGNOSTICS === 'true'")
    expect(subscription).toContain('href="/settings/subscription/diagnostics"')
    expect(diagnostics).toContain('revenueCatIdentityBridge.snapshot()')
    expect(diagnostics).toContain("api.get('/api/auth/me')")
    expect(diagnostics).toContain("api.get<SubscriptionApiResponse>('/api/subscription')")
    expect(diagnostics).toContain('products = await billing.getProducts()')
    expect(diagnostics).toContain('entitlements = await billing.getEntitlements()')
    expect(diagnostics).not.toContain('NEXT_PUBLIC_REVENUECAT_IOS_KEY')
    expect(diagnostics).not.toContain('NEXT_PUBLIC_REVENUECAT_ANDROID_KEY')
  })

  it('provides a safe preview-only server readiness probe using the canonical billing runtime context', () => {
    const readiness = read('src/app/api/mobile/sandbox-readiness/route.ts')
    const identity = read('src/lib/billing/identity.ts')

    expect(readiness).toContain("import { resolveBillingRuntimeContext } from '@/lib/billing/identity'")
    expect(readiness).toContain('const runtimeContext = resolveBillingRuntimeContext()')
    expect(readiness).toContain("vercelEnvironment === 'production'")
    expect(readiness).toContain("runtimeContext.deploymentEnvironment === 'production'")
    expect(readiness).toContain("runtimeContext.deploymentEnvironment === 'staging'")
    expect(readiness).toContain("runtimeContext.billingAccessEnvironment === 'sandbox'")
    expect(readiness).toContain('runtimeContext.sandboxAllowed')

    expect(identity).toContain("const STAGING_PROJECT_HOST = 'aqwelia-staging.vercel.app'")
    expect(identity).toContain("if (vercelEnv === 'production')")
    expect(identity).toContain('isVerifiedStagingPreview')
    expect(identity).toContain("billingAccessEnvironment: BillingEnvironment")
  })

  it('automatically gates the Launch R1 Staging sandbox APK while keeping standard PR builds separate', () => {
    const workflow = read('.github/workflows/mobile-native-quality.yml')

    expect(workflow).toContain("if: github.event_name == 'pull_request'")
    expect(workflow).toContain('name: Android Staging sandbox APK')
    expect(workflow).toContain("github.head_ref == 'release/aqwelia-launch'")
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'")
    expect(workflow).toContain('environment: staging')
    expect(workflow).toContain('NEXT_PUBLIC_MOBILE_SANDBOX_DIAGNOSTICS: "true"')
    expect(workflow).toContain('aqwelia-staging-git-release-aqwelia-launch-ejd5s-projects.vercel.app')
    expect(workflow).not.toContain('aqwelia-staging-git-fix-wave-a4-mobile-au-2b2425-ejd5s-projects.vercel.app')
    expect(workflow).toContain('/api/mobile/sandbox-readiness')
    expect(workflow).toContain('Refusing to build sandbox APK against Production')
    expect(workflow).toContain('Refusing fixture RevenueCat keys for sandbox APK')
    expect(workflow).toContain('aqwelia-staging-sandbox.apk')
    expect(workflow).toContain('manifest.json')
  })
})
