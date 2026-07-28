/**
 * ARQWELIA Lot 1 — API: create a Project Passport.
 *
 * POST /api/arqwelia/project
 * Body: { questionnaire, selectedConcept, contact: { firstName, email, phone, postalCode, consent } }
 *
 * - Validates required fields server-side.
 * - Consent MUST be explicit (not pre-checked) — rejects if consent !== true.
 * - Stores consent text version + timestamp.
 * - Never transmits the lead to a pro in Lot 1.
 * - No image blobs are stored (uploads stay client-side).
 */
import { NextRequest, NextResponse } from 'next/server'
import { pickLocale, translate } from '@/lib/i18n-api'
import { db } from '@/lib/db'
import { generateArqweliaPublicId } from '@/lib/arqwelia/public-id'
import { ARQ_CONSENT_VERSION, type ArqQuestionnaireData, type ArqConcept } from '@/lib/arqwelia/types'
import { demoRealityScore } from '@/lib/arqwelia/fixtures'
import { trackEventServer } from '@/lib/analytics-server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FR_POSTAL_RE = /^\d{5}$/

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  try {
    const body = await req.json()
    const q: Partial<ArqQuestionnaireData> = body?.questionnaire ?? {}
    const selectedConcept: ArqConcept | null =
      body?.selectedConcept === 'A' || body?.selectedConcept === 'B' ? body.selectedConcept : null
    const contact = body?.contact ?? {}

    // ── Server-side validation ──────────────────────────────────────────
    const errors: Record<string, string> = {}

    if (!q.projectType) errors.projectType = await translate(locale, 'arqwelia.wizard.errors.required', 'Requis')
    if (!q.timeline) errors.timeline = await translate(locale, 'arqwelia.wizard.errors.required', 'Requis')
    if (!q.budget) errors.budget = await translate(locale, 'arqwelia.wizard.errors.required', 'Requis')
    if (!q.style) errors.style = await translate(locale, 'arqwelia.wizard.errors.required', 'Requis')

    if (!contact.firstName || String(contact.firstName).trim().length < 2) {
      errors.firstName = await translate(locale, 'arqwelia.wizard.errors.firstName', 'Prénom requis')
    }
    const email = String(contact.email ?? '').toLowerCase().trim()
    if (!EMAIL_RE.test(email)) {
      errors.email = await translate(locale, 'arqwelia.wizard.errors.email', 'E-mail invalide')
    }
    if (!contact.postalCode || !FR_POSTAL_RE.test(String(contact.postalCode))) {
      errors.postalCode = await translate(locale, 'arqwelia.wizard.errors.postalCode', 'Code postal invalide')
    }

    // Consent MUST be explicit (not pre-checked). Reject if missing/false.
    if (!contact.consent || contact.consent !== true) {
      errors.consent = await translate(locale, 'arqwelia.wizard.errors.consentRequired', 'Consentement requis')
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: 'validation_failed', errors }, { status: 400 })
    }

    if (!selectedConcept) {
      errors.selectedConcept = await translate(locale, 'arqwelia.wizard.errors.conceptRequired', 'Sélectionnez un concept')
      return NextResponse.json({ error: 'validation_failed', errors }, { status: 400 })
    }

    // ── Persist project + consent in a transaction ──────────────────────
    const publicId = generateArqweliaPublicId()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30-day lifetime for Lot 1 dossiers

    const project = await db.arqweliaProject.create({
      data: {
        publicId,
        locale,
        projectType: q.projectType ?? null,
        timeline: q.timeline ?? null,
        budgetRange: q.budget ?? null,
        style: q.style ?? null,
        knownMeasureLabel: q.knownMeasureLabel ?? null,
        knownMeasureValue: q.knownMeasureValue ?? null,
        knownMeasureUnit: q.knownMeasureUnit ?? 'm',
        selectedConcept,
        postalCode: contact.postalCode ?? null,
        realityScoreDemo: demoRealityScore(q),
        expiresAt,
        consent: {
          create: {
            firstName: String(contact.firstName).trim(),
            email,
            phone: contact.phone ?? null,
            consentVersion: ARQ_CONSENT_VERSION,
            source: 'arqwelia_lot1',
          },
        },
      },
    })

    // Analytics — fire-and-forget. NEVER include PII.
    void trackEventServer(
      'arq_project_created',
      {
        projectType: q.projectType ?? null,
        timeline: q.timeline ?? null,
        budget: q.budget ?? null,
        style: q.style ?? null,
        selectedConcept,
        postalCodePrefix: String(contact.postalCode ?? '').slice(0, 2),
        demoMode: Boolean(body?.demoMode),
      },
      publicId
    )

    return NextResponse.json({
      publicId: project.publicId,
      selectedConcept,
      realityScoreDemo: project.realityScoreDemo,
      projectType: project.projectType,
      timeline: project.timeline,
      budgetRange: project.budgetRange,
      style: project.style,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur' },
      { status: 500 }
    )
  }
}