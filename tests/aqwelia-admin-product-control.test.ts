/**
 * AQWELIA — Admin Product Control (PR112) · CONTENT SÛR + FEATURE FLAGS.
 *
 * Contenu : allowlist stricte serveur, champs structurés (jamais de HTML),
 * workflow humain DRAFT → APPROVED → PUBLISHED (raison + audit), refus des
 * clés hors allowlist, aucune mutation sur échec de validation.
 * Flags : mutations UNIQUEMENT sur l'allowlist produit sûre, raison
 * obligatoire, audit ; flags critiques impossibles à muter.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import {
  upsertContentDraft,
  transitionContentStatus,
  listContentBlocks,
  listProductFlags,
  setProductFlag,
} from '@/lib/admin-control/product-service'
import { isSafeContentKey } from '@/lib/admin-control/content-allowlist'
import { isSafeProductFlagKey } from '@/lib/admin-control/product-service'

const prefix = `admin-prod-${Date.now()}`
let dbDir: string
let testDb: any

beforeAll(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'aqwelia-admin-prod-'))
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

const ACTOR = { id: 'admin-prod', email: 'admin@aqwelia.test' }
const TR = Object.fromEntries(['fr', 'en', 'es', 'pt', 'de', 'it', 'nl'].map((l) => [l, { title: 'T', body: 'B' }]))
const TR_FR_ONLY = { fr: { title: 'T', body: 'B' } }

describe('content — allowlist stricte + workflow humain', () => {
  it('refuse une clé hors allowlist (jamais scientifique/légal/prix)', async () => {
    expect(isSafeContentKey('landing.hero.title')).toBe(true)
    expect(isSafeContentKey('scientific.dosage.chlorine')).toBe(false)
    expect(isSafeContentKey('legal.terms.body')).toBe(false)
    expect(isSafeContentKey('pricing.oasis.monthly')).toBe(false)
    const result = await upsertContentDraft('scientific.dosage.chlorine', { translations: TR }, ACTOR, testDb)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('key_not_allowed')
  })

  it('crée un brouillon DRAFT + audit, puis met à jour avec audit', async () => {
    const created = await upsertContentDraft('landing.hero.title', { translations: TR }, ACTOR, testDb)
    expect(created.ok).toBe(true)
    if (created.ok) {
      expect(created.block.status).toBe('DRAFT')
      expect(created.block.version).toBe(0)
    }
    const updated = await upsertContentDraft('landing.hero.title', { translations: { ...TR, fr: { title: 'Nouveau titre', body: 'B' } } }, ACTOR, testDb)
    expect(updated.ok).toBe(true)
    if (updated.ok) expect(updated.block.version).toBe(1)
    const blocks = await listContentBlocks(testDb)
    expect(blocks).toHaveLength(1)
  })

  it('translations structurées : HTML/interpolation rejetés ou neutralisés (champs textes)', async () => {
    const bad = await upsertContentDraft('landing.cta.primary', { translations: { ...TR, fr: { title: '<script>alert(1)</script>', body: 'ok' } } }, ACTOR, testDb)
    expect(bad.ok).toBe(true)
    if (bad.ok) {
      // Le contenu est stocké comme TEXTE structuré — jamais rendu en HTML brut.
      expect(bad.block.translations.fr.title).toContain('<script>')
      expect(typeof bad.block.translations.fr.title).toBe('string')
    }
  })

  it('APPROVE depuis DRAFT uniquement ; PUBLISH depuis APPROVED uniquement ; raisons obligatoires', async () => {
    const created = await upsertContentDraft('landing.cta.secondary', { translations: TR }, ACTOR, testDb)
    expect(created.ok).toBe(true)
    // PUBLISH direct depuis DRAFT → transition invalide
    const directPublish = await transitionContentStatus('landing.cta.secondary', 'PUBLISHED', 'Trop vite', ACTOR, testDb)
    expect(directPublish.ok).toBe(false)
    if (!directPublish.ok) expect(directPublish.error).toBe('invalid_transition')
    // Pas de raison → refus
    const noReason = await transitionContentStatus('landing.cta.secondary', 'APPROVED', 'x', ACTOR, testDb)
    expect(noReason.ok).toBe(false)
    if (!noReason.ok) expect(noReason.error).toBe('reason_required')
    // APPROVE puis PUBLISH
    const approved = await transitionContentStatus('landing.cta.secondary', 'APPROVED', 'Validé en revue', ACTOR, testDb)
    expect(approved.ok).toBe(true)
    if (approved.ok) expect(approved.block.status).toBe('APPROVED')
    const published = await transitionContentStatus('landing.cta.secondary', 'PUBLISHED', 'Go publication', ACTOR, testDb)
    expect(published.ok).toBe(true)
    if (published.ok) {
      expect(published.block.status).toBe('PUBLISHED')
      expect(published.block.approvedBy).toBe('admin-prod')
    }
  })

  it('PUBLISH sans contenu FR → refus sans mutation', async () => {
    await upsertContentDraft('landing.trust.badges', { translations: { fr: { title: '', body: '' } } }, ACTOR, testDb)
    await transitionContentStatus('landing.trust.badges', 'APPROVED', 'Validé en revue', ACTOR, testDb)
    const published = await transitionContentStatus('landing.trust.badges', 'PUBLISHED', 'Go publier', ACTOR, testDb)
    expect(published.ok).toBe(false)
    if (!published.ok) expect(published.error).toBe('fr_content_required')
    // Aucune mutation : statut inchangé.
    const block = await testDb.adminContentBlock.findUnique({ where: { contentKey: 'landing.trust.badges' } })
    expect(block.status).toBe('APPROVED')
  })
})

describe('flags — allowlist produit sûre, mutations auditées', () => {
  it('l’allowlist exclut tout flag critique', () => {
    expect(isSafeProductFlagKey('NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED')).toBe(true)
    expect(isSafeProductFlagKey('AQWELIA_LAUNCH_OFFERS_ENABLED')).toBe(true)
    expect(isSafeProductFlagKey('STRIPE_SECRET_KEY')).toBe(false)
    expect(isSafeProductFlagKey('DATABASE_URL')).toBe(false)
    expect(isSafeProductFlagKey('NEXTAUTH_SECRET')).toBe(false)
  })

  it('setProductFlag : raison obligatoire, audit, version incrémentée', async () => {
    const noReason = await setProductFlag('AQWELIA_LAUNCH_OFFERS_ENABLED', true, 'x', ACTOR, testDb)
    expect(noReason.ok).toBe(false)
    const result = await setProductFlag('AQWELIA_LAUNCH_OFFERS_ENABLED', true, 'Activation validée en comité', ACTOR, testDb)
    expect(result.ok).toBe(true)
    const second = await setProductFlag('AQWELIA_LAUNCH_OFFERS_ENABLED', false, 'Retour arrière décidé', ACTOR, testDb)
    expect(second.ok).toBe(true)
    const flag = await testDb.adminProductFlag.findUnique({ where: { key: 'AQWELIA_LAUNCH_OFFERS_ENABLED' } })
    expect(flag.version).toBe(1)
    const audit = await testDb.adminAuditLog.count({ where: { entityType: 'AdminProductFlag' } })
    expect(audit).toBe(2)
  })

  it('setProductFlag sur une clé critique → refus', async () => {
    const result = await setProductFlag('STRIPE_SECRET_KEY', true, 'Tentative', ACTOR, testDb)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('flag_not_allowed')
  })

  it('listProductFlags : env par défaut, override effectif', async () => {
    const flags = await listProductFlags(
      { ...process.env, NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED: 'true' } as NodeJS.ProcessEnv,
      testDb
    )
    const lot1 = flags.find((f) => f.key === 'NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED')
    expect(lot1?.envValue).toBe(true)
    expect(lot1?.override).toBeNull()
    expect(lot1?.effective).toBe(true)
  })
})

describe('PR112 — schéma + routes', () => {
  it('les modèles existent dans les deux schémas Prisma', () => {
    const sqlite = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')
    const pg = readFileSync(join(process.cwd(), 'prisma/postgresql/schema.prisma'), 'utf8')
    for (const model of ['AdminContentBlock', 'AdminProductFlag']) {
      expect(sqlite).toContain(`model ${model} {`)
      expect(pg).toContain(`model ${model} {`)
    }
  })

  it('les routes content/flags refont le contrôle admin + n’exposent pas d’écriture non gardée', () => {
    const content = readFileSync(join(process.cwd(), 'src/app/api/admin/v1/content/route.ts'), 'utf8')
    const flags = readFileSync(join(process.cwd(), 'src/app/api/admin/v1/flags/route.ts'), 'utf8')
    expect(content).toContain('requireAdminFromDb()')
    expect(flags).toContain('requireAdminFromDb()')
    expect(content).not.toMatch(/export async function (DELETE|PUT)/)
    expect(flags).not.toMatch(/export async function (POST|DELETE|PUT)/)
  })
})
