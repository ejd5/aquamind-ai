export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6] as const
export const DEFAULT_DAY_START = '08:00'
export const DEFAULT_DAY_END = '18:00'
export const DEFAULT_TIME_ZONE = 'Europe/Paris'
export const DEFAULT_DAILY_CAPACITY_MINUTES = 480

export type TechnicianAvailability = {
  dispatchEnabled: boolean
  workingDays: number[]
  dayStart: string
  dayEnd: string
  timeZone: string
  dailyCapacityMinutes: number
}

export type ScheduledWindow = {
  id?: string
  scheduledAt: Date
  durationMinutes: number
}

export type DispatchValidationCode =
  | 'technician_disabled'
  | 'outside_working_day'
  | 'outside_working_hours'
  | 'schedule_conflict'
  | 'daily_capacity_exceeded'

export type DispatchValidationResult =
  | { ok: true; projectedDailyMinutes: number }
  | { ok: false; code: DispatchValidationCode; conflictId?: string; projectedDailyMinutes?: number }

export function parseStoredStringArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
}

export function serializeStringArray(value: unknown, maximum = 30): string | null {
  const items = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []
  const normalized = [...new Set(
    items
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().replace(/\s+/g, ' ').slice(0, 80))
      .filter(Boolean),
  )].slice(0, maximum)
  return normalized.length ? JSON.stringify(normalized) : null
}

export function parseWorkingDays(value: string | null | undefined): number[] {
  if (!value) return [...DEFAULT_WORKING_DAYS]
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return [...DEFAULT_WORKING_DAYS]
    const days = [...new Set(
      parsed
        .map(Number)
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    )].sort((a, b) => a - b)
    return days.length ? days : [...DEFAULT_WORKING_DAYS]
  } catch {
    return [...DEFAULT_WORKING_DAYS]
  }
}

export function serializeWorkingDays(value: unknown): string {
  const source = Array.isArray(value) ? value : []
  const days = [...new Set(
    source
      .map(Number)
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
  )].sort((a, b) => a - b)
  return JSON.stringify(days.length ? days : [...DEFAULT_WORKING_DAYS])
}

export function normalizeClock(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  return match ? `${match[1]}:${match[2]}` : fallback
}

export function normalizeCapacity(value: unknown): number {
  const minutes = Number(value)
  if (!Number.isFinite(minutes)) return DEFAULT_DAILY_CAPACITY_MINUTES
  return Math.min(24 * 60, Math.max(30, Math.round(minutes)))
}

export function normalizeTimeZone(value: unknown): string {
  const timeZone = typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_TIME_ZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return timeZone
  } catch {
    return DEFAULT_TIME_ZONE
  }
}

export function validateTechnicianSchedule(
  availability: TechnicianAvailability,
  candidate: ScheduledWindow,
  existing: ScheduledWindow[],
): DispatchValidationResult {
  if (!availability.dispatchEnabled) return { ok: false, code: 'technician_disabled' }

  const timeZone = normalizeTimeZone(availability.timeZone)
  const duration = Math.max(1, Math.round(candidate.durationMinutes || 60))
  const candidateStart = candidate.scheduledAt
  const candidateEnd = new Date(candidateStart.getTime() + duration * 60_000)
  const local = zonedParts(candidateStart, timeZone)

  if (!availability.workingDays.includes(local.weekday)) {
    return { ok: false, code: 'outside_working_day' }
  }

  const startMinutes = local.hour * 60 + local.minute
  const endLocal = zonedParts(candidateEnd, timeZone)
  const endMinutes = endLocal.dateKey === local.dateKey
    ? endLocal.hour * 60 + endLocal.minute
    : 24 * 60 + endLocal.hour * 60 + endLocal.minute
  const dayStart = clockToMinutes(availability.dayStart, DEFAULT_DAY_START)
  const dayEnd = clockToMinutes(availability.dayEnd, DEFAULT_DAY_END)
  if (startMinutes < dayStart || endMinutes > dayEnd) {
    return { ok: false, code: 'outside_working_hours' }
  }

  const sameDay = existing.filter(
    (item) => zonedDateKey(item.scheduledAt, timeZone) === local.dateKey,
  )
  for (const item of sameDay) {
    const itemDuration = Math.max(1, Math.round(item.durationMinutes || 60))
    const itemEnd = new Date(item.scheduledAt.getTime() + itemDuration * 60_000)
    if (candidateStart < itemEnd && item.scheduledAt < candidateEnd) {
      return { ok: false, code: 'schedule_conflict', conflictId: item.id }
    }
  }

  const existingMinutes = sameDay.reduce(
    (sum, item) => sum + Math.max(1, Math.round(item.durationMinutes || 60)),
    0,
  )
  const projectedDailyMinutes = existingMinutes + duration
  if (projectedDailyMinutes > availability.dailyCapacityMinutes) {
    return { ok: false, code: 'daily_capacity_exceeded', projectedDailyMinutes }
  }

  return { ok: true, projectedDailyMinutes }
}

export function zonedDateKey(value: Date, timeZone: string): string {
  return zonedParts(value, normalizeTimeZone(timeZone)).dateKey
}

export function broadLocalDayQueryRange(value: Date): { gte: Date; lte: Date } {
  return {
    gte: new Date(value.getTime() - 36 * 60 * 60_000),
    lte: new Date(value.getTime() + 36 * 60 * 60_000),
  }
}

type ZonedParts = {
  dateKey: string
  weekday: number
  hour: number
  minute: number
}

function zonedParts(value: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    dateKey: `${values.year}-${values.month}-${values.day}`,
    weekday: weekdayNumber(values.weekday),
    hour: Number(values.hour),
    minute: Number(values.minute),
  }
}

function weekdayNumber(value: string): number {
  const days: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return days[value] ?? 0
}

function clockToMinutes(value: string, fallback: string): number {
  const normalized = normalizeClock(value, fallback)
  const [hours, minutes] = normalized.split(':').map(Number)
  return hours * 60 + minutes
}
