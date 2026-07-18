/**
 * AQWELIA Pro — Interventions API (MVP).
 *
 * URL: /api/pro/interventions
 *
 * GET  — list the authenticated pro's interventions with optional filters:
 *          ?clientId=xxx      restrict to a client
 *          ?poolId=xxx        restrict to a pool
 *          ?status=scheduled  restrict to a status
 *          ?type=maintenance  restrict to a type
 *          ?technicianId=xxx  restrict to a technician (User id)
 *          ?from=2025-01-01   scheduledAt >= from (ISO)
 *          ?to=2025-12-31     scheduledAt <= to (ISO)
 *          ?page=1&page=20    pagination
 *        Returns `{ interventions, total, page, pageSize }`.
 *
 * POST — create a new intervention. `proClientId` required; `proPoolId`
 *        optional (must belong to the same client). `scheduledAt` required
 *        (ISO 8601). `photos`, `actions`, `productsUsed` are JSON-stringified
 *        server-side from arrays supplied in the body.
 *
 * Auth: NextAuth session required. All filters AND create are scoped to
 * `client.proUserId = session.user.id`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import { getProAccess } from '@/lib/pro/access'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

const ALLOWED_TYPES = new Set([
  'maintenance',
  'repair',
  'opening',
  'closing',
  'emergency',
])
const ALLOWED_STATUSES = new Set([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
])

/** Stringify an array field for JSON-string columns (photos/actions/productsUsed). */
function toJsonArray(v: unknown): string | null {
  if (Array.isArray(v)) return JSON.stringify(v)
  if (typeof v === 'string' && v.trim()) return v
  return null
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
  const technicianId = url.searchParams.get('technicianId')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('pageSize')) || 20)
  )

  // Build WHERE clause scoped to the pro's clients.
  const where: Record<string, unknown> = {
    client: { proUserId: access.ownerUserId },
  }
  if (clientId) where.proClientId = clientId
  if (poolId) where.proPoolId = poolId
  if (status && ALLOWED_STATUSES.has(status)) where.status = status
  if (type && ALLOWED_TYPES.has(type)) where.type = type
  if (technicianId) where.technicianId = technicianId

  const scheduledRange: Record<string, Date> = {}
  if (from) {
    const d = new Date(from)
    if (!Number.isNaN(d.getTime())) scheduledRange.gte = d
  }
  if (to) {
    const d = new Date(to)
    if (!Number.isNaN(d.getTime())) scheduledRange.lte = d
  }
  if (Object.keys(scheduledRange).length > 0) {
    where.scheduledAt = scheduledRange
  }

  const [total, interventions] = await Promise.all([
    db.proIntervention.count({ where }),
    db.proIntervention.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, phone: true, city: true },
        },
        pool: { select: { id: true, name: true, type: true } },
      },
    }),
  ])

  return NextResponse.json({ interventions, total, page, pageSize })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const access = await getProAccess(session.user.id)
  if (!access.canWrite) return NextResponse.json({ error: toolWorkspaceText(locale, 'readonly') }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const proClientId =
    typeof body?.proClientId === 'string' ? body.proClientId : ''
  if (!proClientId) {
    const msg = await translate(
      locale,
      'pro.errors.clientIdRequired',
      'Client requis'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Verify the client belongs to the authenticated pro.
  const client = await db.proClient.findFirst({
    where: { id: proClientId, proUserId: access.ownerUserId },
    select: { id: true },
  })
  if (!client) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  // Optional pool: if provided, it must belong to the same client.
  const proPoolId =
    typeof body?.proPoolId === 'string' && body.proPoolId ? body.proPoolId : null
  if (proPoolId) {
    const pool = await db.proPool.findFirst({
      where: { id: proPoolId, proClientId },
      select: { id: true },
    })
    if (!pool) {
      const msg = await translate(
        locale,
        'pro.errors.poolNotOwnedByClient',
        'Ce bassin n\'appartient pas à ce client'
      )
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

  // scheduledAt is required (an intervention without a date is meaningless).
  if (!body?.scheduledAt) {
    const msg = await translate(
      locale,
      'pro.errors.scheduledAtRequired',
      'Date planifiée requise'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const scheduledAt = new Date(body.scheduledAt)
  if (Number.isNaN(scheduledAt.getTime())) {
    const msg = await translate(
      locale,
      'pro.errors.scheduledAtInvalid',
      'Date planifiée invalide'
    )
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const type =
    typeof body?.type === 'string' && ALLOWED_TYPES.has(body.type)
      ? body.type
      : 'maintenance'
  const status =
    typeof body?.status === 'string' && ALLOWED_STATUSES.has(body.status)
      ? body.status
      : 'scheduled'
  let technicianId =
    typeof body?.technicianId === 'string' && body.technicianId
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
  const duration =
    body?.duration != null && Number.isFinite(Number(body.duration))
      ? Math.max(0, Math.round(Number(body.duration)))
      : null
  const notes =
    typeof body?.notes === 'string' && body.notes.trim()
      ? body.notes.trim().slice(0, 10000)
      : null
  // completedAt: if status === 'completed' and not provided, use now.
  let completedAt: Date | null = null
  if (body?.completedAt) {
    const d = new Date(body.completedAt)
    if (!Number.isNaN(d.getTime())) completedAt = d
  } else if (status === 'completed') {
    completedAt = new Date()
  }

  const recurrence = ['weekly', 'biweekly', 'monthly'].includes(body?.recurrence)
    ? String(body.recurrence)
    : 'none'
  const occurrences = recurrence === 'none'
    ? 1
    : Math.min(52, Math.max(2, Math.round(Number(body?.occurrences) || 4)))

  try {
    const interventions = await db.$transaction(
      Array.from({ length: occurrences }, (_, index) => {
        const occurrenceDate = new Date(scheduledAt)
        if (recurrence === 'weekly') occurrenceDate.setDate(occurrenceDate.getDate() + 7 * index)
        if (recurrence === 'biweekly') occurrenceDate.setDate(occurrenceDate.getDate() + 14 * index)
        if (recurrence === 'monthly') occurrenceDate.setMonth(occurrenceDate.getMonth() + index)
        return db.proIntervention.create({ data: {
        proClientId,
        proPoolId,
        technicianId,
        type,
        status,
        scheduledAt: occurrenceDate,
        completedAt,
        duration,
        notes,
        photos: toJsonArray(body?.photos),
        actions: toJsonArray(body?.actions),
        productsUsed: toJsonArray(body?.productsUsed),
        } })
      })
    )
    return NextResponse.json({ intervention: interventions[0], interventions, recurrence }, { status: 201 })
  } catch (err) {
    console.error('[pro/interventions] POST error:', err)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
