import { db } from '@/lib/db'
import type { ProAccess } from '@/lib/pro/access'
import {
  broadLocalDayQueryRange,
  DEFAULT_DAILY_CAPACITY_MINUTES,
  DEFAULT_DAY_END,
  DEFAULT_DAY_START,
  DEFAULT_TIME_ZONE,
  parseStoredStringArray,
  parseWorkingDays,
  validateTechnicianSchedule,
  type DispatchValidationCode,
  type TechnicianAvailability,
} from '@/lib/pro/dispatch'

const DISPATCH_ROLES = ['owner', 'admin', 'manager', 'technician']

export class DispatchAssignmentError extends Error {
  constructor(
    public readonly code: DispatchValidationCode | 'technician_not_found',
    public readonly statusCode: 400 | 404 | 409,
    public readonly details?: Record<string, unknown>,
  ) {
    super(code)
    this.name = 'DispatchAssignmentError'
  }
}

export type DispatchMember = {
  memberId: string | null
  userId: string
  role: string
  name: string | null
  email: string
  dispatchEnabled: boolean
  skills: string[]
  serviceZones: string[]
  workingDays: number[]
  dayStart: string
  dayEnd: string
  timeZone: string
  dailyCapacityMinutes: number
  dispatchColor: string | null
  phone: string | null
  vehicle: string | null
}

export async function listDispatchMembers(access: ProAccess): Promise<DispatchMember[]> {
  if (!access.organizationId) {
    const user = await db.user.findUnique({
      where: { id: access.ownerUserId },
      select: { id: true, name: true, email: true },
    })
    return user ? [virtualOwner(user)] : []
  }

  const members = await db.organizationMember.findMany({
    where: {
      organizationId: access.organizationId,
      status: 'active',
      role: { in: DISPATCH_ROLES },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  const mapped: DispatchMember[] = members.map((member) => ({
    memberId: member.id,
    userId: member.userId,
    role: member.role,
    name: member.user.name,
    email: member.user.email,
    dispatchEnabled: member.dispatchEnabled,
    skills: parseStoredStringArray(member.skills),
    serviceZones: parseStoredStringArray(member.serviceZones),
    workingDays: parseWorkingDays(member.workingDays),
    dayStart: member.dayStart,
    dayEnd: member.dayEnd,
    timeZone: member.timeZone || DEFAULT_TIME_ZONE,
    dailyCapacityMinutes: member.dailyCapacityMinutes,
    dispatchColor: member.dispatchColor,
    phone: member.phone,
    vehicle: member.vehicle,
  }))

  if (!mapped.some((member) => member.userId === access.ownerUserId)) {
    const owner = await db.user.findUnique({
      where: { id: access.ownerUserId },
      select: { id: true, name: true, email: true },
    })
    if (owner) mapped.unshift(virtualOwner(owner))
  }
  return mapped
}

export async function validateTechnicianAssignment(input: {
  access: ProAccess
  technicianId: string
  scheduledAt: Date
  durationMinutes: number
  excludeInterventionId?: string
}): Promise<DispatchMember> {
  const member = await findDispatchMember(input.access, input.technicianId)
  if (!member) throw new DispatchAssignmentError('technician_not_found', 404)

  const range = broadLocalDayQueryRange(input.scheduledAt)
  const existing = await db.proIntervention.findMany({
    where: {
      technicianId: input.technicianId,
      client: { proUserId: input.access.ownerUserId },
      status: { in: ['scheduled', 'in_progress'] },
      scheduledAt: range,
      ...(input.excludeInterventionId ? { id: { not: input.excludeInterventionId } } : {}),
    },
    select: { id: true, scheduledAt: true, duration: true },
  })

  const result = validateTechnicianSchedule(
    availabilityOf(member),
    {
      id: input.excludeInterventionId,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes || 60,
    },
    existing.map((intervention) => ({
      id: intervention.id,
      scheduledAt: intervention.scheduledAt,
      durationMinutes: intervention.duration || 60,
    })),
  )

  if (!result.ok) {
    throw new DispatchAssignmentError(result.code, 409, {
      conflictId: result.conflictId,
      projectedDailyMinutes: result.projectedDailyMinutes,
      dailyCapacityMinutes: member.dailyCapacityMinutes,
    })
  }
  return member
}

export function availabilityOf(member: DispatchMember): TechnicianAvailability {
  return {
    dispatchEnabled: member.dispatchEnabled,
    workingDays: member.workingDays,
    dayStart: member.dayStart,
    dayEnd: member.dayEnd,
    timeZone: member.timeZone,
    dailyCapacityMinutes: member.dailyCapacityMinutes,
  }
}

async function findDispatchMember(
  access: ProAccess,
  technicianId: string,
): Promise<DispatchMember | null> {
  if (!access.organizationId) {
    if (technicianId !== access.ownerUserId) return null
    const user = await db.user.findUnique({
      where: { id: technicianId },
      select: { id: true, name: true, email: true },
    })
    return user ? virtualOwner(user) : null
  }

  const member = await db.organizationMember.findFirst({
    where: {
      organizationId: access.organizationId,
      userId: technicianId,
      status: 'active',
      role: { in: DISPATCH_ROLES },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  if (member) {
    return {
      memberId: member.id,
      userId: member.userId,
      role: member.role,
      name: member.user.name,
      email: member.user.email,
      dispatchEnabled: member.dispatchEnabled,
      skills: parseStoredStringArray(member.skills),
      serviceZones: parseStoredStringArray(member.serviceZones),
      workingDays: parseWorkingDays(member.workingDays),
      dayStart: member.dayStart,
      dayEnd: member.dayEnd,
      timeZone: member.timeZone || DEFAULT_TIME_ZONE,
      dailyCapacityMinutes: member.dailyCapacityMinutes,
      dispatchColor: member.dispatchColor,
      phone: member.phone,
      vehicle: member.vehicle,
    }
  }

  if (technicianId === access.ownerUserId) {
    const owner = await db.user.findUnique({
      where: { id: technicianId },
      select: { id: true, name: true, email: true },
    })
    return owner ? virtualOwner(owner) : null
  }
  return null
}

function virtualOwner(user: { id: string; name: string | null; email: string }): DispatchMember {
  return {
    memberId: null,
    userId: user.id,
    role: 'owner',
    name: user.name,
    email: user.email,
    dispatchEnabled: true,
    skills: [],
    serviceZones: [],
    workingDays: [1, 2, 3, 4, 5, 6],
    dayStart: DEFAULT_DAY_START,
    dayEnd: DEFAULT_DAY_END,
    timeZone: DEFAULT_TIME_ZONE,
    dailyCapacityMinutes: DEFAULT_DAILY_CAPACITY_MINUTES,
    dispatchColor: null,
    phone: null,
    vehicle: null,
  }
}
