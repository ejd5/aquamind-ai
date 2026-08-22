/**
 * AQWELIA — Admin Completion Core (PR111) · ANNOUNCEMENTS + SYSTEM STATUS.
 *
 * Annonces : mêmes garanties que bannières/popups (auth serveur, CAS,
 * raison obligatoire pour publier, readiness FR/7 locales, dates effectives,
 * audit gagnant unique, URLs sûres). Système : READ ONLY, jamais de secrets,
 * timeouts bornés, statuts HEALTHY/DEGRADED/UNAVAILABLE/UNKNOWN.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import {
  createAnnouncementDraft,
  updateAnnouncementDraft,
  setAnnouncementStatus,
  listAnnouncements,
  listAuditLogs,
} from '@/lib/admin-control/service'
import { ctaUrlSchema } from '@/lib/admin-control/schemas'

const prefix = `admin-ann-${Date.now()}`
let dbDir: string
let testDb: any

beforeAll(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'aqwelia-admin-ann-'))
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

const ACTOR = { id: 'admin-ann', email: 'admin@aqwelia.test' }
const ANN_TR = Object.fromEntries(
  ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl'].map((l) => [l, { title: 'Titre', body: 'Corps' }])
) as never

describe('announcements — cycle de vie humain', () => {
  it('crée un brouillon + audit ANNOUNCEMENT_CREATED', async () => {
    const ann = await createAnnouncementDraft({ internalName: 'Annonce été', translations: ANN_TR, priority: 1 }, ACTOR, testDb)
    expect(ann.status).toBe('DRAFT')
    expect(ann.version).toBe(0)
    const logs = await listAuditLogs({ entityType: 'AdminContentAnnouncement', limit: 5 }, testDb)
    expect(logs.some((l) => l.action === 'ANNOUNCEMENT_CREATED')).toBe(true)
  })

  it('update CAS : stale refusé, gagnant v=N+1, un seul audit', async () => {
    const ann = await createAnnouncementDraft({ internalName: 'CAS ann', translations: ANN_TR }, ACTOR, testDb)
    const ok = await updateAnnouncementDraft(ann.id, { internalName: 'CAS gagnant', expectedVersion: 0 }, ACTOR, testDb)
    expect(ok.ok).toBe(true)
    const stale = await updateAnnouncementDraft(ann.id, { internalName: 'CAS stale', expectedVersion: 0 }, ACTOR, testDb)
    expect(stale.ok).toBe(false)
    if (!stale.ok) expect(stale.error).toBe('stale_version')
    const final = await testDb.adminContentAnnouncement.findUnique({ where: { id: ann.id } })
    expect(final.version).toBe(1)
    expect(final.internalName).toBe('CAS gagnant')
    const logs = await listAuditLogs({ entityId: ann.id, limit: 10 }, testDb)
    expect(logs.filter((l) => l.action === 'ANNOUNCEMENT_UPDATED')).toHaveLength(1)
  })

  it('publish : raison obligatoire, readiness FR/7 locales, CAS, audit + approbateur', async () => {
    const ann = await createAnnouncementDraft({ internalName: 'Publish ann', translations: ANN_TR }, ACTOR, testDb)
    await expect(
      setAnnouncementStatus(ann.id, { status: 'PUBLISHED', expectedVersion: 0, reason: 'x' }, ACTOR, testDb)
    ).rejects.toThrow()
    const result = await setAnnouncementStatus(ann.id, { status: 'PUBLISHED', expectedVersion: 0, reason: 'Validation humaine' }, ACTOR, testDb)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.announcement.status).toBe('PUBLISHED')
      expect(result.announcement.approvedBy).toBe('admin-ann')
    }
    const logs = await listAuditLogs({ entityId: ann.id, limit: 10 }, testDb)
    const statusLog = logs.find((l) => l.action === 'ANNOUNCEMENT_STATUS_CHANGED')
    expect(statusLog).toBeTruthy()
  })

  it('publish sans FR → refus sans mutation ni audit', async () => {
    const ann = await createAnnouncementDraft(
      {
        internalName: 'Sans FR',
        translations: Object.fromEntries(
          ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl'].map((l) => [l, { title: l === 'fr' ? '' : 'T', body: 'B' }])
        ) as never,
      },
      ACTOR,
      testDb
    )
    const result = await setAnnouncementStatus(ann.id, { status: 'PUBLISHED', expectedVersion: 0, reason: 'Test' }, ACTOR, testDb)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('fr_title_required')
    const final = await testDb.adminContentAnnouncement.findUnique({ where: { id: ann.id } })
    expect(final.status).toBe('DRAFT')
    expect(final.version).toBe(0)
    const logs = await listAuditLogs({ entityId: ann.id, limit: 10 }, testDb)
    expect(logs.filter((l) => l.action === 'ANNOUNCEMENT_STATUS_CHANGED')).toHaveLength(0)
  })

  it('SCHEDULED sans startAt → refus ; CTA javascript: → refus Zod', async () => {
    const ann = await createAnnouncementDraft({ internalName: 'Sched ann', translations: ANN_TR }, ACTOR, testDb)
    await expect(
      setAnnouncementStatus(ann.id, { status: 'SCHEDULED', expectedVersion: 0, reason: 'Planif' }, ACTOR, testDb)
    ).rejects.toThrow()
    await expect(
      createAnnouncementDraft({ internalName: 'XSS', translations: ANN_TR, ctaUrl: 'javascript:alert(1)' }, ACTOR, testDb)
    ).rejects.toThrow()
  })

  it('archive puis verrouille les transitions non-archive', async () => {
    const ann = await createAnnouncementDraft({ internalName: 'Arch ann', translations: ANN_TR }, ACTOR, testDb)
    const archived = await setAnnouncementStatus(ann.id, { status: 'ARCHIVED', expectedVersion: 0, reason: 'Fin de vie' }, ACTOR, testDb)
    expect(archived.ok).toBe(true)
    const resurrect = await setAnnouncementStatus(ann.id, { status: 'PUBLISHED', expectedVersion: 1, reason: 'Résurrection' }, ACTOR, testDb)
    expect(resurrect.ok).toBe(false)
    if (!resurrect.ok) expect(resurrect.error).toBe('archived')
  })
})

describe('system status — READ ONLY, jamais de secrets', () => {
  it("l'API système n'expose aucun secret ni valeur d'environnement brute", () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/admin/v1/system/route.ts'), 'utf8')
    // Seules des lectures SÛRES sont permises (NODE_ENV, VERCEL_GIT_COMMIT_SHA,
    // présence booléenne fournisseur, nom du provider). Jamais une valeur brute.
    expect(src).not.toMatch(/process\.env\.(NEXTAUTH|APPLE|GOOGLE|SMTP)/)
    expect(src).toContain('requireAdminFromDb')
    expect(src).toContain('HEALTHY')
    expect(src).toContain('UNAVAILABLE')
    expect(src).toContain('withTimeout')
    // Le corps de réponse (second NextResponse.json) ne contient AUCUN secret.
    const first = src.indexOf('NextResponse.json')
    const second = src.indexOf('NextResponse.json', first + 1)
    const response = src.slice(second)
    expect(response).not.toContain('password')
    expect(response).not.toContain('apiKey')
    expect(response).not.toContain('secret')
    expect(response).not.toMatch(/process\.env\.(?!NODE_ENV\b)[A-Z_]+/)
  })

  it('la réponse contient uniquement des champs sûrs (contrat)', async () => {
    const src = readFileSync(join(process.cwd(), 'src/app/api/admin/v1/system/route.ts'), 'utf8')
    for (const field of ['status', 'runtime', 'environment', 'appVersion', 'gitSha', 'database', 'adminControlPlane', 'providerConfigurationPresence']) {
      expect(src, field).toContain(field)
    }
    // La présence fournisseur n'est JAMAIS une valeur : uniquement des booléens.
    const presence = src.slice(src.indexOf('const providerPresence'))
    expect(presence).toMatch(/stripe: Boolean\(process\.env\.STRIPE_SECRET_KEY\)/)
    expect(presence).toMatch(/revenuecat: Boolean\(process\.env\.REVENUECAT_API_KEY\)/)
    expect(presence).not.toContain('process.env.STRIPE_SECRET_KEY ??')
    expect(presence).not.toMatch(/Boolean\(process\.env\.[A-Z_]+\s*\|\|/)
  })

  it('la section UI système remplace le placeholder (plus de "préparé pour la V2")', () => {
    const section = readFileSync(join(process.cwd(), 'src/components/admin/system-status-section.tsx'), 'utf8')
    expect(section).toContain('/api/admin/v1/system')
    expect(section).not.toContain('V2')
    expect(section).not.toContain('préparé')
  })
})

describe('PR111 — parité schéma + i18n', () => {
  it('AdminContentAnnouncement existe dans les deux schémas Prisma', () => {
    const sqlite = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')
    const pg = readFileSync(join(process.cwd(), 'prisma/postgresql/schema.prisma'), 'utf8')
    expect(sqlite).toContain('model AdminContentAnnouncement {')
    expect(pg).toContain('model AdminContentAnnouncement {')
  })

  it('les clés i18n des modules annonces/système existent dans les 7 locales', () => {
    const keys = ['cpAnnouncementsTitle', 'cpAnnouncementsDesc', 'cpAnnouncementsCreate', 'cpAnnouncementsEmpty', 'cpSystemTitle', 'cpSystemDesc', 'cpSystemStatus', 'cpSystemDatabase', 'cpSystemMigrations', 'cpSystemAdminTables']
    for (const locale of ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl']) {
      const data = JSON.parse(readFileSync(join(process.cwd(), `src/i18n/locales/${locale}.json`), 'utf8'))
      for (const key of keys) {
        expect(data.admin[key], `${locale}.${key}`).toBeTruthy()
      }
    }
  })
})
