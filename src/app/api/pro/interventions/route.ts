import { Prisma, type ProIntervention } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getProAccess } from '@/lib/pro/access'
import {
  cleanOptionalText,
  isOneOf,
  normalizeCurrency,
  parseOptionalAmount,
  parseOptionalDate,
  PRO_INTERVENTION_PRIORITIES,
} from '@/lib/pro/crm'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

const ALLOWED_TYPES = ['maintenance', 'repair', 'opening', 'closing', 'emergency'] as const
const ALLOWED_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const
const RECURRENCES = ['none', 'weekly', 'biweekly', 'monthly'] as const

function toJsonArray(value: unknown): string | null {
  if (Array.isArray(value)) return JSON.stringify(value.slice(0, 100))
  if (typeof value === 'string' && value.trim()) return value.slice(0, 100_000)
  return null
}

function addRecurrence(date: Date, recurrence: (typeof RECURRENCES)[number], index: number): Date {
  const occurrence = new Date(date)
  if (recurrence === 'weekly') occurrence.setDate(occurrence.getDate() + 7 * index)
  if (recurrence === 'biweekly') occurrence.setDate(occurrence.getDate() + 14 * index)
  if (recurrence === 'monthly') occurrence.setMonth(occurrence.getMonth() + index)
  return occurrence
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
  const clientId = url.searchParams.get('clientId')
  const poolId = url.searchParams.get('poolId')
  const status = url.searchParams.get('status')
  const type = url.searchParams.get('type')
  const priority = url.searchParams.get('priority')
  const technicianId = url.searchParams.get('technicianId')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20))

  const where: Prisma.ProInterventionWhereInput = {
    client: { proUserId: access.ownerUserId },
  }
  if (clientId) where.proClientId = clientId
  if (poolId) where.proPoolId = poolId
  if (isOneOf(ALLOWED_STATUSES, status)) where.status = status
  if (isOneOf(ALLOWED_TYPES, type)) where.type = type
  if (isOneOf(PRO_INTERVENTION_PRIORITIES, priority)) where.priority = priority
  if (technicianId) where.technicianId = technicianId

  const scheduledRange: Prisma.DateTimeFilter = {}
  if (from) {
    const date = new Date(from)
    if (!Number.isNaN(date.getTime())) scheduledRange.gte = date
  }
  if (to) {
    const date = new Date(to)
    if (!Number.isNaN(date.getTime())) scheduledRange.lte = date
  }
  if (Object.keys(scheduledRange).length > 0) where.scheduledAt = scheduledRange

  const [total, interventions, urgentOpen] = await Promise.all([
    db.proIntervention.count({ where }),
    db.proIntervention.findMany({
      where,
      orderBy: [{ scheduledAt: 'desc' }, { priority: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            phone: true,
            city: true,
          },
        },
        pool: { select: { id: true, name: true, type: true, status: true } },
      },
    }),
    db.proIntervention.count({
      where: {
        client: { proUserId: access.ownerUserId },
        priority: 'urgent',
        status: { in: ['scheduled', 'in_progress'] },
      },
    }),
  ])

  return NextResponse.json({
    interventions,
    total,
    page,
    pageSize,
    summary: { urgentOpen },
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

  const proClientId = typeof body.proClientId === 'string' ? body.proClientId : ''
  if (!proClientId) {
    const msg = await translate(locale, 'pro.errors.clientIdRequired', 'Client requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const client = await db.proClient.findFirst({
    where: { id: proClientId, proUserId: access.ownerUserId },
    select: { id: true },
  })
  if (!client) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  const proPoolId = typeof body.proPoolId === 'string' && body.proPoolId ? body.proPoolId : null
  if (proPoolId) {
    const pool = await db.proPool.findFirst({
      where: { id: proPoolId, proClientId },
      select: { id: true },
    })
    if (!pool) {
      const msg = await translate(
        locale,
        'pro.errors.poolNotOwnedByClient',
        "Ce bassin n'appartient pas à ce client",
      )
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

  const scheduledAt = parseOptionalDate(body.scheduledAt)
  if (!scheduledAt.provided || !scheduledAt.valid || !scheduledAt.value) {
    const msg = await translate(locale, 'pro.errors.scheduledAtRequired', 'Date planifiée requise')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const startedAt = parseOptionalDate(body.startedAt)
  const completedAtInput = parseOptionalDate(body.completedAt)
  if (!startedAt.valid || !completedAtInput.valid) {
    return NextResponse.json({ error: 'Invalid intervention date' }, { status: 400 })
  }

  let technicianId = typeof body.technicianId === 'string' && body.technicianId
    ? body.technicianId
    : null
  if (!technicianId && access.role === 'technician') technicianId = session.user.id
  if (technicianId && technicianId !== access.ownerUserId) {
    const member = access.organizationId
      ? await db.organizationMember.findFirst({
          where: {
            organizationId: access.organizationId,
            userId: technicianId,
            status: 'active',
            role: { in: ['owner', 'admin', 'manager', 'technician'] },
          },
          select: { id: true },
        })
      : null
    if (!member) technicianId = null
  }

  const status = isOneOf(ALLOWED_STATUSES, body.status) ? body.status : 'scheduled'
  const amount = parseOptionalAmount(body.amount)
  if (body.amount !== undefined && amount === undefined) {
    return NextResponse.json({ error: 'Invalid intervention amount' }, { status: 400 })
  }
  const duration = body.duration === null || body.duration === ''
    ? null
    : Number.isFinite(Number(body.duration))
      ? Math.max(0, Math.round(Number(body.duration)))
      : null
  const recurrence = isOneOf(RECURRENCES, body.recurrence) ? body.recurrence : 'none'
  const occurrences = recurrence === 'none'
    ? 1
    : Math.min(52, Math.max(2, Math.round(Number(body.occurrences) || 4)))
  const completedAt = completedAtInput.value ?? (status === 'completed' ? new Date() : null)
  const actualStartedAt = startedAt.value ?? (
    status === 'in_progress' || status === 'completed' ? new Date() : null
  )

  try {
    const result = await db.$transaction(async (tx) => {
      const interventions: ProIntervention[] = []
      for (let index = 0; index < occurrences; index += 1) {
        interventions.push(
          await tx.proIntervention.create({
            data: {
              proClientId,
              proPoolId,
              technicianId,
              type: isOneOf(ALLOWED_TYPES, body.type) ? body.type : 'maintenance',
              status,
              priority: isOneOf(PRO_INTERVENTION_PRIORITIES, body.priority)
                ? body.priority
                : 'normal',
              scheduledAt: addRecurrence(scheduledAt.value!, recurrence, index),
              startedAt: actualStartedAt,
              completedAt,
              duration,
              summary: cleanOptionalText(body.summary, 500),
              customerNotes: cleanOptionalText(body.customerNotes),
              internalNotes: cleanOptionalText(body.internalNotes),
              notes: cleanOptionalText(body.notes),
              photos: toJsonArray(body.photos),
              actions: toJsonArray(body.actions),
              productsUsed: toJsonArray(body.productsUsed),
              billable: body.billable !== false,
              amount: amount ?? null,
              currency: normalizeCurrency(body.currency),
            },
          }),
        )
      }

      await tx.proClientActivity.create({
        data: {
          proClientId,
          actorUserId: session.user.id,
          type: 'intervention_scheduled',
          title: 'crm.intervention_scheduled',
          details: JSON.stringify({
            interventionId: interventions[0].id,
            count: interventions.length,
            type: interventions[0].type,
            scheduledAt: interventions[0].scheduledAt,
          }),
          occurredAt: new Date(),
        },
      })
      return interventions
    })

    return NextResponse.json(
      { intervention: result[0], interventions: result, recurrence },
      { status: 201 },
    )
  } catch (error) {
    console.error('[pro/interventions] POST error:', error)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
