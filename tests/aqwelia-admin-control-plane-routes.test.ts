/**
 * AQWELIA — Admin Control Plane V1 · mapping des statuts des routes admin v1.
 *
 * Vérifie que CHAQUE route de mutation refait son propre contrôle admin :
 *   - session absente → 401 ;
 *   - authentifié non admin → 403 ;
 *   - admin → accès ;
 *   - payload invalide → 400 ;
 *   - stale_version → 409.
 *
 * requireAdminFromDb et le service sont mockés : leur logique réelle est
 * couverte par aqwelia-admin-control-plane.test.ts (DB isolée).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { requireAdminFromDb } from '@/lib/admin-auth'

vi.mock('@/lib/admin-auth', () => ({ requireAdminFromDb: vi.fn() }))

const promotionsDbHolder = vi.hoisted(() => ({
  promotionCampaign: { findMany: vi.fn() },
  adminProductFlag: { findMany: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/lib/db', () => ({ db: promotionsDbHolder }))
vi.mock('@/lib/admin-control/service', () => ({
  listBanners: vi.fn().mockResolvedValue([]),
  createBannerDraft: vi.fn().mockResolvedValue({ id: 'b1', status: 'DRAFT', version: 0 }),
  updateBannerDraft: vi.fn().mockResolvedValue({ ok: true, banner: { id: 'b1', version: 1 } }),
  setBannerStatus: vi.fn().mockResolvedValue({ ok: true, banner: { id: 'b1' } }),
  listPopups: vi.fn().mockResolvedValue([]),
  createPopupDraft: vi.fn().mockResolvedValue({ id: 'p1', status: 'DRAFT', version: 0 }),
  updatePopupDraft: vi.fn().mockResolvedValue({ ok: true, popup: { id: 'p1', version: 1 } }),
  setPopupStatus: vi.fn().mockResolvedValue({ ok: true, popup: { id: 'p1' } }),
  listAuditLogs: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/admin-agentic/agents', () => ({
  runAdminAgent: vi.fn().mockResolvedValue({ id: 'a1', status: 'NEEDS_REVIEW' }),
  listProposals: vi.fn().mockResolvedValue([]),
  reviewProposal: vi.fn().mockResolvedValue({ ok: true, proposal: { id: 'a1', status: 'APPROVED' } }),
}))

const mockRequire = (value: unknown) => {
  vi.mocked(requireAdminFromDb).mockResolvedValue(value as never)
}

const json = (method: string, body: unknown, url = 'http://localhost') =>
  new NextRequest(url, { method, body: JSON.stringify(body) })

const FULL_TR = { fr: 'x', en: 'x', es: 'x', pt: 'x', de: 'x', it: 'x', nl: 'x' }

describe('routes banners', () => {
  it.each([
    ['GET', 'no-session', 401],
    ['GET', 'not-admin', 403],
    ['GET', 'admin', 200],
  ])('%s — %s → %i', async (method, reason, expected) => {
    const mod = await import('@/app/api/admin/v1/banners/route')
    mockRequire(reason === 'admin' ? { authorized: true, userId: 'a' } : { authorized: false, reason })
    if (method === 'GET') {
      expect((await mod.GET()).status).toBe(expected)
    } else {
      expect((await mod.POST(json('POST', { internalName: 'T', translations: FULL_TR }))).status).toBe(expected)
    }
  })

  it('POST — payload invalide → 400 (validation Zod avant mutation)', async () => {
    const mod = await import('@/app/api/admin/v1/banners/route')
    mockRequire({ authorized: true, userId: 'a' })
    const res = await mod.POST(json('POST', { internalName: 'X' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_payload')
  })

  it('POST [id] — action humaine sans raison → 400', async () => {
    const mod = await import('@/app/api/admin/v1/banners/[id]/route')
    mockRequire({ authorized: true, userId: 'a' })
    const res = await mod.POST(json('POST', { status: 'PUBLISHED', expectedVersion: 0 }), { params: Promise.resolve({ id: 'b1' }) })
    expect(res.status).toBe(400)
  })

  it('PATCH [id] — stale_version → 409 (pas d’écrasement silencieux)', async () => {
    const service = await import('@/lib/admin-control/service')
    ;(service.updateBannerDraft as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, error: 'stale_version' })
    const mod = await import('@/app/api/admin/v1/banners/[id]/route')
    mockRequire({ authorized: true, userId: 'a' })
    const res = await mod.PATCH(json('PATCH', { internalName: 'Vieux client', expectedVersion: 0 }), { params: Promise.resolve({ id: 'b1' }) })
    expect(res.status).toBe(409)
  })
})

describe('routes popups', () => {
  it('GET — non admin → 403 ; admin → 200', async () => {
    const mod = await import('@/app/api/admin/v1/popups/route')
    mockRequire({ authorized: false, reason: 'not-admin' })
    expect((await mod.GET()).status).toBe(403)
    mockRequire({ authorized: true, userId: 'a' })
    expect((await mod.GET()).status).toBe(200)
  })

  it('POST — payload invalide → 400', async () => {
    const mod = await import('@/app/api/admin/v1/popups/route')
    mockRequire({ authorized: true, userId: 'a' })
    const res = await mod.POST(json('POST', { internalName: 'P' }))
    expect(res.status).toBe(400)
  })
})

describe('routes agentic', () => {
  it('POST run — non admin → 401/403 ; admin → 201 (proposition NEEDS_REVIEW)', async () => {
    const mod = await import('@/app/api/admin/v1/agentic/route')
    mockRequire({ authorized: false, reason: 'no-session' })
    expect((await mod.POST(json('POST', { agent: 'copyAssistant' }))).status).toBe(401)
    mockRequire({ authorized: false, reason: 'not-admin' })
    expect((await mod.POST(json('POST', { agent: 'copyAssistant' }))).status).toBe(403)
    mockRequire({ authorized: true, userId: 'a' })
    expect((await mod.POST(json('POST', { agent: 'copyAssistant' }))).status).toBe(201)
  })

  it('POST run — agent inconnu → 400', async () => {
    const mod = await import('@/app/api/admin/v1/agentic/route')
    mockRequire({ authorized: true, userId: 'a' })
    const res = await mod.POST(json('POST', { agent: 'publisher' }))
    expect(res.status).toBe(400)
  })

  it('POST review — décision invalide → 400 ; admin → 200', async () => {
    const mod = await import('@/app/api/admin/v1/agentic/[id]/route')
    mockRequire({ authorized: true, userId: 'a' })
    expect((await mod.POST(json('POST', { decision: 'EXECUTE' }), { params: Promise.resolve({ id: 'a1' }) })).status).toBe(400)
    expect((await mod.POST(json('POST', { decision: 'APPROVE' }), { params: Promise.resolve({ id: 'a1' }) })).status).toBe(200)
  })
})

describe('route audit + flags', () => {
  it('audit — non admin → 403 ; admin → 200', async () => {
    const mod = await import('@/app/api/admin/v1/audit/route')
    mockRequire({ authorized: false, reason: 'not-admin' })
    expect((await mod.GET(new NextRequest('http://localhost/api/admin/v1/audit'))).status).toBe(403)
    mockRequire({ authorized: true, userId: 'a' })
    expect((await mod.GET(new NextRequest('http://localhost/api/admin/v1/audit'))).status).toBe(200)
  })

  it('flags — allowlist produit sûre uniquement, aucune clé critique', async () => {
    const mod = await import('@/app/api/admin/v1/flags/route')
    mockRequire({ authorized: true, userId: 'a' })
    const res = await mod.GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.readOnly).toBe(false)
    // Seules les clés sûres de l'allowlist sont exposées (env + override + effectif).
    const keys = body.flags.map((f: { key: string }) => f.key)
    expect(keys).toContain('NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED')
    expect(keys).toContain('AQWELIA_LAUNCH_OFFERS_ENABLED')
    expect(keys.every((k: string) => !/STRIPE|SECRET|DATABASE|NEXTAUTH/.test(k))).toBe(true)
    // Chaque entrée expose envValue/override/effective (jamais une valeur d'env brute).
    for (const f of body.flags) {
      expect(typeof f.envValue).toBe('boolean')
      expect('override' in f).toBe(true)
      expect(typeof f.effective).toBe('boolean')
    }
  })
})

describe('route /api/admin/v1/promotions — V2 canonique (cockpit)', () => {
  const MOCK_CAMPAIGNS = [
    {
      id: 'c1',
      code: 'AQWELIA_LAUNCH_2026',
      name: 'Offres de lancement AQWELIA',
      status: 'DRAFT',
      totalQuota: 500,
      confirmedCount: 0,
      startsAt: null,
      endsAt: null,
      eligibleCountries: null,
      eligiblePlanIds: null,
      variants: [],
      auditLogs: [],
    },
  ]

  beforeEach(() => {
    promotionsDbHolder.promotionCampaign.findMany.mockReset()
    promotionsDbHolder.promotionCampaign.findMany.mockResolvedValue(MOCK_CAMPAIGNS)
    vi.mocked(requireAdminFromDb).mockReset()
  })

  it('GET admin → 200 avec { campaigns: [...] } incluant une campagne DRAFT', async () => {
    vi.mocked(requireAdminFromDb).mockResolvedValue({ authorized: true, userId: 'a' } as never)
    const mod = await import('@/app/api/admin/v1/promotions/route')
    const res = await mod.GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.campaigns)).toBe(true)
    expect(body.campaigns[0].code).toBe('AQWELIA_LAUNCH_2026')
    expect(body.campaigns[0].status).toBe('DRAFT')
    expect(body.campaigns[0].reservedCount).toBe(0)
  })

  it('GET non-admin → 403 ; non-auth → 401', async () => {
    const mod = await import('@/app/api/admin/v1/promotions/route')
    vi.mocked(requireAdminFromDb).mockResolvedValue({ authorized: false, reason: 'not-admin' } as never)
    expect((await mod.GET()).status).toBe(403)
    vi.mocked(requireAdminFromDb).mockResolvedValue({ authorized: false, reason: 'no-session' } as never)
    expect((await mod.GET()).status).toBe(401)
  })

  it('GET n’amorce JAMAIS de campagne (findMany seul, aucune écriture possible)', async () => {
    vi.mocked(requireAdminFromDb).mockResolvedValue({ authorized: true, userId: 'a' } as never)
    const mod = await import('@/app/api/admin/v1/promotions/route')
    await mod.GET()
    expect(promotionsDbHolder.promotionCampaign.findMany).toHaveBeenCalledTimes(1)
    // Le mock n'expose QUE findMany : une écriture (create/update) serait impossible côté GET.
    expect(Object.keys(promotionsDbHolder.promotionCampaign)).toEqual(['findMany'])
    const src = readFileSync(join(process.cwd(), 'src/app/api/admin/v1/promotions/route.ts'), 'utf8')
    const getSrc = src.slice(src.indexOf('export async function GET'), src.indexOf('export async function PATCH'))
    expect(getSrc).not.toContain('updateMany')
    expect(getSrc).not.toContain('.create(')
    expect(getSrc).not.toContain('seedCampaign')
  })

  it('PATCH exposé uniquement (pilotage humain) — POST/DELETE/PUT interdits', async () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/admin/v1/promotions/route.ts'), 'utf8')
    expect(src).toMatch(/export async function PATCH\(/)
    expect(src).not.toMatch(/export async function (POST|DELETE|PUT)/)
    // PATCH refait le contrôle admin.
    vi.mocked(requireAdminFromDb).mockResolvedValue({ authorized: false, reason: 'not-admin' } as never)
    const mod = await import('@/app/api/admin/v1/promotions/route')
    const req = new NextRequest('http://localhost/api/admin/v1/promotions', { method: 'PATCH', body: JSON.stringify({ action: 'campaign_update' }) })
    expect((await mod.PATCH(req)).status).toBe(403)
    vi.mocked(requireAdminFromDb).mockResolvedValue({ authorized: false, reason: 'no-session' } as never)
    expect((await mod.PATCH(req)).status).toBe(401)
  })
})

describe('UI Promotions — cockpit canonique /admin/promotions', () => {
  it('la nav principale pointe vers /admin/promotions (plus de section V1)', () => {
    const page = readFileSync(join(process.cwd(), 'src/app/admin/page.tsx'), 'utf8')
    expect(page).toContain("href: '/admin/promotions'")
    expect(page).toContain("router.push('/admin/promotions')")
    // La section READ ONLY V1 a été retirée du shell.
    expect(page).not.toContain('function PromotionsSection')
    expect(page).not.toContain('CampaignRow')
  })

  it('le cockpit /admin/promotions existe et appelle l’API canonique', () => {
    const cockpit = readFileSync(join(process.cwd(), 'src/app/admin/promotions/page.tsx'), 'utf8')
    expect(cockpit).toContain("'/api/admin/v1/promotions'")
    expect(cockpit).toContain("t('cpPromotionsTitle')")
  })

  it('traductions obsolètes nettoyées dans les 7 locales', () => {
    for (const locale of ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl']) {
      const data = JSON.parse(readFileSync(join(process.cwd(), `src/i18n/locales/${locale}.json`), 'utf8'))
      expect(data.admin.cpPromotionsReadOnly, locale).toBeUndefined()
      expect(data.admin.cpPromotionsTitle, locale).toBeTruthy()
      expect(data.admin.cpPromotionsTitle.toLowerCase(), locale).not.toContain('lecture seule')
      expect(data.admin.cpPromotionsTitle.toLowerCase(), locale).not.toContain('read-only')
      expect(data.admin.cpPromotionsEmpty, locale).not.toContain('seedCampaign')
    }
  })
})

describe('garde serveur /admin (layout)', () => {
  it('le layout revérifie le rôle admin en base avant rendu', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/admin/layout.tsx'), 'utf8')
    expect(src).toContain('requireAdminFromDb()')
    expect(src).toContain("redirect('/auth/signin?callbackUrl=/admin')")
    // Session absente → redirect ; non-admin authentifié → VRAI 403 (forbidden()).
    expect(src).toContain("auth.reason === 'no-session'")
    expect(src).toContain('forbidden()')
    expect(src).toContain('{children}')
    // La nav du layout expose le lien vers le cockpit promotions canonique.
    expect(src).toContain("href=\"/admin/promotions\"")
    expect(src).toContain('navPromotions')
    // Jamais de confiance dans le client : pas de localStorage ni de role depuis props.
    expect(src).not.toMatch(/localStorage\s*[.(]/)
  })

  it('la page forbidden.tsx rend un 403 i18n avec le statut HTTP 403 (Next forbidden())', () => {
    const forbiddenPage = readFileSync(join(process.cwd(), 'src/app/admin/forbidden.tsx'), 'utf8')
    expect(forbiddenPage).toContain('getTranslations')
    expect(forbiddenPage).toContain("t('accessDeniedDesc')")
    expect(forbiddenPage).toContain('403')
  })

  it('la page admin ne lit plus le localStorage comme source canonique', () => {
    const page = readFileSync(join(process.cwd(), 'src/app/admin/page.tsx'), 'utf8')
    expect(page).not.toContain('aqwelia-banner')
    expect(page).not.toContain('aqwelia-popups')
    // Aucun appel réel au localStorage (le mot n'apparaît qu'en commentaire).
    expect(page).not.toMatch(/localStorage\s*[.(]/)
    // Les mutations passent par les routes serveur.
    expect(page).toContain('/api/admin/v1/banners')
    expect(page).toContain('/api/admin/v1/popups')
    expect(page).toContain('/api/admin/v1/agentic')
    expect(page).toContain('/api/admin/v1/audit')
  })
})

