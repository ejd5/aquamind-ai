/**
 * AQWELIA Launch offers — P1 #1 : mapping des statuts de la route admin.
 *
 * La route `/api/admin/promotions` (GET + PATCH) doit retourner :
 *  - 401 pour une session absente/invalide ;
 *  - 403 pour un utilisateur authentifié mais non admin ;
 *  - 200 pour un administrateur.
 *
 * `requireAdminFromDb` est mocké ici (sa logique de rôle est testée dans
 * `aqwelia-launch-offers-admin.test.ts`) afin de vérifier précisément le
 * mapping de statuts des deux verbes, sur toutes les actions admin.
 */
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'

vi.mock('@/lib/admin-auth', () => ({
  requireAdminFromDb: vi.fn(),
}))
vi.mock('@/lib/launch-offers/admin', () => ({
  seedCampaign: vi.fn().mockResolvedValue({ created: false }),
  getCampaignAdmin: vi.fn().mockResolvedValue({ ok: true }),
  setCampaignStatus: vi.fn().mockResolvedValue({ ok: true }),
  reallocate: vi.fn().mockResolvedValue({ ok: true }),
}))

const mockRequire = (value: any) => {
  vi.mocked(requireAdminFromDb).mockResolvedValue(value)
}

describe('route /api/admin/promotions — mapping des statuts', () => {
  it('GET — session absente → 401', async () => {
    const { GET } = await import('@/app/api/admin/promotions/route')
    mockRequire({ authorized: false, reason: 'no-session' })
    expect((await GET()).status).toBe(401)
  })

  it('GET — utilisateur non admin → 403', async () => {
    const { GET } = await import('@/app/api/admin/promotions/route')
    mockRequire({ authorized: false, reason: 'not-admin' })
    expect((await GET()).status).toBe(403)
  })

  it('GET — administrateur → 200', async () => {
    const { GET } = await import('@/app/api/admin/promotions/route')
    mockRequire({ authorized: true, userId: 'admin-1' })
    expect((await GET()).status).toBe(200)
  })

  it('PATCH — session absente → 401', async () => {
    const { PATCH } = await import('@/app/api/admin/promotions/route')
    mockRequire({ authorized: false, reason: 'no-session' })
    const req = new NextRequest('http://localhost/api/admin/promotions', { method: 'PATCH', body: JSON.stringify({ action: 'status', status: 'PAUSED' }) })
    expect((await PATCH(req)).status).toBe(401)
  })

  it('PATCH — utilisateur non admin → 403', async () => {
    const { PATCH } = await import('@/app/api/admin/promotions/route')
    mockRequire({ authorized: false, reason: 'not-admin' })
    const req = new NextRequest('http://localhost/api/admin/promotions', { method: 'PATCH', body: JSON.stringify({ action: 'status', status: 'PAUSED' }) })
    expect((await PATCH(req)).status).toBe(403)
  })

  it('PATCH — administrateur, action status → 200', async () => {
    const { PATCH } = await import('@/app/api/admin/promotions/route')
    mockRequire({ authorized: true, userId: 'admin-1' })
    const req = new NextRequest('http://localhost/api/admin/promotions', { method: 'PATCH', body: JSON.stringify({ action: 'status', status: 'PAUSED' }) })
    expect((await PATCH(req)).status).toBe(200)
  })

  it('PATCH — administrateur, action reallocate → 200', async () => {
    const { PATCH } = await import('@/app/api/admin/promotions/route')
    mockRequire({ authorized: true, userId: 'admin-1' })
    const req = new NextRequest('http://localhost/api/admin/promotions', { method: 'PATCH', body: JSON.stringify({ action: 'reallocate', variantCode: 'LAUNCH50_MONTHLY', platform: 'WEB', newQuota: 100 }) })
    expect((await PATCH(req)).status).toBe(200)
  })
})
