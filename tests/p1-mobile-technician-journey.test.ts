import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { workspaceEntryTarget } from '@/lib/auth-entry-target'
import { normalizeOfflineTarget } from '@/lib/offline/idempotency'

const todayPage = readFileSync(
  join(process.cwd(), 'src/app/pro/app/today/page.tsx'),
  'utf8',
)
const appLayout = readFileSync(
  join(process.cwd(), 'src/app/pro/app/layout.tsx'),
  'utf8',
)
const mobileShell = readFileSync(
  join(process.cwd(), 'src/components/pro/pro-mobile-shell.tsx'),
  'utf8',
)

describe('P1 Mobile technician journey', () => {
  it('lands technicians on the daily field workspace', () => {
    expect(
      workspaceEntryTarget({
        ownsProOrganization: false,
        proMembershipRole: 'technician',
        ownsGrowthOrganization: false,
        hasGrowthMembership: false,
      }),
    ).toBe('/pro/app/today')
  })

  it('uses the mobile API abstraction and a locally cached daily route', () => {
    expect(todayPage).toContain("import { api } from '@/lib/api-client'")
    expect(todayPage).toContain('NEXT_PUBLIC_API_BASE_URL').toBe(false)
    expect(todayPage).toContain('TODAY_CACHE_KEY')
    expect(todayPage).toContain('window.localStorage')
    expect(todayPage).toContain("Network.addListener('networkStatusChange'")
  })

  it('queues field status changes through the idempotent offline ledger', () => {
    expect(todayPage).toContain("queueAction({ method: 'PATCH', path, body })")
    expect(todayPage).toContain('flushPending().then(load)')
    expect(
      normalizeOfflineTarget(
        'https://aqwelia.test',
        '/api/pro/interventions/intervention-42',
        'PATCH',
      ).method,
    ).toBe('PATCH')
  })

  it('keeps manager and technician navigation separate', () => {
    expect(appLayout).toContain("access.role === 'technician'")
    expect(appLayout).toContain("href: '/pro/app/today'")
    expect(appLayout).toContain('role={access.role}')
    expect(mobileShell).toContain('TECHNICIAN_PRIMARY_ITEMS')
    expect(mobileShell).toContain('MANAGER_PRIMARY_ITEMS')
    expect(mobileShell).toContain("role === 'technician'")
  })
})
