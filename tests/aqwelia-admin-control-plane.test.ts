/**
 * AQWELIA — Admin Control Plane V1 · tests service + agentic + sécurité.
 *
 * Base SQLite temporaire isolée (prisma db push), client injecté : aucun
 * impact sur la DB locale partagée. Couvre :
 *   - création/mise à jour de brouillons + audit systématique ;
 *   - optimistic concurrency (stale_version refusée) ;
 *   - publish = action humaine explicite (raison obligatoire, approbateur) ;
 *   - ciblage : résolution canonique serveur uniquement ;
 *   - agentic : NEEDS_REVIEW systématique, guardrails, jamais de publication ;
 *   - feature flags : allowlist produit, flags critiques jamais exposés ;
 *   - parité des modèles Prisma SQLite/PostgreSQL ;
 *   - parité i18n admin sur les 7 locales.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import {
  createBannerDraft,
  updateBannerDraft,
  setBannerStatus,
  createPopupDraft,
  updatePopupDraft,
  setPopupStatus,
  listAuditLogs,
} from '@/lib/admin-control/service'
import { resolveTargetingMatch, translationCompleteness, isWithinSchedule } from '@/lib/admin-control/targeting'
import { isCriticalFlagKey, getSafeFlagsView } from '@/lib/admin-control/safe-flags'
import { runAdminAgent, reviewProposal, runGuardrailSupervisor, opportunityDetector } from '@/lib/admin-agentic/agents'

const prefix = `admincp-${Date.now()}`
let dbDir: string
let testDb: any

beforeAll(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'aqwelia-admincp-'))
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

const ACTOR = { id: 'admin-test', email: 'admin@aqwelia.test' }
const FULL_TRANSLATIONS = { fr: 'Texte FR', en: 'EN text', es: 'Texto ES', pt: 'Texto PT', de: 'DE Text', it: 'Testo IT', nl: 'NL tekst' }

describe('bannières — brouillon, audit, concurrence, publish humain', () => {
  it('crée un BROUILLON et journalise BANNER_CREATED', async () => {
    const banner = await createBannerDraft(
      { internalName: 'Été 2026', translations: FULL_TRANSLATIONS, variant: 'LAGOON', priority: 2 },
      ACTOR,
      testDb
    )
    expect(banner.status).toBe('DRAFT')
    expect(banner.version).toBe(0)
    const logs = await listAuditLogs({ entityType: 'AdminContentBanner', limit: 5 }, testDb)
    expect(logs.some((l) => l.action === 'BANNER_CREATED' && l.entityId === banner.id && l.actor === 'admin@aqwelia.test')).toBe(true)
  })

  it('refuse un payload invalide (locale manquante / nom interne interdit)', async () => {
    await expect(
      createBannerDraft({ internalName: 'X', translations: { fr: 'ok' } as never }, ACTOR, testDb)
    ).rejects.toThrow()
    await expect(
      createBannerDraft({ internalName: 'Injection <script>', translations: FULL_TRANSLATIONS }, ACTOR, testDb)
    ).rejects.toThrow()
  })

  it('refuse un lost update (expectedVersion obsolète)', async () => {
    const banner = await createBannerDraft({ internalName: 'Concurrence', translations: FULL_TRANSLATIONS }, ACTOR, testDb)
    // Un client à jour pousse la version à 1.
    const fresh = await updateBannerDraft(banner.id, { internalName: 'Client à jour', expectedVersion: banner.version }, ACTOR, testDb)
    expect(fresh.ok).toBe(true)
    // Un ancien client (version 0 en main) ne peut plus écraser silencieusement.
    const stale = await updateBannerDraft(banner.id, { internalName: 'Vieux client', expectedVersion: 0 }, ACTOR, testDb)
    expect(stale.ok).toBe(false)
    if (!stale.ok) expect(stale.error).toBe('stale_version')
    const logs = await listAuditLogs({ entityType: 'AdminContentBanner', limit: 10 }, testDb)
    expect(logs.some((l) => l.action === 'BANNER_UPDATED' && l.before && l.after)).toBe(true)
  })

  it('le publish exige une raison et marque l’approbateur humain', async () => {
    const banner = await createBannerDraft({ internalName: 'Publish test', translations: FULL_TRANSLATIONS }, ACTOR, testDb)
    await expect(setBannerStatus(banner.id, { status: 'PUBLISHED', expectedVersion: banner.version, reason: 'x' }, ACTOR, testDb)).rejects.toThrow()
    const result = await setBannerStatus(banner.id, { status: 'PUBLISHED', expectedVersion: banner.version, reason: 'Validation campagne été' }, ACTOR, testDb)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.banner.status).toBe('PUBLISHED')
      expect(result.banner.approvedBy).toBe('admin-test')
    }
    const logs = await listAuditLogs({ entityType: 'AdminContentBanner', limit: 10 }, testDb)
    const statusLog = logs.find((l) => l.action === 'BANNER_STATUS_CHANGED')
    expect((statusLog?.metadata as { reason?: string } | null | undefined)?.reason).toBe('Validation campagne été')
  })
})

describe('popups — brouillon + archive', () => {
  it('crée, met à jour et archive un popup avec audit', async () => {
    const popup = await createPopupDraft(
      {
        internalName: 'Popup été',
        translations: {
          fr: { title: 'T', body: 'B' },
          en: { title: 'T', body: 'B' },
          es: { title: 'T', body: 'B' },
          pt: { title: 'T', body: 'B' },
          de: { title: 'T', body: 'B' },
          it: { title: 'T', body: 'B' },
          nl: { title: 'T', body: 'B' },
        },
        trigger: 'ON_EXIT',
        frequency: 'ONCE',
      },
      ACTOR,
      testDb
    )
    expect(popup.status).toBe('DRAFT')
    const updated = await updatePopupDraft(popup.id, { frequency: 'PER_SESSION', expectedVersion: popup.version }, ACTOR, testDb)
    expect(updated.ok).toBe(true)
    if (updated.ok) expect(updated.popup.frequency).toBe('PER_SESSION')
    const archived = await setPopupStatus(popup.id, { status: 'ARCHIVED', expectedVersion: 1, reason: 'Fin de campagne' }, ACTOR, testDb)
    expect(archived.ok).toBe(true)
    const logs = await listAuditLogs({ entityType: 'AdminContentPopup', limit: 10 }, testDb)
    expect(logs.some((l) => l.action === 'POPUP_ARCHIVED')).toBe(true)
    // Un popup archivé ne peut plus être modifié.
    const afterArchive = await updatePopupDraft(popup.id, { internalName: 'Nope', expectedVersion: 2 }, ACTOR, testDb)
    expect(afterArchive.ok).toBe(false)
    if (!afterArchive.ok) expect(afterArchive.error).toBe('archived')
  })
})

describe('ciblage — résolution canonique serveur uniquement', () => {
  const ctx = { locale: 'fr', country: 'FR', plan: 'oasis', platform: 'WEB' as const, zone: 'DASHBOARD', isNewUser: false }

  it('sans ciblage → tout le monde ; ciblage vide → personne bloqué', () => {
    expect(resolveTargetingMatch(null, ctx)).toBe(true)
    expect(resolveTargetingMatch({}, ctx)).toBe(true)
  })

  it('locale / pays / plateforme / zone / segment', () => {
    expect(resolveTargetingMatch({ locales: ['fr', 'en'] }, ctx)).toBe(true)
    expect(resolveTargetingMatch({ locales: ['de'] }, ctx)).toBe(false)
    expect(resolveTargetingMatch({ countries: ['FR'] }, ctx)).toBe(true)
    expect(resolveTargetingMatch({ countries: ['US'] }, ctx)).toBe(false)
    expect(resolveTargetingMatch({ platforms: ['IOS'] }, ctx)).toBe(false)
    expect(resolveTargetingMatch({ zones: ['WEATHER'] }, ctx)).toBe(false)
    expect(resolveTargetingMatch({ userSegments: ['EXISTING'] }, ctx)).toBe(true)
  })

  it('un ciblage par plan exige un plan serveur réel (jamais ?plan= client)', () => {
    expect(resolveTargetingMatch({ plans: ['oasis'] }, ctx)).toBe(true)
    expect(resolveTargetingMatch({ plans: ['premium'] }, ctx)).toBe(false)
    expect(resolveTargetingMatch({ plans: ['oasis'] }, { ...ctx, plan: null })).toBe(false)
  })

  it('complétude 7 locales + fenêtre de publication', () => {
    expect(translationCompleteness(FULL_TRANSLATIONS).filled).toBe(7)
    expect(translationCompleteness({ fr: 'x' }).missing).toContain('nl')
    expect(isWithinSchedule(new Date(Date.now() - 1000), new Date(Date.now() + 1000))).toBe(true)
    expect(isWithinSchedule(new Date(Date.now() + 1000), null)).toBe(false)
  })
})

describe('feature flags — allowlist produit, critiques jamais exposés', () => {
  it('les clés critiques sont reconnues', () => {
    expect(isCriticalFlagKey('STRIPE_SECRET_KEY')).toBe(true)
    expect(isCriticalFlagKey('DATABASE_URL')).toBe(true)
    expect(isCriticalFlagKey('NEXTAUTH_SECRET')).toBe(true)
    expect(isCriticalFlagKey('REVENUECAT_API_KEY')).toBe(true)
  })

  it('la vue ne contient que des flags produit allowlistés', () => {
    const view = getSafeFlagsView({
      ...process.env,
      NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED: 'true',
      STRIPE_SECRET_KEY: 'sk_live_secret',
    } as NodeJS.ProcessEnv)
    expect(view.map((f) => f.key)).not.toContain('STRIPE_SECRET_KEY')
    expect(view.every((f) => !isCriticalFlagKey(f.key))).toBe(true)
  })
})

describe('agentic — propose, jamais publie', () => {
  it('persiste une proposition NEEDS_REVIEW + audit', async () => {
    const proposal = await runAdminAgent('opportunityDetector', { season: 'SUMMER', zone: 'APP' }, ACTOR.id, testDb)
    expect(proposal.status).toBe('NEEDS_REVIEW')
    expect(proposal.agent).toBe('opportunityDetector')
    expect(proposal.executedAt).toBeNull()
    const logs = await listAuditLogs({ entityType: 'AdminAgentProposal', limit: 5 }, testDb)
    expect(logs.some((l) => l.action === 'AGENT_PROPOSAL_CREATED')).toBe(true)
  })

  it('le guardrail bloque les claims dangereux et le contenu billing', () => {
    const bad = runGuardrailSupervisor('copyAssistant', {
      kind: 'BANNER',
      internalName: 'Offre miracle',
      translations: { fr: 'Guérison garantie de votre eau en 24h' },
    }, { intent: 'promouvoir' })
    expect(bad.riskLevel).toBe('BLOCKED')
    expect(bad.blockedReasons.some((r) => r.startsWith('claim_'))).toBe(true)

    const billing = runGuardrailSupervisor('copyAssistant', {
      kind: 'BANNER',
      internalName: 'Promo prix',
      translations: { fr: 'Nouveau tarif à 9€' },
    }, { intent: 'changer le prix' })
    expect(billing.riskLevel).toBe('BLOCKED')
    expect(billing.blockedReasons).toContain('billing_or_pricing_content')
    expect(billing.blockedReasons).toContain('billing_change_not_allowed')
  })

  it('APPROVE ne fait QUE changer le statut (aucune exécution)', async () => {
    const proposal = await runAdminAgent('copyAssistant', { intent: 'Mettre en avant une eau saine' }, ACTOR.id, testDb)
    const result = await reviewProposal(proposal.id, 'APPROVE', 'reviewer-1', undefined, testDb)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.proposal.status).toBe('APPROVED')
      expect(result.proposal.executedAt).toBeNull()
      expect(result.proposal.reviewedBy).toBe('reviewer-1')
    }
    const logs = await listAuditLogs({ entityType: 'AdminAgentProposal', limit: 10 }, testDb)
    expect(logs.some((l) => l.action === 'AGENT_PROPOSAL_APPROVED')).toBe(true)
    // Pas de double revue.
    const again = await reviewProposal(proposal.id, 'REJECT', 'reviewer-2', undefined, testDb)
    expect(again.ok).toBe(false)
    if (!again.ok) expect(again.error).toBe('invalid_status')
  })

  it('une proposition BLOQUÉE ne peut pas être approuvée', async () => {
    const blocked = await runAdminAgent('copyAssistant', { intent: 'baisser les prix' }, ACTOR.id, testDb)
    expect(blocked.riskLevel).toBe('BLOCKED')
    const result = await reviewProposal(blocked.id, 'APPROVE', 'reviewer-1', undefined, testDb)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('blocked_proposal')
  })

  it('les payloads agents ne contiennent jamais de clés billing/prix', () => {
    const run = opportunityDetector({ season: 'SUMMER', zone: 'APP' })
    const json = JSON.stringify(run.payload)
    expect(json).not.toMatch(/price|pricing|discountPercent|planId|secret|apiKey/i)
  })
})

describe('schéma Prisma — parité SQLite/PostgreSQL', () => {
  it('les 4 modèles du control plane existent dans les deux schémas', () => {
    const sqlite = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')
    const pg = readFileSync(join(process.cwd(), 'prisma/postgresql/schema.prisma'), 'utf8')
    for (const model of ['AdminContentBanner', 'AdminContentPopup', 'AdminAuditLog', 'AdminAgentProposal']) {
      expect(sqlite).toContain(`model ${model} {`)
      expect(pg).toContain(`model ${model} {`)
    }
  })
})

describe('i18n admin — parité des 7 locales', () => {
  it('chaque locale expose exactement le même jeu de clés admin', () => {
    const locales = ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl']
    const keySets = locales.map((l) => {
      const data = JSON.parse(readFileSync(join(process.cwd(), `src/i18n/locales/${l}.json`), 'utf8'))
      return new Set(Object.keys(data.admin))
    })
    for (let i = 1; i < keySets.length; i++) {
      expect(keySets[i]).toEqual(keySets[0])
    }
  })

  it('les clés essentielles du control plane existent', () => {
    const fr = JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales/fr.json'), 'utf8'))
    for (const key of ['overviewPrincipleDesc', 'cpAgenticRule', 'cpBannersTitle', 'cpPopupsTitle', 'cpFlagsReadOnly', 'cpAuditTitle', 'accessDeniedDesc', 'cpPublishReason']) {
      expect(fr.admin[key], key).toBeTruthy()
    }
  })
})
