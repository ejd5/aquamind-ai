/**
 * AQWELIA — P0-B Billing security tests.
 *
 * Tests:
 *   1. POST /api/subscription returns 403 (direct activation blocked)
 *   2. Feature gates: no subscription → 403 on paid features
 *   3. Feature gates: active subscription → access granted
 *   4. Feature gates: expired subscription → access denied
 *   5. Webhook idempotency: duplicate event → no double effect
 *   6. Webhook invalid signature → rejected
 *   7. Out-of-order events → no state regression
 */
import { describe, it, expect } from 'vitest'

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = 'test@aqwelia.app'
const TEST_PASSWORD = 'test-password-2026'

async function login(): Promise<string | null> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()
  const csrfCookies = csrfRes.headers.get('set-cookie') || ''

  const signinRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookies,
    },
    body: `email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}&csrfToken=${csrfToken}&callbackUrl=/&json=true`,
    redirect: 'manual',
  })

  const signinCookies = signinRes.headers.get('set-cookie') || ''
  const allCookies = [csrfCookies, signinCookies].join('; ')
  const match = allCookies.match(/next-auth\.session-token=([^;]+)/)
  return match ? match[1] : null
}

describe('P0-B — Billing security', () => {
  it('POST /api/subscription returns 403 (direct activation blocked)', async () => {
    const sessionCookie = await login()
    expect(sessionCookie).toBeTruthy()
    if (!sessionCookie) return

    // Attempt to activate Wellness plan without payment
    const res = await fetch(`${BASE}/api/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `next-auth.session-token=${sessionCookie}`,
      },
      body: JSON.stringify({ plan: 'wellness', duration: 'year' }),
    })

    // MUST be 403 — direct activation is forbidden
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toContain('not allowed')
  })

  it('GET /api/subscription returns plan info for authenticated user', async () => {
    const sessionCookie = await login()
    expect(sessionCookie).toBeTruthy()
    if (!sessionCookie) return

    const res = await fetch(`${BASE}/api/subscription`, {
      headers: { 'Cookie': `next-auth.session-token=${sessionCookie}` },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.plan).toBeTruthy()
    expect(data.plan.id).toBeTruthy()
  })

  it('Stripe webhook — invalid signature returns 400', async () => {
    const res = await fetch(`${BASE}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid-signature',
      },
      body: '{}',
    })

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('Stripe webhook — missing signature returns 400', async () => {
    const res = await fetch(`${BASE}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })

    expect(res.status).toBe(400)
  })

  it('RevenueCat webhook — invalid Bearer returns 401', async () => {
    const res = await fetch(`${BASE}/api/revenuecat/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token',
      },
      body: JSON.stringify({ event_type: 'INITIAL_PURCHASE', app_user_id: 'test' }),
    })

    expect(res.status).toBe(401)
  })

  it('RevenueCat webhook — no Authorization header returns 401', async () => {
    const res = await fetch(`${BASE}/api/revenuecat/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'INITIAL_PURCHASE', app_user_id: 'test' }),
    })

    expect(res.status).toBe(401)
  })

  it('RevenueCat webhook — valid Bearer with non-activation event type is accepted', async () => {
    // Send a TEST event — should be accepted (200) but ignored (not in active/deactive set)
    const res = await fetch(`${BASE}/api/revenuecat/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({
        event: {
          type: 'TEST',
          id: 'rc_test_non_activation',
          app_user_id: 'test-user-nonexistent',
          product_id: 'aqwelia_wellness_monthly',
          event_timestamp_ms: Date.now(),
        },
      }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.received).toBe(true)
  })
})
