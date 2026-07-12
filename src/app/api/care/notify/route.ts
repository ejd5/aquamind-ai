/**
 * AQWELIA Care — Launch notification API.
 *
 * URL: /api/care/notify
 *
 * POST: Public. Records a new CareNotification (validates email format +
 *       uniqueness). Returns 201 on success, 409 if email already exists,
 *       400 on validation errors, 500 on server errors.
 *
 * GET:  Admin-only. Requires an authenticated NextAuth session. If the
 *       `ADMIN_EMAILS` env var is set (comma-separated list of emails),
 *       the session user's email must be in that list. Returns the list
 *       of all CareNotification records, newest first.
 *
 * Mirrors the API pattern used by /api/pro/early-access (P2-PRO agent).
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { isAdminEmail } from '@/lib/admin'
import { checkRateLimit, rateLimitedResponse } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/care/notify
 * Body: { email: string }
 */
export async function POST(req: Request) {
  const locale = pickLocale(req)
  const rateLimit = checkRateLimit(req, 'care-notify', 10, 60 * 60 * 1000)
  if (!rateLimit.allowed) return rateLimitedResponse(rateLimit)

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email =
    typeof body?.email === 'string' ? body.email.toLowerCase().trim() : ''

  // --- Validations ---
  if (!email) {
    const msg = await translate(
      locale,
      'care.notifyErrorEmailRequired',
      'Email requis'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    const msg = await translate(
      locale,
      'care.notifyErrorEmailInvalid',
      'Email invalide'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    // Defensive cast: `careNotification` model may not be picked up by the
    // Prisma Client TS types before the next `prisma generate` (we just
    // pushed the schema, so the regenerated client should be in sync, but
    // we keep the cast for resilience against stale client bundles).
    const existing = await (db as any).careNotification.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existing) {
      const msg = await translate(
        locale,
        'care.notifyErrorEmailExists',
        'Cet email est déjà inscrit.'
      )
      return NextResponse.json({ error: msg }, { status: 409 })
    }

    const record = await (db as any).careNotification.create({
      data: { email },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    })

    // Best-effort: notify the product team of the new Care lead.
    // Fire-and-forget so a slow SMTP server never blocks the 201 response.
    void import('@/lib/email')
      .then(({ sendCareNotificationEmail }) =>
        sendCareNotificationEmail({
          email: record.email,
          createdAt: record.createdAt,
        }),
      )
      .catch((err) => {
        console.error('[care/notify] team notification email failed:', err)
      })

    return NextResponse.json({ notification: record }, { status: 201 })
  } catch (err) {
    console.error('[care/notify] POST error:', err)
    // Prisma unique-constraint error code (P2002) — defensive: should not
    // happen because we checked above, but a race could land here.
    if ((err as any)?.code === 'P2002') {
      const msg = await translate(
        locale,
        'care.notifyErrorEmailExists',
        'Cet email est déjà inscrit.'
      )
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    const msg = await translate(
      locale,
      'care.notifyErrorGeneric',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * GET /api/care/notify — admin-only listing.
 * Returns newest-first list of all CareNotification records.
 */
export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  if (!isAdminEmail(session.user.email)) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 403 })
  }

  try {
    const records = await (db as any).careNotification.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ notifications: records, count: records.length })
  } catch (err) {
    console.error('[care/notify] GET error:', err)
    const msg = await translate(
      locale,
      'care.notifyErrorGeneric',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
