/**
 * AQWELIA Launch offers — tests unitaires + concurrence (spec v1.0 §21).
 *
 * Couvre : éligibilité (chaque code), prix et cohérence marketing, réservation
 * atomique (100 requêtes pour 1 place), idempotence (clé + webhook dupliqué),
 * consommation (confirmation, tardive, déjà traitée), réallocation sûre, et les
 * garde-fous de sécurité (pays serveur, idempotencyKey appartenance, échec
 * sécurisé sans secret, montants serveur, quota global).
 *
 * ISOLATION : ce fichier utilise SA PROPRE base SQLite (file dédiée) et son
 * propre client Prisma, injecté dans les fonctions de service/admin. Il ne
 * touche jamais au client partagé (`@/lib/db`) ni à la base du harnais CI.
 * Chaque test consomme un utilisateur dédié (l'éligibilité est permanente pour
 * un compte) afin d'éviter toute dépendance d'ordre entre tests.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import {
  toMinorUnits,
  computeLaunchPricing,
  marketingConsistency,
  monthlyMinor,
  quarterlyMinor,
} from '@/lib/launch-offers/pricing'
import {
  createReservation,
  releaseReservation,
  confirmRedemption,
  checkEligibility,
  expireDueReservations,
} from '@/lib/launch-offers/service'
import type { LaunchDb } from '@/lib/launch-offers/service'
import { seedCampaign, setCampaignStatus, reallocate, getCampaignAdmin } from '@/lib/launch-offers/admin'
import { LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE } from '@/lib/launch-offers/config'

// Campagne activée pour le test + secret de signature (l'échec sécurisé est
// testé séparément en vidant le secret).
process.env.AQWELIA_LAUNCH_OFFERS_ENABLED = 'true'
process.env.AQWELIA_LAUNCH_TOKEN_SECRET = 'test-token-secret-launch-offers'

const prefix = `launch-${Date.now()}`
let userSeq = 0
let dbDir: string
let dbFile: string
let testDb: LaunchDb

/** Utilisateur dédié pour un test (indépendance totale entre tests). */
async function makeUser(): Promise<string> {
  userSeq += 1
  const u = await testDb.user.create({ data: { email: `${prefix}-u${userSeq}@aqwelia.test`, passwordHash: 'x' } })
  return u.id
}

