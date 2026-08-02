/**
 * ARQWELIA Lot 1 — API route validation tests.
 *
 * Calls the POST /api/arqwelia/project handler with invalid bodies and
 * asserts server-side validation rejects:
 *   - missing required questionnaire fields
 *   - invalid email / postal code
 *   - consent NOT pre-checked (explicit opt-in required)
 *   - missing concept selection
 *
 * Uses a real test SQLite DB so the happy path also runs end-to-end.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Stub server analytics so no PostHog calls fire during tests.
vi.mock('@/lib/analytics-server', () => ({
  trackEventServer: vi.fn(async () => {}),
}))

import { POST as createProject } from '@/app/api/arqwelia/project/route'
import { POST as joinWaitlist } from '@/app/api/arqwelia/partner-waitlist/route'
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

async function call(handler: typeof createProject, body: unknown, url = '/api/arqwelia/project') {
  const res = await handler(makeReq(url, body))
  return { status: res.status, json: await res.json() }
}

describe('ARQWELIA Lot 1 — API validation', () => {
  beforeEach(() => {
    // Keep the per-hour rate-limit buckets from leaking between tests.
    resetRateLimitsForTests()
  })

  afterAll(async () => {
    // Clean up any rows we created.
    if (createdEmails.length) {
      await db.arqweliaLeadConsent.deleteMany({ where: { email: { in: createdEmails } } })
      await db.arqweliaPartnerWaitlist.deleteMany({ where: { email: { in: createdEmails } } })
    }
    if (createdProjectIds.length) {
      await db.arqweliaProject.deleteMany({ where: { id: { in: createdProjectIds } } })
    }
  })

  it('rejects when consent is NOT pre-checked (explicit opt-in required)', async () => {
    const { status, json } = await call(createProject, {
      questionnaire: {
        projectType: 'buried_pool',
        timeline: '6-12m',
        budget: '25-40k',
        style: 'contemporary',
      },
      selectedConcept: 'A',
      contact: {
        firstName: 'Jane',
        email: `valid-${NOW}@e2e.dev`,
        phone: '0600000000',
        postalCode: '33000',
        consent: false, // ← explicit false must be rejected
      },
    })
    expect(status).toBe(400)
    expect(json.error).toBe('validation_failed')
    expect(json.errors.consent).toBeTruthy()
  })

  it('rejects invalid email and postal code', async () => {
    const { status, json } = await call(createProject, {
      questionnaire: {
        projectType: 'buried_pool',
        timeline: '6-12m',
        budget: '25-40k',
        style: 'contemporary',
      },
      selectedConcept: 'A',
      contact: { firstName: 'X', email: 'not-an-email', phone: '', postalCode: 'ABC', consent: true },
    })
    expect(status).toBe(400)
    expect(json.errors.email).toBeTruthy()
    expect(json.errors.postalCode).toBeTruthy()
  })

  it('rejects missing concept selection', async () => {
    const { status, json } = await call(createProject, {
      questionnaire: {
        projectType: 'buried_pool',
        timeline: '6-12m',
        budget: '25-40k',
        style: 'contemporary',
      },
      selectedConcept: null,
      contact: { firstName: 'Jane', email: `c-${NOW}@e2e.dev`, phone: '', postalCode: '33000', consent: true },
    })
    expect(status).toBe(400)
    expect(json.errors.selectedConcept).toBeTruthy()
  })

  it('rejects missing required questionnaire fields', async () => {
    const { status, json } = await call(createProject, {
      questionnaire: { projectType: 'piscine_enterrée' },
      selectedConcept: 'A',
      contact: { firstName: 'Jane', email: `q-${NOW}@e2e.dev`, phone: '', postalCode: '33000', consent: true },
    })
    expect(status).toBe(400)
    expect(json.errors.timeline).toBeTruthy()
    expect(json.errors.budget).toBeTruthy()
    expect(json.errors.style).toBeTruthy()
  })

  it('happy path: creates a project when all fields valid + consent true', async () => {
    const email = `happy-${NOW}@e2e.dev`
    createdEmails.push(email)
    const { status, json } = await call(createProject, {
      questionnaire: {
        projectType: 'buried_pool',
        timeline: '6-12m',
        budget: '25-40k',
        style: 'contemporary',
        knownMeasureValue: 8,
        knownMeasureUnit: 'm',
      },
      selectedConcept: 'A',
      contact: { firstName: 'Jane', email, phone: '0600000000', postalCode: '33000', consent: true },
      demoMode: true,
    })
    expect(status).toBe(200)
    expect(json.publicId).toMatch(/^ARQ-/)
    expect(json.selectedConcept).toBe('A')
    expect(json.realityScoreDemo).toBeGreaterThan(0)
    // Track for cleanup via the publicId-derived row.
    const row = await db.arqweliaProject.findUnique({ where: { publicId: json.publicId } })
    if (row) createdProjectIds.push(row.id)
  })

  it('partner waitlist rejects missing consent', async () => {
    const { status, json } = await call(joinWaitlist as any, {
      companyName: 'Piscines E2E',
      contactName: 'Jane',
      email: `p-${NOW}@e2e.dev`,
      consent: false,
    }, '/api/arqwelia/partner-waitlist')
    expect(status).toBe(400)
    expect(json.errors.consent).toBeTruthy()
  })

  it('partner waitlist dedups by email (generic response, no enumeration)', async () => {
    const email = `dup-${NOW}@e2e.dev`
    createdEmails.push(email)
    const first = await call(joinWaitlist as any, {
      companyName: 'Piscines E2E',
      contactName: 'Jane',
      email,
      phone: '0600000000',
      postalCode: '33000',
      radiusKm: 30,
      consent: true,
    }, '/api/arqwelia/partner-waitlist')
    expect(first.status).toBe(200)
    expect(first.json.ok).toBe(true)
    const second = await call(joinWaitlist as any, {
      companyName: 'Other',
      contactName: 'John',
      email,
      consent: true,
    }, '/api/arqwelia/partner-waitlist')
    // Identical response for existing emails — no exploitable distinction.
    expect(second.status).toBe(200)
    expect(second.json.ok).toBe(true)
    expect(second.json.exists).toBeUndefined()
    const count = await db.arqweliaPartnerWaitlist.count({ where: { email } })
    expect(count).toBe(1)
  })
})