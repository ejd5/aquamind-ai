import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { workspaceEntryTarget } from '@/lib/auth-entry-target'
import { normalizeOfflineTarget } from '@/lib/offline/idempotency'

const todayWorkspace = readFileSync(
  join(process.cwd(), 'src/components/pro/technician-today-workspace.tsx'),
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
const mobileAppLayout = readFileSync(
  join(process.cwd(), 'src/mobile-app/layout.tsx'),
  'utf8',
)
const mobileAppEntry = readFileSync(
  join(process.cwd(), 'src/mobile-app/page.tsx'),
  'utf8',
)
const mobileSignin = readFileSync(
  join(process.cwd(), 'src/mobile-app/auth/signin/page.tsx'),
  'utf8',
)
const mobileReport = readFileSync(
  join(process.cwd(), 'src/mobile-app/pro/app/report/page.tsx'),
  'utf8',
)
const apiClient = readFileSync(join(process.cwd(), 'src/lib/api-client.ts'), 'utf8')
const authMeRoute = readFileSync(
  join(process.cwd(), 'src/app/api/auth/me/route.ts'),
  'utf8',
)
const capacitorConfig = readFileSync(join(process.cwd(), 'capacitor.config.ts'), 'utf8')
const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
) as { scripts: Record<string, string> }
const nextConfig = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8')
const mobileNextConfig = readFileSync(join(process.cwd(), 'next.config.mobile.ts'), 'utf8')
const mobileBuildScript = readFileSync(join(process.cwd(), 'scripts/build-mobile.mjs'), 'utf8')

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
    expect(todayWorkspace).toContain("import { api } from '@/lib/api-client'")
    expect(todayWorkspace).not.toContain('NEXT_PUBLIC_API_BASE_URL')
    expect(todayWorkspace).toContain('TODAY_CACHE_KEY')
    expect(todayWorkspace).toContain('window.localStorage')
    expect(todayWorkspace).toContain("Network.addListener('networkStatusChange'")
    expect(todayWorkspace).toContain('const detailsHref = mobileMode')
    expect(todayWorkspace).toContain('/pro/app/report?id=')
  })

  it('queues field status changes through the idempotent offline ledger', () => {
    expect(todayWorkspace).toContain("queueAction({ method: 'PATCH', path, body })")
    expect(todayWorkspace).toContain('flushPending().then(load)')
    expect(mobileReport).toContain("queueAction({ method: 'PATCH', path, body })")
    expect(
      normalizeOfflineTarget(
        'https://aqwelia.test',
        '/api/pro/interventions/intervention-42',
        'PATCH',
      ).method,
    ).toBe('PATCH')
  })

  it('keeps manager and technician navigation separate on the web app', () => {
    expect(appLayout).toContain("access.role === 'technician'")
    expect(appLayout).toContain("href: '/pro/app/today'")
    expect(appLayout).toContain('role={access.role}')
    expect(mobileShell).toContain('TECHNICIAN_PRIMARY_ITEMS')
    expect(mobileShell).toContain('MANAGER_PRIMARY_ITEMS')
    expect(mobileShell).toContain("role === 'technician'")
  })

  it('builds a dedicated static native route tree instead of exporting the website', () => {
    expect(packageJson.scripts['mobile:build']).toBe('node scripts/build-mobile.mjs')
    expect(Object.values(packageJson.scripts).join('\n')).not.toContain('next build -c')
    expect(nextConfig).toContain("process.env.MOBILE_BUILD === 'true'")
    expect(nextConfig).toContain("import mobileNextConfig from './next.config.mobile'")
    expect(mobileNextConfig).toContain("output: 'export'")
    expect(mobileBuildScript).toContain("join(root, 'src', 'mobile-app')")
    expect(mobileBuildScript).toContain('await rename(appDirectory, stashedAppDirectory)')
    expect(mobileBuildScript).toContain('await cp(mobileAppSource, appDirectory, { recursive: true })')
    expect(mobileBuildScript).toContain('await rename(stashedAppDirectory, appDirectory)')
    expect(mobileBuildScript).toContain('stashedMiddlewarePath')
  })

  it('keeps authentication and role selection on the HTTPS backend', () => {
    expect(mobileAppLayout).toContain('MobileIntlProvider')
    expect(mobileAppEntry).toContain("api.get<MobileSessionResponse>('/api/auth/me')")
    expect(mobileAppEntry).toContain("router.replace('/pro/app/today')")
    expect(mobileSignin).toContain("apiUrl('/api/auth/csrf')")
    expect(mobileSignin).toContain("apiUrl('/api/auth/callback/credentials')")
    expect(mobileSignin).toContain("await api.get('/api/auth/me')")
    expect(apiClient).toContain('export function apiUrl')
    expect(authMeRoute).toContain('resolveWorkspaceEntryTarget')
    expect(authMeRoute).toContain('entryTarget')
  })

  it('uses native HTTP and cookie bridges for Capacitor sessions', () => {
    expect(capacitorConfig).toContain('CapacitorHttp')
    expect(capacitorConfig).toContain('CapacitorCookies')
    expect(capacitorConfig.match(/enabled: true/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
