/**
 * AQWELIA Launch offers — régression des 4 nouveaux commentaires Codex (PR #88).
 *
 * P1#1 — UNE SEULE réservation ACTIVE par (campaignId, userId) (activeUserKey).
 * P1#2 — Expirer d'abord dans la transaction de création (TTL).
 * P2#3 — Relire la campagne dans la transaction + CAS sur version/status ACTIVE.
 * P2#4 — Devise normalisée === pricing.currency.
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
import { seedCampaign, setCampaignStatus } from '@/lib/launch-offers/admin'
import { checkEligibility, confirmRedemption, createReservation, releaseReservation } from '@/lib/launch-offers/service'
import { activeUserKeyFor } from '@/lib/launch-offers/service'
import { LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE } from '@/lib/launch-offers/config'

process.env.AQWELIA_LAUNCH_OFFERS_ENABLED = 'true'
process.env.AQWELIA_LAUNCH_TOKEN_SECRET = 'regr5-test-token-secret'

const prefix = `launch-regr5-${Date.now()}`
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

function amountA() { return { paidAmountMinor: 350, normalAmountMinor: 699, currency: 'EUR' } }

beforeAll(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'aqwelia-launch-regr5-'))
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
  const campaigns = await testDb.promotionCampaign.findMany()
  for (const oc of campaigns) {
    await testDb.promotionAuditLog.deleteMany({ where: { campaignId: oc.id } })
    await testDb.promotionRedemption.deleteMany({ where: { campaignId: oc.id } })
    await testDb.promotionReservation.deleteMany({ where: { campaignId: oc.id } })
    await testDb.promotionVariant.deleteMany({ where: { campaignId: oc.id } })
    await testDb.promotionCampaign.deleteMany({ where: { id: oc.id } })
  }
  await testDb.subscription.deleteMany({})
  await testDb.user.deleteMany({})
})

async function setup() {
  await seedCampaign(testDb)
  await setCampaignStatus('ACTIVE', 'test', undefined, testDb)
}

// ─────────────────────────────────────────────────────────────────────────────
// P1#1 — Une seule réservation ACTIVE par (campaignId, userId).
// ─────────────────────────────────────────────────────────────────────────────

describe('P1 #1 — one ACTIVE reservation per user/campaign', () => {
  it('a second reservation for the same user is refused (different offer/platform/allocation)', async () => {
    await setup()
    const u = await makeUser()
    const r1 = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-one-a-${randomUUID()}` }, testDb)
    expect(r1.ok).toBe(true)
    // Même utilisateur, autre offre (variante B) et autre plateforme.
    const r2 = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-one-b-${randomUUID()}` }, testDb)
    expect(r2.ok).toBe(false)
    if (!r2.ok) expect(r2.reasonCode).toBe('ACTIVE_RESERVATION_EXISTS')
    // Une seule réservation ACTIVE, une seule place réservée au total.
    const active = await testDb.promotionReservation.count({ where: { userId: u, status: 'ACTIVE' } })
    expect(active).toBe(1)
    const allocs = await testDb.promotionAllocation.findMany()
    const totalReserved = allocs.reduce((s, a) => s + a.reservedCount, 0)
    expect(totalReserved).toBe(1)
  })

  it('activeUserKey is set on creation and cleared on release', async () => {
    await setup()
    const u = await makeUser()
    const r = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-key-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    const campaign = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    const res = await testDb.promotionReservation.findUnique({ where: { id: r.ok ? r.reservationId : '' } })
    expect(res?.activeUserKey).toBe(activeUserKeyFor(campaign!.id, u))
    await releaseReservation(res!.id, u, testDb)
    const after = await testDb.promotionReservation.findUnique({ where: { id: res!.id } })
    expect(after?.status).toBe('CANCELLED')
    expect(after?.activeUserKey).toBeNull()
    // Une nouvelle réservation est possible après libération.
    const r2 = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-key2-${randomUUID()}` }, testDb)
    expect(r2.ok).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P1#2 — Expirer avant de bloquer une nouvelle tentative (TTL).
// ─────────────────────────────────────────────────────────────────────────────

describe('P1 #2 — expired reservations are cleared before blocking a new attempt', () => {
  it('retry after TTL without expireDueReservations works, even on another offer/platform', async () => {
    await setup()
    const u = await makeUser()
    // 1re réservation sur WEB (offre A), puis TTL dépassé (statut ACTIVE conservé).
    const r1 = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-ttl-1-${randomUUID()}` }, testDb)
    expect(r1.ok).toBe(true)
    await testDb.promotionReservation.update({ where: { id: r1.ok ? r1.reservationId : '' }, data: { expiresAt: new Date(Date.now() - 1000) } })

    // Nouvelle tentative sur une AUTRE offre (B) et AUTRE plateforme (IOS),
    // SANS appeler expireDueReservations : la périmée doit être expirée d'abord.
    const r2 = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'IOS', idempotencyKey: `${prefix}-ttl-2-${randomUUID()}` }, testDb)
    expect(r2.ok).toBe(true)

    // L'ancienne est EXPIRED, la nouvelle ACTIVE ; aucune place fantôme.
    const old = await testDb.promotionReservation.findUnique({ where: { id: r1.ok ? r1.reservationId : '' } })
    expect(old?.status).toBe('EXPIRED')
    expect(old?.activeUserKey).toBeNull()
    const newRes = await testDb.promotionReservation.findUnique({ where: { id: r2.ok ? r2.reservationId : '' } })
    expect(newRes?.status).toBe('ACTIVE')
    const allocs = await testDb.promotionAllocation.findMany()
    const totalReserved = allocs.reduce((s, a) => s + a.reservedCount, 0)
    expect(totalReserved).toBe(1)
  })

  it('a genuinely ACTIVE reservation still blocks', async () => {
    await setup()
    const u = await makeUser()
    const r1 = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-act-${randomUUID()}` }, testDb)
    expect(r1.ok).toBe(true)
    const el = await checkEligibility({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB' }, testDb)
    expect(el.eligible).toBe(false)
    expect(el.reasonCode).toBe('ACTIVE_RESERVATION_EXISTS')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P2#3 — Campagne relue dans la transaction (CAS status/version).
// ─────────────────────────────────────────────────────────────────────────────

describe('P2 #3 — campaign state re-checked inside the reservation transaction', () => {
  it('a paused campaign refuses new reservations (no reservation, no counter)', async () => {
    await setup()
    const u = await makeUser()
    await setCampaignStatus('PAUSED', 'test', undefined, testDb)
    const r = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-paused-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reasonCode).toBe('CAMPAIGN_PAUSED')
    const active = await testDb.promotionReservation.count({ where: { userId: u, status: 'ACTIVE' } })
    expect(active).toBe(0)
    const allocs = await testDb.promotionAllocation.findMany()
    expect(allocs.reduce((s, a) => s + a.reservedCount, 0)).toBe(0)
  })

  it('reservation created before a pause commit stays valid', async () => {
    await setup()
    const u = await makeUser()
    const r = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-prepaused-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    await setCampaignStatus('PAUSED', 'test', undefined, testDb)
    // La réservation reste ACTIVE et valide.
    const res = await testDb.promotionReservation.findUnique({ where: { id: r.ok ? r.reservationId : '' } })
    expect(res?.status).toBe('ACTIVE')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P2#4 — Devise normalisée === pricing.currency.
// ─────────────────────────────────────────────────────────────────────────────

describe('P2 #4 — currency must match server pricing', () => {
  it('EUR is accepted; lowercase eur is normalized and stored as EUR', async () => {
    await setup()
    const u1 = await makeUser()
    const u2 = await makeUser()
    const c1 = await confirmRedemption({ userId: u1, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: `${prefix}-cur-eur-${randomUUID()}`, paidAmountMinor: 350, normalAmountMinor: 699, currency: 'EUR' }, testDb)
    expect(c1.ok).toBe(true)
    const c2 = await confirmRedemption({ userId: u2, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: `${prefix}-cur-lower-${randomUUID()}`, paidAmountMinor: 350, normalAmountMinor: 699, currency: 'eur' }, testDb)
    expect(c2.ok).toBe(true)
    const red = await testDb.promotionRedemption.findFirst({ where: { userId: u2 } })
    expect(red?.currency).toBe('EUR')
  })

  it('USD with same amounts is refused, no mutation', async () => {
    await setup()
    const u = await makeUser()
    const c = await confirmRedemption({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: `${prefix}-cur-usd-${randomUUID()}`, paidAmountMinor: 350, normalAmountMinor: 699, currency: 'USD' }, testDb)
    expect(c.ok).toBe(false)
    if (!c.ok) expect(c.reasonCode).toBe('PRICE_CONFIGURATION_INVALID')
    const allocs = await testDb.promotionAllocation.findMany()
    expect(allocs.reduce((s, a) => s + a.confirmedCount, 0)).toBe(0)
    expect(allocs.reduce((s, a) => s + a.reservedCount, 0)).toBe(0)
    expect(await testDb.promotionRedemption.count()).toBe(0)
  })

  it('empty currency falls back to server EUR; invalid/garbage is refused safely', async () => {
    await setup()
    const uEmpty = await makeUser()
    const cEmpty = await confirmRedemption({ userId: uEmpty, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: `${prefix}-cur-empty-${randomUUID()}`, paidAmountMinor: 350, normalAmountMinor: 699, currency: '' }, testDb)
    expect(cEmpty.ok).toBe(true)

    const uBad = await makeUser()
    const cBad = await confirmRedemption({ userId: uBad, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: `${prefix}-cur-bad-${randomUUID()}`, paidAmountMinor: 350, normalAmountMinor: 699, currency: 'XXX' }, testDb)
    expect(cBad.ok).toBe(false)
    if (!cBad.ok) expect(cBad.reasonCode).toBe('PRICE_CONFIGURATION_INVALID')

    // Les compteurs restent inchangés.
    const allocs = await testDb.promotionAllocation.findMany()
    expect(allocs.reduce((s, a) => s + a.confirmedCount, 0)).toBe(1) // seulement le EUR vide
    expect(allocs.reduce((s, a) => s + a.reservedCount, 0)).toBe(0)
  })
})
