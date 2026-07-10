/**
 * AQWELIA Partners — Partner application API.
 *
 * URL: /api/partners/apply
 *
 * POST: Public. Records a new PartnerApplication (fournisseur or pisciniste).
 *       Validates: companyName (required), email (required + format), type
 *       (must be "fournisseur" | "pisciniste"), products (required only when
 *       type === "fournisseur"), message (optional). Returns 201 on success,
 *       400 on validation errors, 500 on server errors.
 *
 * GET:  Admin-only. Requires an authenticated NextAuth session. If the
 *       `ADMIN_EMAILS` env var is set (comma-separated list of emails),
 *       the session user's email must be in that list. Returns the list
 *       of all PartnerApplication records, newest first.
 *
 * Mirrors the API pattern used by /api/care/notify and /api/pro/early-access.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { trackEventServer } from '@/lib/analytics-server'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_TYPES = new Set(['fournisseur', 'pisciniste'])
const MAX_FIELD = 5000 // generous guard against giant payloads

/** Parse the ADMIN_EMAILS env var into a lowercased Set (or null if unset). */
function getAdminEmails(): Set<string> | null {
  const raw = process.env.ADMIN_EMAILS
  if (!raw) return null
  const set = new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  )
  return set.size > 0 ? set : null
}

/**
 * POST /api/partners/apply
 * Body: { companyName, email, type, products?, message? }
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
    typeof body?.companyName === 'string' ? body.companyName.trim().slice(0, MAX_FIELD) : ''
  const email =
    typeof body?.email === 'string' ? body.email.toLowerCase().trim() : ''
  const type =
    typeof body?.type === 'string' ? body.type.trim().toLowerCase() : ''
  const products =
    typeof body?.products === 'string' && body.products.trim()
      ? body.products.trim().slice(0, MAX_FIELD)
      : null
  const message =
    typeof body?.message === 'string' && body.message.trim()
      ? body.message.trim().slice(0, MAX_FIELD)
      : null

  // --- Validations ---
  if (!companyName) {
    const msg = await translate(
      locale,
      'partners.applyErrorCompanyName',
      "Nom de l'entreprise requis"
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (!email) {
    const msg = await translate(
      locale,
      'partners.applyErrorEmailRequired',
      'Email requis'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    const msg = await translate(
      locale,
      'partners.applyErrorEmailInvalid',
      'Email invalide'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (!VALID_TYPES.has(type)) {
    const msg = await translate(
      locale,
      'partners.applyErrorType',
      'Type de partenariat invalide'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  // Products required only for fournisseurs
  if (type === 'fournisseur' && !products) {
    const msg = await translate(
      locale,
      'partners.applyErrorProducts',
      'Description des produits requise'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    // Defensive cast: `partnerApplication` model may not be picked up by the
    // Prisma Client TS types before the next `prisma generate` (we just
    // pushed the schema, so the regenerated client should be in sync, but
    // we keep the cast for resilience against stale client bundles — same
    // pattern as /api/care/notify and /api/pro/early-access).
    const record = await (db as any).partnerApplication.create({
      data: {
        companyName,
        email,
        type,
        products,
        message,
      },
      select: {
        id: true,
        companyName: true,
        email: true,
        type: true,
        createdAt: true,
      },
    })

    // Analytics — fire-and-forget, never blocks the response.
    void trackEventServer('partner_application_submitted', {
      type,
      companyName,
      hasProducts: Boolean(products),
      hasMessage: Boolean(message),
    })

    return NextResponse.json({ application: record }, { status: 201 })
  } catch (err) {
    console.error('[partners/apply] POST error:', err)
    const msg = await translate(
      locale,
      'partners.applyErrorGeneric',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * GET /api/partners/apply — admin-only listing.
 * Returns newest-first list of all PartnerApplication records, optionally
 * filtered by `type` query param.
 */
export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  // If ADMIN_EMAILS is configured, restrict to those emails.
  const adminEmails = getAdminEmails()
  if (adminEmails && session.user.email) {
    if (!adminEmails.has(session.user.email.toLowerCase())) {
      const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
      return NextResponse.json({ error: msg }, { status: 403 })
    }
  }

  // Optional type filter: ?type=fournisseur|pisciniste
  const { searchParams } = new URL(req.url)
  const typeFilter = searchParams.get('type')
  const where =
    typeFilter && VALID_TYPES.has(typeFilter) ? { where: { type: typeFilter } } : {}

  try {
    const records = await (db as any).partnerApplication.findMany({
      ...where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        companyName: true,
        email: true,
        type: true,
        products: true,
        message: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ applications: records, count: records.length })
  } catch (err) {
    console.error('[partners/apply] GET error:', err)
    const msg = await translate(
      locale,
      'partners.applyErrorGeneric',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
