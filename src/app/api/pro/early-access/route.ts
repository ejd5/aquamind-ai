/**
 * AQWELIA Pro — Early Access lead capture API.
 *
 * URL: /api/pro/early-access
 *
 * POST: Public. Creates a new EarlyAccessLead (validates email format +
 *       uniqueness). Returns 201 on success, 409 if email already exists,
 *       400 on validation errors, 500 on server errors.
 *
 * GET:  Admin-only. Requires an authenticated NextAuth session. If the
 *       `ADMIN_EMAILS` env var is set (comma-separated list of emails),
 *       the session user's email must be in that list. Returns the list
 *       of all EarlyAccessLead records, newest first.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { isAdminEmail } from '@/lib/admin'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/pro/early-access
 * Body: { companyName, email, phone?, poolCount?, techCount?, message? }
 */
export async function POST(req: Request) {
  const locale = pickLocale(req)

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const companyName =
    typeof body?.companyName === 'string' ? body.companyName.trim() : ''
  const email =
    typeof body?.email === 'string' ? body.email.toLowerCase().trim() : ''
  const phone =
    typeof body?.phone === 'string' && body.phone.trim() ? body.phone.trim() : null
  const poolCount =
    Number.isFinite(Number(body?.poolCount)) && Number(body?.poolCount) >= 0
      ? Math.min(Math.floor(Number(body.poolCount)), 1_000_000)
      : 0
  const techCount =
    Number.isFinite(Number(body?.techCount)) && Number(body?.techCount) >= 1
      ? Math.min(Math.floor(Number(body?.techCount)), 1_000_000)
      : 1
  const message =
    typeof body?.message === 'string' && body.message.trim()
      ? body.message.trim().slice(0, 5000)
      : null

  // --- Validations ---
  if (!companyName) {
    const msg = await translate(
      locale,
      'pro.earlyAccessErrorCompanyRequired',
      'Nom de l\'entreprise requis'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (!email) {
    const msg = await translate(
      locale,
      'pro.earlyAccessErrorEmailRequired',
      'Email requis'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    const msg = await translate(
      locale,
      'pro.earlyAccessErrorEmailInvalid',
      'Email invalide'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    // Defensive cast: `earlyAccessLead` model may not be picked up by the
    // Prisma Client TS types before the next `prisma generate` (we just
    // pushed the schema, so the regenerated client should be in sync, but
    // we keep the cast for resilience against stale client bundles).
    const existing = await (db as any).earlyAccessLead.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existing) {
      const msg = await translate(
        locale,
        'pro.earlyAccessErrorEmailExists',
        'Cet email est déjà inscrit.'
      )
      return NextResponse.json({ error: msg }, { status: 409 })
    }

    const lead = await (db as any).earlyAccessLead.create({
      data: {
        companyName,
        email,
        phone,
        poolCount,
        techCount,
        message,
      },
      select: {
        id: true,
        companyName: true,
        email: true,
        phone: true,
        poolCount: true,
        techCount: true,
        message: true,
        createdAt: true,
      },
    })

    // Best-effort: notify the product team of the new Pro lead.
    // Wrapped in try/catch + fire-and-forget (no await) so a slow SMTP server
    // never blocks the 201 response. The sendEmail() function itself never
    // throws — it returns a structured result — but we keep the catch for
    // resilience against the dynamic import failing (rare: module resolution).
    void import('@/lib/email')
      .then(({ sendEarlyAccessNotificationEmail }) =>
        sendEarlyAccessNotificationEmail({
          companyName: lead.companyName,
          email: lead.email,
          phone: lead.phone,
          poolCount: lead.poolCount,
          techCount: lead.techCount,
          message: lead.message,
          createdAt: lead.createdAt,
        }),
      )
      .catch((err) => {
        console.error('[early-access] team notification email failed:', err)
      })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (err) {
    console.error('[early-access] POST error:', err)
    // Prisma unique-constraint error code (P2002) — defensive: should not
    // happen because we checked above, but a race could land here.
    if ((err as any)?.code === 'P2002') {
      const msg = await translate(
        locale,
        'pro.earlyAccessErrorEmailExists',
        'Cet email est déjà inscrit.'
      )
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    const msg = await translate(
      locale,
      'pro.earlyAccessErrorGeneric',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * GET /api/pro/early-access — admin-only listing.
 * Returns newest-first list of all EarlyAccessLead records.
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
    const leads = await (db as any).earlyAccessLead.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        companyName: true,
        email: true,
        phone: true,
        poolCount: true,
        techCount: true,
        message: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ leads, count: leads.length })
  } catch (err) {
    console.error('[early-access] GET error:', err)
    const msg = await translate(
      locale,
      'pro.earlyAccessErrorGeneric',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
