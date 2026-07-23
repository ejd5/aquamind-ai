import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import {
  DEFAULT_DAY_END,
  DEFAULT_DAY_START,
  normalizeCapacity,
  normalizeClock,
  normalizeTimeZone,
  serializeStringArray,
  serializeWorkingDays,
} from '@/lib/pro/dispatch'
import { listDispatchMembers } from '@/lib/pro/dispatch-server'
import { toolWorkspaceText } from '@/i18n/locales/tool-workspaces'

export const runtime = 'nodejs'

function startOfWeek(value: Date): Date {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  date.setDate(date.getDate() - ((day + 6) % 7))
  return date
}

function parseRange(value: string | null, fallback: Date): Date {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const locale = req.headers.get('accept-language') ?? undefined
  if (!session?.user?.id) {
    return NextResponse.json({ error: toolWorkspaceText(locale, 'unauthorized') }, { status: 401 })
  }

  const access = await getProAccess(session.user.id)
  const url = new URL(req.url)
  const defaultFrom = startOfWeek(new Date())
  const defaultTo = new Date(defaultFrom)
  defaultTo.setDate(defaultTo.getDate() + 7)
  const from = parseRange(url.searchParams.get('from'), defaultFrom)
  const to = parseRange(url.searchParams.get('to'), defaultTo)
  if (to <= from) {
    return NextResponse.json({ error: 'Invalid workload range' }, { status: 400 })
  }

  const [members, interventions] = await Promise.all([
    listDispatchMembers(access),
    db.proIntervention.findMany({
      where: {
        client: { proUserId: access.ownerUserId },
        status: { not: 'cancelled' },
        scheduledAt: { gte: from, lt: to },
      },
      select: {
        id: true,
        technicianId: true,
        scheduledAt: true,
        duration: true,
        priority: true,
        status: true,
      },
    }),
  ])

  const workload = new Map<string, {
    interventionCount: number
    scheduledMinutes: number
    urgentCount: number
    inProgressCount: number
  }>()
  let unassignedCount = 0
  let unassignedUrgentCount = 0
  for (const intervention of interventions) {
    if (!intervention.technicianId) {
      if (['scheduled', 'in_progress'].includes(intervention.status)) {
        unassignedCount += 1
        if (intervention.priority === 'urgent') unassignedUrgentCount += 1
      }
      continue
    }
    const current = workload.get(intervention.technicianId) ?? {
      interventionCount: 0,
      scheduledMinutes: 0,
      urgentCount: 0,
      inProgressCount: 0,
    }
    current.interventionCount += 1
    current.scheduledMinutes += intervention.duration || 60
    if (intervention.priority === 'urgent' && ['scheduled', 'in_progress'].includes(intervention.status)) current.urgentCount += 1
    if (intervention.status === 'in_progress') current.inProgressCount += 1
    workload.set(intervention.technicianId, current)
  }

  return NextResponse.json({
    members: members.map((member) => {
      const load = workload.get(member.userId) ?? {
        interventionCount: 0,
        scheduledMinutes: 0,
        urgentCount: 0,
        inProgressCount: 0,
      }
      const workingDayCount = Math.max(1, member.workingDays.length)
      const weeklyCapacityMinutes = member.dailyCapacityMinutes * workingDayCount
      return {
        ...member,
        workload: {
          ...load,
          weeklyCapacityMinutes,
          utilizationPercent: Math.round((load.scheduledMinutes / weeklyCapacityMinutes) * 100),
        },
      }
    }),
    summary: {
      from: from.toISOString(),
      to: to.toISOString(),
      interventionCount: interventions.length,
      unassignedCount,
      unassignedUrgentCount,
    },
    access: {
      role: access.role,
      canManage: access.canManage,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const locale = req.headers.get('accept-language') ?? undefined
  if (!session?.user?.id) {
    return NextResponse.json({ error: toolWorkspaceText(locale, 'unauthorized') }, { status: 401 })
  }

  const access = await getProAccess(session.user.id)
  if (!access.canManage) {
    return NextResponse.json({ error: toolWorkspaceText(locale, 'readonly') }, { status: 403 })
  }
  if (!access.organizationId) {
    return NextResponse.json({ error: toolWorkspaceText(locale, 'companySetupRequired') }, { status: 409 })
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  const memberId = typeof body.memberId === 'string' ? body.memberId : ''
  const userId = typeof body.userId === 'string' ? body.userId : ''
  const existing = await db.organizationMember.findFirst({
    where: {
      organizationId: access.organizationId,
      status: 'active',
      ...(memberId ? { id: memberId } : { userId }),
    },
  })
  if (!existing) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })

  const dayStart = normalizeClock(body.dayStart, existing.dayStart || DEFAULT_DAY_START)
  const dayEnd = normalizeClock(body.dayEnd, existing.dayEnd || DEFAULT_DAY_END)
  if (clockMinutes(dayEnd) <= clockMinutes(dayStart)) {
    return NextResponse.json({ error: 'Working day end must be after start' }, { status: 400 })
  }

  const dispatchColor = normalizeColor(body.dispatchColor)
  const member = await db.organizationMember.update({
    where: { id: existing.id },
    data: {
      dispatchEnabled: typeof body.dispatchEnabled === 'boolean'
        ? body.dispatchEnabled
        : existing.dispatchEnabled,
      skills: body.skills === undefined ? existing.skills : serializeStringArray(body.skills),
      serviceZones: body.serviceZones === undefined
        ? existing.serviceZones
        : serializeStringArray(body.serviceZones),
      workingDays: body.workingDays === undefined
        ? existing.workingDays
        : serializeWorkingDays(body.workingDays),
      dayStart,
      dayEnd,
      timeZone: normalizeTimeZone(body.timeZone ?? existing.timeZone),
      dailyCapacityMinutes: body.dailyCapacityMinutes === undefined
        ? existing.dailyCapacityMinutes
        : normalizeCapacity(body.dailyCapacityMinutes),
      dispatchColor: body.dispatchColor === undefined ? existing.dispatchColor : dispatchColor,
      phone: body.phone === undefined ? existing.phone : clean(body.phone, 80),
      vehicle: body.vehicle === undefined ? existing.vehicle : clean(body.vehicle, 160),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ member })
}

function clean(value: unknown, maximum: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text.slice(0, maximum) : null
}

function normalizeColor(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const color = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : null
}

function clockMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}
