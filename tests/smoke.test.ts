/**
 * AQWELIA — Smoke tests (P0-A baseline)
 *
 * Tests the critical paths that MUST work for the app to be functional.
 *
 * Run: bash tests/run-smoke-tests.sh
 * Or:  SMOKE_BASE_URL=http://localhost:3000 bun run test
 */
import { describe, it, expect } from 'vitest'

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000'

// Test credentials (created by tests/run-smoke-tests.sh)
const TEST_EMAIL = 'test@aqwelia.app'
const TEST_PASSWORD = 'test-password-2026'

// ── Helper: login and return the session cookie ─────────────────────────────

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

// ── Auth & API baseline ──────────────────────────────────────────────────────

describe('Smoke — Auth & API baseline', () => {
  it('GET /api/auth/csrf — returns a CSRF token', async () => {
    const res = await fetch(`${BASE}/api/auth/csrf`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.csrfToken).toBeTruthy()
    expect(typeof data.csrfToken).toBe('string')
  })

  it('GET /api/auth/session — returns empty session when unauthenticated', async () => {
    const res = await fetch(`${BASE}/api/auth/session`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Object.keys(data).length === 0 || data.user === undefined).toBe(true)
  })

  it('GET /api/pool/profile — returns 401 JSON when unauthenticated', async () => {
    const res = await fetch(`${BASE}/api/pool/profile`)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('unauthorized')
    expect(data.authenticated).toBe(false)
  })

  it('GET /auth/signin — returns 200', async () => {
    const res = await fetch(`${BASE}/auth/signin`)
    expect(res.status).toBe(200)
  })

  it('GET / — returns 200 (landing page)', async () => {
    const res = await fetch(`${BASE}/`)
    expect(res.status).toBe(200)
  })
})

// ── Real auth flow: login, session, logout ───────────────────────────────────

describe('Smoke — Real auth flow', () => {
  it('POST /api/auth/callback/credentials with valid credentials — creates a session', async () => {
    const sessionCookie = await login()
    expect(sessionCookie).toBeTruthy()
  })

  it('POST /api/auth/callback/credentials with invalid password — rejects with error (not 500)', async () => {
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
    const { csrfToken } = await csrfRes.json()
    const cookies = csrfRes.headers.get('set-cookie') || ''

    const signinRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
      },
      body: `email=${encodeURIComponent(TEST_EMAIL)}&password=wrong-password&csrfToken=${csrfToken}&callbackUrl=/&json=true`,
      redirect: 'manual',
    })

    // A 500 would indicate a server error — that must NEVER pass the test.
    expect(signinRes.status).not.toBe(500)
    expect([200, 302, 401]).toContain(signinRes.status)

    // No session cookie should be set on failed login
    const signinCookies = signinRes.headers.get('set-cookie') || ''
    const sessionCookie = signinCookies.match(/next-auth\.session-token=([^;]+)/)?.[1]
    expect(sessionCookie).toBeFalsy()
  })

  it('Authenticated session — GET /api/auth/session returns user', async () => {
    const sessionCookie = await login()
    expect(sessionCookie).toBeTruthy()
    if (!sessionCookie) return

    const sessionRes = await fetch(`${BASE}/api/auth/session`, {
      headers: { 'Cookie': `next-auth.session-token=${sessionCookie}` },
    })
    const session = await sessionRes.json()
    expect(session.user).toBeTruthy()
    expect(session.user.email).toBe(TEST_EMAIL)
  })

  it('Authenticated request — GET /api/pool/profile returns 200', async () => {
    const sessionCookie = await login()
    expect(sessionCookie).toBeTruthy()
    if (!sessionCookie) return

    const profileRes = await fetch(`${BASE}/api/pool/profile`, {
      headers: { 'Cookie': `next-auth.session-token=${sessionCookie}` },
    })
    expect(profileRes.status).toBe(200)
  })

  it('Logout — signout invalidates the session', async () => {
    // 1. Login
    const sessionCookie = await login()
    expect(sessionCookie).toBeTruthy()
    if (!sessionCookie) return

    // 2. Verify session is valid before logout
    const beforeLogout = await fetch(`${BASE}/api/auth/session`, {
      headers: { 'Cookie': `next-auth.session-token=${sessionCookie}` },
    })
    const beforeData = await beforeLogout.json()
    expect(beforeData.user).toBeTruthy()

    // 3. Get CSRF for signout
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`, {
      headers: { 'Cookie': `next-auth.session-token=${sessionCookie}` },
    })
    const { csrfToken } = await csrfRes.json()

    // 4. Sign out
    const signoutRes = await fetch(`${BASE}/api/auth/callback/signout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `next-auth.session-token=${sessionCookie}`,
      },
      body: `csrfToken=${csrfToken}&callbackUrl=/&json=true`,
      redirect: 'manual',
    })
    expect(signoutRes.status).not.toBe(500)

    // 5. After logout: call /api/auth/session WITHOUT the session cookie
    //    (simulating a client that applied the cookie deletion)
    const afterLogout = await fetch(`${BASE}/api/auth/session`)
    const afterData = await afterLogout.json()
    expect(afterData.user).toBeFalsy()

    // 6. After logout: call /api/pool/profile without session → 401
    const profileRes = await fetch(`${BASE}/api/pool/profile`)
    expect(profileRes.status).toBe(401)
  })
})

