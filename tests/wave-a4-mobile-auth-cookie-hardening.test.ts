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

  it('keeps native credential sign-in explicitly cookie-authenticated', () => {
    const signin = read('src/mobile-app/auth/signin/page.tsx')
    const apiClient = read('src/lib/api-client.ts')

    expect(signin).toContain("credentials: 'include'")
    expect(apiClient).toContain("credentials: 'include'")
  })

  it('does not bypass Turnstile from the static mobile registration bundle', () => {
    const register = read('src/mobile-app/auth/register/page.tsx')

    expect(register).toContain("import { Browser } from '@capacitor/browser'")
    expect(register).toContain("apiUrl('/auth/signin?mode=signup')")
    expect(register).toContain("/^https:\\/\\//i.test(url)")
    expect(register).not.toContain("fetch('/api/auth/register'")
    expect(register).not.toContain("signIn('credentials'")
  })
})
