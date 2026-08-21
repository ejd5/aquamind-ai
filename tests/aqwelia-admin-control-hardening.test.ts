/**
 * AQWELIA — Admin Control Plane V1 · HARDENING (URLs + publication readiness).
 *
 * P1 : ctaUrl/imageUrl = chemin interne sûr OU https absolu. Refus de
 * javascript:/data:/file:/ftp:/protocol-relative et tout schéma non autorisé.
 * P1 : publication readiness — PUBLISHED/SCHEDULED exigent le contenu FR et
 * la structure 7 locales ; SCHEDULED exige startAt ; endAt > startAt.
 * Un refus ne mute RIEN (ni version, ni audit).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { bannerPayloadSchema, popupPayloadSchema, bannerPublishSchema, ctaUrlSchema, imageUrlSchema } from '@/lib/admin-control/schemas'
import { isValidInternalPath, isValidExternalHttpsUrl, isValidAdminUrl } from '@/lib/admin-control/url-validation'
import { createBannerDraft, createPopupDraft, setBannerStatus, setPopupStatus, listAuditLogs, updateBannerDraft, updatePopupDraft } from '@/lib/admin-control/service'

const prefix = `admincp-hard-${Date.now()}`
let dbDir: string
let testDb: any

beforeAll(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'aqwelia-admincp-hard-'))
  const dbFile = join(dbDir, 'test.db')
  execSync('bunx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: `file:${dbFile}` },
    stdio: 'pipe',
  })
  testDb = new PrismaClient({
    datasources: { db: { url: `file:${dbFile}` } },
    transactionOptions: { maxWait: 8_000, timeout: 30_000 },
  })
})

afterAll(async () => {
  await testDb?.$disconnect()
  rmSync(dbDir, { recursive: true, force: true })
})

const ACTOR = { id: 'admin-h', email: 'admin@aqwelia.test' }
const FULL_TR = { fr: 'FR', en: 'EN', es: 'ES', pt: 'PT', de: 'DE', it: 'IT', nl: 'NL' }
const POPUP_TR = Object.fromEntries(['fr', 'en', 'es', 'pt', 'de', 'it', 'nl'].map((l) => [l, { title: 'Titre', body: 'Corps' }])) as never

describe('P1 — URL CTA / image durcies (parser WHATWG)', () => {
  const VALID = ['', '/settings', '/tarifs', '/pro/app/today', 'https://aqwelia.app/tarifs', 'https://aqwelia.app/x?y=1']
  const INVALID = [
    'javascript:alert(1)',
    'data:text/html,<script>x</script>',
    'file:///etc/passwd',
    'vbscript:msgbox',
    'ftp://evil.example.com',
    '//evil.example.com/x',
    'http://aqwelia.app/x',
    'mailto:admin@example.com',
  ]

  it('accepte chemins internes et https', () => {
    for (const url of VALID) {
      expect(ctaUrlSchema.safeParse(url).success, `ctaUrl ${url}`).toBe(true)
      expect(imageUrlSchema.safeParse(url).success, `imageUrl ${url}`).toBe(true)
    }
  })

  it('refuse javascript:, data:, file:, vbscript:, ftp:, protocol-relative, http:', () => {
    for (const url of INVALID) {
      expect(ctaUrlSchema.safeParse(url).success, `ctaUrl ${url}`).toBe(false)
      expect(imageUrlSchema.safeParse(url).success, `imageUrl ${url}`).toBe(false)
    }
  })

  it('liste exacte de la mission — ACCEPT', () => {
    for (const url of ['https://example.com', 'https://example.com/path?q=1', '/dashboard', '/assets/banner.webp', '/guides?source=banner']) {
      expect(isValidAdminUrl(url), url).toBe(true)
    }
  })

  it('liste exacte de la mission — REJECT (fausses https, backslash bypass, credentials)', () => {
    for (const url of [
      'https://',
      'https:///',
      'https://?',
      'http://example.com',
      '//evil.example.com',
      '/\\evil.example.com',
      'https:evil.example.com',
      'javascript:alert(1)',
      'data:text/html,test',
      'file:///tmp/a',
      'ftp://example.com',
      'mailto:test@example.com',
      'https://user:pass@example.com',
      'https://trusted.example@evil.example',
    ]) {
      expect(isValidAdminUrl(url), `devrait refuser: ${url}`).toBe(false)
    }
    // Backslash sous ses deux formes littérales (un seul backslash).
    expect(isValidAdminUrl('/\\evil.example.com')).toBe(false)
    expect(isValidInternalPath('/\\evil.example.com')).toBe(false)
    expect(isValidInternalPath('//evil.example.com')).toBe(false)
  })

  it('https avec credentials (username/password) est refusé', () => {
    expect(isValidExternalHttpsUrl('https://user:pass@example.com')).toBe(false)
    expect(isValidExternalHttpsUrl('https://example.com')).toBe(true)
  })

  it('le payload bannière rejette un CTA dangereux à la création', async () => {
    await expect(
      createBannerDraft({ internalName: 'XSS', translations: FULL_TR, ctaUrl: 'javascript:alert(1)' }, ACTOR, testDb)
    ).rejects.toThrow()
    await expect(
      createBannerDraft({ internalName: 'ProtoRel', translations: FULL_TR, ctaUrl: '//evil.example.com' }, ACTOR, testDb)
    ).rejects.toThrow()
    await expect(
      createBannerDraft({ internalName: 'Backslash', translations: FULL_TR, ctaUrl: '/\\evil.example.com' }, ACTOR, testDb)
    ).rejects.toThrow()
    // Un CTA https valide passe.
    const ok = await createBannerDraft({ internalName: 'HTTPS ok', translations: FULL_TR, ctaUrl: 'https://aqwelia.app/tarifs' }, ACTOR, testDb)
    expect(ok.status).toBe('DRAFT')
  })

  it('le payload popup rejette une image non autorisée', async () => {
    await expect(
      createPopupDraft({ internalName: 'Img', translations: POPUP_TR, imageUrl: 'data:image/png;base64,x' }, ACTOR, testDb)
    ).rejects.toThrow()
    const ok = await createPopupDraft({ internalName: 'Img https', translations: POPUP_TR, imageUrl: 'https://cdn.aqwelia.app/banner.png' }, ACTOR, testDb)
    expect(ok.status).toBe('DRAFT')
  })
})

describe('P0 — dates sur l’ÉTAT EFFECTIF (payload ∪ DB)', () => {
  const FUTURE_START = new Date('2026-09-20T00:00:00Z')
  const EARLIER_END = new Date('2026-09-10T00:00:00Z')
  const FUTURE_END = new Date('2026-10-20T00:00:00Z')
  const LATER_START = new Date('2026-11-01T00:00:00Z')

  it('BANNER A — DB startAt futur, PATCH endAt antérieur → refus sans mutation ni audit', async () => {
    const banner = await createBannerDraft(
      { internalName: 'Dates A', translations: FULL_TR, startAt: FUTURE_START },
      ACTOR,
      testDb
    )
    const result = await updateBannerDraft(banner.id, { endAt: EARLIER_END, expectedVersion: 0 }, ACTOR, testDb)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_dates')
    const final = await testDb.adminContentBanner.findUnique({ where: { id: banner.id } })
    expect(final.version).toBe(0)
    expect(final.endAt).toBeNull()
    const logs = await listAuditLogs({ entityId: banner.id, limit: 10 }, testDb)
    expect(logs.filter((l) => l.action === 'BANNER_UPDATED')).toHaveLength(0)
  })

  it('BANNER B — DB endAt futur, PATCH startAt postérieur → refus identique', async () => {
    const banner = await createBannerDraft(
      { internalName: 'Dates B', translations: FULL_TR, endAt: FUTURE_END },
      ACTOR,
      testDb
    )
    const result = await updateBannerDraft(banner.id, { startAt: LATER_START, expectedVersion: 0 }, ACTOR, testDb)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_dates')
    const final = await testDb.adminContentBanner.findUnique({ where: { id: banner.id } })
    expect(final.version).toBe(0)
    expect(final.startAt).toBeNull()
  })

  it('POPUP — les deux scénarios (endAt antérieur / startAt postérieur) sont refusés', async () => {
    const p1 = await createPopupDraft(
      { internalName: 'Dates popup A', translations: POPUP_TR, startAt: FUTURE_START },
      ACTOR,
      testDb
    )
    const r1 = await updatePopupDraft(p1.id, { endAt: EARLIER_END, expectedVersion: 0 }, ACTOR, testDb)
    expect(r1.ok).toBe(false)
    if (!r1.ok) expect(r1.error).toBe('invalid_dates')

    const p2 = await createPopupDraft(
      { internalName: 'Dates popup B', translations: POPUP_TR, endAt: FUTURE_END },
      ACTOR,
      testDb
    )
    const r2 = await updatePopupDraft(p2.id, { startAt: LATER_START, expectedVersion: 0 }, ACTOR, testDb)
    expect(r2.ok).toBe(false)
    if (!r2.ok) expect(r2.error).toBe('invalid_dates')

    expect((await testDb.adminContentPopup.findUnique({ where: { id: p1.id } })).version).toBe(0)
    expect((await testDb.adminContentPopup.findUnique({ where: { id: p2.id } })).version).toBe(0)
  })

  it('SCHEDULE — DB contient endAt, startAt fourni > endAt → refus sans mutation/audit', async () => {
    const banner = await createBannerDraft(
      { internalName: 'Schedule conflit', translations: FULL_TR, endAt: FUTURE_END },
      ACTOR,
      testDb
    )
    const result = await setBannerStatus(
      banner.id,
      { status: 'SCHEDULED', expectedVersion: 0, reason: 'Planif conflit', startAt: LATER_START },
      ACTOR,
      testDb
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_dates')
    const final = await testDb.adminContentBanner.findUnique({ where: { id: banner.id } })
    expect(final.status).toBe('DRAFT')
    expect(final.version).toBe(0)
    const logs = await listAuditLogs({ entityId: banner.id, limit: 10 }, testDb)
    expect(logs.filter((l) => l.action === 'BANNER_STATUS_CHANGED')).toHaveLength(0)
  })

  it('PUBLISHED — un état final incohérent n’est jamais accepté', async () => {
    const banner = await createBannerDraft(
      { internalName: 'Publish dates', translations: FULL_TR, startAt: FUTURE_START },
      ACTOR,
      testDb
    )
    const result = await setBannerStatus(
      banner.id,
      { status: 'PUBLISHED', expectedVersion: 0, reason: 'Publish conflit', endAt: EARLIER_END },
      ACTOR,
      testDb
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_dates')
    const final = await testDb.adminContentBanner.findUnique({ where: { id: banner.id } })
    expect(final.status).toBe('DRAFT')
    expect(final.version).toBe(0)
  })

  it('les dates cohérentes restent acceptées (pas de régression)', async () => {
    const banner = await createBannerDraft(
      { internalName: 'Dates OK', translations: FULL_TR, startAt: FUTURE_START, endAt: FUTURE_END },
      ACTOR,
      testDb
    )
    const result = await setBannerStatus(
      banner.id,
      { status: 'SCHEDULED', expectedVersion: 0, reason: 'Planif valide', startAt: FUTURE_START, endAt: FUTURE_END },
      ACTOR,
      testDb
    )
    expect(result.ok).toBe(true)
  })
})

describe('P1 — publication readiness', () => {
  it('bannière PUBLISHED sans FR → refus sans mutation ni audit', async () => {
    const banner = await createBannerDraft(
      { internalName: 'Sans FR', translations: { fr: '', en: 'EN', es: 'ES', pt: 'PT', de: 'DE', it: 'IT', nl: 'NL' } },
      ACTOR,
      testDb
    )
    const result = await setBannerStatus(banner.id, { status: 'PUBLISHED', expectedVersion: 0, reason: 'Test readiness' }, ACTOR, testDb)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('fr_translation_required')

    const final = await testDb.adminContentBanner.findUnique({ where: { id: banner.id } })
    expect(final.status).toBe('DRAFT')
    expect(final.version).toBe(0)
    const logs = await listAuditLogs({ entityId: banner.id, limit: 10 }, testDb)
    expect(logs.filter((l) => l.action === 'BANNER_STATUS_CHANGED')).toHaveLength(0)
  })

  it('bannière SCHEDULED sans startAt → 400 (Zod), pas de mutation', async () => {
    const banner = await createBannerDraft({ internalName: 'Schedule', translations: FULL_TR }, ACTOR, testDb)
    await expect(
      setBannerStatus(banner.id, { status: 'SCHEDULED', expectedVersion: 0, reason: 'Planif sans date' }, ACTOR, testDb)
    ).rejects.toThrow()
    const final = await testDb.adminContentBanner.findUnique({ where: { id: banner.id } })
    expect(final.status).toBe('DRAFT')
    expect(final.version).toBe(0)
  })

  it('endAt <= startAt → refus', () => {
    const start = new Date('2026-08-20T00:00:00Z')
    const end = new Date('2026-08-20T00:00:00Z')
    expect(bannerPublishSchema.safeParse({ status: 'SCHEDULED', expectedVersion: 0, reason: 'Dates', startAt: start, endAt: end }).success).toBe(false)
    expect(bannerPayloadSchema.safeParse({ internalName: 'Dates', translations: FULL_TR, startAt: start, endAt: end }).success).toBe(false)
  })

  it('popup PUBLISHED sans body FR → refus ; structure 7 locales exigée', async () => {
    const popup = await createPopupDraft(
      {
        internalName: 'Popup FR incomplet',
        translations: {
          fr: { title: 'Titre', body: '' },
          en: { title: 'T', body: 'B' },
          es: { title: 'T', body: 'B' },
          pt: { title: 'T', body: 'B' },
          de: { title: 'T', body: 'B' },
          it: { title: 'T', body: 'B' },
          nl: { title: 'T', body: 'B' },
        },
      },
      ACTOR,
      testDb
    )
    const result = await setPopupStatus(popup.id, { status: 'PUBLISHED', expectedVersion: 0, reason: 'Test readiness popup' }, ACTOR, testDb)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('fr_body_required')
    const final = await testDb.adminContentPopup.findUnique({ where: { id: popup.id } })
    expect(final.status).toBe('DRAFT')
    expect(final.version).toBe(0)
  })

  it('popup prêt → PUBLISHED accepté ; PAUSED/ARCHIVED conservent leurs règles', async () => {
    const popup = await createPopupDraft({ internalName: 'Popup prêt', translations: POPUP_TR }, ACTOR, testDb)
    const published = await setPopupStatus(popup.id, { status: 'PUBLISHED', expectedVersion: 0, reason: 'Validation humaine' }, ACTOR, testDb)
    expect(published.ok).toBe(true)
    const paused = await setPopupStatus(popup.id, { status: 'PAUSED', expectedVersion: 1, reason: 'Pause temporaire' }, ACTOR, testDb)
    expect(paused.ok).toBe(true)
    const archived = await setPopupStatus(popup.id, { status: 'ARCHIVED', expectedVersion: 2, reason: 'Fin de vie' }, ACTOR, testDb)
    expect(archived.ok).toBe(true)
    // Une entité archivée refuse les transitions non-archive.
    const resurrect = await setPopupStatus(popup.id, { status: 'PUBLISHED', expectedVersion: 3, reason: 'Résurrection' }, ACTOR, testDb)
    expect(resurrect.ok).toBe(false)
    if (!resurrect.ok) expect(resurrect.error).toBe('archived')
  })
})
