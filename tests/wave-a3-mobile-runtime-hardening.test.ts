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

  it('deduplicates the native quality workflow to PR-only and hardens the Xcode 26 probe', () => {
    const workflow = read('.github/workflows/mobile-native-quality.yml')
    // 1. The workflow triggers on PR to main only — no duplicate push trigger.
    expect(workflow).toContain('pull_request:')
    expect(workflow).toContain('branches:\n      - main')
    expect(workflow).not.toMatch(/push:\s*\n\s*branches:\s*\n\s*- feat\/wave-a3-mobile-b2c-sandbox-foundation/)
    // 2. The iOS job runs on the deterministic macos-26 runner (Capacitor 8 needs Xcode 26).
    expect(workflow).toContain('runs-on: macos-26')
    // 3. The Xcode probe has a retry limited to 3 attempts and probes xcodebuild -version.
    expect(workflow).toContain('Verify Xcode 26')
    expect(workflow).toContain('for attempt in 1 2 3; do')
    expect(workflow).toContain("if version_output=\"$(xcodebuild -version 2>&1)\"; then")
    expect(workflow).toContain("grep -Eq '^Xcode 26(\\.|$)'")
    expect(workflow).toContain('if [ "${success}" -ne 1 ]; then')
    // 4. The real iOS build targets the project and stays fail-closed (no retry around it).
    expect(workflow).toContain('-project ios/App/App.xcodeproj')
    expect(workflow).not.toContain('-workspace ios/App/App.xcworkspace')
    expect(workflow).not.toContain('runs-on: macos-14')
    // The final build command is NOT wrapped in a retry loop — its exit code is exposed.
    const build = workflow.slice(workflow.indexOf('- name: Build iOS app for simulator'))
    expect(build).toContain('build | tee /tmp/ios-build.log | tail -40')
    expect(build).not.toContain('for attempt in 1 2 3')
    expect(build).toContain('set -euo pipefail')
  })

  it('attaches the fr/en localized resources to the Xcode App group (path = App)', () => {
    const pbxproj = read('ios/App/App.xcodeproj/project.pbxproj')
    // Extract the exact App group block.
    const groupStart = pbxproj.indexOf('504EC3061FED79650016851F /* App */ = {')
    expect(groupStart).toBeGreaterThan(-1)
    const groupBlock = pbxproj.slice(groupStart, pbxproj.indexOf('/* End PBXGroup section */'))
    // 1. The two references are children of the App group.
    expect(groupBlock).toContain('A3AA00030000000000000001 /* fr.lproj */,')
    expect(groupBlock).toContain('A3AA00040000000000000001 /* en.lproj */,')
    // 2. The group resolves paths from ios/App/App/.
    expect(groupBlock).toContain('path = App;')
    expect(groupBlock).toContain('sourceTree = "<group>";')
    // 3. The declarations keep their relative paths.
    expect(pbxproj).toMatch(/A3AA00030000000000000001 \/\* fr\.lproj \*\/ = \{[\s\S]*?path = fr\.lproj;[\s\S]*?sourceTree = "<group>";/)
    expect(pbxproj).toMatch(/A3AA00040000000000000001 \/\* en\.lproj \*\/ = \{[\s\S]*?path = en\.lproj;[\s\S]*?sourceTree = "<group>";/)
    // 4. knownRegions contains en, fr, Base.
    const regions = pbxproj.slice(pbxproj.indexOf('knownRegions = ('), pbxproj.indexOf(');', pbxproj.indexOf('knownRegions = (')))
    expect(regions).toContain('en,')
    expect(regions).toContain('fr,')
    expect(regions).toContain('Base,')
    // 5. The physical localized strings files exist.
    expect(join(root, 'ios/App/App/fr.lproj/InfoPlist.strings')).toSatisfy((p: string) => {
      try { readFileSync(p); return true } catch { return false }
    })
    expect(join(root, 'ios/App/App/en.lproj/InfoPlist.strings')).toSatisfy((p: string) => {
      try { readFileSync(p); return true } catch { return false }
    })
  })
})
