/**
 * ARQWELIA Lot 1 — API: pisciniste partner waitlist.
 *
 * POST /api/arqwelia/partner-waitlist
 * Body: { companyName, contactName, email, phone?, postalCode?, radiusKm?, consent, turnstileToken }
 *
 * Security (P0 hardening, pre-Lot 2):
 * - Server-side rate limiting per server fingerprint (3 / hour).
 * - Cloudflare Turnstile verification (mandatory when configured; fails closed
 *   in production if the secret is missing — no silent bypass).
 * - Strict validation with field length limits.
 * - Deduplicated by professional email (DB), but the response is identical for
 *   new and existing emails — no exploitable email-enumeration distinction.
 * - Consent MUST be explicit (not pre-checked).
 * - No PII in analytics (the distinct id is an opaque hash, not the email).
 * - Generic errors — no PII in logs, tokens never logged.
 */
import { NextRequest, NextResponse } from 'next/server'
import { pickLocale, translate } from '@/lib/i18n-api'
import { db } from '@/lib/db'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'
import { verifyArqweliaTurnstile } from '@/lib/arqwelia/bot-protection'
import {
  ARQ_PARTNER_CONSENT_VERSION,
  ARQWELIA_PARTNER_RATE_LIMIT,
  ARQWELIA_RATE_WINDOW_MS,
  ARQ_COMPANY_MAX,
  ARQ_CONTACT_NAME_MAX,
  ARQ_EMAIL_MAX,
  ARQ_PHONE_MAX,
  ARQ_PHONE_RE,
} from '@/lib/arqwelia/types'
import { trackEventServer } from '@/lib/analytics-server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FR_POSTAL_RE = /^\d{5}$/
const RADIUS_KM_MAX = 500

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)

  // Rate limit first — cheap, no body parsing, no PII handling.
  const rateLimit = checkRateLimit(req, 'arqwelia-partner-waitlist', ARQWELIA_PARTNER_RATE_LIMIT, ARQWELIA_RATE_WINDOW_MS)
  if (!rateLimit.allowed) return rateLimitedResponse(rateLimit)

  let body: any
  try {
    body = await req.json()
  } catch {
    const errors = { generic: await translate(locale, 'arqwelia.partner.errors.internal', 'Une erreur est survenue. Réessayez.') }
    return NextResponse.json({ error: 'invalid_json', errors }, { status: 400 })
  }

  // Cloudflare Turnstile — token is single-use on Cloudflare's side.
  const turnstileToken = typeof body?.turnstileToken === 'string' ? body.turnstileToken : ''
  const remoteIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const turnstile = await verifyArqweliaTurnstile({
    token: turnstileToken,
    remoteIp,
    expectedAction: 'arqwelia_partner',
    expectedHostname: req.nextUrl.hostname,
  })
  if (!turnstile.success) {
    const key = turnstile.reason === 'turnstile_unavailable' ? 'turnstileUnavailable' : 'turnstileFailed'
    const msg = await translate(locale, `arqwelia.partner.errors.${key}`, 'La vérification anti-robot a échoué. Réessayez.')
    return NextResponse.json({ error: 'bot_verification_failed', errors: { turnstile: msg } }, { status: 403 })
  }

  const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : ''
  const contactName = typeof body?.contactName === 'string' ? body.contactName.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : ''
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
  const postalCode = typeof body?.postalCode === 'string' ? body.postalCode.trim() : ''
  const radiusKm = body?.radiusKm === undefined || body?.radiusKm === null || body?.radiusKm === '' ? null : Number(body.radiusKm)
  const consent = body?.consent === true

  const errors: Record<string, string> = {}
  if (companyName.length < 2 || companyName.length > ARQ_COMPANY_MAX) {
    errors.companyName = await translate(locale, 'arqwelia.partner.errors.companyName', 'Société requise')
  }
  if (contactName.length < 2 || contactName.length > ARQ_CONTACT_NAME_MAX) {
    errors.contactName = await translate(locale, 'arqwelia.partner.errors.contactName', 'Nom requis')
  }
  if (!EMAIL_RE.test(email) || email.length > ARQ_EMAIL_MAX) {
    errors.email = await translate(locale, 'arqwelia.partner.errors.email', 'E-mail professionnel invalide')
  }
  if (phone.length > 0 && (phone.length > ARQ_PHONE_MAX || !ARQ_PHONE_RE.test(phone))) {
    errors.phone = await translate(locale, 'arqwelia.partner.errors.phone', 'Numéro de téléphone invalide')
  }
  if (postalCode.length > 0 && !FR_POSTAL_RE.test(postalCode)) {
    errors.postalCode = await translate(locale, 'arqwelia.partner.errors.postalCode', 'Code postal invalide')
  }
  if (radiusKm !== null && (Number.isNaN(radiusKm) || radiusKm < 1 || radiusKm > RADIUS_KM_MAX)) {
    errors.radiusKm = await translate(locale, 'arqwelia.partner.errors.radiusKm', 'Rayon invalide')
  }
  if (!consent) {
    errors.consent = await translate(locale, 'arqwelia.partner.errors.consentRequired', 'Consentement requis')
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'validation_failed', errors }, { status: 400 })
  }

  // Dedup by professional email, but ALWAYS return the same generic response —
  // whether the row was just created or already existed. This prevents an
  // attacker from probing which emails are already registered.
  try {
    let row = await db.arqweliaPartnerWaitlist.findUnique({ where: { email } })
    if (!row) {
      row = await db.arqweliaPartnerWaitlist.create({
        data: {
          companyName,
          contactName,
          email,
          phone: phone || null,
          postalCode: postalCode || null,
          radiusKm,
          consentVersion: ARQ_PARTNER_CONSENT_VERSION,
        },
      })
    }

    // Analytics — fire-and-forget. NEVER include PII and NEVER derive the
    // distinct id from the email (no raw email, no SHA-256(email), no phone,
    // no full postal code, no company or contact name). We use the opaque,
    // random Prisma row id so the id reveals nothing about the lead.
    const distinctId = `arq_partner_${row.id}`
    void trackEventServer(
      'arq_pro_waitlist_submitted',
      {
        hasPhone: Boolean(phone),
        hasPostalCode: Boolean(postalCode),
        radiusKm: radiusKm ?? null,
      },
      distinctId
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    // Generic error to the client. Log only a non-PII marker server-side.
    console.error('[arqwelia] partner waitlist failed:', e instanceof Error ? e.name : 'unknown')
    return NextResponse.json(
      { error: 'internal_error', message: await translate(locale, 'arqwelia.partner.errors.internal', 'Une erreur est survenue. Réessayez.') },
      { status: 500 }
    )
  }
}
