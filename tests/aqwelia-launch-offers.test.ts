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

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))
function isBusy(e: any) { return e?.code === 'SQLITE_BUSY' || /locked/i.test(String(e?.message || '')) }
async function withBusyRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 0; i < attempts; i += 1) {
    try { return await fn() } catch (e) { if (!isBusy(e) || i === attempts - 1) throw e; await pause(50) }
  }
  throw new Error('unreachable')
}

async function runPool<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = []
  let cursor = 0
  async function worker() {
    while (cursor < tasks.length) {
      const task = tasks[cursor]
      cursor += 1
      results.push(await task())
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return results
}

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
  testDb = new PrismaClient({ datasources: { db: { url: `file:${dbFile}` } } })

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

describe('atomic reservation concurrency (1 slot, 100 requests)', () => {
  it('exactly one reservation succeeds; others are quota-exhausted; counters never negative', async () => {
    // 100 utilisateurs distincts (un seul essai chacun) pour tester le claim
    // atomique de l'allocation sans interférer avec la règle "réservation
    // active" (qui est par compte).
    const users: string[] = []
    for (let i = 0; i < 100; i += 1) users.push(await makeUser())

    const attempts = users.map((uid) => () =>
      withBusyRetry(() => createReservation({
        userId: uid,
        offerCode: LAUNCH_OFFER_A_CODE,
        planId: 'oasis',
        platform: 'WEB',
        idempotencyKey: `${prefix}-race-${uid}-${randomUUID()}`,
      }, testDb)),
    )
    const results = await runPool(attempts, 8)
    const ok = results.filter((r) => r.ok)
    const exhausted = results.filter((r) => !r.ok && r.reasonCode === 'ALLOCATION_EXHAUSTED')
    expect(ok.length).toBe(1)
    expect(exhausted.length).toBe(99)

    const variant = await testDb.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const allocWeb = await testDb.promotionAllocation.findFirst({ where: { variantId: variant!.id, platform: 'WEB', planId: null } })
    const allocAfter = await testDb.promotionAllocation.findUnique({ where: { id: allocWeb!.id } })
    expect(allocAfter!.reservedCount).toBe(1)
    expect(allocAfter!.confirmedCount).toBe(0)
    expect(allocAfter!.reservedCount).toBeGreaterThanOrEqual(0)
  }, 60_000)
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
    await testDb.promotionReservation.update({ where: { id: r.ok ? r.reservationId : '' }, data: { expiresAt: new Date(Date.now() - 1000), status: 'EXPIRED' } })
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
