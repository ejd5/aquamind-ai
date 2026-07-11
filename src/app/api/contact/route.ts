/**
 * AQWELIA — Contact message API.
 *
 * URL: /api/contact
 *
 * POST: Public. Validates name/email/subject/message and creates a
 *       ContactMessage record. Returns 201 on success, 400 on validation
 *       errors, 500 on server errors.
 *
 * GET:  Admin-only. Requires an authenticated NextAuth session. If the
 *       `ADMIN_EMAILS` env var is set (comma-separated list of emails),
 *       the session user's email must be in that list. Returns the list
 *       of all ContactMessage records, newest first.
 *
 * Mirrors the API pattern used by /api/care/notify and /api/pro/early-access.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_SUBJECTS = new Set(['general', 'support', 'partnership', 'press', 'other'])
const MIN_MESSAGE = 10
const MAX_MESSAGE = 5000
const MAX_NAME = 120
const MAX_EMAIL = 254

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
 * POST /api/contact
 * Body: { name: string, email: string, subject: string, message: string }
 */
export async function POST(req: Request) {
  const locale = pickLocale(req)

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email =
    typeof body?.email === 'string' ? body.email.toLowerCase().trim() : ''
  const subject =
    typeof body?.subject === 'string' ? body.subject.toLowerCase().trim() : 'general'
  const message = typeof body?.message === 'string' ? body.message.trim() : ''

  // --- Validations ---
  if (!name) {
    const msg = await translate(locale, 'contact.errorNameRequired', 'Nom requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (name.length > MAX_NAME) {
    const msg = await translate(locale, 'contact.errorNameRequired', 'Nom trop long')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (!email) {
    const msg = await translate(locale, 'contact.errorEmailRequired', 'Email requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL) {
    const msg = await translate(locale, 'contact.errorEmailInvalid', 'Email invalide')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (!VALID_SUBJECTS.has(subject)) {
    const msg = await translate(locale, 'contact.errorGeneric', 'Sujet invalide')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (message.length < MIN_MESSAGE) {
    const msg = await translate(
      locale,
      'contact.errorMessageMin',
      `Message trop court (min ${MIN_MESSAGE} caractères)`
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE) {
    const msg = await translate(
      locale,
      'contact.errorMessageMax',
      `Message trop long (max ${MAX_MESSAGE} caractères)`
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Optional: link to authenticated user if session available
  let userId: string | undefined
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) userId = session.user.id
  } catch {
    // ignore — anonymous submissions are allowed
  }

  try {
    // Defensive cast: `contactMessage` model may not be picked up by the
    // Prisma Client TS types before the next `prisma generate` (we just
    // pushed the schema, so the regenerated client should be in sync, but
    // we keep the cast for resilience against stale client bundles).
    const record = await (db as any).contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
        userId: userId ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        subject: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ message: record }, { status: 201 })
  } catch (err) {
    console.error('[contact] POST error:', err)
    const msg = await translate(
      locale,
      'contact.errorGeneric',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * GET /api/contact — admin-only listing.
 * Returns newest-first list of all ContactMessage records.
 */
export async function GET(req: Request) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  // If ADMIN_EMAILS is configured, restrict to those emails.
  // Otherwise, any authenticated user can list (loose admin check —
  // upgrade to a proper admin role when the User model gains one).
  const adminEmails = getAdminEmails()
  if (adminEmails && session.user.email) {
    if (!adminEmails.has(session.user.email.toLowerCase())) {
      const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
      return NextResponse.json({ error: msg }, { status: 403 })
    }
  }

  try {
    const records = await (db as any).contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        subject: true,
        message: true,
        status: true,
        userId: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ messages: records, count: records.length })
  } catch (err) {
    console.error('[contact] GET error:', err)
    const msg = await translate(
      locale,
      'contact.errorGeneric',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
