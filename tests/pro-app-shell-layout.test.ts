import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const marketingLayout = readFileSync(
  join(process.cwd(), 'src/app/pro/layout.tsx'),
  'utf8',
)
const routeShell = readFileSync(
  join(process.cwd(), 'src/components/pro/pro-route-shell.tsx'),
  'utf8',
)
const appLayout = readFileSync(
  join(process.cwd(), 'src/app/pro/app/layout.tsx'),
  'utf8',
)
const proCss = readFileSync(
  join(process.cwd(), 'src/app/aqwelia-pro.css'),
  'utf8',
)

describe('AQWELIA Pro authenticated workspace shell', () => {
  it('does not render the marketing header or footer around /pro/app', () => {
    expect(marketingLayout).toContain('ProRouteShell')
    expect(routeShell).toContain("pathname === '/pro/app'")
    expect(routeShell).toContain("pathname.startsWith('/pro/app/')")
    expect(routeShell).toContain('if (isAuthenticatedWorkspace) return <>{children}</>')
    expect(routeShell).toContain('<Footer />')
    expect(appLayout).not.toContain("from '@/components/aquamind/footer'")
    expect(appLayout).not.toContain('<Footer />')
  })

  it('uses the available desktop width for operational screens', () => {
    expect(appLayout.match(/max-w-\[1760px\]/g)?.length).toBeGreaterThanOrEqual(3)
    expect(appLayout).toContain('min-w-0 flex-1')
    expect(appLayout).toContain('xl:w-64')
  })

  it('keeps a dedicated responsive navigation and full-width mobile content', () => {
    expect(appLayout).toContain('aq-pro-mobile-nav')
    expect(appLayout).toContain('md:hidden')
    expect(appLayout).toContain('hidden h-[calc(100vh-4rem)]')
    expect(appLayout).toContain('md:block')
    expect(proCss).toContain('@media (max-width: 767px)')
    expect(proCss).toContain('border-radius: 0')
  })
})
