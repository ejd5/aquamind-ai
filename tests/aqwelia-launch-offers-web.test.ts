/**
 * AQWELIA Launch offers — Web checkout & webhook (spec v1.0 §5-§10).
 *
 * Couvre, sur base SQLite isolée (client dédié injecté) et Stripe mocké :
 *  - résolution du price ID/coupon CÔTÉ SERVEUR (jamais du client) ;
 *  - createLaunchCheckoutSession : éligibilité → réservation → session Stripe
 *    (coupon + metadata), lien providerCheckoutId, libération sur erreur ;
 *  - handleLaunchCheckoutSession : confirmation atomique (quota global +
 *    allocation), montants validés contre le pricing serveur, idempotence
 *    (webhook dupliqué → alreadyProcessed), rejet si montant incohérent ;
 *  - restoreRedemptionSlot : remise de place ADMIN auditée, une seule fois ;
 *  - markLaunchRedemptionRefunded : remboursement → REFUNDED sans remettre la
 *    place.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import type { LaunchDb } from '@/lib/launch-offers/service'
import { seedCampaign, setCampaignStatus, restoreRedemptionSlot } from '@/lib/launch-offers/admin'
import { getLaunchStripeConfig } from '@/lib/launch-offers/stripe'
import { createLaunchCheckoutSession } from '@/lib/launch-offers/checkout'
import { handleLaunchCheckoutSession, markLaunchRedemptionRefunded } from '@/lib/launch-offers/webhook'
import { LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE } from '@/lib/launch-offers/config'

process.env.AQWELIA_LAUNCH_OFFERS_ENABLED = 'true'
process.env.AQWELIA_LAUNCH_TOKEN_SECRET = 'web-test-token-secret'
process.env.STRIPE_PRICE_OASIS_MONTHLY = 'price_oasis_monthly_test'
process.env.STRIPE_PRICE_OASIS_QUARTERLY = 'price_oasis_quarterly_test'
process.env.AQWELIA_LAUNCH_STRIPE_COUPON_LAUNCH50_MONTHLY = 'coupon_50_test'
process.env.AQWELIA_LAUNCH_STRIPE_COUPON_LAUNCH3FOR2_QUARTERLY = 'coupon_3for2_test'

const prefix = `launch-web-${Date.now()}`
let userSeq = 0
let dbDir: string
let dbFile: string
let testDb: LaunchDb

// Capture des sessions Stripe créées (pour assertion sur coupon + metadata).
const stripeSessionCalls: any[] = []

// vi.mock est hoisté au-dessus des `process.env = ...` ; on lit donc env de façon
// paresseuse via un Proxy pour STRIPE_PRICES.
vi.mock('@/lib/stripe', () => ({
  STRIPE_PRICES: new Proxy({}, {
    get: (_t, key: string) => {
      if (key === 'oasis_monthly') return process.env.STRIPE_PRICE_OASIS_MONTHLY || ''
      if (key === 'oasis_quarterly') return process.env.STRIPE_PRICE_OASIS_QUARTERLY || ''
      return ''
    },
    has: () => true,
  }),
  getStripe: () => ({
    checkout: {
      sessions: {
        create: async (opts: any) => {
          stripeSessionCalls.push(opts)
          return { id: 'cs_test_mock', url: 'https://checkout.stripe.com/cs_test_mock' }
        },
      },
    },
  }),
}))

async function makeUser(): Promise<string> {
  userSeq += 1
  // Pays FR vérifié côté serveur (le backend final exige countryVerifiedAt).
  const u = await testDb.user.create({ data: { email: `${prefix}-u${userSeq}@aqwelia.test`, passwordHash: 'x', country: 'FR', countryVerifiedAt: new Date(), countrySource: 'test' } })
  return u.id
}

beforeAll(async () => {
  dbDir = mkdtempSync(join(tmpdir(), 'aqwelia-launch-web-'))
  dbFile = join(dbDir, 'test.db')
  execSync(`bunx prisma db push --skip-generate --accept-data-loss`, {
    env: { ...process.env, DATABASE_URL: `file:${dbFile}` },
    stdio: 'pipe',
  })
  testDb = new PrismaClient({
    datasources: { db: { url: `file:${dbFile}` } },
    transactionOptions: { maxWait: 8_000, timeout: 30_000 },
  })
  const seeded = await seedCampaign(testDb)
  expect(seeded.created).toBe(true)
  await setCampaignStatus('ACTIVE', 'test', undefined, testDb)
})

afterEach(async () => {
  await testDb.promotionReservation.deleteMany({})
  await testDb.promotionRedemption.deleteMany({})
  await testDb.promotionAllocation.updateMany({ data: { reservedCount: 0, confirmedCount: 0 } })
  await testDb.promotionCampaign.updateMany({ data: { confirmedCount: 0 } })
})

afterAll(async () => {
  await testDb.$disconnect()
  rmSync(dbDir, { recursive: true, force: true })
})

describe('server-side Stripe mapping', () => {
  it('resolves price ID + coupon from server config (never from client)', () => {
    const a = getLaunchStripeConfig(LAUNCH_OFFER_A_CODE, 'oasis')
    expect(a).not.toBeNull()
    expect(a!.priceId).toBe('price_oasis_monthly_test')
    expect(a!.couponId).toBe('coupon_50_test')
    expect(a!.dueNowMinor).toBe(350)
    expect(a!.renewalMinor).toBe(699)
    expect(a!.renewalPeriod).toBe('P1M')

    const b = getLaunchStripeConfig(LAUNCH_OFFER_B_CODE, 'oasis')
    expect(b).not.toBeNull()
    expect(b!.priceId).toBe('price_oasis_quarterly_test')
    expect(b!.couponId).toBe('coupon_3for2_test')
    expect(b!.dueNowMinor).toBe(1398)
    expect(b!.renewalMinor).toBe(1999)
    expect(b!.renewalPeriod).toBe('P3M')
  })

  it('returns null when the plan has no monthly price (decouverte)', () => {
    expect(getLaunchStripeConfig(LAUNCH_OFFER_A_CODE, 'decouverte')).toBeNull()
  })
})

describe('createLaunchCheckoutSession', () => {
  it('creates a reservation then a Stripe session with coupon + campaign metadata', async () => {
    const userId = await makeUser()
    const result = await createLaunchCheckoutSession({
      userId,
      userEmail: 'u@aqwelia.test',
      offerCode: LAUNCH_OFFER_A_CODE,
      planId: 'oasis',
      idempotencyKey: `${prefix}-sess-${randomUUID()}`,
      origin: 'http://localhost:3000',
    }, testDb)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.sessionId).toBe('cs_test_mock')
      const opts = stripeSessionCalls[stripeSessionCalls.length - 1]
      expect(opts.mode).toBe('subscription')
      expect(opts.line_items[0].price).toBe('price_oasis_monthly_test')
      expect(opts.discounts[0].coupon).toBe('coupon_50_test')
      expect(opts.metadata.campaignCode).toBe('AQWELIA_LAUNCH_2026')
      expect(opts.metadata.offerCode).toBe(LAUNCH_OFFER_A_CODE)
      expect(opts.metadata.reservationId).toBe(result.reservationId)
      // La réservation est liée à la session.
      const res = await testDb.promotionReservation.findUnique({ where: { id: result.reservationId } })
      expect(res?.providerCheckoutId).toBe('cs_test_mock')
      // La place est réservée (reservedCount=1).
      const alloc = await testDb.promotionAllocation.findFirst({ where: { platform: 'WEB', planId: null } })
      expect(alloc!.reservedCount).toBe(1)
    }
  })

  it('rejects when the user is not eligible (already redeemed)', async () => {
    const userId = await makeUser()
    // 1er achat → réservation + session, puis confirmation (webhook).
    const r = await createLaunchCheckoutSession({
      userId, userEmail: 'u@aqwelia.test', offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis',
      idempotencyKey: `${prefix}-first-${randomUUID()}`, origin: 'http://localhost:3000',
    }, testDb)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const res = await testDb.promotionReservation.findUnique({ where: { id: r.reservationId } })
    const h = await handleLaunchCheckoutSession({
      id: res?.providerCheckoutId || 'cs_x',
      payment_status: 'paid',
      amount_total: 1398,
      payment_intent: `pi_${randomUUID().replace(/-/g, '')}`,
      client_reference_id: userId,
      metadata: { campaignCode: 'AQWELIA_LAUNCH_2026', offerCode: LAUNCH_OFFER_B_CODE, planId: 'oasis', platform: 'WEB', reservationId: r.reservationId },
    }, testDb)
    expect(h.handled).toBe(true)

    // 2e achat → le user a déjà consommé la campagne.
    const again = await createLaunchCheckoutSession({
      userId, userEmail: 'u@aqwelia.test', offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis',
      idempotencyKey: `${prefix}-second-${randomUUID()}`, origin: 'http://localhost:3000',
    }, testDb)
    expect(again.ok).toBe(false)
    if (!again.ok) expect(again.reasonCode).toBe('OFFER_ALREADY_REDEEMED')
  })

  it('releases the reservation when Stripe is not configured', async () => {
    const userId = await makeUser()
    vi.stubEnv('STRIPE_PRICE_OASIS_MONTHLY', '')
    try {
      const result = await createLaunchCheckoutSession({
        userId, userEmail: 'u@aqwelia.test', offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis',
        idempotencyKey: `${prefix}-noconf-${randomUUID()}`, origin: 'http://localhost:3000',
      }, testDb)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reasonCode).toBe('STRIPE_NOT_CONFIGURED')
      const alloc = await testDb.promotionAllocation.findFirst({ where: { platform: 'WEB', planId: null } })
      expect(alloc!.reservedCount).toBe(0)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('handleLaunchCheckoutSession (webhook)', () => {
  function makePaidSession(over: any = {}) {
    return {
      id: `cs_${randomUUID().replace(/-/g, '')}`,
      payment_status: 'paid',
      amount_total: 350,
      payment_intent: `pi_${randomUUID().replace(/-/g, '')}`,
      client_reference_id: over.userId,
      metadata: {
        campaignCode: 'AQWELIA_LAUNCH_2026',
        offerCode: LAUNCH_OFFER_A_CODE,
        planId: 'oasis',
        platform: 'WEB',
        reservationId: over.reservationId,
      },
      ...over,
    }
  }

  it('confirms the redemption atomically (global + allocation quota)', async () => {
    const userId = await makeUser()
    const alloc = await testDb.promotionAllocation.findFirst({ where: { platform: 'WEB', planId: null } })
    const campaign = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    const allocBefore = alloc!.confirmedCount
    const campaignBefore = campaign!.confirmedCount

    const result = await handleLaunchCheckoutSession(makePaidSession({ userId }), testDb)
    expect(result.handled).toBe(true)

    const allocAfter = await testDb.promotionAllocation.findUnique({ where: { id: alloc!.id } })
    const campaignAfter = await testDb.promotionCampaign.findUnique({ where: { id: campaign!.id } })
    expect(allocAfter!.confirmedCount).toBe(allocBefore + 1)
    expect(campaignAfter!.confirmedCount).toBe(campaignBefore + 1)

    const redemption = await testDb.promotionRedemption.findFirst({ where: { userId } })
    expect(redemption).not.toBeNull()
    expect(redemption!.paidAmountMinor).toBe(350)
    expect(redemption!.normalAmountMinor).toBe(699)
  })

  it('is idempotent: duplicate webhook for the same payment → alreadyProcessed, no double consumption', async () => {
    const userId = await makeUser()
    const session = makePaidSession({ userId })
    const r1 = await handleLaunchCheckoutSession(session, testDb)
    expect(r1.handled).toBe(true)
    if (r1.handled) expect(r1.alreadyProcessed).toBe(false)

    const r2 = await handleLaunchCheckoutSession(session, testDb)
    expect(r2.handled).toBe(true)
    if (r2.handled) expect(r2.alreadyProcessed).toBe(true)

    const campaign = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    expect(campaign!.confirmedCount).toBe(1)
  })

  it('rejects when the paid amount does not match server pricing', async () => {
    const userId = await makeUser()
    const session = makePaidSession({ userId, amount_total: 1 })
    const result = await handleLaunchCheckoutSession(session, testDb)
    expect(result.handled).toBe(false)
    if (!result.handled) expect(result.reason).toBe('amount_mismatch_with_server_pricing')
    const campaign = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    expect(campaign!.confirmedCount).toBe(0)
  })

  it('does not treat a non-campaign session as handled', async () => {
    const userId = await makeUser()
    const session = makePaidSession({ userId, metadata: { offerCode: LAUNCH_OFFER_A_CODE } })
    const result = await handleLaunchCheckoutSession(session, testDb)
    expect(result.handled).toBe(false)
  })
})

describe('admin restore slot (audited) + refunds', () => {
  it('restores a slot only once, decrementing global + allocation quota, with audit', async () => {
    const userId = await makeUser()
    const session = { id: `cs_${randomUUID().replace(/-/g, '')}`, payment_status: 'paid', amount_total: 350, payment_intent: `pi_${randomUUID().replace(/-/g, '')}`, client_reference_id: userId, metadata: { campaignCode: 'AQWELIA_LAUNCH_2026', offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB' } }
    const h = await handleLaunchCheckoutSession(session, testDb)
    expect(h.handled).toBe(true)

    const redemption = await testDb.promotionRedemption.findFirst({ where: { userId } })
    expect(redemption).not.toBeNull()
    const campaign = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    expect(campaign!.confirmedCount).toBe(1)

    const restored = await restoreRedemptionSlot({ redemptionId: redemption!.id, actor: 'admin-test', reason: 'doublon technique' }, testDb)
    expect(restored.ok).toBe(true)
    const campaignAfter = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    expect(campaignAfter!.confirmedCount).toBe(0)
    const redAfter = await testDb.promotionRedemption.findUnique({ where: { id: redemption!.id } })
    expect(redAfter!.status).toBe('TECHNICAL_CANCEL')

    // Idempotence : seconde remise refusée.
    const again = await restoreRedemptionSlot({ redemptionId: redemption!.id, actor: 'admin-test', reason: 'again' }, testDb)
    expect(again.ok).toBe(false)

    const audit = await testDb.promotionAuditLog.findFirst({ where: { action: 'restore_slot' } })
    expect(audit).not.toBeNull()
    expect(audit!.actor).toBe('admin-test')
  })

  it('a full refund marks the redemption REFUNDED without restoring the slot', async () => {
    const userId = await makeUser()
    const session = { id: `cs_${randomUUID().replace(/-/g, '')}`, payment_status: 'paid', amount_total: 350, payment_intent: `pi_${randomUUID().replace(/-/g, '')}`, client_reference_id: userId, metadata: { campaignCode: 'AQWELIA_LAUNCH_2026', offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB' } }
    const h = await handleLaunchCheckoutSession(session, testDb)
    expect(h.handled).toBe(true)

    const refunded = await markLaunchRedemptionRefunded({ userId }, testDb)
    expect(refunded.handled).toBe(true)
    const redemption = await testDb.promotionRedemption.findFirst({ where: { userId } })
    expect(redemption!.status).toBe('REFUNDED')
    // La place n'est PAS remise automatiquement.
    const campaign = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    expect(campaign!.confirmedCount).toBe(1)
  })
})
