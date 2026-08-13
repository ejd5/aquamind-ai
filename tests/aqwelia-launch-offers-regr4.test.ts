/**
 * AQWELIA Launch offers — régression des 4 nouveaux commentaires Codex (PR #88).
 *
 * P1#1 — Pays réellement vérifié (countryVerifiedAt/countrySource).
 * P1#2 — Réallocation atomique (CAS campaign.version + all within transaction).
 * P2#3 — Cohérence des quotas au seed (validation avant création).
 * P2#4 — Correspondance fournisseur/plateforme (STRIPE→WEB, APPLE→IOS, GOOGLE→ANDROID).
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
import { checkEligibility, confirmRedemption, createReservation } from '@/lib/launch-offers/service'
import { computeLaunchAllocationSplit, LAUNCH_OFFER_A_CODE, LAUNCH_OFFER_B_CODE } from '@/lib/launch-offers/config'

process.env.AQWELIA_LAUNCH_OFFERS_ENABLED = 'true'
process.env.AQWELIA_LAUNCH_TOKEN_SECRET = 'regr4-test-token-secret'

const prefix = `launch-regr4-${Date.now()}`
let userSeq = 0
let dbDir: string
let dbFile: string
let testDb: LaunchDb

async function makeUser(opts: { country?: string; verified?: boolean } = {}): Promise<string> {
  userSeq += 1
  const u = await testDb.user.create({
    data: {
      email: `${prefix}-u${userSeq}@aqwelia.test`,
      passwordHash: 'x',
      country: opts.country ?? 'FR',
      countryVerifiedAt: opts.verified === false ? null : (opts.verified ?? true) ? new Date() : null,
      countrySource: opts.verified === false ? null : 'test',
    },
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
  dbDir = mkdtempSync(join(tmpdir(), 'aqwelia-launch-regr4-'))
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

// ─────────────────────────────────────────────────────────────────────────────
// P1#1 — Pays réellement vérifié.
// ─────────────────────────────────────────────────────────────────────────────

describe('P1 #1 — country must be server-verified', () => {
  async function setup() {
    await seedCampaign(testDb)
    await setCampaignStatus('ACTIVE', 'test', undefined, testDb)
  }

  it('France verified server-side → eligible', async () => {
    await setup()
    const u = await makeUser({ country: 'FR', verified: true })
    const r = await checkEligibility({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB' }, testDb)
    expect(r.eligible).toBe(true)
  })

  it('another country verified → refused', async () => {
    await setup()
    const u = await makeUser({ country: 'DE', verified: true })
    const r = await checkEligibility({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB' }, testDb)
    expect(r.eligible).toBe(false)
    expect(r.reasonCode).toBe('COUNTRY_NOT_ELIGIBLE')
  })

  it('country absent (default FR, never verified) → refused', async () => {
    await setup()
    const u = await makeUser({ country: 'FR', verified: false })
    const r = await checkEligibility({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB' }, testDb)
    expect(r.eligible).toBe(false)
    expect(r.reasonCode).toBe('COUNTRY_NOT_ELIGIBLE')
  })

  it('falsified FR in the request does not grant eligibility', async () => {
    await setup()
    // User DE vérifié ; le hint FR du client ne doit pas lever le refus.
    const u = await makeUser({ country: 'DE', verified: true })
    const r = await checkEligibility({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', countryHint: 'FR' }, testDb)
    expect(r.eligible).toBe(false)
    expect(r.reasonCode).toBe('COUNTRY_NOT_ELIGIBLE')
  })

  it('credentials/OAuth accounts (no proof) are unverified', async () => {
    await setup()
    // Simule un compte créé par l'inscription credentials/OAuth : pays par
    // défaut FR, countryVerifiedAt NULL.
    const u = await testDb.user.create({ data: { email: `${prefix}-noauth-${randomUUID()}@aqwelia.test`, passwordHash: 'x' } })
    const r = await checkEligibility({ userId: u.id, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB' }, testDb)
    expect(r.eligible).toBe(false)
    expect(r.reasonCode).toBe('COUNTRY_NOT_ELIGIBLE')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P2#3 — Cohérence des quotas au seed.
// ─────────────────────────────────────────────────────────────────────────────

describe('P2 #3 — seed quota coherence', () => {
  it('default 300 + 200 = 500 is accepted', async () => {
    const s = await seedCampaign(testDb)
    expect(s.created).toBe(true)
    expect(s.error).toBeUndefined()
    const c = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
    expect(c!.totalQuota).toBe(500)
  })

  it('sum above total → refused with no partial graph', async () => {
    process.env.AQWELIA_LAUNCH_QUOTA_A = '400'
    process.env.AQWELIA_LAUNCH_QUOTA_B = '200'
    process.env.AQWELIA_LAUNCH_TOTAL_QUOTA = '500'
    try {
      const s = await seedCampaign(testDb)
      expect(s.created).toBe(false)
      expect(s.error).toContain('exceeds total quota')
      const c = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
      expect(c).toBeNull()
      const variants = await testDb.promotionVariant.count()
      expect(variants).toBe(0)
      const allocs = await testDb.promotionAllocation.count()
      expect(allocs).toBe(0)
    } finally {
      delete process.env.AQWELIA_LAUNCH_QUOTA_A
      delete process.env.AQWELIA_LAUNCH_QUOTA_B
      delete process.env.AQWELIA_LAUNCH_TOTAL_QUOTA
    }
  })

  it('negative / non-integer / invalid quotas are refused', async () => {
    for (const [env, val] of [
      ['AQWELIA_LAUNCH_QUOTA_A', '-5'],
      ['AQWELIA_LAUNCH_QUOTA_A', '1.5'],
      ['AQWELIA_LAUNCH_QUOTA_A', 'abc'],
      ['AQWELIA_LAUNCH_TOTAL_QUOTA', '-1'],
    ] as const) {
      process.env[env] = val
      try {
        const s = await seedCampaign(testDb)
        expect(s.created).toBe(false)
        expect(s.error).toContain('non-negative integer')
        const c = await testDb.promotionCampaign.findFirst({ where: { code: 'AQWELIA_LAUNCH_2026' } })
        expect(c).toBeNull()
      } finally {
        delete process.env[env]
      }
    }
  })

  it('sum below total is allowed if intentionally supported', async () => {
    process.env.AQWELIA_LAUNCH_QUOTA_A = '100'
    process.env.AQWELIA_LAUNCH_QUOTA_B = '100'
    process.env.AQWELIA_LAUNCH_TOTAL_QUOTA = '500'
    try {
      const s = await seedCampaign(testDb)
      expect(s.created).toBe(true)
      expect(s.error).toBeUndefined()
    } finally {
      delete process.env.AQWELIA_LAUNCH_QUOTA_A
      delete process.env.AQWELIA_LAUNCH_QUOTA_B
      delete process.env.AQWELIA_LAUNCH_TOTAL_QUOTA
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P2#4 — Correspondance fournisseur/plateforme.
// ─────────────────────────────────────────────────────────────────────────────

describe('P2 #4 — provider → platform mapping', () => {
  async function setup() {
    await seedCampaign(testDb)
    await setCampaignStatus('ACTIVE', 'test', undefined, testDb)
  }

  it('the three valid mappings succeed', async () => {
    await setup()
    const uWeb = await makeUser()
    const uIos = await makeUser()
    const uAndroid = await makeUser()
    const c1 = await confirmRedemption({ userId: uWeb, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', provider: 'STRIPE', providerTransactionId: `${prefix}-m1-${randomUUID()}`, ...amountA() }, testDb)
    expect(c1.ok).toBe(true)
    const c2 = await confirmRedemption({ userId: uIos, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'IOS', provider: 'APPLE', providerTransactionId: `${prefix}-m2-${randomUUID()}`, ...amountA() }, testDb)
    expect(c2.ok).toBe(true)
    const c3 = await confirmRedemption({ userId: uAndroid, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'ANDROID', provider: 'GOOGLE', providerTransactionId: `${prefix}-m3-${randomUUID()}`, ...amountA() }, testDb)
    expect(c3.ok).toBe(true)
  })

  it('all invalid combinations are refused with no counter change', async () => {
    await setup()
    const allocWeb = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB')
    const allocIos = await allocOf(LAUNCH_OFFER_A_CODE, 'IOS')
    const allocAndroid = await allocOf(LAUNCH_OFFER_A_CODE, 'ANDROID')

    const invalid: Array<{ provider: 'STRIPE' | 'APPLE' | 'GOOGLE'; platform: string }> = [
      { provider: 'STRIPE', platform: 'IOS' },
      { provider: 'STRIPE', platform: 'ANDROID' },
      { provider: 'APPLE', platform: 'WEB' },
      { provider: 'APPLE', platform: 'ANDROID' },
      { provider: 'GOOGLE', platform: 'WEB' },
      { provider: 'GOOGLE', platform: 'IOS' },
    ]
    let i = 0
    for (const bad of invalid) {
      i += 1
      const u = await makeUser()
      const r = await confirmRedemption({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: bad.platform, provider: bad.provider, providerTransactionId: `${prefix}-inv-${i}-${randomUUID()}`, ...amountA() }, testDb)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.reasonCode).toBe('PLATFORM_NOT_ELIGIBLE')
    }

    const w = await testDb.promotionAllocation.findUnique({ where: { id: allocWeb.id } })
    const ios = await testDb.promotionAllocation.findUnique({ where: { id: allocIos.id } })
    const and = await testDb.promotionAllocation.findUnique({ where: { id: allocAndroid.id } })
    expect(w!.confirmedCount).toBe(0)
    expect(ios!.confirmedCount).toBe(0)
    expect(and!.confirmedCount).toBe(0)
    expect(await testDb.promotionRedemption.count()).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// P1#2 — Réallocation atomique (logique de base ; concurrence PG séparée).
// ─────────────────────────────────────────────────────────────────────────────

describe('P1 #2 — atomic reallocation', () => {
  async function setup() {
    await seedCampaign(testDb)
    await setCampaignStatus('ACTIVE', 'test', undefined, testDb)
  }

  it('refuses to lower below floor (confirmed + reserved)', async () => {
    await setup()
    const u = await makeUser()
    const r = await createReservation({ userId: u, offerCode: LAUNCH_OFFER_A_CODE, planId: 'oasis', platform: 'WEB', idempotencyKey: `${prefix}-re-${randomUUID()}` }, testDb)
    expect(r.ok).toBe(true)
    const res = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 0, actor: 'test' }, testDb)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('cannot_set_below')
  })

  it('writes exactly one audit per successful mutation', async () => {
    await setup()
    const res = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 160, actor: 'test' }, testDb)
    expect(res.ok).toBe(true)
    const audits = await testDb.promotionAuditLog.findMany({ where: { action: 'reallocate' } })
    expect(audits).toHaveLength(1)
    const alloc = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB')
    expect(alloc.quota).toBe(160)
  })

  it('no audit when the mutation is refused', async () => {
    await setup()
    const res = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 99999, actor: 'test' }, testDb)
    expect(res.ok).toBe(false)
    const audits = await testDb.promotionAuditLog.findMany({ where: { action: 'reallocate' } })
    expect(audits).toHaveLength(0)
  })

  it('never exceeds variant or campaign quota', async () => {
    await setup()
    const byVariant = await reallocate({ variantCode: LAUNCH_OFFER_A_CODE, platform: 'WEB', newQuota: 99999, actor: 'test' }, testDb)
    expect(byVariant.ok).toBe(false)
    expect(byVariant.error).toBe('exceeds_variant_quota')
    const allocWeb = await allocOf(LAUNCH_OFFER_A_CODE, 'WEB')
    expect(allocWeb.quota).toBe(180)
  })
})
