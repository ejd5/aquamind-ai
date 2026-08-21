/**
 * AQWELIA — Admin Control Plane · SUPPRESSION DU DOUBLE GATE LEGACY.
 *
 * Le middleware /admin ne doit PLUS utiliser isAdminEmail (allowlist
 * ADMIN_EMAILS) comme condition d'accès : seule l'AUTHENTIFICATION y est
 * vérifiée (token session). La décision ADMIN canonique revient au layout
 * /admin via requireAdminFromDb() qui relit User.role EN BASE.
 *
 * Garanties :
 *   1. /admin sans token → redirect /auth/signin?callbackUrl=… ;
 *   2. /admin avec token → laisse passer MÊME si ADMIN_EMAILS est vide ou
 *      ne contient pas l'email ;
 *   3. rôle DB user → requireAdminFromDb refuse ;
 *   4. rôle DB admin → requireAdminFromDb autorise ;
 *   5-6. routes API admin : user → 403, admin → accès (couvert par les
 *      routes tests existants + rappel statique ici) ;
 *   7. ADMIN_EMAILS vide ne bloque plus un admin DB authentifié ;
 *   8. lib/admin.ts conservée pour ses autres usages légitimes (contact,
 *      care, partners, early-access, reconcile…) — seule la condition
 *      middleware /admin disparaît.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const getTokenMock = vi.fn()
vi.mock('next-auth/jwt', () => ({ getToken: (...args: unknown[]) => getTokenMock(...args) }))
vi.mock('@/lib/features', () => ({ PRO_GPS_ENABLED: false }))

async function callMiddleware(pathname: string) {
  const { default: middleware } = await import('@/middleware')
  const req = new NextRequest(`http://localhost${pathname}`, { method: 'GET', headers: {} })
  return middleware(req)
}

describe('middleware /admin — authentification uniquement', () => {
  beforeEach(() => {
    getTokenMock.mockReset()
    delete process.env.ADMIN_EMAILS
    vi.resetModules()
  })

  it('1. /admin sans token → redirect signin avec callbackUrl', async () => {
    getTokenMock.mockResolvedValue(null)
    const res = await callMiddleware('/admin')
    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/auth/signin')
    expect(location).toContain('callbackUrl=%2Fadmin')
  })

  it('2. /admin/banners sans token → callbackUrl conservée', async () => {
    getTokenMock.mockResolvedValue(null)
    const res = await callMiddleware('/admin/banners')
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('callbackUrl=%2Fadmin%2Fbanners')
  })

  it('3. /admin avec token → laisse passer, ADMIN_EMAILS vide (plus de 403 legacy)', async () => {
    process.env.ADMIN_EMAILS = ''
    getTokenMock.mockResolvedValue({ email: 'eltduarte@gmail.com' })
    const res = await callMiddleware('/admin')
    expect(res.status).not.toBe(403)
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('4. /admin avec token → passe même si l’email n’est PAS dans ADMIN_EMAILS', async () => {
    process.env.ADMIN_EMAILS = 'someone-else@example.com'
    getTokenMock.mockResolvedValue({ email: 'eltduarte@gmail.com' })
    const res = await callMiddleware('/admin')
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('5. /admin/* avec token → passe (la décision admin est déléguée au layout DB)', async () => {
    getTokenMock.mockResolvedValue({ email: 'eltduarte@gmail.com' })
    const res = await callMiddleware('/admin/agentic')
    expect(res.status).toBe(200)
  })
})

describe('source canonique — rôle DB, jamais le client', () => {
  it('le middleware ne référence plus isAdminEmail ni ADMIN_EMAILS', () => {
    const middleware = readFileSync(join(process.cwd(), 'src/middleware.ts'), 'utf8')
    expect(middleware).not.toContain('isAdminEmail')
    expect(middleware).not.toContain('ADMIN_EMAILS')
    // L'authentification seule est vérifiée au niveau middleware…
    expect(middleware).toContain("if (pathname === '/admin' || pathname.startsWith('/admin/'))")
    expect(middleware).toContain("const signin = new URL('/auth/signin', req.url)")
  })

  it('le layout /admin garde requireAdminFromDb (rôle relu en base)', () => {
    const layout = readFileSync(join(process.cwd(), 'src/app/admin/layout.tsx'), 'utf8')
    expect(layout).toContain('requireAdminFromDb()')
    expect(layout).toContain("redirect('/auth/signin?callbackUrl=/admin')")
  })

  it('lib/admin.ts (isAdminEmail) est CONSERVÉE pour ses usages légitimes hors control plane', () => {
    const adminLib = readFileSync(join(process.cwd(), 'src/lib/admin.ts'), 'utf8')
    expect(adminLib).toContain('ADMIN_EMAILS')
    // Usages légitimes conservés ailleurs (contact, care, partners, early-access, reconcile…).
    for (const file of [
      'src/app/api/contact/route.ts',
      'src/app/api/care/notify/route.ts',
      'src/app/api/partners/apply/route.ts',
      'src/app/api/pro/early-access/route.ts',
      'src/app/api/admin/reconcile/route.ts',
    ]) {
      expect(readFileSync(join(process.cwd(), file), 'utf8'), file).toContain('isAdminEmail')
    }
  })
})

describe('rappel défense en profondeur — routes API admin', () => {
  it('chaque route /api/admin/v1/* appelle requireAdminFromDb elle-même', () => {
    const routes = [
      'src/app/api/admin/v1/banners/route.ts',
      'src/app/api/admin/v1/banners/[id]/route.ts',
      'src/app/api/admin/v1/popups/route.ts',
      'src/app/api/admin/v1/popups/[id]/route.ts',
      'src/app/api/admin/v1/agentic/route.ts',
      'src/app/api/admin/v1/agentic/[id]/route.ts',
      'src/app/api/admin/v1/audit/route.ts',
      'src/app/api/admin/v1/flags/route.ts',
    ]
    for (const route of routes) {
      const src = readFileSync(join(process.cwd(), route), 'utf8')
      expect(src, route).toContain('requireAdminFromDb()')
      expect(src, route).toContain("auth.reason === 'no-session' ? 401 : 403")
    }
  })
})
