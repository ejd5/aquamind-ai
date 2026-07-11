/**
 * AQWELIA — Smoke tests (P0-A baseline)
 *
 * Tests the critical paths that MUST work for the app to be functional.
 * Does NOT test business logic — tests that the app boots, auth works,
 * and API routes respond correctly.
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
  // 1. Get CSRF token + cookie
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()
  const csrfCookies = csrfRes.headers.get('set-cookie') || ''

  // 2. Sign in with valid credentials
  const signinRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookies,
    },
    body: `email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}&csrfToken=${csrfToken}&callbackUrl=/&json=true`,
    redirect: 'manual',
  })

  // 3. Extract session cookie
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

    // NextAuth returns 401 (CredentialsSignin) or redirects to signin with error.
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
    // Authenticated user with no pool profile gets 200 with { profiles: [] }
    // (not 401 — the user IS authenticated)
    expect(profileRes.status).toBe(200)
  })

  it('Logout — signout invalidates the session', async () => {
    // 1. Login
    const sessionCookie = await login()
    expect(sessionCookie).toBeTruthy()
    if (!sessionCookie) return

    // 2. Verify session is valid
    const beforeLogout = await fetch(`${BASE}/api/auth/session`, {
      headers: { 'Cookie': `next-auth.session-token=${sessionCookie}` },
    })
    const beforeData = await beforeLogout.json()
    expect(beforeData.user).toBeTruthy()

    // 3. Get a fresh CSRF token for signout
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

    // 5. Verify session is invalidated
    // The signout response should clear the session cookie
    const signoutCookies = signoutRes.headers.get('set-cookie') || ''
    // NextAuth sets the session cookie to empty/expired on signout
    const clearedCookie = signoutCookies.match(/next-auth\.session-token=([^;]*)/)?.[1]
    expect(clearedCookie === '' || clearedCookie === undefined).toBe(true)
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
    // CSRF endpoint should work without session
    const res = await fetch(`${BASE}/api/auth/csrf`)
    expect(res.status).toBe(200)
  })

  it('Webhook Stripe — accessible without session middleware (no 401)', async () => {
    // Stripe webhooks must NOT be blocked by the auth middleware.
    // The middleware excludes /api/auth but NOT /api/stripe/webhook.
    // However, webhooks should be excluded from auth — check that
    // the middleware doesn't return 401 for them.
    // We send a POST with empty body — the webhook will fail signature
    // verification (400) but should NOT return 401 (auth blocked).
    const res = await fetch(`${BASE}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    // 400 (bad signature) is acceptable; 401 means middleware blocked it
    expect(res.status).not.toBe(401)
  })

  it('Public lead capture (Growth) — accessible without session', async () => {
    // Growth OS lead capture should be publicly accessible (no auth required)
    // Check that GET on the growth page returns 200
    const res = await fetch(`${BASE}/growth`)
    expect(res.status).toBe(200)
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
