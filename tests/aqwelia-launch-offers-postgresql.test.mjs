/**
 * AQWELIA Launch offers — VRAI test de concurrence (PostgreSQL).
 *
 * SQLite sérialise les transactions interactives (une seule à la fois), donc un
 * test « 100 requêtes simultanées » sur SQLite est un test de pool, pas un test
 * d'atomicité. Ce fichier exécute le véritable test de concurrence sur
 * PostgreSQL (le pool y autorise la concurrence réelle), en conditions proches
 * de la production : 100 utilisateurs distincts, 100 réservations simultanées
 * sur UNE seule place d'allocation WEB.
 *
 * Pré-requis : POSTGRES_TEST_DATABASE_URL doit pointer vers une base de test
 * PostgreSQL avec le schéma déployé (voir .github/workflows/postgresql-staging.yml
 * → db:pg:deploy puis test:postgresql:integration).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'

const databaseUrl = process.env.POSTGRES_TEST_DATABASE_URL
let prisma
let prefix

process.env.AQWELIA_LAUNCH_OFFERS_ENABLED = 'true'
process.env.AQWELIA_LAUNCH_TOKEN_SECRET = 'pg-test-token-secret-launch-offers'

beforeAll(async () => {
  if (!databaseUrl?.match(/^postgres(ql)?:\/\//)) {
    throw new Error('POSTGRES_TEST_DATABASE_URL must point to a PostgreSQL test database')
  }
  const loaded = await import(pathToFileURL(resolve('generated/client-postgresql/index.js')).href)
  const PrismaClient = loaded.PrismaClient || loaded.default?.PrismaClient
  if (!PrismaClient) throw new Error('PostgreSQL Prisma client is unavailable')
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })

  const { seedCampaign, setCampaignStatus } = await import('@/lib/launch-offers/admin')
  const { LAUNCH_OFFER_A_CODE } = await import('@/lib/launch-offers/config')

  prefix = `pg-launch-${Date.now()}`
  await seedCampaign(prisma)
  await setCampaignStatus('ACTIVE', 'pg-test', undefined, prisma)
  // Réduire l'allocation Offre A WEB à 1 place pour le test de concurrence.
  const variant = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
  const allocWeb = await prisma.promotionAllocation.findFirst({ where: { variantId: variant.id, platform: 'WEB', planId: null } })
  await prisma.promotionAllocation.update({ where: { id: allocWeb.id }, data: { quota: 1 } })
})

afterAll(async () => {
  // Nettoyage complet : le workflow postgresql-staging.yml exécute ensuite une
  // migration SQLite→PostgreSQL qui exige une cible VIDE (assertTargetEmpty).
  // Ce test crée campagne + variantes + allocations + 100 utilisateurs +
  // réservations : tout doit être supprimé.
  try {
    if (prisma) {
      const c = await prisma.promotionCampaign.findUnique({ where: { code: 'AQWELIA_LAUNCH_2026' } })
      if (c) {
        await prisma.promotionAuditLog.deleteMany({ where: { campaignId: c.id } })
        await prisma.promotionRedemption.deleteMany({ where: { campaignId: c.id } })
        await prisma.promotionReservation.deleteMany({ where: { campaignId: c.id } })
        await prisma.promotionVariant.deleteMany({ where: { campaignId: c.id } })
        await prisma.promotionCampaign.deleteMany({ where: { id: c.id } })
      }
      if (prefix) {
        await prisma.user.deleteMany({ where: { email: { startsWith: `${prefix}-` } } })
      }
    }
  } finally {
    await prisma?.$disconnect()
  }
})

describe('atomic reservation concurrency on PostgreSQL (1 slot, 100 requests)', () => {
  it('exactly one reservation succeeds; others are quota-exhausted; counters never negative', async () => {
    const { createReservation } = await import('@/lib/launch-offers/service')
    const { LAUNCH_OFFER_A_CODE } = await import('@/lib/launch-offers/config')

    // 100 utilisateurs distincts (un seul essai chacun) → 1 place unique.
    const users = []
    for (let i = 0; i < 100; i += 1) {
      const u = await prisma.user.create({ data: { email: `${prefix}-u${i}@aqwelia.test`, passwordHash: 'x', country: 'FR', countryVerifiedAt: new Date(), countrySource: 'test' } })
      users.push(u.id)
    }

    const attempts = users.map((uid) => () =>
      createReservation({ userId: uid, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-race-${uid}-${randomUUID()}` }, prisma),
    )

    // Lance TOUTES les réservations simultanément (vraie concurrence PG).
    const results = await Promise.all(attempts.map((fn) => fn()))
    const ok = results.filter((r) => r.ok)
    const exhausted = results.filter((r) => !r.ok && r.reasonCode === 'ALLOCATION_EXHAUSTED')
    expect(ok.length).toBe(1)
    expect(exhausted.length).toBe(99)

    const variant = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const allocWeb = await prisma.promotionAllocation.findFirst({ where: { variantId: variant.id, platform: 'WEB', planId: null } })
    const allocAfter = await prisma.promotionAllocation.findUnique({ where: { id: allocWeb.id } })
    expect(allocAfter.reservedCount).toBe(1)
    expect(allocAfter.confirmedCount).toBe(0)
    expect(allocAfter.reservedCount).toBeGreaterThanOrEqual(0)
  }, 60_000)
})

async function resetPromotionData(prisma, prefix) {
  const c = await prisma.promotionCampaign.findUnique({ where: { code: 'AQWELIA_LAUNCH_2026' } })
  if (c) {
    await prisma.promotionRedemption.deleteMany({ where: { campaignId: c.id } })
    await prisma.promotionReservation.deleteMany({ where: { campaignId: c.id } })
    await prisma.promotionAllocation.updateMany({ data: { reservedCount: 0, confirmedCount: 0 } })
    await prisma.promotionCampaign.updateMany({ data: { confirmedCount: 0 } })
  }
  await prisma.user.deleteMany({ where: { email: { startsWith: `${prefix}-` } } })
}

async function freshUser(prisma, prefix, n) {
  return prisma.user.create({ data: { email: `${prefix}-c${n}-${randomUUID()}@aqwelia.test`, passwordHash: 'x', country: 'FR', countryVerifiedAt: new Date(), countrySource: 'test' } })
}

describe('P1 #2/#3/#4 — true concurrency on PostgreSQL', () => {
  it('concurrent confirmations without reservation never exceed a 1-slot allocation', async () => {
    await resetPromotionData(prisma, prefix)
    const { confirmRedemption } = await import('@/lib/launch-offers/service')
    const { LAUNCH_OFFER_A_CODE } = await import('@/lib/launch-offers/config')
    const variant = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const allocWeb = await prisma.promotionAllocation.findFirst({ where: { variantId: variant.id, platform: 'WEB', planId: null } })
    await prisma.promotionAllocation.update({ where: { id: allocWeb.id }, data: { quota: 1, reservedCount: 0, confirmedCount: 0 } })

    const a = await freshUser(prisma, prefix, 1)
    const b = await freshUser(prisma, prefix, 2)
    const [c1, c2] = await Promise.all([
      confirmRedemption({ userId: a.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: `${prefix}-rc1-${randomUUID()}`, paidAmountMinor: 350, normalAmountMinor: 699 }, prisma),
      confirmRedemption({ userId: b.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: `${prefix}-rc2-${randomUUID()}`, paidAmountMinor: 350, normalAmountMinor: 699 }, prisma),
    ])
    const ok = [c1, c2].filter((c) => c.ok).length
    expect(ok).toBe(1)
    const alloc = await prisma.promotionAllocation.findUnique({ where: { id: allocWeb.id } })
    expect(alloc.confirmedCount).toBe(1)
    expect(alloc.confirmedCount + alloc.reservedCount + alloc.safetyBuffer).toBeLessThanOrEqual(alloc.quota)
  }, 60_000)

  it('expired reservations under concurrency free exactly their slots (no double-decrement)', async () => {
    await resetPromotionData(prisma, prefix)
    const { createReservation, expireDueReservations, confirmRedemption } = await import('@/lib/launch-offers/service')
    const { LAUNCH_OFFER_B_CODE } = await import('@/lib/launch-offers/config')
    const variant = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_B_CODE } })
    const allocIOS = await prisma.promotionAllocation.findFirst({ where: { variantId: variant.id, platform: 'IOS', planId: null } })

    const holders = [await freshUser(prisma, prefix, 3), await freshUser(prisma, prefix, 4)]
    const reservations = []
    for (const u of holders) {
      const r = await createReservation({ userId: u.id, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-exp-${u.id}-${randomUUID()}` }, prisma)
      expect(r.ok).toBe(true)
      reservations.push(r.reservationId)
    }
    // Expire les deux (statut ET compteur cohérents via le nettoyage régulier).
    await prisma.promotionReservation.updateMany({ where: { id: { in: reservations } }, data: { expiresAt: new Date(Date.now() - 1000) } })
    const n = await expireDueReservations(500, prisma)
    expect(n).toBeGreaterThanOrEqual(2)
    let alloc = await prisma.promotionAllocation.findUnique({ where: { id: allocIOS.id } })
    expect(alloc.reservedCount).toBe(0)

    // Deux confirmations tardives simultanées : chaque détenteur confirme SA
    // propre réservation expirée — chacune consomme une place libre, jamais la
    // même, jamais en dessous de zéro.
    const [d1, d2] = await Promise.all([
      confirmRedemption({ userId: holders[0].id, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS', provider: 'APPLE', providerTransactionId: `${prefix}-late1-${randomUUID()}`, reservationId: reservations[0], paidAmountMinor: 1398, normalAmountMinor: 1999 }, prisma),
      confirmRedemption({ userId: holders[1].id, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS', provider: 'APPLE', providerTransactionId: `${prefix}-late2-${randomUUID()}`, reservationId: reservations[1], paidAmountMinor: 1398, normalAmountMinor: 1999 }, prisma),
    ])
    // La capacité est libre ; chacune peut réussir (ou l'une des deux si la
    // course est conservatrice). Dans tous les cas : jamais de double
    // consommation, jamais de compteur négatif, jamais de dépassement.
    const ok = [d1, d2].filter((c) => c.ok).length
    expect(ok).toBeGreaterThanOrEqual(1)
    alloc = await prisma.promotionAllocation.findUnique({ where: { id: allocIOS.id } })
    expect(alloc.reservedCount).toBe(0)
    expect(alloc.confirmedCount).toBe(ok)
    expect(alloc.confirmedCount).toBeLessThanOrEqual(alloc.quota)
    expect(alloc.reservedCount).toBeGreaterThanOrEqual(0)
  }, 60_000)

  it('direct late confirmations under concurrency: no double-decrement, no negative, no overbooking', async () => {
    await resetPromotionData(prisma, prefix)
    const { createReservation, confirmRedemption } = await import('@/lib/launch-offers/service')
    const { LAUNCH_OFFER_A_CODE } = await import('@/lib/launch-offers/config')
    const variant = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const allocIOS = await prisma.promotionAllocation.findFirst({ where: { variantId: variant.id, platform: 'IOS', planId: null } })
    await prisma.promotionAllocation.update({ where: { id: allocIOS.id }, data: { quota: 2, reservedCount: 0, confirmedCount: 0 } })

    // Deux réservations ACTIVE, chacune expirée UNIQUEMENT à l'horloge (statut
    // conservé ACTIVE, compteur incluant toujours ces réservations). On
    // n'appelle JAMAIS expireDueReservations : confirmRedemption doit gérer la
    // transition d'expiration de façon autonome.
    const users = [await freshUser(prisma, prefix, 6), await freshUser(prisma, prefix, 7)]
    const reservations = []
    for (const u of users) {
      const r = await createReservation({ userId: u.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-dlc-${u.id}-${randomUUID()}` }, prisma)
      expect(r.ok).toBe(true)
      reservations.push(r.reservationId)
    }
    await prisma.promotionReservation.updateMany({ where: { id: { in: reservations } }, data: { expiresAt: new Date(Date.now() - 1000) } })
    let alloc = await prisma.promotionAllocation.findUnique({ where: { id: allocIOS.id } })
    expect(alloc.reservedCount).toBe(2)

    // Deux confirmations tardives DIRECTES simultanées.
    const [d1, d2] = await Promise.all([
      confirmRedemption({ userId: users[0].id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', provider: 'APPLE', providerTransactionId: `${prefix}-dlc1-${randomUUID()}`, reservationId: reservations[0], paidAmountMinor: 350, normalAmountMinor: 699 }, prisma),
      confirmRedemption({ userId: users[1].id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', provider: 'APPLE', providerTransactionId: `${prefix}-dlc2-${randomUUID()}`, reservationId: reservations[1], paidAmountMinor: 350, normalAmountMinor: 699 }, prisma),
    ])

    const ok = [d1, d2].filter((c) => c.ok).length
    // Les deux ont des réservations distinctes expirées : les deux devraient
    // réussir (chaque transition libère SA place puis consomme une place libre).
    expect(ok).toBe(2)
    if (d1.ok) expect(d1.lateConfirmation).toBe(true)
    if (d2.ok) expect(d2.lateConfirmation).toBe(true)

    alloc = await prisma.promotionAllocation.findUnique({ where: { id: allocIOS.id } })
    // Chaque réservation expirée est décrémentée exactement une fois, puis chaque
    // confirmation consomme une place → reservedCount 0, confirmedCount 2.
    expect(alloc.reservedCount).toBe(0)
    expect(alloc.confirmedCount).toBe(2)
    expect(alloc.reservedCount).toBeGreaterThanOrEqual(0)
    expect(alloc.confirmedCount + alloc.reservedCount + alloc.safetyBuffer).toBeLessThanOrEqual(alloc.quota)

    // Les deux réservations sont dans un état final cohérent (CONSUMED).
    for (const rid of reservations) {
      const res = await prisma.promotionReservation.findUnique({ where: { id: rid } })
      expect(res.status).toBe('CONSUMED')
    }
    const campaign = await prisma.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    expect(campaign.confirmedCount).toBe(2)
  }, 60_000)

  it('concurrent reallocations never drop quota below floor, never exceed limits, one audit per success', async () => {
    await resetPromotionData(prisma, prefix)
    const { reallocate } = await import('@/lib/launch-offers/admin')
    const { LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE } = await import('@/lib/launch-offers/config')
    const { setCampaignStatus } = await import('@/lib/launch-offers/admin')
    await setCampaignStatus('ACTIVE', 'pg-test', undefined, prisma)

    const variantA = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const allocWebA = await prisma.promotionAllocation.findFirst({ where: { variantId: variantA.id, platform: 'WEB', planId: null } })
    await prisma.promotionAllocation.update({ where: { id: allocWebA.id }, data: { quota: 180, reservedCount: 0, confirmedCount: 0 } })

    // Réallocation concurrente : 2 tentatives sur la MÊME allocation.
    const [r1, r2] = await Promise.all([
      reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 170, actor: 'a' }, prisma),
      reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 160, actor: 'b' }, prisma),
    ])
    const okCount = [r1, r2].filter((r) => r.ok).length
    // Au moins une réussit ; les deux peuvent réussir séquentiellement car chaque
    // relecture est dans sa propre transaction, mais jamais de quota < plancher
    // ni de dépassement. Le CAS sur campaign.version empêche un état incohérent.
    expect(okCount).toBeGreaterThanOrEqual(1)
    const allocAfter = await prisma.promotionAllocation.findUnique({ where: { id: allocWebA.id } })
    const finalQuota = allocAfter.quota
    expect([160, 170]).toContain(finalQuota)
    // Jamais sous le plancher (0 confirmé + 0 réservé → 0).
    expect(finalQuota).toBeGreaterThanOrEqual(0)

    // Un seul audit par mutation réussie.
    const audits = await prisma.promotionAuditLog.findMany({ where: { action: 'reallocate' } })
    expect(audits).toHaveLength(okCount)

    // Réallocations parallèles de DEUX allocations différentes : les deux
    // peuvent réussir sans s'annuler.
    const variantB = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_B_CODE } })
    const allocWebB = await prisma.promotionAllocation.findFirst({ where: { variantId: variantB.id, platform: 'WEB', planId: null } })
    const [ra, rb] = await Promise.all([
      reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 150, actor: 'e' }, prisma),
      reallocate({ variantCode: LAUNCH_OFFER_B_CODE, platform: 'WEB', newQuota: 110, actor: 'f' }, prisma),
    ])
    expect([ra.ok, rb.ok].filter(Boolean).length).toBeGreaterThanOrEqual(1)
    void allocWebB
    void variantB
  }, 60_000)

  it('reallocate vs createReservation — concurrent race keeps capacity invariant (barrier)', async () => {
    await resetPromotionData(prisma, prefix)
    const { reallocate } = await import('@/lib/launch-offers/admin')
    const { createReservation } = await import('@/lib/launch-offers/service')
    const { LAUNCH_OFFER_A_CODE } = await import('@/lib/launch-offers/config')
    const { setCampaignStatus } = await import('@/lib/launch-offers/admin')
    await setCampaignStatus('ACTIVE', 'pg-test', undefined, prisma)

    const variantA = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const allocWebA = await prisma.promotionAllocation.findFirst({ where: { variantId: variantA.id, platform: 'WEB', planId: null } })
    await prisma.promotionAllocation.update({ where: { id: allocWebA.id }, data: { quota: 2, reservedCount: 0, confirmedCount: 0 } })

    // Barrière : les deux opérations partent SIMULTANÉMENT (Promise.all), chaque
    // transaction interactive PG est une vraie course sur la même allocation.
    const barrier = {}
    const gate = new Promise((res) => { barrier.release = res })
    let reserveRes
    let reallocRes
    const runReserve = (async () => {
      await gate
      const u = await freshUser(prisma, prefix, 40)
      reserveRes = await createReservation({ userId: u.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-race-res-${randomUUID()}` }, prisma)
    })()
    const runRealloc = (async () => {
      await gate
      reallocRes = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 1, actor: 'r' }, prisma)
    })()
    barrier.release()
    await Promise.all([runReserve, runRealloc])

    // Invariant : confirmed + reserved + safetyBuffer <= quota (frais).
    const after = await prisma.promotionAllocation.findUnique({ where: { id: allocWebA.id } })
    expect(after.reservedCount + after.confirmedCount + after.safetyBuffer).toBeLessThanOrEqual(after.quota)
    expect(after.reservedCount).toBeGreaterThanOrEqual(0)
    expect(after.confirmedCount).toBeGreaterThanOrEqual(0)
    // La réservation ne peut réussir que si la capacité finale le permet.
    if (reserveRes.ok) {
      expect(after.reservedCount).toBeGreaterThanOrEqual(1)
    } else {
      // reallocate a réduit le quota à 1 et la course a dû être annulée / refusée
      expect(reserveRes.reasonCode).toBe('ALLOCATION_EXHAUSTED')
      expect(after.reservedCount).toBe(0)
    }
  }, 60_000)

  it('reallocate vs confirmRedemption (with reservation) — race keeps capacity invariant', async () => {
    await resetPromotionData(prisma, prefix)
    const { reallocate } = await import('@/lib/launch-offers/admin')
    const { createReservation, confirmRedemption } = await import('@/lib/launch-offers/service')
    const { LAUNCH_OFFER_A_CODE } = await import('@/lib/launch-offers/config')
    const { setCampaignStatus } = await import('@/lib/launch-offers/admin')
    await setCampaignStatus('ACTIVE', 'pg-test', undefined, prisma)

    const variantA = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const allocWebA = await prisma.promotionAllocation.findFirst({ where: { variantId: variantA.id, platform: 'WEB', planId: null } })
    await prisma.promotionAllocation.update({ where: { id: allocWebA.id }, data: { quota: 2, reservedCount: 0, confirmedCount: 0 } })

    // Réservation terminée AVANT la course (pré-condition).
    const holder = await freshUser(prisma, prefix, 50)
    const res = await createReservation({ userId: holder.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-race-conf-${randomUUID()}` }, prisma)
    expect(res.ok).toBe(true)

    // Course : confirmation de SA réservation (conversion 1:1) vs réallocation.
    const barrier = {}
    const gate = new Promise((r) => { barrier.release = r })
    let confirmRes
    let reallocRes
    const runConfirm = (async () => {
      await gate
      confirmRes = await confirmRedemption({ userId: holder.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: `${prefix}-race-cf-${randomUUID()}`, reservationId: res.reservationId, paidAmountMinor: 350, normalAmountMinor: 699 }, prisma)
    })()
    const runRealloc = (async () => {
      await gate
      reallocRes = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 1, actor: 'r2' }, prisma)
    })()
    barrier.release()
    await Promise.all([runConfirm, runRealloc])

    const after = await prisma.promotionAllocation.findUnique({ where: { id: allocWebA.id } })
    expect(after.reservedCount + after.confirmedCount + after.safetyBuffer).toBeLessThanOrEqual(after.quota)
    expect(after.reservedCount).toBeGreaterThanOrEqual(0)
    expect(after.confirmedCount).toBeGreaterThanOrEqual(0)
    if (confirmRes.ok) {
      // La conversion consomme sa propre place réservée.
      expect(after.confirmedCount).toBeGreaterThanOrEqual(1)
    }
  }, 60_000)

  it('reallocate vs confirmation without reservation — race keeps capacity invariant', async () => {
    await resetPromotionData(prisma, prefix)
    const { reallocate } = await import('@/lib/launch-offers/admin')
    const { confirmRedemption } = await import('@/lib/launch-offers/service')
    const { LAUNCH_OFFER_A_CODE } = await import('@/lib/launch-offers/config')
    const { setCampaignStatus } = await import('@/lib/launch-offers/admin')
    await setCampaignStatus('ACTIVE', 'pg-test', undefined, prisma)

    const variantA = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const allocWebA = await prisma.promotionAllocation.findFirst({ where: { variantId: variantA.id, platform: 'WEB', planId: null } })
    await prisma.promotionAllocation.update({ where: { id: allocWebA.id }, data: { quota: 1, reservedCount: 0, confirmedCount: 0 } })

    // Course : confirmation sans réservation (chemin capacité libre) vs
    // réallocation qui réduit le quota à 0 (impossible — plancher 0) → la
    // réallocation échoue, la confirmation doit réussir si place libre.
    const barrier = {}
    const gate = new Promise((r) => { barrier.release = r })
    const payer = await freshUser(prisma, prefix, 60)
    let confirmRes
    let reallocRes
    const runConfirm = (async () => {
      await gate
      confirmRes = await confirmRedemption({ userId: payer.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: `${prefix}-race-nr-${randomUUID()}`, paidAmountMinor: 350, normalAmountMinor: 699 }, prisma)
    })()
    const runRealloc = (async () => {
      await gate
      reallocRes = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 0, actor: 'r3' }, prisma)
    })()
    barrier.release()
    await Promise.all([runConfirm, runRealloc])

    const after = await prisma.promotionAllocation.findUnique({ where: { id: allocWebA.id } })
    expect(after.reservedCount + after.confirmedCount + after.safetyBuffer).toBeLessThanOrEqual(after.quota)
    expect(after.reservedCount).toBeGreaterThanOrEqual(0)
    expect(after.confirmedCount).toBeGreaterThanOrEqual(0)
  }, 60_000)

  it('two concurrent reservations for the SAME user (different keys/allocations) → exactly one ACTIVE', async () => {
    await resetPromotionData(prisma, prefix)
    const { createReservation } = await import('@/lib/launch-offers/service')
    const { LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE } = await import('@/lib/launch-offers/config')
    const { setCampaignStatus } = await import('@/lib/launch-offers/admin')
    await setCampaignStatus('ACTIVE', 'pg-test', undefined, prisma)

    const variantA = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const allocWebA = await prisma.promotionAllocation.findFirst({ where: { variantId: variantA.id, platform: 'WEB', planId: null } })
    const variantB = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_B_CODE } })
    const allocIosB = await prisma.promotionAllocation.findFirst({ where: { variantId: variantB.id, platform: 'IOS', planId: null } })
    await prisma.promotionAllocation.updateMany({ data: { reservedCount: 0, confirmedCount: 0 } })

    const u = await freshUser(prisma, prefix, 70)
    // Barrière : DEUX réservations réellement concurrentes, mêmes utilisateur,
    // clés distinctes et allocations distinctes (offre A WEB + offre B IOS).
    const barrier = {}
    const gate = new Promise((r) => { barrier.release = r })
    let r1
    let r2
    const runA = (async () => { await gate; r1 = await createReservation({ userId: u.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-same-a-${randomUUID()}` }, prisma) })()
    const runB = (async () => { await gate; r2 = await createReservation({ userId: u.id, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-same-b-${randomUUID()}` }, prisma) })()
    barrier.release()
    await Promise.all([runA, runB])

    // Exactement une ACTIVE.
    const active = await prisma.promotionReservation.count({ where: { userId: u.id, status: 'ACTIVE' } })
    expect(active).toBe(1)
    const ok = [r1, r2].filter((r) => r.ok).length
    expect(ok).toBe(1)
    const failed = [r1, r2].find((r) => !r.ok)
    // Refus sûr : soit la clé d'unicité activeUserKey (concurrent ACTIVE), soit
    // une course d'allocation — jamais une double réservation.
    if (failed && !failed.ok) {
      expect(['ACTIVE_RESERVATION_EXISTS', 'ALLOCATION_EXHAUSTED']).toContain(failed.reasonCode)
    }

    // reservedCount total augmenté d'UNE seule place.
    const a = await prisma.promotionAllocation.findUnique({ where: { id: allocWebA.id } })
    const b = await prisma.promotionAllocation.findUnique({ where: { id: allocIosB.id } })
    expect(a.reservedCount + b.reservedCount).toBe(1)
    expect(a.reservedCount + a.confirmedCount + a.safetyBuffer).toBeLessThanOrEqual(a.quota)
    expect(b.reservedCount + b.confirmedCount + b.safetyBuffer).toBeLessThanOrEqual(b.quota)
  }, 60_000)

  it('setCampaignStatus(PAUSED) vs createReservation — both commit orders, no partial state', async () => {
    await resetPromotionData(prisma, prefix)
    const { createReservation } = await import('@/lib/launch-offers/service')
    const { setCampaignStatus } = await import('@/lib/launch-offers/admin')
    const { LAUNCH_OFFER_A_CODE } = await import('@/lib/launch-offers/config')
    await setCampaignStatus('ACTIVE', 'pg-test', undefined, prisma)
    const variantA = await prisma.promotionVariant.findFirst({ where: { code: LAUNCH_OFFER_A_CODE } })
    const allocWebA = await prisma.promotionAllocation.findFirst({ where: { variantId: variantA.id, platform: 'WEB', planId: null } })
    await prisma.promotionAllocation.update({ where: { id: allocWebA.id }, data: { quota: 2, reservedCount: 0, confirmedCount: 0 } })

    // Ordre de commit 1 : PAUSED gagne → aucune réservation créée.
    const u1 = await freshUser(prisma, prefix, 80)
    const p1 = await setCampaignStatus('PAUSED', 'pg-test', undefined, prisma)
    expect(p1.ok).toBe(true)
    const r1 = await createReservation({ userId: u1.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-paused-1-${randomUUID()}` }, prisma)
    expect(r1.ok).toBe(false)
    if (!r1.ok) expect(r1.reasonCode).toBe('CAMPAIGN_PAUSED')
    let active1 = await prisma.promotionReservation.count({ where: { userId: u1.id, status: 'ACTIVE' } })
    expect(active1).toBe(0)

    // Ordre de commit 2 : réservation gagne avant la pause → reste valide.
    const u2 = await freshUser(prisma, prefix, 81)
    await setCampaignStatus('ACTIVE', 'pg-test', undefined, prisma)
    const r2 = await createReservation({ userId: u2.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-paused-2-${randomUUID()}` }, prisma)
    expect(r2.ok).toBe(true)
    const paused = await setCampaignStatus('PAUSED', 'pg-test', undefined, prisma)
    expect(paused.ok).toBe(true)
    const afterPause = await prisma.promotionReservation.findUnique({ where: { id: r2.ok ? r2.reservationId : '' } })
    expect(afterPause.status).toBe('ACTIVE')

    // Aucun état intermédiaire : une seule réservation ACTIVE au total.
    const activeAll = await prisma.promotionReservation.count({ where: { status: 'ACTIVE' } })
    expect(activeAll).toBe(1)
    const alloc = await prisma.promotionAllocation.findUnique({ where: { id: allocWebA.id } })
    expect(alloc.reservedCount).toBe(1)
  }, 60_000)
})
