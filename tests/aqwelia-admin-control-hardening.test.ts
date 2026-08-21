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
import { createBannerDraft, createPopupDraft, setBannerStatus, setPopupStatus, listAuditLogs } from '@/lib/admin-control/service'

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

describe('P1 — URL CTA / image durcies', () => {
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

  it('le payload bannière rejette un CTA dangereux à la création', async () => {
    await expect(
      createBannerDraft({ internalName: 'XSS', translations: FULL_TR, ctaUrl: 'javascript:alert(1)' }, ACTOR, testDb)
    ).rejects.toThrow()
    await expect(
      createBannerDraft({ internalName: 'ProtoRel', translations: FULL_TR, ctaUrl: '//evil.example.com' }, ACTOR, testDb)
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
