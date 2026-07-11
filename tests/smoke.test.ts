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
    // 1. Get CSRF token
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
    const { csrfToken } = await csrfRes.json()
    const cookies = csrfRes.headers.get('set-cookie') || ''

    // 2. Sign in with valid credentials
    const signinRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
      },
      body: `email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}&csrfToken=${csrfToken}&callbackUrl=/&json=true`,
      redirect: 'manual',
    })

    // NextAuth returns 200 with JSON { url: "..." } on success
    expect([200, 302]).toContain(signinRes.status)

    // 3. Extract session cookie from response
    const signinCookies = signinRes.headers.get('set-cookie') || ''
    const sessionCookie = signinCookies.match(/next-auth\.session-token=([^;]+)/)?.[1]
    expect(sessionCookie).toBeTruthy()
  })

  it('POST /api/auth/callback/credentials with invalid password — rejects', async () => {
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

    // Should NOT create a session (401 or redirect to signin with error)
    const signinCookies = signinRes.headers.get('set-cookie') || ''
    const sessionCookie = signinCookies.match(/next-auth\.session-token=([^;]+)/)?.[1]
    expect(sessionCookie).toBeFalsy()
  })

  it('Authenticated session — GET /api/auth/session returns user', async () => {
    // 1. Login
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

    // 2. Extract all cookies
    const signinCookies = signinRes.headers.get('set-cookie') || ''
    const allCookies = [csrfCookies, signinCookies].join('; ')
    const sessionMatch = allCookies.match(/next-auth\.session-token=([^;]+)/)
    expect(sessionMatch).toBeTruthy()
    if (!sessionMatch) return // type guard

    // 3. Check session
    const sessionRes = await fetch(`${BASE}/api/auth/session`, {
      headers: { 'Cookie': `next-auth.session-token=${sessionMatch[1]}` },
    })
    const session = await sessionRes.json()
    expect(session.user).toBeTruthy()
    expect(session.user.email).toBe(TEST_EMAIL)
  })

  it('Authenticated request — GET /api/pool/profile returns 200 (not 401)', async () => {
    // Login first
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
    const sessionMatch = signinCookies.match(/next-auth\.session-token=([^;]+)/)
    expect(sessionMatch).toBeTruthy()
    if (!sessionMatch) return // type guard

    // Now access protected route WITH session cookie
    const profileRes = await fetch(`${BASE}/api/pool/profile`, {
      headers: { 'Cookie': `next-auth.session-token=${sessionMatch[1]}` },
    })
    // Should NOT be 401 — user is authenticated
    expect(profileRes.status).not.toBe(401)
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
