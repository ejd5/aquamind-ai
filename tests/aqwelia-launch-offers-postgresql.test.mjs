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
      const u = await prisma.user.create({ data: { email: `${prefix}-u${i}@aqwelia.test`, passwordHash: 'x' } })
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