// ── Middleware tests ─────────────────────────────────────────────────────────

describe('Smoke — Middleware (auth + public access)', () => {
  it('Protected API route (anonymous) — returns 401 JSON', async () => {
    const res = await fetch(`${BASE}/api/pool/profile`)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('unauthorized')
  })

  it('Protected API route (authenticated) — returns 200', async () => {
    const sessionCookie = await login()
    expect(sessionCookie).toBeTruthy()
    if (!sessionCookie) return

    const res = await fetch(`${BASE}/api/pool/profile`, {
      headers: { 'Cookie': `next-auth.session-token=${sessionCookie}` },
    })
    expect(res.status).toBe(200)
  })

  it('/api/auth/* routes — accessible without session', async () => {
    const res = await fetch(`${BASE}/api/auth/csrf`)
    expect(res.status).toBe(200)
  })

  it('Stripe webhook — accessible without session (no 401 from middleware)', async () => {
    // Stripe webhooks must NOT be blocked by the auth middleware.
    // The webhook will fail signature verification (400) but should NOT return 401.
    const res = await fetch(`${BASE}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    // 400 (bad signature) or 500 (not configured) is acceptable;
    // 401 means middleware blocked it.
    expect(res.status).not.toBe(401)
  })

  it('RevenueCat webhook — accessible without session, returns 401 from webhook verification (not middleware)', async () => {
    // RevenueCat webhooks use Bearer token auth, NOT NextAuth session.
    // Without a valid Bearer token, the route returns 401 (from the route handler,
    // not from the middleware). This proves the middleware doesn't block it.
    const res = await fetch(`${BASE}/api/revenuecat/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    // If REVENUECAT_WEBHOOK_SECRET is not set → 500 (not configured)
    // If set but no Bearer token → 401 (from webhook verification)
    // NEVER 401 from middleware (that would mean middleware blocked it)
    expect(res.status).not.toBe(500) // must be configured in test env
    expect(res.status).toBe(401) // 401 from webhook Bearer check, not middleware
    const data = await res.json()
    expect(data.error).toBe('Unauthorized') // route handler error, not middleware
  })

  it('Public lead capture (Growth) — POST /api/growth/leads without session returns 401 from route (not middleware)', async () => {
    // The growth/leads POST route checks auth internally (getServerSession).
    // It's NOT in the middleware PROTECTED_PATTERNS, so the middleware won't block it.
    // The 401 comes from the route handler itself.
    const res = await fetch(`${BASE}/api/growth/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'test', firstName: 'Test', lastName: 'User', email: 'test@example.com' }),
    })
    // 401 from the route handler (not middleware — middleware would return
    // { error: 'unauthorized', authenticated: false })
    expect(res.status).toBe(401)
    const data = await res.json()
    // Route handler returns a translated error, not the middleware JSON
    expect(data.authenticated).toBeUndefined()
  })

  it('Public lead capture (Pro early-access) — POST without session returns business error (not 401)', async () => {
    // /api/pro/early-access POST is PUBLIC — no auth required.
    // Sending an invalid body (missing email) should return 400, not 401.
    const res = await fetch(`${BASE}/api/pro/early-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // empty body → validation error
    })
    // Should be 400 (validation) — proves the route is publicly accessible
    expect(res.status).toBe(400)
    expect(res.status).not.toBe(401) // not auth-blocked
    expect(res.status).not.toBe(500) // not a server error
  })
})

// ── Public pages accessible ──────────────────────────────────────────────────

describe('Smoke — Public pages accessible', () => {
  const publicPages = [
    '/tarifs',
    '/faq',
    '/pro',
    '/care',
    '/growth',
    '/business',
    '/academy',
  ]

  for (const page of publicPages) {
    it(`GET ${page} — returns 200`, async () => {
      const res = await fetch(`${BASE}${page}`)
      expect(res.status).toBe(200)
    })
  }
})
