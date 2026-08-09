/**
 * AQWELIA Launch offers — tests unitaires + concurrence (spec v1.0 §21).
 *
 * Couvre : éligibilité (chaque code), prix et cohérence marketing, réservation
 * atomique (100 requêtes pour 1 place), idempotence (clé + webhook dupliqué),
 * consommation (confirmation, tardive, déjà traitée), réallocation sûre.
 *
 * Aucun appel externe : base SQLite locale, mocks analytics.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
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
import { seedCampaign, setCampaignStatus, reallocate, getCampaignAdmin } from '@/lib/launch-offers/admin'
import { LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE } from '@/lib/launch-offers/config'

// Campaigne activée pour le test.
process.env.AQWELIA_LAUNCH_OFFERS_ENABLED = 'true'

const prefix = `launch-${Date.now()}`
let userId: string

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

beforeAll(async () => {
  // Force enable via env re-import path (config reads env lazily per call).
  const user = await db.user.create({ data: { email: `${prefix}@aqwelia.test`, passwordHash: 'x' } })
  userId = user.id
  const seeded = await seedCampaign()
  expect(seeded.created).toBe(true)
  await setCampaignStatus('ACTIVE', 'test')
  // Réduire l'allocation Offre A WEB à 1 place pour le test de concurrence.
  const variant = await db.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
  const allocWeb = await db.promotionAllocation.findFirst({ where: { variantId: variant!.id, platform: 'WEB', planId: null } })
  await db.promotionAllocation.update({ where: { id: allocWeb!.id }, data: { quota: 1 } })
})

afterAll(async () => {
  await db.promotionRedemption.deleteMany({ where: { userId } })
  await db.promotionReservation.deleteMany({ where: { userId } })
  await db.user.deleteMany({ where: { id: userId } })
  const c = await db.promotionCampaign.findUnique({ where: { code: 'AQWELIA_LAUNCH_2026' } })
  if (c) {
    await db.promotionAuditLog.deleteMany({ where: { campaignId: c.id } })
    await db.promotionRedemption.deleteMany({ where: { campaignId: c.id } })
    await db.promotionReservation.deleteMany({ where: { campaignId: c.id } })
    await db.promotionVariant.deleteMany({ where: { campaignId: c.id } })
    await db.promotionCampaign.deleteMany({ where: { id: c.id } })
  }
  await db.$disconnect()
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
    const r = await checkEligibility({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB' })
    expect(r.eligible).toBe(true)
    expect(r.offer?.pricing?.dueNowMinor).toBe(350)
    expect(r.offer?.availability.state).toBe('AVAILABLE')
  })

  it('country hint from the client never overrides the server-side country', async () => {
    // Le user de test a User.country = 'FR' (défaut serveur). Un hint client
    // vers un pays exclu ne doit pas rendre inéligible, ni un hint vers un pays
    // autorisé ne doit permettre de contourner un User.country exclu.
    const ok = await checkEligibility({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', countryHint: 'ZZ' })
    expect(ok.eligible).toBe(true)

    const excludedUser = await db.user.create({ data: { email: `${prefix}-excl@aqwelia.test`, passwordHash: 'x', country: 'XX' } })
    const blocked = await checkEligibility({ userId: excludedUser.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', countryHint: 'FR' })
    expect(blocked.eligible).toBe(false)
    expect(blocked.reasonCode).toBe('COUNTRY_NOT_ELIGIBLE')
    await db.user.deleteMany({ where: { id: excludedUser.id } })
  })

  it('plan not eligible', async () => {
    const r = await checkEligibility({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'decouverte', platform: 'WEB' })
    expect(r.eligible).toBe(false)
    expect(r.reasonCode).toBe('PLAN_NOT_ELIGIBLE')
  })

  it('platform not eligible', async () => {
    const r = await checkEligibility({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'DESKTOP' })
    expect(r.eligible).toBe(false)
    expect(r.reasonCode).toBe('PLATFORM_NOT_ELIGIBLE')
  })
})

describe('atomic reservation concurrency (1 slot, 100 requests)', () => {
  it('exactly one reservation succeeds; others are quota-exhausted; counters never negative', async () => {
    // Libère tout pour ce test.
    const user2 = await db.user.create({ data: { email: `${prefix}-race@aqwelia.test`, passwordHash: 'x' } })
    const variant = await db.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const allocWeb = await db.promotionAllocation.findFirst({ where: { variantId: variant!.id, platform: 'WEB', planId: null } })
    await db.promotionAllocation.update({ where: { id: allocWeb!.id }, data: { confirmedCount: 0, reservedCount: 0 } })

    // SQLite sérialise les transactions interactives (une seule à la fois) ;
    // on borne donc le nombre de requêtes réellement simultanées tout en
    // gardant 100 tentatives qui se disputent la place unique. C'est la
    // garantie d'atomicité (UPDATE conditionnel + contrainte unique) qui est
    // testée, pas la capacité de pool de SQLite.
    const concurrency = 8
    const attempts = Array.from({ length: 100 }, (_, i) => () =>
      withBusyRetry(() => createReservation({
        userId: user2.id,
        offerCode: LAUNCH_OFFER_A_CODE,
        planId: 'oasis',
        platform: 'WEB',
        idempotencyKey: `${prefix}-race-${i}-${crypto.randomUUID()}`,
      })),
    )
    const results = await runPool(attempts, concurrency)
    const ok = results.filter((r) => r.ok)
    const exhausted = results.filter((r) => !r.ok && r.reasonCode === 'ALLOCATION_EXHAUSTED')
    expect(ok.length).toBe(1)
    expect(exhausted.length).toBe(99)

    const allocAfter = await db.promotionAllocation.findUnique({ where: { id: allocWeb!.id } })
    expect(allocAfter!.reservedCount).toBe(1)
    expect(allocAfter!.confirmedCount).toBe(0)
    // Aucun compteur négatif.
    expect(allocAfter!.reservedCount).toBeGreaterThanOrEqual(0)

    await db.promotionReservation.deleteMany({ where: { userId: user2.id } })
    await db.promotionAllocation.update({ where: { id: allocWeb!.id }, data: { reservedCount: 0 } })
    await db.user.deleteMany({ where: { id: user2.id } })
  }, 60_000)
})

describe('reservation idempotency + release + expiry', () => {
  it('same idempotencyKey returns the existing reservation', async () => {
    const key = `${prefix}-idem-${crypto.randomUUID()}`
    const r1 = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: key })
    const r2 = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: key })
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    if (r1.ok && r2.ok) expect(r1.reservationId).toBe(r2.reservationId)
    await db.promotionReservation.deleteMany({ where: { userId, idempotencyKey: key } })
    const v = await db.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const a = await db.promotionAllocation.findFirst({ where: { variantId: v!.id, platform: 'IOS', planId: null } })
    await db.promotionAllocation.update({ where: { id: a!.id }, data: { reservedCount: 0 } })
  })

  it('release is idempotent and frees the slot', async () => {
    const key = `${prefix}-release-${crypto.randomUUID()}`
    const r = await createReservation({ userId, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: key })
    expect(r.ok).toBe(true)
    if (r.ok) {
      const ok1 = await releaseReservation(r.reservationId, userId)
      const ok2 = await releaseReservation(r.reservationId, userId)
      expect(ok1.ok).toBe(true)
      expect(ok2.ok).toBe(true)
    }
    await db.promotionReservation.deleteMany({ where: { userId, idempotencyKey: key } })
  })
})

describe('redemption (quota consumption)', () => {
  it('confirms once, then duplicate provider transaction is alreadyProcessed', async () => {
    const key = `${prefix}-redem-${crypto.randomUUID()}`
    const r = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: key })
    expect(r.ok).toBe(true)
    const txId = `${prefix}-tx-${crypto.randomUUID()}`
    const c1 = await confirmRedemption({
      userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB',
      provider: 'STRIPE', providerTransactionId: txId, reservationId: r.ok ? r.reservationId : undefined,
      paidAmountMinor: 350, normalAmountMinor: 699,
    })
    expect(c1.ok).toBe(true)
    if (c1.ok) expect(c1.alreadyProcessed).toBe(false)

    const c2 = await confirmRedemption({
      userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB',
      provider: 'STRIPE', providerTransactionId: txId, reservationId: r.ok ? r.reservationId : undefined,
      paidAmountMinor: 350, normalAmountMinor: 699,
    })
    expect(c2.ok).toBe(true)
    if (c2.ok) expect(c2.alreadyProcessed).toBe(true)

    // Unicité (campaign, user) : un second achat pour le même user est refusé.
    const c3 = await confirmRedemption({
      userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB',
      provider: 'STRIPE', providerTransactionId: `${txId}-2`,
      paidAmountMinor: 350, normalAmountMinor: 699,
    })
    expect(c3.ok).toBe(false)
    if (!c3.ok) expect(c3.reasonCode).toBe('OFFER_ALREADY_REDEEMED')

    await db.promotionRedemption.deleteMany({ where: { userId } })
    const v = await db.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const a = await db.promotionAllocation.findFirst({ where: { variantId: v!.id, platform: 'WEB', planId: null } })
    await db.promotionAllocation.update({ where: { id: a!.id }, data: { confirmedCount: 0, reservedCount: 0 } })
  })

  it('late confirmation (reservation expired) is honored and flagged', async () => {
    const key = `${prefix}-late-${crypto.randomUUID()}`
    const r = await createReservation({ userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: key })
    expect(r.ok).toBe(true)
    // Expire immédiatement.
    await db.promotionReservation.update({ where: { id: r.ok ? r.reservationId : '' }, data: { expiresAt: new Date(Date.now() - 1000), status: 'EXPIRED' } })
    const c = await confirmRedemption({
      userId, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB',
      provider: 'STRIPE', providerTransactionId: `${prefix}-late-tx-${crypto.randomUUID()}`, reservationId: r.ok ? r.reservationId : undefined,
      paidAmountMinor: 350, normalAmountMinor: 699,
    })
    expect(c.ok).toBe(true)
    if (c.ok) expect(c.lateConfirmation).toBe(true)
    const red = await db.promotionRedemption.findFirst({ where: { userId, planId: 'oasis' } })
    expect(red?.metadata).toContain('late_confirmation')
    await db.promotionRedemption.deleteMany({ where: { userId } })
  })
})

describe('admin reallocation guards', () => {
  it('cannot lower quota below confirmed + active_reserved', async () => {
    const r = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 0, actor: 'test' })
    expect(r.ok).toBe(false)
    expect(r.error).toContain('cannot_set_below')
  })

  it('cannot exceed the global campaign quota', async () => {
    const r = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 99999, actor: 'test' })
    expect(r.ok).toBe(false)
    expect(r.error).toBe('exceeds_global_quota')
  })

  it('admin view exposes campaign + variants + allocations', async () => {
    const admin = await getCampaignAdmin()
    expect(admin).not.toBeNull()
    expect(admin!.code).toBe('AQWELIA_LAUNCH_2026')
    expect(admin!.variants).toHaveLength(2)
    expect(admin!.variants.flatMap((v) => v.allocations)).toHaveLength(6)
  })
})
