/**
 * ARQWELIA Lot 1 — DB integration tests.
 *
 * Uses a real throwaway SQLite DB (same approach as billing-concurrency.test.ts)
 * to exercise the ArqweliaProject / ArqweliaLeadConsent / ArqweliaPartnerWaitlist
 * models end-to-end: project creation, consent persistence, waitlist dedup by
 * professional email.
 *
 * Requires the test SQLite DB to be schema-synced via `prisma db push` before run.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { generateArqweliaPublicId } from '@/lib/arqwelia/public-id'
import {
  ARQ_CONSENT_VERSION,
  ARQ_PARTNER_CONSENT_VERSION,
} from '@/lib/arqwelia/types'
import { demoRealityScore } from '@/lib/arqwelia/fixtures'

const NOW = Date.now()
const createdIds: string[] = []
const createdEmails: string[] = []

describe('ARQWELIA Lot 1 — DB integration', () => {
  beforeAll(() => {
    // Pick emails unlikely to collide with anyone else's tests.
  })

  afterAll(async () => {
    // Cleanup everything we created.
    await Promise.all([
      db.arqweliaLeadConsent.deleteMany({ where: { email: { in: createdEmails } } }),
      db.arqweliaProject.deleteMany({ where: { id: { in: createdIds } } }),
      db.arqweliaPartnerWaitlist.deleteMany({ where: { email: { in: createdEmails } } }),
    ])
  })

  it('creates a project with consent (transaction-style via nested write)', async () => {
    const publicId = generateArqweliaPublicId()
    const email = `lot1-${NOW}@e2e.dev`
    createdEmails.push(email)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const q = {
      projectType: 'piscine_enterrée' as const,
      timeline: '6-12m' as const,
      budget: '25-40k' as const,
      style: 'contemporary' as const,
    }

    const project = await db.arqweliaProject.create({
      data: {
        publicId,
        locale: 'fr',
        projectType: q.projectType,
        timeline: q.timeline,
        budgetRange: q.budget,
        style: q.style,
        selectedConcept: 'A',
        postalCode: '33000',
        realityScoreDemo: demoRealityScore(q),
        expiresAt,
        consent: {
          create: {
            firstName: 'E2E',
            email,
            phone: '0600000000',
            consentVersion: ARQ_CONSENT_VERSION,
            source: 'arqwelia_lot1',
          },
        },
      },
      include: { consent: true },
    })
    createdIds.push(project.id)

    expect(project.publicId).toMatch(/^ARQ-[A-Z0-9]{3}-[A-Z0-9]{3}$/)
    expect(project.selectedConcept).toBe('A')
    expect(project.consent).not.toBeNull()
    expect(project.consent?.consentVersion).toBe(ARQ_CONSENT_VERSION)
    expect(project.realityScoreDemo).toBeGreaterThan(0)
  })

  it('partner waitlist dedups by professional email', async () => {
    const email = `partner-${NOW}@e2e.dev`
    createdEmails.push(email)

    const first = await db.arqweliaPartnerWaitlist.create({
      data: {
        companyName: 'Piscines E2E',
        contactName: 'Jane',
        email,
        postalCode: '33000',
        radiusKm: 30,
        consentVersion: ARQ_PARTNER_CONSENT_VERSION,
      },
    })
    createdEmails.push(first.id)

    // Second insert with same email should throw (unique constraint).
    await expect(
      db.arqweliaPartnerWaitlist.create({
        data: {
          companyName: 'Concurrent',
          contactName: 'John',
          email,
          consentVersion: ARQ_PARTNER_CONSENT_VERSION,
        },
      })
    ).rejects.toThrow()
  })

  it('publicId is unique (DB-level enforcement)', async () => {
    const pid = generateArqweliaPublicId()
    const expiresAt = new Date(Date.now() + 86400000)
    const a = await db.arqweliaProject.create({
      data: { publicId: pid, expiresAt },
    })
    createdIds.push(a.id)
    await expect(
      db.arqweliaProject.create({ data: { publicId: pid, expiresAt } })
    ).rejects.toThrow()
  })
})