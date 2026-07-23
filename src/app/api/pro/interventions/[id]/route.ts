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
import { DispatchAssignmentError, validateTechnicianAssignment } from '@/lib/pro/dispatch-server'

export const runtime = 'nodejs'

const ALLOWED_TYPES = ['maintenance', 'repair', 'opening', 'closing', 'emergency'] as const
const ALLOWED_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const
type Ctx = { params: Promise<{ id: string }> }

function toJsonArray(value: unknown): string | null {
  if (Array.isArray(value)) return JSON.stringify(value.slice(0, 100))
  if (typeof value === 'string' && value.trim()) return value.slice(0, 100_000)
  return null
}

function containsEmbeddedPhoto(value: unknown): boolean {
  try {
    return JSON.stringify(value).includes('data:image/')
  } catch {
    return true
  }
}

type SafePhotoReference = string | {
  url: string
  capturedAt?: string
  label?: string
}

function toSafePhotoReferences(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const safe: SafePhotoReference[] = []
  for (const item of value.slice(0, 20)) {
    if (typeof item === 'string' && /^(https:\/\/|redacted:\/\/)/.test(item)) {
      safe.push(item.slice(0, 2_000))
      continue
    }
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const url = typeof record.url === 'string' ? record.url.trim() : ''
      if (/^(https:\/\/|redacted:\/\/)/.test(url)) {
        safe.push({
          url: url.slice(0, 2_000),
          capturedAt: typeof record.capturedAt === 'string' ? record.capturedAt.slice(0, 80) : undefined,
          label: typeof record.label === 'string' ? record.label.slice(0, 120) : undefined,
        })
      }
    }
  }
  return safe.length ? JSON.stringify(safe) : null
}

