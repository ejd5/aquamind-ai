/**
 * AQWELIA Launch offers — régression des 4 nouveaux commentaires Codex (PR #88).
 *
 * P1#1 — Quotas configurés par offre : allocations dérivées du quota de variante.
 * P2#2 — Agrégation de reallocate limitée à la campagne courante.
 * P2#3 — seedCampaign atomique (transaction + idempotent + graphe complet).
 * P2#4 — Idempotence paiement composite (provider + providerTransactionId) +
 *        validation du contexte de la redemption existante.
 *
 * Base SQLite dédiée + client Prisma dédié, injecté dans admin/service.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import type { LaunchDb } from '@/lib/launch-offers/service'
import { seedCampaign, setCampaignStatus, reallocate } from '@/lib/launch-offers/admin'
import { createReservation, confirmRedemption } from '@/lib/launch-offers/service'
import { computeLaunchAllocationSplit, LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE } from '@/lib/launch-offers/config'

process.env.AQWELIA_LAUNCH_OFFERS_ENABLED = 'true'
process.env.AQWELIA_LAUNCH_TOKEN_SECRET = 'regr-test-token-secret'

const prefix = `launch-regr-${Date.now()}`
let userSeq = 0
let dbDir: string
let dbFile: string
let testDb: LaunchDb

async function makeUser(): Promise<string> {
  userSeq += 1
  const u = await testDb.user.create({
    data: { email: `${prefix}-u${userSeq}@aqwelia.test`, passwordHash: 'x', country: 'FR', countryVerifiedAt: new Date(), countrySource: 'test' },
  })
  return u.id
}

async function allocOf(offerCode: string, platform: string) {
  const v = await testDb.promotionVariant.findFirst({ where: { code: offerCode } })
  const a = await testDb.promotionAllocation.findFirst({ where: { variantId: v!.id, platform, planId: null } })
  return a!
}

function amountA() { return { paidAmountMinor: 349, normalAmountMinor: 699 } }

beforeAll(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'aqwelia-launch-regr-'))
  dbFile = join(dbDir, 'test.db')
  execSync(`bunx prisma db push --skip-generate --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: `file:${dbFile}` },
    stdio: 'pipe',
  })
  testDb = new PrismaClient({
    datasources: { db: { url: `file:${dbFile}` } },
    transactionOptions: { maxWait: 8_000, timeout: 30_000 },
  })
})

afterAll(async () => {
  await testDb.$disconnect()
  rmSync(dbDir, { recursive: true, force: true })
})

afterEach(async () => {
  // Nettoyage complet de la base entre chaque test (la campagne est re-seedée
  // par les tests qui en ont besoin).
  const c = await testDb.promotionCampaign.findUnique({ where: { code: 'AQWELIA_LAUNCH_2026' } })
  if (c) {
    await testDb.promotionAuditLog.deleteMany({ where: { campaignId: c.id } })
    await testDb.promotionRedemption.deleteMany({ where: { campaignId: c.id } })
    await testDb.promotionReservation.deleteMany({ where: { campaignId: c.id } })
    await testDb.promotionVariant.deleteMany({ where: { campaignId: c.id } })
    await testDb.promotionCampaign.deleteMany({ where: { id: c.id } })
  }
  const others = await testDb.promotionCampaign.findMany({ where: { code: { not: 'AQWELIA_LAUNCH_2026' } } })
  for (const oc of others) {
    await testDb.promotionAuditLog.deleteMany({ where: { campaignId: oc.id } })
    await testDb.promotionRedemption.deleteMany({ where: { campaignId: oc.id } })
    await testDb.promotionReservation.deleteMany({ where: { campaignId: oc.id } })
    await testDb.promotionVariant.deleteMany({ where: { campaignId: oc.id } })
    await testDb.promotionCampaign.deleteMany({ where: { id: oc.id } })
  }
  await testDb.subscription.deleteMany({})
  await testDb.user.deleteMany({})
})

// ─────────────────────────────────────────────────────────────────────────────
// P1#1 — Quotas configurés par offre.
// ─────────────────────────────────────────────────────────────────────────────

describe('P1 #1 — allocations derived from the configured variant quota', () => {
  it('computeLaunchAllocationSplit preserves the exact commercial split at defaults', () => {
    // 300 → 180/75/45 ; 200 → 120/50/30.
    expect(computeLaunchAllocationSplit(LAUNCH_OFFER_A_CODE, 300)).toEqual({ web: 180, ios: 75, android: 45 })
    expect(computeLaunchAllocationSplit(LAUNCH_OFFER_B_CODE, 200)).toEqual({ web: 120, ios: 50, android: 30 })
  })

  it('sum of allocations always equals the variant quota (deterministic rounding)', () => {
    for (const quota of [1, 2, 3, 7, 99, 100, 101, 333, 500]) {
      for (const code of [LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE]) {
        const split = computeLaunchAllocationSplit(code, quota)
        const sum = split.web + split.ios + split.android
        expect(sum).toBe(quota)
        expect(split.web).toBeGreaterThanOrEqual(0)
        expect(split.ios).toBeGreaterThanOrEqual(0)
        expect(split.android).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('seedCampaign with custom A/B quotas derives allocations that sum to each variant quota', async () => {
    process.env.AQWELIA_LAUNCH_QUOTA_A = '100'
    process.env.AQWELIA_LAUNCH_QUOTA_B = '80'
    try {
      const seeded = await seedCampaign(testDb)
      expect(seeded.created).toBe(true)

      const variants = await testDb.promotionVariant.findMany({ include: { allocations: true } })
      expect(variants).toHaveLength(2)
      const variantA = variants.find((v) => v.code === LAUNCH_OFFER_A_CODE)!
      const variantB = variants.find((v) => v.code === LAUNCH_OFFER_B_CODE)!
      const sumA = variantA.allocations.reduce((s, a) => s + a.quota, 0)
      const sumB = variantB.allocations.reduce((s, a) => s + a.quota, 0)
      // La somme des allocations ne dépasse jamais le quota de la variante et
      // lui est exactement égale.
      expect(sumA).toBe(variantA.quota)
      expect(sumA).toBe(100)
      expect(sumB).toBe(variantB.quota)
      expect(sumB).toBe(80)
      expect(variantA.allocations).toHaveLength(3)
      expect(variantB.allocations).toHaveLength(3)
    } finally {
      delete process.env.AQWELIA_LAUNCH_QUOTA_A
      delete process.env.AQWELIA_LAUNCH_QUOTA_B
    }
  })

  it('reallocate refuses to exceed the variant quota', async () => {
    const seeded = await seedCampaign(testDb)
    expect(seeded.created).toBe(true)
    await setCampaignStatus('ACTIVE', 'test', undefined, testDb)

    // Variante A par défaut : 300 → WEB 180. Augmenter WEB au-delà du quota
    // de variante (ex. 200 sur la variante A) doit être refusé.
    const allocWeb = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB')
    const res = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 200, actor: 'test' }, testDb)
    expect(res.ok).toBe(false)
    expect(res.error).toBe('exceeds_variant_quota')
    // Quota inchangé.
    const after = await testDb.promotionAllocation.findUnique({ where: { id: allocWeb.id } })
    expect(after!.quota).toBe(180)
  })

  it('reallocate within the variant quota still works', async () => {
    const seeded = await seedCampaign(testDb)
    expect(seeded.created).toBe(true)
    await setCampaignStatus('ACTIVE', 'test', undefined, testDb)
    const allocWeb = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB')
    const res = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 160, actor: 'test' }, testDb)
    expect(res.ok).toBe(true)
    const after = await testDb.promotionAllocation.findUnique({ where: { id: allocWeb.id } })
    expect(after!.quota).toBe(160)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P2#2 — Agrégation de reallocate limitée à la campagne courante.
// ─────────────────────────────────────────────────────────────────────────────

describe('P2 #2 — reallocate is scoped to the current campaign', () => {
  it('an old campaign never influences the current campaign reallocation', async () => {
    const seeded = await seedCampaign(testDb)
    expect(seeded.created).toBe(true)
    await setCampaignStatus('ACTIVE', 'test', undefined, testDb)

    // Ancienne campagne avec de nombreuses allocations (dépasserait totalQuota
    // si elle était incluse dans l'agrégat).
    const oldCampaign = await testDb.promotionCampaign.create({
      data: { code: `OLD_LAUNCH_${Date.now()}`, name: 'Old', status: 'ENDED', totalQuota: 100000 },
    })
    const oldVariant = await testDb.promotionVariant.create({
      data: { campaignId: oldCampaign.id, code: LAUNCH_OFFER_A_CODE, quota: 90000, billingPeriod: 'P1M', discountKind: 'PERCENT_ONCE', discountValue: 50 },
    })
    await testDb.promotionAllocation.createMany({
      data: [
        { variantId: oldVariant.id, platform: 'WEB', planId: null, quota: 30000 },
        { variantId: oldVariant.id, platform: 'IOS', planId: null, quota: 30000 },
        { variantId: oldVariant.id, platform: 'ANDROID', planId: null, quota: 30000 },
      ],
    })

    // La campagne courante : 300 (A) + 200 (B) = 500. Réallouer WEB A à 190
    // garde le total à 510 → 500 - 180 + 190 = 510 > 500 → refus global correct.
    // Mais une réallocation qui RESTE sous le quota global doit être acceptée
    // SANS que l'ancienne campagne (90000) fasse rejeter par erreur.
    const allocWeb = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB')
    // 500 - 180 + 170 = 490 ≤ 500 → accepté ; l'ancienne campagne ne doit pas
    // être comptée.
    const res = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 170, actor: 'test' }, testDb)
    expect(res.ok).toBe(true)
    const after = await testDb.promotionAllocation.findUnique({ where: { id: allocWeb.id } })
    expect(after!.quota).toBe(170)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P2#3 — seedCampaign atomique.
// ─────────────────────────────────────────────────────────────────────────────

describe('P2 #3 — atomic campaign seed', () => {
  it('creates the complete graph (2 variants, 6 allocations)', async () => {
    const seeded = await seedCampaign(testDb)
    expect(seeded.created).toBe(true)
    const c = await testDb.promotionCampaign.findUnique({
      where: { code: 'AQWELIA_LAUNCH_2026' },
      include: { variants: { include: { allocations: true } } },
    })
    expect(c).not.toBeNull()
    expect(c!.variants).toHaveLength(2)
    expect(c!.variants.flatMap((v) => v.allocations)).toHaveLength(6)
  })

  it('a second seed is idempotent (created: false)', async () => {
    const s1 = await seedCampaign(testDb)
    expect(s1.created).toBe(true)
    const s2 = await seedCampaign(testDb)
    expect(s2.created).toBe(false)
  })

  it('concurrent seeds produce exactly one campaign and no durable error', async () => {
    const [a, b] = await Promise.all([seedCampaign(testDb), seedCampaign(testDb)])
    // Un seul a créé ; l'autre a été traité de façon idempotente.
    expect(a.created !== b.created).toBe(true)
    const count = await testDb.promotionCampaign.count({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    expect(count).toBe(1)
    // Le graphe est complet (pas de graphe partiel).
    const c = await testDb.promotionCampaign.findUnique({
      where: { code: 'AQWELIA_LAUNCH_2026' },
      include: { variants: { include: { allocations: true } } },
    })
    expect(c!.variants).toHaveLength(2)
    expect(c!.variants.flatMap((v) => v.allocations)).toHaveLength(6)
  })

  it('a failed insert rolls back the whole graph (no partial campaign)', async () => {
    // Simule une transaction en mémoire : les inserts ne sont PAS persistés
    // (rollback) et la 2e création de variante lève une erreur. Après l'échec,
    // la base réelle ne doit contenir AUCUN graphe partiel.
    let variantCreates = 0
    const brokenClient = {
      ...testDb,
      $transaction: async (cb: any) => {
        const staged: any[] = []
        const tx = new Proxy({} as any, {
          get(_t: any, prop: string) {
            if (prop === 'promotionCampaign') return { create: async (d: any) => { staged.push(['campaign', d]); return { id: `mock-c-${Date.now()}`, ...d.data } } }
            if (prop === 'promotionVariant') return {
              create: async (d: any) => {
                variantCreates += 1
                if (variantCreates === 2) throw new Error('simulated_insert_failure')
                staged.push(['variant', d])
                return { id: `mock-v-${Date.now()}-${variantCreates}`, ...d.data }
              },
            }
            if (prop === 'promotionAllocation') return { create: async (d: any) => { staged.push(['allocation', d]); return { id: `mock-a-${Date.now()}-${staged.length}`, ...d.data } } }
            return testDb[prop]
          },
        })
        return cb(tx)
      },
    } as any
    await expect(seedCampaign(brokenClient)).rejects.toThrow('simulated_insert_failure')
    // Rien n'a été persisté → aucun graphe partiel en base réelle.
    const c = await testDb.promotionCampaign.findUnique({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    expect(c).toBeNull()
    const variants = await testDb.promotionVariant.count()
    expect(variants).toBe(0)
    const allocs = await testDb.promotionAllocation.count()
    expect(allocs).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P2#4 — Idempotence paiement composite (provider + providerTransactionId).
// ─────────────────────────────────────────────────────────────────────────────

describe('P2 #4 — payment idempotency is provider+transaction scoped and context-validated', () => {
  async function setup() {
    await seedCampaign(testDb)
    await setCampaignStatus('ACTIVE', 'test', undefined, testDb)
  }

  it('exact same webhook replay → alreadyProcessed', async () => {
    await setup()
    const u = await makeUser()
    const tx = `${prefix}-p24a-${randomUUID()}`
    const c1 = await confirmRedemption({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: tx, ...amountA() }, testDb)
    expect(c1.ok).toBe(true)
    const c2 = await confirmRedemption({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: tx, ...amountA() }, testDb)
    expect(c2.ok).toBe(true)
    if (c2.ok) expect(c2.alreadyProcessed).toBe(true)
  })

  it('same ID across two different providers → second creates its own redemption', async () => {
    await setup()
    const u1 = await makeUser()
    const u2 = await makeUser()
    const tx = `${prefix}-p24b-${randomUUID()}`
    // APPLE → IOS, GOOGLE → ANDROID (mapping fournisseur/plateforme valide).
    const c1 = await confirmRedemption({ userId: u1, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', provider: 'APPLE', providerTransactionId: tx, ...amountA() }, testDb)
    expect(c1.ok).toBe(true)
    const c2 = await confirmRedemption({ userId: u2, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'ANDROID', provider: 'GOOGLE', providerTransactionId: tx, ...amountA() }, testDb)
    // Identité composite (GOOGLE, tx) ≠ (APPLE, tx) → nouvelle redemption.
    expect(c2.ok).toBe(true)
    if (c2.ok) expect(c2.alreadyProcessed).toBe(false)
    const red = await testDb.promotionRedemption.count()
    expect(red).toBe(2)
  })

  it('same ID with a different user → refused, counters unchanged', async () => {
    await setup()
    const u1 = await makeUser()
    const u2 = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB')
    const tx = `${prefix}-p24c-${randomUUID()}`
    const c1 = await confirmRedemption({ userId: u1, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: tx, ...amountA() }, testDb)
    expect(c1.ok).toBe(true)

    const before = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    const c2 = await confirmRedemption({ userId: u2, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: tx, ...amountA() }, testDb)
    expect(c2.ok).toBe(false)
    if (!c2.ok) expect(c2.reasonCode).toBe('PAYMENT_CONTEXT_MISMATCH')
    const after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.confirmedCount).toBe(before!.confirmedCount)
    expect(after!.reservedCount).toBe(before!.reservedCount)
    const campaign = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    expect(campaign!.confirmedCount).toBe(1) // seule la 1re redemption compte
  })

  it('same ID with wrong offer/plan/platform → refused, counters unchanged', async () => {
    await setup()
    const u = await makeUser()
    const allocA = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB')
    const tx = `${prefix}-p24d-${randomUUID()}`
    const c1 = await confirmRedemption({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: tx, ...amountA() }, testDb)
    expect(c1.ok).toBe(true)

    // Même ID mais offre B (variante différente) → refus sûr.
    const c2 = await confirmRedemption({ userId: u, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: tx, paidAmountMinor: 1398, normalAmountMinor: 1999 }, testDb)
    expect(c2.ok).toBe(false)
    if (!c2.ok) expect(c2.reasonCode).toBe('PAYMENT_CONTEXT_MISMATCH')

    // Même ID mais fournisseur/plateforme différent (APPLE+IOS vs STRIPE+WEB) →
    // identité composite distincte, mais même user → unicité campagne/user refuse
    // (OFFER_ALREADY_REDEEMED) ou refus de contexte → dans les deux cas, refus sûr.
    const c3 = await confirmRedemption({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', provider: 'APPLE', providerTransactionId: tx, ...amountA() }, testDb)
    expect(c3.ok).toBe(false)
    if (!c3.ok) expect(c3.reasonCode).toBe('OFFER_ALREADY_REDEEMED')

    // Une combinaison fournisseur/plateforme invalide (STRIPE+IOS) est refusée
    // AVANT toute sélection d'allocation.
    const bad = await confirmRedemption({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', provider: 'STRIPE', providerTransactionId: `${tx}-x`, ...amountA() }, testDb)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.reasonCode).toBe('PLATFORM_NOT_ELIGIBLE')

    const after = await testDb.promotionAllocation.findUnique({ where: { id: allocA.id } })
    expect(after!.confirmedCount).toBe(1)
    const allocB = await allocOf(LAUNCH_OFFER_B_CODE, 'WEB')
    expect(allocB.confirmedCount).toBe(0)
    const allocIOS = await allocOf(LAUNCH_OFFER_A_CODE, 'IOS')
    expect(allocIOS.confirmedCount).toBe(0)
    const allocAndroid = await allocOf(LAUNCH_OFFER_A_CODE, 'ANDROID')
    expect(allocAndroid.confirmedCount).toBe(0)
  })
})
