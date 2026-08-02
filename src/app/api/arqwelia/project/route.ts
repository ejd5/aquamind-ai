/**
 * ARQWELIA Lot 1 — API: create a Project Passport.
 *
 * POST /api/arqwelia/project
 * Body: { questionnaire, selectedConcept, contact: { firstName, email, phone, postalCode, consent }, turnstileToken }
 *
 * Security (P0 hardening, pre-Lot 2):
 * - Server-side rate limiting per server fingerprint (5 / hour).
 * - Cloudflare Turnstile verification (mandatory when configured; fails closed
 *   in production if the secret is missing — no silent bypass).
 * - Strict server-side validation with field length limits.
 * - Consent MUST be explicit (not pre-checked) — rejects if consent !== true.
 * - Generic errors — no internal messages, no PII in logs, tokens never logged.
 * - Never transmits the lead to a pro in Lot 1.
 * - No image blobs are stored (uploads stay client-side).
 */
import { NextRequest, NextResponse } from 'next/server'
import { pickLocale, translate } from '@/lib/i18n-api'
import { db } from '@/lib/db'
import { generateArqweliaPublicId } from '@/lib/arqwelia/public-id'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'
import { verifyArqweliaTurnstile } from '@/lib/arqwelia/bot-protection'
import {
  ARQ_CONSENT_VERSION,
  ARQWELIA_PROJECT_RATE_LIMIT,
  ARQWELIA_RATE_WINDOW_MS,
  ARQ_FIRSTNAME_MAX,
  ARQ_EMAIL_MAX,
  ARQ_PHONE_MAX,
  ARQ_PHONE_RE,
  type ArqQuestionnaireData,
  type ArqConcept,
} from '@/lib/arqwelia/types'
import { demoRealityScore } from '@/lib/arqwelia/fixtures'
import { trackEventServer } from '@/lib/analytics-server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FR_POSTAL_RE = /^\d{5}$/

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)

  // Rate limit first — cheap, no body parsing, no PII handling.
  const rateLimit = checkRateLimit(req, 'arqwelia-project', ARQWELIA_PROJECT_RATE_LIMIT, ARQWELIA_RATE_WINDOW_MS)
  if (!rateLimit.allowed) return rateLimitedResponse(rateLimit)

  let body: any
  try {
    body = await req.json()
  } catch {
    const errors = { generic: await translate(locale, 'arqwelia.wizard.errors.internal', 'Une erreur est survenue. Réessayez.') }
    return NextResponse.json({ error: 'invalid_json', errors }, { status: 400 })
  }

  const q: Partial<ArqQuestionnaireData> = body?.questionnaire ?? {}
  const selectedConcept: ArqConcept | null =
    body?.selectedConcept === 'A' || body?.selectedConcept === 'B' ? body.selectedConcept : null
  const contact = body?.contact ?? {}

  // Cloudflare Turnstile — token is single-use on Cloudflare's side.
  const turnstileToken = typeof body?.turnstileToken === 'string' ? body.turnstileToken : ''
  const remoteIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const turnstile = await verifyArqweliaTurnstile({
    token: turnstileToken,
    remoteIp,
    expectedAction: 'arqwelia_contact',
  })
  if (!turnstile.success) {
    const key = turnstile.reason === 'turnstile_unavailable' ? 'turnstileUnavailable' : 'turnstileFailed'
    const msg = await translate(locale, `arqwelia.wizard.errors.${key}`, 'La vérification anti-robot a échoué. Réessayez.')
    return NextResponse.json({ error: 'bot_verification_failed', errors: { turnstile: msg } }, { status: 403 })
  }

  // ── Server-side validation ──────────────────────────────────────────
  const errors: Record<string, string> = {}

  if (!q.projectType) errors.projectType = await translate(locale, 'arqwelia.wizard.errors.required', 'Requis')
  if (!q.timeline) errors.timeline = await translate(locale, 'arqwelia.wizard.errors.required', 'Requis')
  if (!q.budget) errors.budget = await translate(locale, 'arqwelia.wizard.errors.required', 'Requis')
  if (!q.style) errors.style = await translate(locale, 'arqwelia.wizard.errors.required', 'Requis')

  const firstName = typeof contact.firstName === 'string' ? contact.firstName.trim() : ''
  if (firstName.length < 2 || firstName.length > ARQ_FIRSTNAME_MAX) {
    errors.firstName = await translate(locale, 'arqwelia.wizard.errors.firstName', 'Prénom requis')
  }

  const email = typeof contact.email === 'string' ? contact.email.toLowerCase().trim() : ''
  if (!EMAIL_RE.test(email) || email.length > ARQ_EMAIL_MAX) {
    errors.email = await translate(locale, 'arqwelia.wizard.errors.email', 'E-mail invalide')
  }

  if (typeof contact.postalCode !== 'string' || !FR_POSTAL_RE.test(contact.postalCode.trim())) {
    errors.postalCode = await translate(locale, 'arqwelia.wizard.errors.postalCode', 'Code postal invalide')
  }

  const phone = typeof contact.phone === 'string' ? contact.phone.trim() : ''
  if (phone.length > 0 && (phone.length > ARQ_PHONE_MAX || !ARQ_PHONE_RE.test(phone))) {
    errors.phone = await translate(locale, 'arqwelia.wizard.errors.phone', 'Numéro de téléphone invalide')
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
  try {
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
        postalCode: contact.postalCode.trim(),
        realityScoreDemo: demoRealityScore(q),
        expiresAt,
        consent: {
          create: {
            firstName,
            email,
            phone: phone || null,
            consentVersion: ARQ_CONSENT_VERSION,
            source: 'arqwelia_lot1',
          },
        },
      },
    })

    // Analytics — fire-and-forget. NEVER include PII, NEVER include the token.
    void trackEventServer(
      'arq_project_created',
      {
        projectType: q.projectType ?? null,
        timeline: q.timeline ?? null,
        budget: q.budget ?? null,
        style: q.style ?? null,
        selectedConcept,
        postalCodePrefix: contact.postalCode.slice(0, 2),
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
    // Generic error to the client. Log only a non-PII marker server-side.
    console.error('[arqwelia] project create failed:', e instanceof Error ? e.name : 'unknown')
    return NextResponse.json(
      { error: 'internal_error', message: await translate(locale, 'arqwelia.wizard.errors.internal', 'Une erreur est survenue. Réessayez.') },
      { status: 500 }
    )
  }
}