beforeAll(async () => {
  // Base SQLite dédiée, poussée depuis le schéma, client Prisma dédié.
  dbDir = mkdtempSync(join(tmpdir(), 'aqwelia-launch-'))
  dbFile = join(dbDir, 'test.db')
  execSync(`bunx prisma db push --skip-generate --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: `file:${dbFile}` },
    stdio: 'pipe',
  })
  testDb = new PrismaClient({
    datasources: { db: { url: `file:${dbFile}` } },
    // Options exactes du client applicatif (src/lib/db.ts) : le pool de
    // transactions interactives SQLite est sérialisé, un maxWait borné évite
    // les P1008 sous charge CI sans masquer les vrais ralentissements.
    transactionOptions: { maxWait: 8_000, timeout: 30_000 },
  })

  const seeded = await seedCampaign(testDb)
  expect(seeded.created).toBe(true)
  await setCampaignStatus('ACTIVE', 'test', undefined, testDb)
  // Réduire l'allocation Offre A WEB à 1 place pour le test de concurrence.
  const variant = await testDb.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
  const allocWeb = await testDb.promotionAllocation.findFirst({ where: { variantId: variant!.id, platform: 'WEB', planId: null } })
  await testDb.promotionAllocation.update({ where: { id: allocWeb!.id }, data: { quota: 1 } })
})

afterAll(async () => {
  // Ne déconnecte QUE le client dédié de ce fichier, jamais le client partagé.
  await testDb.$disconnect()
  rmSync(dbDir, { recursive: true, force: true })
})

afterEach(async () => {
  // Réinitialise les compteurs partagés (allocations + quota global) pour que
  // chaque test soit indépendant, quel que soit l'état laissé par le précédent.
  await testDb.promotionReservation.deleteMany({})
  await testDb.promotionRedemption.deleteMany({})
  await testDb.promotionAllocation.updateMany({ data: { reservedCount: 0, confirmedCount: 0 } })
  await testDb.promotionCampaign.updateMany({ data: { confirmedCount: 0 } })
})

describe('pricing & marketing consistency (prices derived from plans.ts)', () => {
  it('converts EUR floats to minor units (cents)', () => {
    expect(toMinorUnits(6.99)).toBe(699)
    expect(toMinorUnits(19.99)).toBe(1999)
    expect(toMinorUnits(0)).toBe(0)
  })

  it('Offer A = 50% once, then monthly; Offer B = 2×monthly, then quarterly (oasis)', () => {
    const a = computeLaunchPricing(LAUNCH_OFFER_A_CODE, 'oasis')!
    const b = computeLaunchPricing(LAUNCH_OFFER_B_CODE, 'oasis')!
    expect(monthlyMinor('oasis')).toBe(699)
    expect(quarterlyMinor('oasis')).toBe(1999)
    expect(a.dueNowMinor).toBe(350) // 699 * 0.5 = 349.5 → 350
    expect(a.renewalMinor).toBe(699)
    expect(a.renewalPeriod).toBe('P1M')
    expect(b.dueNowMinor).toBe(1398) // 2 × 699
    expect(b.renewalMinor).toBe(1999)
    expect(b.renewalPeriod).toBe('P3M')
  })

  it('no pricing for decouverte', () => {
    expect(computeLaunchPricing(LAUNCH_OFFER_A_CODE, 'decouverte')).toBeNull()
    expect(monthlyMinor('decouverte')).toBeNull()
  })

  it('marketing consistency allows both labels for oasis', () => {
    const c = marketingConsistency('oasis')
    expect(c.valid).toBe(true)
    expect(c.labelA50).toBe(true)
    expect(c.labelB3for2).toBe(true)
  })
})

describe('eligibility codes', () => {
  it('eligible for Offer A on WEB with a valid plan', async () => {
    const userId = await makeUser()
    const r = await checkEligibility({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB' }, testDb)
    expect(r.eligible).toBe(true)
    expect(r.offer?.pricing?.dueNowMinor).toBe(350)
    expect(r.offer?.availability.state).toBe('AVAILABLE')
  })

  it('country hint from the client never overrides the server-side country', async () => {
    const userId = await makeUser()
    const ok = await checkEligibility({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', countryHint: 'ZZ' }, testDb)
    expect(ok.eligible).toBe(true)

    const excludedUser = await testDb.user.create({ data: { email: `${prefix}-excl-${Date.now()}@aqwelia.test`, passwordHash: 'x', country: 'XX' } })
    try {
      const blocked = await checkEligibility({ userId: excludedUser.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', countryHint: 'FR' }, testDb)
      expect(blocked.eligible).toBe(false)
      expect(blocked.reasonCode).toBe('COUNTRY_NOT_ELIGIBLE')
    } finally {
      await testDb.user.deleteMany({ where: { id: excludedUser.id } })
    }
  })

  it('plan not eligible', async () => {
    const userId = await makeUser()
    const r = await checkEligibility({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'decouverte', platform: 'WEB' }, testDb)
    expect(r.eligible).toBe(false)
    expect(r.reasonCode).toBe('PLAN_NOT_ELIGIBLE')
  })

  it('platform not eligible', async () => {
    const userId = await makeUser()
    const r = await checkEligibility({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'DESKTOP' }, testDb)
    expect(r.eligible).toBe(false)
    expect(r.reasonCode).toBe('PLATFORM_NOT_ELIGIBLE')
  })

  it('account with a paid subscription is not eligible', async () => {
    const u = await testDb.user.create({ data: { email: `${prefix}-paid-${Date.now()}@aqwelia.test`, passwordHash: 'x' } })
    try {
      await testDb.subscription.create({
        data: { userId: u.id, plan: 'oasis', status: 'ACTIVE', provider: 'stripe', startedAt: new Date() },
      })
      const r = await checkEligibility({ userId: u.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB' }, testDb)
      expect(r.eligible).toBe(false)
      expect(r.reasonCode).toBe('ALREADY_SUBSCRIBED')
    } finally {
      await testDb.subscription.deleteMany({ where: { userId: u.id } })
      await testDb.user.deleteMany({ where: { id: u.id } })
    }
  })
})

describe('atomic reservation (SQLite serialized pool)', () => {
  // SQLite sérialise les transactions interactives : le VRAI test de concurrence
  // (100 requêtes, 1 place) est exécuté sur PostgreSQL (voir
  // tests/aqwelia-launch-offers-postgresql.test.ts), où le pool autorise la
  // concurrence réelle. Ici on vérifie seulement le comportement séquentiel.
  it('reserves exactly one slot sequentially', async () => {
    const u1 = await makeUser()
    const u2 = await makeUser()
    const r1 = await createReservation({ userId: u1, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-seq-${randomUUID()}` }, testDb)
    const r2 = await createReservation({ userId: u2, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-seq-${randomUUID()}` }, testDb)
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(false)
    if (!r2.ok) expect(r2.reasonCode).toBe('ALLOCATION_EXHAUSTED')
  })
})

describe('reservation idempotency + release + expiry', () => {
  it('same idempotencyKey returns the existing reservation', async () => {
    const userId = await makeUser()
    const key = `${prefix}-idem-${randomUUID()}`
    const r1 = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: key }, testDb)
    const r2 = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: key }, testDb)
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    if (r1.ok && r2.ok) expect(r1.reservationId).toBe(r2.reservationId)
  })

  it('idempotencyKey reused by another user/offer/plan/platform is rejected (conflict, no leak)', async () => {
    const userId = await makeUser()
    const otherUser = await testDb.user.create({ data: { email: `${prefix}-other-${Date.now()}@aqwelia.test`, passwordHash: 'x' } })
    const key = `${prefix}-conflict-${randomUUID()}`
    const r1 = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: key }, testDb)
    expect(r1.ok).toBe(true)
    try {
      const r2 = await createReservation({ userId: otherUser.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: key }, testDb)
      expect(r2.ok).toBe(false)
      if (!r2.ok) expect(r2.reasonCode).toBe('IDEMPOTENCY_KEY_CONFLICT')

      const r3 = await createReservation({ userId, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: key }, testDb)
      expect(r3.ok).toBe(false)
      if (!r3.ok) expect(r3.reasonCode).toBe('IDEMPOTENCY_KEY_CONFLICT')

      const r4 = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'ANDROID', idempotencyKey: key }, testDb)
      expect(r4.ok).toBe(false)
      if (!r4.ok) expect(r4.reasonCode).toBe('IDEMPOTENCY_KEY_CONFLICT')
    } finally {
      await testDb.user.deleteMany({ where: { id: otherUser.id } })
    }
  })

  it('release is idempotent and frees the slot', async () => {
    const userId = await makeUser()
    const key = `${prefix}-release-${randomUUID()}`
    const r = await createReservation({ userId, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: key }, testDb)
    expect(r.ok).toBe(true)
    if (r.ok) {
      const ok1 = await releaseReservation(r.reservationId, userId, testDb)
      const ok2 = await releaseReservation(r.reservationId, userId, testDb)
      expect(ok1.ok).toBe(true)
      expect(ok2.ok).toBe(true)
    }
  })

  it('expired reservations free their slot via expireDueReservations', async () => {
    const userId = await makeUser()
    const key = `${prefix}-exp-${randomUUID()}`
    const r = await createReservation({ userId, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: key }, testDb)
    expect(r.ok).toBe(true)
    if (r.ok) {
      await testDb.promotionReservation.update({ where: { id: r.reservationId }, data: { expiresAt: new Date(Date.now() - 1000) } })
      const n = await expireDueReservations(500, testDb)
      expect(n).toBeGreaterThanOrEqual(1)
      const res = await testDb.promotionReservation.findUnique({ where: { id: r.reservationId } })
      expect(res?.status).toBe('EXPIRED')
    }
  })
})

describe('redemption (quota consumption)', () => {
  it('confirms once, then duplicate provider transaction is alreadyProcessed', async () => {
    const userId = await makeUser()
    const key = `${prefix}-redem-${randomUUID()}`
    const r = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: key }, testDb)
    expect(r.ok).toBe(true)
    const txId = `${prefix}-tx-${randomUUID()}`
    const c1 = await confirmRedemption({
      userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB',
      provider: 'STRIPE', providerTransactionId: txId, reservationId: r.ok ? r.reservationId : undefined,
      paidAmountMinor: 350, normalAmountMinor: 699,
    }, testDb)
    expect(c1.ok).toBe(true)
    if (c1.ok) expect(c1.alreadyProcessed).toBe(false)

    const c2 = await confirmRedemption({
      userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB',
      provider: 'STRIPE', providerTransactionId: txId, reservationId: r.ok ? r.reservationId : undefined,
      paidAmountMinor: 350, normalAmountMinor: 699,
    }, testDb)
    expect(c2.ok).toBe(true)
    if (c2.ok) expect(c2.alreadyProcessed).toBe(true)
  })

  it('amounts are validated against server pricing (never trusted from client)', async () => {
    const userId = await makeUser()
    const key = `${prefix}-amount-${randomUUID()}`
    const r = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'ANDROID', idempotencyKey: key }, testDb)
    expect(r.ok).toBe(true)
    const bad = await confirmRedemption({
      userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'ANDROID',
      provider: 'GOOGLE', providerTransactionId: `${prefix}-bad-${randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      paidAmountMinor: 1, normalAmountMinor: 1,
    }, testDb)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.reasonCode).toBe('PRICE_CONFIGURATION_INVALID')
  })

  it('late confirmation (reservation expired) is honored and flagged', async () => {
    const userId = await makeUser()
    const key = `${prefix}-late-${randomUUID()}`
    const r = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: key }, testDb)
    expect(r.ok).toBe(true)
    // Expire la réservation via le chemin réel (statut ET compteur cohérents).
    await testDb.promotionReservation.update({ where: { id: r.ok ? r.reservationId : '' }, data: { expiresAt: new Date(Date.now() - 1000) } })
    await expireDueReservations(500, testDb)
    const c = await confirmRedemption({
      userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB',
      provider: 'STRIPE', providerTransactionId: `${prefix}-late-tx-${randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      paidAmountMinor: 350, normalAmountMinor: 699,
    }, testDb)
    expect(c.ok).toBe(true)
    if (c.ok) expect(c.lateConfirmation).toBe(true)
    const red = await testDb.promotionRedemption.findFirst({ where: { userId, planId: 'oasis' } })
    expect(red?.metadata).toContain('late_confirmation')
  })

  it('global quota is consumed atomically', async () => {
    const userId = await makeUser()
    const campaign = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    const before = campaign!.confirmedCount

    const key = `${prefix}-global-${randomUUID()}`
    const r = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'ANDROID', idempotencyKey: key }, testDb)
    expect(r.ok).toBe(true)
    const c = await confirmRedemption({
      userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'ANDROID',
      provider: 'APPLE', providerTransactionId: `${prefix}-global-tx-${randomUUID()}`,
      paidAmountMinor: 350, normalAmountMinor: 699,
    }, testDb)
    expect(c.ok).toBe(true)
    const after = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    expect(after!.confirmedCount).toBe(before + 1)
  })

  it('a user who already redeemed cannot redeem again (global uniqueness)', async () => {
    const userId = await makeUser()
    const key = `${prefix}-unique-${randomUUID()}`
    const r = await createReservation({ userId, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'ANDROID', idempotencyKey: key }, testDb)
    expect(r.ok).toBe(true)
    const c1 = await confirmRedemption({
      userId, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'ANDROID',
      provider: 'APPLE', providerTransactionId: `${prefix}-unique-tx1-${randomUUID()}`,
      paidAmountMinor: 1398, normalAmountMinor: 1999,
    }, testDb)
    expect(c1.ok).toBe(true)

    const c2 = await confirmRedemption({
      userId, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'ANDROID',
      provider: 'APPLE', providerTransactionId: `${prefix}-unique-tx2-${randomUUID()}`,
      paidAmountMinor: 1398, normalAmountMinor: 1999,
    }, testDb)
    expect(c2.ok).toBe(false)
    if (!c2.ok) expect(c2.reasonCode).toBe('OFFER_ALREADY_REDEEMED')
  })
})

describe('admin reallocation guards', () => {
  it('cannot lower quota below confirmed + active_reserved', async () => {
    // Crée un état : 1 réservation active sur l'allocation WEB (reservedCount=1).
    const userId = await makeUser()
    const r = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-guard-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    // Quota actuel = 1 (réduit en beforeAll) → newQuota: 0 est sous le plancher.
    const res = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 0, actor: 'test' }, testDb)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('cannot_set_below')
  })

  it('cannot exceed the global campaign quota', async () => {
    const r = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 99999, actor: 'test' }, testDb)
    expect(r.ok).toBe(false)
    expect(r.error).toBe('exceeds_global_quota')
  })

  it('admin view exposes campaign + variants + allocations', async () => {
    const admin = await getCampaignAdmin(testDb)
    expect(admin).not.toBeNull()
    expect(admin!.code).toBe('AQWELIA_LAUNCH_2026')
    expect(admin!.variants).toHaveLength(2)
    expect(admin!.variants.flatMap((v) => v.allocations)).toHaveLength(6)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P1 #2 — Synchronisation du compteur à l'expiration (nettoyage paresseux).
// ─────────────────────────────────────────────────────────────────────────────

async function allocOf(offerCode: string, platform: string) {
  const v = await testDb.promotionVariant.findFirst({ where: { code: offerCode } })
  const a = await testDb.promotionAllocation.findFirst({ where: { variantId: v!.id, platform, planId: null } })
  return a!
}

function amountA() { return { paidAmountMinor: 350, normalAmountMinor: 699 } }
function amountB() { return { paidAmountMinor: 1398, normalAmountMinor: 1999 } }

describe('P1 #2 — lazy expiration syncs reservedCount', () => {
  it('an expired reservation frees exactly one slot (lazy cleanup decrements)', async () => {
    const userA = await makeUser()
    const userB = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_B_CODE, 'WEB')
    const r = await createReservation({ userId: userA, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-lz-a-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    // Expire A sans libérer le compteur (état incohérent volontaire).
    await testDb.promotionReservation.update({ where: { id: r.ok ? r.reservationId : '' }, data: { expiresAt: new Date(Date.now() - 1000) } })

    // Le prochain createReservation déclenche le nettoyage paresseux :
    // A passe EXPIRED et reservedCount est décrémenté d'exactement 1.
    const r2 = await createReservation({ userId: userB, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-lz-b-${randomUUID()}` }, testDb)
    expect(r2.ok).toBe(true)

    const resA = await testDb.promotionReservation.findUnique({ where: { id: r.ok ? r.reservationId : '' } })
    expect(resA?.status).toBe('EXPIRED')
    const after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    // Seule la réservation de B est encore active.
    expect(after!.reservedCount).toBe(1)
  })

  it('two successive cleanups never free two slots for one reservation', async () => {
    const uA = await makeUser()
    const uB = await makeUser()
    const uC = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_B_CODE, 'IOS')
    const rA = await createReservation({ userId: uA, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-lz2-a-${randomUUID()}` }, testDb)
    const rB = await createReservation({ userId: uB, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-lz2-b-${randomUUID()}` }, testDb)
    expect(rA.ok).toBe(true)
    expect(rB.ok).toBe(true)
    const now = new Date(Date.now() - 1000)
    await testDb.promotionReservation.updateMany({ where: { id: { in: [rA.ok ? rA.reservationId : '', rB.ok ? rB.reservationId : ''] } }, data: { expiresAt: now } })

    // 1er nettoyage : les 2 expirées sont décrémentées, puis C réserve → 1.
    const rC = await createReservation({ userId: uC, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-lz2-c-${randomUUID()}` }, testDb)
    expect(rC.ok).toBe(true)
    let after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.reservedCount).toBe(1)

    // 2e nettoyage : plus aucune expirée → aucun décrément supplémentaire.
    const uD = await makeUser()
    const rD = await createReservation({ userId: uD, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-lz2-d-${randomUUID()}` }, testDb)
    expect(rD.ok).toBe(true)
    after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.reservedCount).toBe(2)
  })

  it('a non-expired reservation stays active (not freed)', async () => {
    const uA = await makeUser()
    const uB = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB') // quota 1
    const rA = await createReservation({ userId: uA, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-nz-a-${randomUUID()}` }, testDb)
    expect(rA.ok).toBe(true)
    const rB = await createReservation({ userId: uB, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-nz-b-${randomUUID()}` }, testDb)
    expect(rB.ok).toBe(false)
    if (!rB.ok) expect(rB.reasonCode).toBe('ALLOCATION_EXHAUSTED')
    const resA = await testDb.promotionReservation.findUnique({ where: { id: rA.ok ? rA.reservationId : '' } })
    expect(resA?.status).toBe('ACTIVE')
    const after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.reservedCount).toBe(1)
  })

  it('the next user can reserve the slot once released', async () => {
    const uA = await makeUser()
    const uB = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB')
    const rA = await createReservation({ userId: uA, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-rl-a-${randomUUID()}` }, testDb)
    expect(rA.ok).toBe(true)
    await testDb.promotionReservation.update({ where: { id: rA.ok ? rA.reservationId : '' }, data: { expiresAt: new Date(Date.now() - 1000) } })
    await expireDueReservations(500, testDb)
    const after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.reservedCount).toBe(0)

    const rB = await createReservation({ userId: uB, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-rl-b-${randomUUID()}` }, testDb)
    expect(rB.ok).toBe(true)
    const after2 = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after2!.reservedCount).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P1 #3 — Préserver la capacité détenue par les réservations actives.
// ─────────────────────────────────────────────────────────────────────────────

describe('P1 #3 — reserved capacity is never consumed by a confirmation without reservation', () => {
  it('a confirmation without an active reservation cannot steal a reserved slot', async () => {
    const holder = await makeUser()
    const late = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB') // quota 1
    const r = await createReservation({ userId: holder, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-p3-r-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)

    // Le détenteur a réservé la seule place ; une confirmation sans réservation
    // (tardive/absente) ne doit PAS la consommer.
    const c = await confirmRedemption({
      userId: late, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB',
      provider: 'STRIPE', providerTransactionId: `${prefix}-p3-tx-${randomUUID()}`,
      ...amountA(),
    }, testDb)
    expect(c.ok).toBe(false)
    if (!c.ok) expect(c.reasonCode).toBe('ALLOCATION_EXHAUSTED')

    const res = await testDb.promotionReservation.findUnique({ where: { id: r.ok ? r.reservationId : '' } })
    expect(res?.status).toBe('ACTIVE')
    const after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.reservedCount).toBe(1)
    expect(after!.confirmedCount).toBe(0)
  })

  it('the holder of an active reservation can always confirm their own reservation', async () => {
    const holder = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'IOS')
    const r = await createReservation({ userId: holder, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-p3-h-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    const c = await confirmRedemption({
      userId: holder, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS',
      provider: 'APPLE', providerTransactionId: `${prefix}-p3-htx-${randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      ...amountA(),
    }, testDb)
    expect(c.ok).toBe(true)
    const res = await testDb.promotionReservation.findUnique({ where: { id: r.ok ? r.reservationId : '' } })
    expect(res?.status).toBe('CONSUMED')
    const after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.reservedCount).toBe(0)
    expect(after!.confirmedCount).toBe(1)
  })

  it('a confirmation without reservation succeeds only when unreserved capacity exists', async () => {
    const a = await makeUser()
    const b = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB') // quota 1
    const c1 = await confirmRedemption({
      userId: a, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB',
      provider: 'STRIPE', providerTransactionId: `${prefix}-p3-c1-${randomUUID()}`,
      ...amountA(),
    }, testDb)
    expect(c1.ok).toBe(true)

    const c2 = await confirmRedemption({
      userId: b, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB',
      provider: 'STRIPE', providerTransactionId: `${prefix}-p3-c2-${randomUUID()}`,
      ...amountA(),
    }, testDb)
    expect(c2.ok).toBe(false)
    if (!c2.ok) expect(c2.reasonCode).toBe('ALLOCATION_EXHAUSTED')

    const after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.confirmedCount).toBe(1)
    expect(after!.reservedCount).toBe(0)
  })

  it('two concurrent confirmations never exceed the quota (no overbooking)', async () => {
    const a = await makeUser()
    const b = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'IOS')
    // Rendre l'allocation IOS à 1 place pour provoquer la course.
    await testDb.promotionAllocation.update({ where: { id: alloc.id }, data: { quota: 1 } })
    const [c1, c2] = await Promise.all([
      confirmRedemption({ userId: a, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', provider: 'APPLE', providerTransactionId: `${prefix}-p3-race1-${randomUUID()}`, ...amountA() }, testDb),
      confirmRedemption({ userId: b, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', provider: 'APPLE', providerTransactionId: `${prefix}-p3-race2-${randomUUID()}`, ...amountA() }, testDb),
    ])
    const okCount = [c1, c2].filter((c) => c.ok).length
    expect(okCount).toBe(1)
    const after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.confirmedCount).toBe(1)
    expect(after!.confirmedCount + after!.reservedCount + after!.safetyBuffer).toBeLessThanOrEqual(after!.quota)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P1 #4 — Décrément conditionnel du compteur (transition ACTIVE → CONSUMED).
// ─────────────────────────────────────────────────────────────────────────────

describe('P1 #4 — reservedCount decremented only on a real ACTIVE transition', () => {
  it('a successful ACTIVE transition decrements exactly once', async () => {
    const u = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'IOS')
    const r = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-p4-1-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    let before = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(before!.reservedCount).toBe(1)

    const c = await confirmRedemption({
      userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS',
      provider: 'APPLE', providerTransactionId: `${prefix}-p4-1tx-${randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      ...amountA(),
    }, testDb)
    expect(c.ok).toBe(true)
    const after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.reservedCount).toBe(0)
    expect(after!.confirmedCount).toBe(1)
  })

  it('an already EXPIRED reservation never decrements a second time', async () => {
    const u = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'IOS')
    const r = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-p4-2-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    // Expire et libère la place (nettoyage régulier).
    await testDb.promotionReservation.update({ where: { id: r.ok ? r.reservationId : '' }, data: { expiresAt: new Date(Date.now() - 1000) } })
    await expireDueReservations(500, testDb)
    let before = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(before!.reservedCount).toBe(0)

    // Confirmation tardive : la réservation est EXPIRED, aucun nouveau décrément.
    const c = await confirmRedemption({
      userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS',
      provider: 'APPLE', providerTransactionId: `${prefix}-p4-2tx-${randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      ...amountA(),
    }, testDb)
    expect(c.ok).toBe(true)
    if (c.ok) expect(c.lateConfirmation).toBe(true)
    const after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.reservedCount).toBe(0) // jamais négatif, jamais re-décrémenté
    expect(after!.confirmedCount).toBe(1)
  })

  it('an already CONSUMED reservation never decrements a second time', async () => {
    const u = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'IOS')
    const r = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-p4-3-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    const c1 = await confirmRedemption({
      userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS',
      provider: 'APPLE', providerTransactionId: `${prefix}-p4-3tx1-${randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      ...amountA(),
    }, testDb)
    expect(c1.ok).toBe(true)

    // Second paiement (nouveau providerTransactionId) avec la même réservation
    // déjà CONSUMED → refus, aucun décrément ni quota consommé.
    const c2 = await confirmRedemption({
      userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS',
      provider: 'APPLE', providerTransactionId: `${prefix}-p4-3tx2-${randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      ...amountA(),
    }, testDb)
    expect(c2.ok).toBe(false)
    if (!c2.ok) expect(c2.reasonCode).toBe('ACTIVE_RESERVATION_EXISTS')

    const after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.reservedCount).toBe(0)
    expect(after!.confirmedCount).toBe(1)
  })

  it('another customer active reservation counter stays intact', async () => {
    const holder = await makeUser()
    const other = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB') // quota 1
    const r = await createReservation({ userId: holder, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-p4-4-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)

    const c = await confirmRedemption({
      userId: other, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB',
      provider: 'STRIPE', providerTransactionId: `${prefix}-p4-4tx-${randomUUID()}`,
      ...amountA(),
    }, testDb)
    expect(c.ok).toBe(false)
    const res = await testDb.promotionReservation.findUnique({ where: { id: r.ok ? r.reservationId : '' } })
    expect(res?.status).toBe('ACTIVE')
    const after = await testDb.promotionAllocation.findUnique({ where: { id: alloc.id } })
    expect(after!.reservedCount).toBe(1) // intact
    expect(after!.confirmedCount).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P1 #5 — Correspondance réservation / offre payée (contexte complet).
// ─────────────────────────────────────────────────────────────────────────────

describe('P1 #5 — reservation must match the paid offer', () => {
  async function snapshot(allocId: string) {
    const alloc = await testDb.promotionAllocation.findUnique({ where: { id: allocId } })
    const res = await testDb.promotionReservation.findMany({ where: { allocationId: allocId } })
    return { reservedCount: alloc!.reservedCount, confirmedCount: alloc!.confirmedCount, statuses: res.map((x) => x.status) }
  }

  it('a correct reservation is confirmed', async () => {
    const u = await makeUser()
    const r = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-p5-ok-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    const c = await confirmRedemption({
      userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS',
      provider: 'APPLE', providerTransactionId: `${prefix}-p5-oktx-${randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      ...amountA(),
    }, testDb)
    expect(c.ok).toBe(true)
  })

  it('wrong user → refused, no quota touched', async () => {
    const u = await makeUser()
    const attacker = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'IOS')
    const r = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-p5-u-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    const before = await snapshot(alloc.id)
    const c = await confirmRedemption({
      userId: attacker, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS',
      provider: 'APPLE', providerTransactionId: `${prefix}-p5-utx-${randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      ...amountA(),
    }, testDb)
    expect(c.ok).toBe(false)
    if (!c.ok) expect(c.reasonCode).toBe('RESERVATION_MISMATCH')
    const after = await snapshot(alloc.id)
    expect(after).toEqual(before)
  })

  it('wrong variant → refused, no quota touched', async () => {
    const u = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'IOS')
    const r = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-p5-v-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    const before = await snapshot(alloc.id)
    // Confirme avec la BONNE réservation mais l'OFFRE B → variante différente.
    const c = await confirmRedemption({
      userId: u, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS',
      provider: 'APPLE', providerTransactionId: `${prefix}-p5-vtx-${randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      ...amountB(),
    }, testDb)
    expect(c.ok).toBe(false)
    if (!c.ok) expect(c.reasonCode).toBe('RESERVATION_MISMATCH')
    const after = await snapshot(alloc.id)
    expect(after).toEqual(before)
  })

  it('wrong plan → refused, no quota touched', async () => {
    const u = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'IOS')
    const r = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-p5-p-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    const before = await snapshot(alloc.id)
    // Montants wellness (OFFER A) : dueNow 550, renewal 1099.
    const c = await confirmRedemption({
      userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'wellness', platform: 'IOS',
      provider: 'APPLE', providerTransactionId: `${prefix}-p5-ptx-${randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      paidAmountMinor: 550, normalAmountMinor: 1099,
    }, testDb)
    expect(c.ok).toBe(false)
    if (!c.ok) expect(c.reasonCode).toBe('RESERVATION_MISMATCH')
    const after = await snapshot(alloc.id)
    expect(after).toEqual(before)
  })

  it('wrong platform/allocation → refused, no quota touched', async () => {
    const u = await makeUser()
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'IOS')
    const r = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-p5-w-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    const before = await snapshot(alloc.id)
    const c = await confirmRedemption({
      userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'ANDROID',
      provider: 'GOOGLE', providerTransactionId: `${prefix}-p5-wtx-${randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      ...amountA(),
    }, testDb)
    expect(c.ok).toBe(false)
    if (!c.ok) expect(c.reasonCode).toBe('RESERVATION_MISMATCH')
    const after = await snapshot(alloc.id)
    expect(after).toEqual(before)
  })
})
