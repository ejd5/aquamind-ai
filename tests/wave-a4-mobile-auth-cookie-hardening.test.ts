import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('AQWELIA Wave A4 mobile auth and cookie hardening', () => {
  it('declares the stable Staging and Production backend hosts as iOS App-Bound Domains', () => {
    const plist = read('ios/App/App/Info.plist')

    expect(plist).toContain('<key>WKAppBoundDomains</key>')
    expect(plist).toContain('<string>aqwelia-staging.vercel.app</string>')
    expect(plist).toContain('<string>aqwelia-production.vercel.app</string>')
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

  it('does not bypass Turnstile from the static mobile registration bundle', () => {
    const register = read('src/mobile-app/auth/register/page.tsx')

    expect(register).toContain("import { Browser } from '@capacitor/browser'")
    expect(register).toContain("const MOBILE_AUTH_CALLBACK_PATH = '/auth/mobile-complete'")
    expect(register).toContain('callbackUrl=${callbackUrl}')
    expect(register).toContain("/^https:\\/\\//i.test(url)")
    expect(register).not.toContain("fetch('/api/auth/register'")
    expect(register).not.toContain("signIn('credentials'")
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
})
