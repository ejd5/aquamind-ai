/**
 * ARQWELIA Lot 1 — API: pisciniste partner waitlist.
 *
 * POST /api/arqwelia/partner-waitlist
 * Body: { companyName, contactName, email, phone?, postalCode?, radiusKm?, consent }
 *
 * - Deduplicated by professional email (returns 200 + exists:true if already subscribed).
 * - Consent MUST be explicit (not pre-checked).
 * - No payment, no auto-access. Just a waitlist row.
 */
import { NextRequest, NextResponse } from 'next/server'
import { pickLocale, translate } from '@/lib/i18n-api'
import { db } from '@/lib/db'
import { ARQ_PARTNER_CONSENT_VERSION } from '@/lib/arqwelia/types'
import { trackEventServer } from '@/lib/analytics-server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  try {
    const body = await req.json()
    const companyName = String(body?.companyName ?? '').trim()
    const contactName = String(body?.contactName ?? '').trim()
    const email = String(body?.email ?? '').toLowerCase().trim()
    const phone = body?.phone ? String(body.phone).trim() : null
    const postalCode = body?.postalCode ? String(body.postalCode).trim() : null
    const radiusKm = body?.radiusKm ? Number(body.radiusKm) : null
    const consent = body?.consent === true

    const errors: Record<string, string> = {}
    if (companyName.length < 2) errors.companyName = await translate(locale, 'arqwelia.partner.errors.companyName', 'Société requise')
    if (contactName.length < 2) errors.contactName = await translate(locale, 'arqwelia.partner.errors.contactName', 'Nom requis')
    if (!EMAIL_RE.test(email)) errors.email = await translate(locale, 'arqwelia.partner.errors.email', 'E-mail professionnel invalide')
    if (!consent) errors.consent = await translate(locale, 'arqwelia.partner.errors.consentRequired', 'Consentement requis')

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: 'validation_failed', errors }, { status: 400 })
    }

    // Dedup by professional email
    const existing = await db.arqweliaPartnerWaitlist.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ ok: true, exists: true, message: 'already_registered' })
    }

    await db.arqweliaPartnerWaitlist.create({
      data: {
        companyName,
        contactName,
        email,
        phone,
        postalCode,
        radiusKm: radiusKm && !isNaN(radiusKm) ? radiusKm : null,
        consentVersion: ARQ_PARTNER_CONSENT_VERSION,
      },
    })

    // Analytics — fire-and-forget. Never include PII.
    void trackEventServer(
      'arq_pro_waitlist_submitted',
      {
        hasPhone: Boolean(phone),
        hasPostalCode: Boolean(postalCode),
        radiusKm: radiusKm ?? null,
      },
      email
    )

    return NextResponse.json({ ok: true, exists: false })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur' },
      { status: 500 }
    )
  }
}