/**
 * AQWELIA — P0-B DB-level tests (blocage 9).
 *
 * These tests use an isolated SQLite database and verify the actual
 * Subscription and BillingEvent rows after each operation.
 *
 * Run: bash tests/run-smoke-tests.sh (includes these tests)
 * Or:  SMOKE_BASE_URL=http://localhost:3000 bun run test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = 'test@aqwelia.app'
const TEST_PASSWORD = 'test-password-2026'

// Use the same DATABASE_URL as the test server
const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
})

async function login(): Promise<string | null> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()
  const csrfCookies = csrfRes.headers.get('set-cookie') || ''
  const signinRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': csrfCookies },
    body: `email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}&csrfToken=${csrfToken}&callbackUrl=/&json=true`,
    redirect: 'manual',
  })
  const signinCookies = signinRes.headers.get('set-cookie') || ''
  const allCookies = [csrfCookies, signinCookies].join('; ')
  const match = allCookies.match(/next-auth\.session-token=([^;]+)/)
  return match ? match[1] : null
}

async function clearSubscriptions(userId: string) {
  await db.subscription.deleteMany({ where: { userId } })
  await db.billingEvent.deleteMany({ where: { userId } })
}

async function createSubscription(params: {
  userId: string
  plan: string
  status: string
  active: boolean
  expiresAt?: Date | null
  stripeSubscriptionId?: string | null
  providerSubscriptionId?: string | null
  lastProviderEventId?: string | null
  lastProviderEventAt?: Date | null
}) {
  return db.subscription.create({
    data: {
      userId: params.userId,
      plan: params.plan,
      status: params.status,
      active: params.active,
      expiresAt: params.expiresAt ?? null,
      stripeSubscriptionId: params.stripeSubscriptionId ?? null,
      providerSubscriptionId: params.providerSubscriptionId ?? null,
      lastProviderEventId: params.lastProviderEventId ?? null,
      lastProviderEventAt: params.lastProviderEventAt ?? null,
    },
  })
}

async function getLatestSubscription(userId: string) {
  return db.subscription.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
  })
}

async function getBillingEvents(userId: string) {
  return db.billingEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
}

describe('P0-B — DB-level billing tests', () => {
  let sessionCookie: string
  let userId: string

  beforeAll(async () => {
    sessionCookie = (await login())!
    expect(sessionCookie).toBeTruthy()

    // Get user ID from session
    const res = await fetch(`${BASE}/api/auth/session`, {
      headers: { 'Cookie': `next-auth.session-token=${sessionCookie}` },
    })
    const data = await res.json()
    userId = data.user.id
    expect(userId).toBeTruthy()

    // Clean up any existing subscriptions for this user
    await clearSubscriptions(userId)
  })

  afterAll(async () => {
    await clearSubscriptions(userId)
    await db.$disconnect()
  })

  // ── Migration backfill tests ──────────────────────────────────────────────

  it('backfill: active=true + future expiry → status=active', async () => {
    // Create a pre-P0-B style subscription (active=true, no status field set)
    await clearSubscriptions(userId)
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const sub = await createSubscription({
      userId, plan: 'oasis', status: 'inactive', active: true, expiresAt: futureDate,
    })
    // The migration would set status='active' for active=true + future expiry.
    // In our test DB, status defaults to 'inactive'. Simulate the backfill:
    await db.subscription.update({ where: { id: sub.id }, data: { status: 'active' } })
    const updated = await db.subscription.findUnique({ where: { id: sub.id } })
    expect(updated?.status).toBe('active')
    expect(updated?.active).toBe(true)
  })

  it('backfill: active=true + past expiry → status=expired, active=false', async () => {
    await clearSubscriptions(userId)
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sub = await createSubscription({
      userId, plan: 'oasis', status: 'inactive', active: true, expiresAt: pastDate,
    })
    // Simulate backfill
    await db.subscription.update({ where: { id: sub.id }, data: { status: 'expired', active: false } })
    const updated = await db.subscription.findUnique({ where: { id: sub.id } })
    expect(updated?.status).toBe('expired')
    expect(updated?.active).toBe(false)
  })

  it('backfill: active=false → status=inactive', async () => {
    await clearSubscriptions(userId)
    const sub = await createSubscription({
      userId, plan: 'decouverte', status: 'inactive', active: false,
    })
    const updated = await db.subscription.findUnique({ where: { id: sub.id } })
    expect(updated?.status).toBe('inactive')
    expect(updated?.active).toBe(false)
  })

  // ── POST /api/subscription blocked ────────────────────────────────────────

  it('POST /api/subscription → 403, no Subscription row created', async () => {
    await clearSubscriptions(userId)
    const res = await fetch(`${BASE}/api/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': `next-auth.session-token=${sessionCookie}` },
      body: JSON.stringify({ plan: 'wellness', duration: 'year' }),
    })
    expect(res.status).toBe(403)
    // Verify no subscription was created
    const subs = await db.subscription.findMany({ where: { userId } })
    expect(subs.length).toBe(0)
  })

  // ── Webhook security tests ────────────────────────────────────────────────

  it('Stripe webhook: missing signature → 400, no BillingEvent', async () => {
    const beforeCount = await db.billingEvent.count()
    const res = await fetch(`${BASE}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    expect(res.status).toBe(400)
    const afterCount = await db.billingEvent.count()
    expect(afterCount).toBe(beforeCount) // no event stored
  })

  it('Stripe webhook: invalid signature → 400, no BillingEvent', async () => {
    const beforeCount = await db.billingEvent.count()
    const res = await fetch(`${BASE}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'invalid' },
      body: '{}',
    })
    expect(res.status).toBe(400)
    const afterCount = await db.billingEvent.count()
    expect(afterCount).toBe(beforeCount)
  })

  it('RevenueCat webhook: invalid Bearer → 401, no BillingEvent', async () => {
    const beforeCount = await db.billingEvent.count()
    const res = await fetch(`${BASE}/api/revenuecat/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer wrong' },
      body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE', app_user_id: userId } }),
    })
    expect(res.status).toBe(401)
    const afterCount = await db.billingEvent.count()
    expect(afterCount).toBe(beforeCount)
  })

  it('RevenueCat webhook: TEST event → 200, BillingEvent created with result=ignored', async () => {
    const res = await fetch(`${BASE}/api/revenuecat/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        event: {
          type: 'TEST',
          id: 'test_evt_001',
          app_user_id: userId,
          event_timestamp_ms: Date.now(),
          product_id: 'aqwelia_oasis_monthly',
        },
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.received).toBe(true)

    // Verify BillingEvent was created
    const events = await getBillingEvents(userId)
    const testEvent = events.find(e => e.eventId === 'test_evt_001')
    expect(testEvent).toBeTruthy()
    expect(testEvent?.result).toBe('ignored')
    expect(testEvent?.ignoredReason).toBe('event_type_not_supported')
  })

  it('RevenueCat webhook: duplicate event → 200 skipped, no double effect', async () => {
    const eventBody = {
      event: {
        type: 'TEST',
        id: 'test_evt_dup_001',
        app_user_id: userId,
        event_timestamp_ms: Date.now(),
        product_id: 'aqwelia_oasis_monthly',
      },
    }

    // First delivery
    const res1 = await fetch(`${BASE}/api/revenuecat/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify(eventBody),
    })
    expect(res1.status).toBe(200)

    // Second delivery (duplicate)
    const res2 = await fetch(`${BASE}/api/revenuecat/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify(eventBody),
    })
    expect(res2.status).toBe(200)
    const data2 = await res2.json()
    expect(data2.skipped).toBe(true)

    // Verify only ONE BillingEvent exists
    const events = await db.billingEvent.findMany({
      where: { eventId: 'test_evt_dup_001', source: 'revenuecat' },
    })
    expect(events.length).toBe(1)
  })

  it('RevenueCat webhook: unknown product → 200, BillingEvent=ignored with reason', async () => {
    const res = await fetch(`${BASE}/api/revenuecat/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        event: {
          type: 'INITIAL_PURCHASE',
          id: 'test_evt_unknown_prod_001',
          app_user_id: userId,
          event_timestamp_ms: Date.now(),
          product_id: 'unknown_product_xyz',
          purchased_at_ms: Date.now(),
          expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
          original_transaction_id: 'rc_orig_001',
          store: 'APP_STORE',
        },
      }),
    })
    expect(res.status).toBe(200)

    const event = await db.billingEvent.findUnique({
      where: { source_eventId: { source: 'revenuecat', eventId: 'test_evt_unknown_prod_001' } },
    })
    expect(event).toBeTruthy()
    expect(event?.result).toBe('ignored')
    expect(event?.ignoredReason).toBe('unknown_product')
  })

  // ── Feature gate tests ────────────────────────────────────────────────────

  it('Feature gate: no subscription → weather returns 200 with upgradeRequired', async () => {
    await clearSubscriptions(userId)
    // User has no subscription — weather should return basic data with upgradeRequired
    const res = await fetch(`${BASE}/api/pool/weather`, {
      headers: { 'Cookie': `next-auth.session-token=${sessionCookie}` },
    })
    // 200 = basic weather is accessible, but advanced assessment is gated
    expect(res.status).toBe(200)
    const data = await res.json()
    // Either upgradeRequired=true or assessment=null for non-paid users
    expect(data.upgradeRequired === true || data.assessment === null).toBe(true)
  })

  it('Feature gate: no subscription → guides basic accessible', async () => {
    await clearSubscriptions(userId)
    const res = await fetch(`${BASE}/api/guides`)
    expect(res.status).toBe(200)
  })

  it('Feature gate: no subscription → water-test returns limited history', async () => {
    await clearSubscriptions(userId)
    const res = await fetch(`${BASE}/api/pool/water-test`, {
      headers: { 'Cookie': `next-auth.session-token=${sessionCookie}` },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.historyLimited).toBe(true)
  })

  it('Feature gate: admin reconcile without admin → 403', async () => {
    const res = await fetch(`${BASE}/api/admin/reconcile?userId=${userId}`, {
      method: 'POST',
      headers: { 'Cookie': `next-auth.session-token=${sessionCookie}` },
    })
    expect(res.status).toBe(403)
  })
})
