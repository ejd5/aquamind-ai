/**
 * ARQWELIA — P0 public endpoint security tests.
 *
 * Covers the hardening applied to the two public, PII-accepting endpoints:
 *   POST /api/arqwelia/project
 *   POST /api/arqwelia/partner-waitlist
 *
 * - rate limiting (429 + Retry-After)
 * - Cloudflare Turnstile (absent / invalid / service unavailable)
 * - strict validation (length limits, optional phone)
 * - consent NOT pre-checked
 * - no PII in analytics events
 * - local test-mode compatibility (default bot check passes)
 *
 * The `verifyArqweliaTurnstile` wrapper is mocked here so route behaviour can
 * be asserted without calling Cloudflare. The real verifier + production
 * fail-closed guard are unit-tested in tests/arqwelia-turnstile.test.ts.
 */
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/analytics-server', () => ({
  trackEventServer: vi.fn(async () => {}),
}))

vi.mock('@/lib/arqwelia/bot-protection', () => ({
  verifyArqweliaTurnstile: vi.fn(async () => ({ success: true })),
}))

import { POST as createProject } from '@/app/api/arqwelia/project/route'
import { POST as joinWaitlist } from '@/app/api/arqwelia/partner-waitlist/route'
import { verifyArqweliaTurnstile } from '@/lib/arqwelia/bot-protection'
import { trackEventServer } from '@/lib/analytics-server'
import { db } from '@/lib/db'
import { resetRateLimitsForTests } from '@/lib/rate-limit'

const NOW = Date.now()
const createdProjectIds: string[] = []
const createdEmails: string[] = []

function makeReq(url: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'accept-language': 'fr' },
    body: JSON.stringify(body),
  })
}

function validProjectBody(email: string) {
  return {
    questionnaire: {
      projectType: 'buried_pool',
      timeline: '6-12m',
      budget: '25-40k',
      style: 'contemporary',
    },
    selectedConcept: 'A',
    contact: { firstName: 'Jane', email, phone: '0600000000', postalCode: '33000', consent: true },
    demoMode: true,
    turnstileToken: 'DUMMY_TURNSTILE_TOKEN',
  }
}