async function getOwnedIntervention(id: string, ownerUserId: string) {
  return db.proIntervention.findFirst({
    where: { id, client: { proUserId: ownerUserId } },
    select: {
      id: true,
      proClientId: true,
      proPoolId: true,
      status: true,
      technicianId: true,
      scheduledAt: true,
      duration: true,
      startedAt: true,
      completedAt: true,
    },
  })
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const { id } = await ctx.params
  const access = await getProAccess(session.user.id)
  const owned = await getOwnedIntervention(id, access.ownerUserId)
  if (!owned) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  const intervention = await db.proIntervention.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          zipCode: true,
          preferredContact: true,
        },
      },
      pool: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          address: true,
          accessInstructions: true,
          brand: true,
          model: true,
        },
      },
    },
  })

  return NextResponse.json({
    intervention,
    access: { role: access.role, canWrite: access.canWrite, canManage: access.canManage },
  })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const { id } = await ctx.params
  const access = await getProAccess(session.user.id)
  if (!access.canWrite) {
    return NextResponse.json({ error: toolWorkspaceText(locale, 'readonly') }, { status: 403 })
  }

  const existing = await getOwnedIntervention(id, access.ownerUserId)
  if (!existing) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  let nextStatus = existing.status

  if (body.type !== undefined) {
    if (!isOneOf(ALLOWED_TYPES, body.type)) {
      return NextResponse.json({ error: 'Invalid intervention type' }, { status: 400 })
    }
    data.type = body.type
  }
  if (body.status !== undefined) {
    if (!isOneOf(ALLOWED_STATUSES, body.status)) {
      return NextResponse.json({ error: 'Invalid intervention status' }, { status: 400 })
    }
    nextStatus = body.status
    data.status = nextStatus
  }
  if (body.priority !== undefined) {
    if (!isOneOf(PRO_INTERVENTION_PRIORITIES, body.priority)) {
      return NextResponse.json({ error: 'Invalid intervention priority' }, { status: 400 })
    }
    data.priority = body.priority
  }

  if (body.technicianId !== undefined) {
    const technicianId = typeof body.technicianId === 'string' ? body.technicianId.trim() : ''
    data.technicianId = technicianId || null
  }

  if (body.duration !== undefined) {
    if (body.duration === null || body.duration === '') data.duration = null
    else if (Number.isFinite(Number(body.duration))) {
      data.duration = Math.max(0, Math.round(Number(body.duration)))
    } else return NextResponse.json({ error: 'Invalid intervention duration' }, { status: 400 })
  }

  for (const field of ['summary', 'customerNotes', 'internalNotes', 'notes'] as const) {
    if (body[field] !== undefined) data[field] = cleanOptionalText(body[field])
  }
  if (body.photos !== undefined) {
    if (containsEmbeddedPhoto(body.photos)) {
      return NextResponse.json({ error: 'Embedded service photos are not accepted' }, { status: 400 })
    }
    data.photos = toSafePhotoReferences(body.photos)
  }
  if (body.actions !== undefined) data.actions = toJsonArray(body.actions)
  if (body.productsUsed !== undefined) data.productsUsed = toJsonArray(body.productsUsed)
  if (body.billable !== undefined && typeof body.billable === 'boolean') data.billable = body.billable
  if (body.amount !== undefined) {
    const amount = parseOptionalAmount(body.amount)
    if (amount === undefined) {
      return NextResponse.json({ error: 'Invalid intervention amount' }, { status: 400 })
    }
    data.amount = amount
  }
  if (body.currency !== undefined) data.currency = normalizeCurrency(body.currency)

  for (const field of ['scheduledAt', 'startedAt', 'completedAt'] as const) {
    const parsed = parseOptionalDate(body[field])
    if (!parsed.provided) continue
    if (!parsed.valid || (field === 'scheduledAt' && !parsed.value)) {
      return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
    }
    data[field] = parsed.value
  }

  const transitionTime = new Date()
  if (nextStatus === 'in_progress' && existing.status !== 'in_progress' && body.startedAt === undefined) {
    data.startedAt = existing.startedAt ?? transitionTime
  }
  if (nextStatus === 'completed' && existing.status !== 'completed') {
    if (body.startedAt === undefined) data.startedAt = existing.startedAt ?? transitionTime
    if (body.completedAt === undefined) data.completedAt = transitionTime
  }
  if (nextStatus !== 'completed' && body.completedAt === undefined && existing.status === 'completed') {
    data.completedAt = null
  }

  if (body.proPoolId !== undefined) {
    if (body.proPoolId === null || body.proPoolId === '') data.proPoolId = null
    else if (typeof body.proPoolId === 'string') {
      const pool = await db.proPool.findFirst({
        where: { id: body.proPoolId, proClientId: existing.proClientId },
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
      data.proPoolId = body.proPoolId
    }
  }

  const nextTechnicianId = data.technicianId === undefined
    ? existing.technicianId
    : data.technicianId as string | null
  const nextScheduledAt = data.scheduledAt instanceof Date ? data.scheduledAt : existing.scheduledAt
  const nextDuration = typeof data.duration === 'number' ? data.duration : existing.duration || 60
  const scheduleChanged = ['technicianId', 'scheduledAt', 'duration', 'status']
    .some((field) => body[field] !== undefined)
  if (scheduleChanged && nextTechnicianId && ['scheduled', 'in_progress'].includes(nextStatus)) {
    try {
      await validateTechnicianAssignment({
        access,
        technicianId: nextTechnicianId,
        scheduledAt: nextScheduledAt,
        durationMinutes: nextDuration,
        excludeInterventionId: id,
      })
    } catch (error) {
      if (error instanceof DispatchAssignmentError) {
        return NextResponse.json(
          { error: `dispatch.${error.code}`, code: error.code, details: error.details },
          { status: error.statusCode },
        )
      }
      throw error
    }
  }

  if (Object.keys(data).length === 0) {
    const msg = await translate(locale, 'common.errors.noFields', 'Aucun champ à mettre à jour')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const intervention = await db.$transaction(async (tx) => {
      const updated = await tx.proIntervention.update({ where: { id }, data })
      if (nextStatus !== existing.status) {
        const activityType = nextStatus === 'in_progress'
          ? 'intervention_started'
          : nextStatus === 'completed'
            ? 'intervention_completed'
            : nextStatus === 'cancelled'
              ? 'intervention_cancelled'
              : 'intervention_scheduled'
        await tx.proClientActivity.create({
          data: {
            proClientId: existing.proClientId,
            actorUserId: session.user.id,
            type: activityType,
            title: `crm.${activityType}`,
            details: JSON.stringify({ interventionId: id, status: nextStatus }),
          },
        })
      }

      if (nextStatus === 'completed') {
        const serviceDate = updated.completedAt ?? transitionTime
        await tx.proClient.update({
          where: { id: existing.proClientId },
          data: { lastContactAt: serviceDate },
        })
        const poolId = updated.proPoolId ?? existing.proPoolId
        if (poolId) {
          await tx.proPool.update({
            where: { id: poolId },
            data: { lastServiceAt: serviceDate },
          })
        }
      }
      return updated
    })
    return NextResponse.json({ intervention })
  } catch (error) {
    console.error('[pro/interventions/[id]] PATCH error:', error)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const { id } = await ctx.params
  const access = await getProAccess(session.user.id)
  if (!access.canManage) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 })
  }

  const existing = await getOwnedIntervention(id, access.ownerUserId)
  if (!existing) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  try {
    await db.proIntervention.delete({ where: { id } })
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    console.error('[pro/interventions/[id]] DELETE error:', error)
    const msg = await translate(locale, 'pro.errors.generic', 'Une erreur est survenue.')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
