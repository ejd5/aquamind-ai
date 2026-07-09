/**
 * AQWELIA Pro — Clients API (MVP).
 *
 * URL: /api/pro/clients
 *
 * GET  — list the authenticated pro's clients, with optional `q` search
 *        (matches firstName/lastName/email/phone/city) and pagination
 *        (`page`, `pageSize`). Returns `{ clients, total, page, pageSize }`.
 * POST — create a new client owned by the authenticated pro.
 *
 * Auth: NextAuth session required. Every record is scoped to
 * `proUserId = session.user.id` so a pro can never see another pro's data.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('pageSize')) || 20)
  )

  // Build the WHERE clause: always scope by proUserId, optionally filter by q.
  const where: { proUserId: string; OR?: Array<Record<string, unknown>> } = {
    proUserId: userId,
  }
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { city: { contains: q } },
    ]
  }

  const [total, clients] = await Promise.all([
    db.proClient.count({ where }),
    db.proClient.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { pools: true, interventions: true } },
      },
    }),
  ])

  return NextResponse.json({ clients, total, page, pageSize })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const firstName =
    typeof body?.firstName === 'string' ? body.firstName.trim() : ''
  const lastName =
    typeof body?.lastName === 'string' ? body.lastName.trim() : ''
  const email =
    typeof body?.email === 'string' && body.email.trim()
      ? body.email.toLowerCase().trim()
      : null
  const phone =
    typeof body?.phone === 'string' && body.phone.trim()
      ? body.phone.trim()
      : null
  const address =
    typeof body?.address === 'string' && body.address.trim()
      ? body.address.trim()
      : null
  const city =
    typeof body?.city === 'string' && body.city.trim()
      ? body.city.trim()
      : null
  const zipCode =
    typeof body?.zipCode === 'string' && body.zipCode.trim()
      ? body.zipCode.trim()
      : null
  const notes =
    typeof body?.notes === 'string' && body.notes.trim()
      ? body.notes.trim().slice(0, 10000)
      : null

  if (!firstName) {
    const msg = await translate(locale, 'pro.errors.firstNameRequired', 'Prénom requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (!lastName) {
    const msg = await translate(locale, 'pro.errors.lastNameRequired', 'Nom requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  if (email && !EMAIL_RE.test(email)) {
    const msg = await translate(locale, 'pro.errors.emailInvalid', 'Email invalide')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const client = await db.proClient.create({
      data: {
        proUserId: userId,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        zipCode,
        notes,
      },
    })
    return NextResponse.json({ client }, { status: 201 })
  } catch (err) {
    console.error('[pro/clients] POST error:', err)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
