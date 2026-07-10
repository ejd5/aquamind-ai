/**
 * AQWELIA — Smoke tests (P0 baseline)
 *
 * These tests verify the critical paths that MUST work for the app to be
 * considered "functional". They don't test business logic — they test that
 * the app boots, auth works, and API routes respond correctly.
 *
 * Run: bun run test
 */
import { describe, it, expect } from 'vitest'

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000'

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
    // Unauthenticated session is an empty object {}
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