describe('ARQWELIA P0 — endpoint security', () => {
  beforeEach(() => {
    resetRateLimitsForTests()
    vi.mocked(trackEventServer).mockClear()
  })

  afterAll(async () => {
    if (createdEmails.length) {
      await db.arqweliaLeadConsent.deleteMany({ where: { email: { in: createdEmails } } })
      await db.arqweliaPartnerWaitlist.deleteMany({ where: { email: { in: createdEmails } } })
    }
    if (createdProjectIds.length) {
      await db.arqweliaProject.deleteMany({ where: { id: { in: createdProjectIds } } })
    }
  })

  it('accepts a valid submission when Turnstile verifies the token', async () => {
    const email = `ok-${NOW}@e2e.dev`
    createdEmails.push(email)
    vi.mocked(verifyArqweliaTurnstile).mockImplementationOnce(async () => ({ success: true }))
    const res = await createProject(makeReq('/api/arqwelia/project', validProjectBody(email)))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.publicId).toMatch(/^ARQ-/)
    const row = await db.arqweliaProject.findUnique({ where: { publicId: json.publicId } })
    if (row) createdProjectIds.push(row.id)
  })

  it('rejects a submission with no Turnstile token', async () => {
    vi.mocked(verifyArqweliaTurnstile).mockImplementationOnce(async () => ({ success: false, reason: 'turnstile_token_missing' }))
    const res = await createProject(makeReq('/api/arqwelia/project', { ...validProjectBody(`no-${NOW}@e2e.dev`), turnstileToken: '' }))
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toBe('bot_verification_failed')
    expect(json.errors.turnstile).toBeTruthy()
  })

  it('rejects an invalid Turnstile token', async () => {
    vi.mocked(verifyArqweliaTurnstile).mockImplementationOnce(async () => ({ success: false, reason: 'turnstile_rejected' }))
    const res = await createProject(makeReq('/api/arqwelia/project', { ...validProjectBody(`bad-${NOW}@e2e.dev`), turnstileToken: 'GARBAGE' }))
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.errors.turnstile).toBeTruthy()
  })

  it('rejects when the Turnstile service is unavailable', async () => {
    vi.mocked(verifyArqweliaTurnstile).mockImplementationOnce(async () => ({ success: false, reason: 'turnstile_unavailable' }))
    const res = await createProject(makeReq('/api/arqwelia/project', validProjectBody(`unav-${NOW}@e2e.dev`)))
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toBe('bot_verification_failed')
    expect(json.errors.turnstile).toBeTruthy()
  })

  it('project endpoint returns 429 with Retry-After after 5 requests/hour', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await createProject(makeReq('/api/arqwelia/project', {}))
      expect(res.status).toBe(400) // rate limit passes, validation rejects
    }
    const res = await createProject(makeReq('/api/arqwelia/project', {}))
    expect(res.status).toBe(429)
    const retryAfter = res.headers.get('Retry-After')
    expect(retryAfter).toBeTruthy()
    expect(Number(retryAfter)).toBeGreaterThan(0)
    const json = await res.json()
    expect(json.error).toBe('rate_limited')
  })

  it('waitlist endpoint returns 429 with Retry-After after 3 requests/hour', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await joinWaitlist(makeReq('/api/arqwelia/partner-waitlist', {}))
      expect(res.status).toBe(400)
    }
    const res = await joinWaitlist(makeReq('/api/arqwelia/partner-waitlist', {}))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeTruthy()
    const json = await res.json()
    expect(json.error).toBe('rate_limited')
  })

  it('rejects when consent is absent or false', async () => {
    const body = validProjectBody(`noconsent-${NOW}@e2e.dev`)
    body.contact.consent = false
    const res = await createProject(makeReq('/api/arqwelia/project', body))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toBe('validation_failed')
    expect(json.errors.consent).toBeTruthy()
  })

  it('rejects invalid or oversized data', async () => {
    const body = validProjectBody(`oversize-${NOW}@e2e.dev`)
    body.contact = {
      firstName: 'X',
      email: 'not-an-email',
      phone: 'abcd'.repeat(20), // too long + not numeric
      postalCode: 'ABC',
      consent: true,
    }
    const res = await createProject(makeReq('/api/arqwelia/project', body))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.errors.firstName).toBeTruthy()
    expect(json.errors.email).toBeTruthy()
    expect(json.errors.phone).toBeTruthy()
    expect(json.errors.postalCode).toBeTruthy()
  })

  it('never sends PII in analytics events', async () => {
    const projectEmail = `nopii-${NOW}@e2e.dev`
    const partnerEmail = `nopii-partner-${NOW}@e2e.dev`
    createdEmails.push(projectEmail, partnerEmail)

    const projectRes = await createProject(makeReq('/api/arqwelia/project', validProjectBody(projectEmail)))
    const projectJson = await projectRes.json()
    expect(projectRes.status).toBe(200)
    const projectRow = await db.arqweliaProject.findUnique({ where: { publicId: projectJson.publicId } })
    if (projectRow) createdProjectIds.push(projectRow.id)

    const waitlistRes = await joinWaitlist(makeReq('/api/arqwelia/partner-waitlist', {
      companyName: 'Piscines P0',
      contactName: 'Jane',
      email: partnerEmail,
      phone: '0600000000',
      postalCode: '33000',
      radiusKm: 30,
      consent: true,
    }))
    expect(waitlistRes.status).toBe(200)

    const calls = vi.mocked(trackEventServer).mock.calls
    expect(calls.length).toBeGreaterThan(0)

    const serialized = JSON.stringify(calls)
    expect(serialized).not.toContain(projectEmail)
    expect(serialized).not.toContain(partnerEmail)
    expect(serialized).not.toContain('0600000000')
    expect(serialized).not.toContain('Jane')
    expect(serialized).not.toContain('DUMMY_TURNSTILE_TOKEN')
    expect(serialized).not.toContain('Piscines P0')

    // Waitlist distinct id must be an opaque hash, never the raw email.
    const waitlistCall = calls.find(([event]) => event === 'arq_pro_waitlist_submitted')
    expect(waitlistCall).toBeTruthy()
    const distinctId = waitlistCall![2]
    expect(distinctId).toMatch(/^[0-9a-f]{64}$/)
    expect(distinctId).not.toBe(partnerEmail)
  })
})
