import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('PR109 admin marketing runtime — security contract', () => {
  it('the public route accepts only an allowlisted display zone from the client', () => {
    const source = read('src/app/api/content/runtime/route.ts')
    expect(source).toContain("searchParams.get('zone')")
    expect(source).not.toContain("searchParams.get('country')")
    expect(source).not.toContain("searchParams.get('plan')")
    expect(source).not.toContain("searchParams.get('userSegment')")
    expect(source).toContain('countryVerifiedAt')
    expect(source).toContain('loadUserEntitlements')
    expect(source).toContain('getBillingAccessEnvironment')
  })

  it('the selector is read-only and only queries published/scheduled rows', () => {
    const source = read('src/lib/admin-runtime/content.ts')
    expect(source).toContain("status: { in: ['PUBLISHED', 'SCHEDULED'] }")
    expect(source).toContain('approvedById')
    expect(source).toContain('approvedAt')
    expect(source).not.toMatch(/\.create\s*\(/)
    expect(source).not.toMatch(/\.update\s*\(/)
    expect(source).not.toMatch(/\.delete\s*\(/)
    expect(source).not.toContain('adminAuditLog')
  })

  it('the client renders admin strings as text, never injected HTML', () => {
    const source = read('src/components/admin-runtime/marketing-runtime.tsx')
    expect(source).not.toContain('dangerouslySetInnerHTML')
    expect(source).toContain('{banner.text}')
    expect(source).toContain('{popup.title}')
    expect(source).toContain('{popup.body}')
    expect(source).toContain('noopener noreferrer')
  })

  it('runtime is mounted on LANDING/public pages and APP views', () => {
    const home = read('src/app/page.tsx')
    const publicLayout = read('src/app/(public)/layout.tsx')
    expect(home).toContain('<MarketingRuntime zone="LANDING" />')
    expect(home).toContain('<MarketingRuntime zone="APP" />')
    expect(publicLayout).toContain('<MarketingRuntime zone="LANDING" />')
  })
})
