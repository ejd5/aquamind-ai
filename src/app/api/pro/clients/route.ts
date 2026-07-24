import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getProAccess } from '@/lib/pro/access'
import { proClientAccessWhere, proNestedInterventionWhere } from '@/lib/pro/intervention-scope'
import {
  cleanOptionalText,
  isOneOf,
  parseOptionalDate,
  parseStoredStringArray,
  PRO_CLIENT_STATUSES,
  PRO_CONTACT_CHANNELS,
  serializeShortStringArray,
} from '@/lib/pro/crm'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FOLLOW_UP_FILTERS = new Set(['overdue', 'upcoming', 'none'])

function parsePositiveInt(value: string | null, fallback: number, maximum: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(1, Math.round(parsed)))
}

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const access = await getProAccess(session.user.id)
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const status = url.searchParams.get('status')
  const tag = (url.searchParams.get('tag') || '').trim()
  const followUp = url.searchParams.get('followUp')
  const page = parsePositiveInt(url.searchParams.get('page'), 1, 100_000)
  const pageSize = parsePositiveInt(url.searchParams.get('pageSize'), 20, 100)
  const now = new Date()
  const interventionWhere = proNestedInterventionWhere(access, session.user.id)

  const where: Prisma.ProClientWhereInput = proClientAccessWhere(access, session.user.id)
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { companyName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { city: { contains: q } },
    ]
  }
  if (isOneOf(PRO_CLIENT_STATUSES, status)) where.status = status
  if (tag) where.tags = { contains: tag.slice(0, 40) }
  if (followUp && FOLLOW_UP_FILTERS.has(followUp)) {
    if (followUp === 'overdue') where.nextFollowUpAt = { lte: now }
    if (followUp === 'upcoming') where.nextFollowUpAt = { gt: now }
    if (followUp === 'none') where.nextFollowUpAt = null
  }

  const summaryScope = proClientAccessWhere(access, session.user.id)
  const [total, clients, statusRows, overdueFollowUps] = await Promise.all([
    db.proClient.count({ where }),
    db.proClient.findMany({
      where,
      orderBy: [{ nextFollowUpAt: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: {
            pools: true,
            interventions: interventionWhere ? { where: interventionWhere } : true,
            activities: true,
          },
        },
        interventions: {
          where: interventionWhere,
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: { id: true, scheduledAt: true, status: true, type: true },
        },
        activities: {
          orderBy: { occurredAt: 'desc' },
          take: 1,
          select: { id: true, type: true, title: true, occurredAt: true },
        },
      },
    }),
    db.proClient.groupBy({
      by: ['status'],
      where: summaryScope,
      _count: { _all: true },
    }),
    db.proClient.count({
      where: {
        ...summaryScope,
        status: { not: 'archived' },
        nextFollowUpAt: { lte: now },
      },
    }),
  ])

  const statusCounts = Object.fromEntries(
    PRO_CLIENT_STATUSES.map((clientStatus) => [
      clientStatus,
      statusRows.find((row) => row.status === clientStatus)?._count._all ?? 0,
    ]),
  )

  return NextResponse.json({
    clients: clients.map(({ interventions, activities, tags, ...client }) => ({
      ...client,
      tags: parseStoredStringArray(tags),
      lastIntervention: interventions[0] ?? null,
      lastActivity: activities[0] ?? null,
    })),
    total,
    page,
    pageSize,
    summary: { statusCounts, overdueFollowUps },
  })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const access = await getProAccess(session.user.id)
  if (!access.canWrite) {
    return NextResponse.json({ error: toolWorkspaceText(locale, 'readonly') }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim().slice(0, 120) : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim().slice(0, 120) : ''
  const email = cleanOptionalText(body.email, 320)?.toLowerCase() ?? null
  const status = isOneOf(PRO_CLIENT_STATUSES, body.status) ? body.status : 'active'
  const preferredContact = isOneOf(PRO_CONTACT_CHANNELS, body.preferredContact)
    ? body.preferredContact
    : 'email'
  const lastContactAt = parseOptionalDate(body.lastContactAt)
  const nextFollowUpAt = parseOptionalDate(body.nextFollowUpAt)

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
  if (!lastContactAt.valid || !nextFollowUpAt.valid) {
    return NextResponse.json({ error: 'Invalid CRM date' }, { status: 400 })
  }

  try {
    const client = await db.$transaction(async (tx) => {
      const created = await tx.proClient.create({
        data: {
          proUserId: access.ownerUserId,
          firstName,
          lastName,
          companyName: cleanOptionalText(body.companyName, 200),
          email,
          phone: cleanOptionalText(body.phone, 80),
          address: cleanOptionalText(body.address, 500),
          city: cleanOptionalText(body.city, 160),
          zipCode: cleanOptionalText(body.zipCode, 30),
          source: cleanOptionalText(body.source, 120),
          preferredContact,
          status,
          tags: serializeShortStringArray(body.tags),
          notes: cleanOptionalText(body.notes),
          lastContactAt: lastContactAt.value,
          nextFollowUpAt: nextFollowUpAt.value,
        },
      })
      await tx.proClientActivity.create({
        data: {
          proClientId: created.id,
          actorUserId: session.user.id,
          type: 'client_created',
          title: 'crm.client_created',
        },
      })
      return created
    })
    return NextResponse.json({ client: { ...client, tags: parseStoredStringArray(client.tags) } }, { status: 201 })
  } catch (error) {
    console.error('[pro/clients] POST error:', error)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
