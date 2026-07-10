/**
 * AQWELIA Growth OS — Quotes API.
 *
 * URL: /api/growth/quotes
 *
 * GET  — list quotes for the authenticated pro's organization.
 * POST — create a new quote (draft) for a lead.
 *
 * Auth: NextAuth session required.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

async function getUserOrganization(userId: string) {
  const owned = await db.organization.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
  })
  if (owned) return owned
  const membership = await db.organizationMember.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'asc' },
    include: { organization: true },
  })
  return membership?.organization ?? null
}

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const org = await getUserOrganization(session.user.id)
  if (!org) {
    return NextResponse.json({ quotes: [], total: 0 })
  }

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const leadId = url.searchParams.get('leadId')

  const where: {
    organizationId: string
    status?: string
    leadId?: string
  } = { organizationId: org.id }
  if (status) where.status = status
  if (leadId) where.leadId = leadId

  const [total, quotes] = await Promise.all([
    db.quote.count({ where }),
    db.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
  ])

  return NextResponse.json({ quotes, total })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const org = await getUserOrganization(session.user.id)

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const leadId = String(body?.leadId ?? '').trim()
  const items = Array.isArray(body?.items) ? body.items : []
  if (!leadId || items.length === 0) {
    const msg = await translate(
      locale,
      'growth.errors.missingFields',
      'Champs requis manquants'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const total = items.reduce(
    (sum: number, i: any) => sum + (Number(i?.total) || 0),
    0
  )

  try {
    const quote = await db.quote.create({
      data: {
        leadId,
        organizationId: org?.id ?? null,
        items: JSON.stringify(items),
        total,
        currency: 'EUR',
        status: body?.status ?? 'draft',
        validUntil: body?.validUntil ? new Date(body.validUntil) : null,
      },
    })
    await db.leadEvent.create({
      data: {
        leadId,
        type: 'quote_sent',
        actor: session.user.id,
        payload: JSON.stringify({ quoteId: quote.id, total }),
      },
    })
    return NextResponse.json({ quote }, { status: 201 })
  } catch (err) {
    console.error('[growth/quotes] POST error:', err)
    const msg = await translate(
      locale,
      'growth.errors.generic',
      'Une erreur est survenue.'
    )
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
