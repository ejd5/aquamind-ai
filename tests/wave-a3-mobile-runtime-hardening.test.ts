import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('AQWELIA Wave A3 — mobile runtime hardening', () => {
  it('installs the API fetch bridge before SessionProvider renders', () => {
    const providers = read('src/components/mobile/mobile-root-providers.tsx')
    const installIndex = providers.indexOf('installMobileApiFetchBridge()')
    const providerIndex = providers.indexOf('<SessionProvider>')

    expect(installIndex).toBeGreaterThan(-1)
    expect(providerIndex).toBeGreaterThan(installIndex)
  })

  it('rewrites local /api requests through the configured API base', () => {
    const bridge = read('src/lib/mobile-api-fetch.ts')

    expect(bridge).toContain("value.startsWith('/api/')")
    expect(bridge).toContain("url.protocol === 'capacitor:'")
    expect(bridge).toContain('apiUrl(path)')
    expect(bridge).toContain('__aqweliaMobileApiBridge')
  })

  it('uses the freshly reloaded server plan after restore convergence', () => {
    const subscription = read('src/mobile-app/settings/subscription/page.tsx')

    expect(subscription).toContain('const serverPlan = await load()')
    expect(subscription).toContain("plan: serverPlan ?? 'decouverte'")
    expect(subscription).not.toContain("plan: plan ?? 'oasis'")
  })

  it('keeps native sign-out inside the bundled Capacitor application', () => {
    const signOut = read('src/lib/billing/sign-out.ts')

    expect(signOut).toContain("await signOut({ ...(options ?? {}), redirect: false })")
    expect(signOut).toContain('window.location.assign(callbackUrl)')
  })

  it('runs the release preflight without job-level server secrets', () => {
    const workflow = read('.github/workflows/mobile-native-quality.yml')
    const preflight = workflow.split('- name: Mobile environment preflight')[1]?.split('- name: Build mobile')[0] ?? ''

    for (const name of [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'REVENUECAT_WEBHOOK_SECRET',
    ]) {
      expect(preflight).toContain(`${name}: ""`)
    }
  })

  it('keeps In-App Purchase as an Xcode capability, not a signing entitlement', () => {
    const project = read('ios/App/App.xcodeproj/project.pbxproj')
    const entitlements = read('ios/App/App/App.entitlements')

    expect(project).toContain('com.apple.InAppPurchase = {')
    expect(project).toContain('enabled = 1;')
    expect(entitlements).not.toContain('<key>com.apple.InAppPurchase</key>')
  })
})
