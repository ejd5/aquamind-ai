export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5] as const
export const DEFAULT_DAY_START = '08:00'
export const DEFAULT_DAY_END = '18:00'
export const DEFAULT_DAILY_CAPACITY_MINUTES = 480

export type TechnicianAvailability = {
  dispatchEnabled: boolean
  workingDays: number[]
  dayStart: string
  dayEnd: string
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

export function validateTechnicianSchedule(
  availability: TechnicianAvailability,
  candidate: ScheduledWindow,
  existing: ScheduledWindow[],
): DispatchValidationResult {
  if (!availability.dispatchEnabled) return { ok: false, code: 'technician_disabled' }

  const duration = Math.max(1, Math.round(candidate.durationMinutes || 60))
  const candidateStart = candidate.scheduledAt
  const candidateEnd = new Date(candidateStart.getTime() + duration * 60_000)
  if (!availability.workingDays.includes(candidateStart.getDay())) {
    return { ok: false, code: 'outside_working_day' }
  }

  const startMinutes = minutesOfDay(candidateStart)
  const endMinutes = startMinutes + duration
  const dayStart = clockToMinutes(availability.dayStart, DEFAULT_DAY_START)
  const dayEnd = clockToMinutes(availability.dayEnd, DEFAULT_DAY_END)
  if (startMinutes < dayStart || endMinutes > dayEnd) {
    return { ok: false, code: 'outside_working_hours' }
  }

  const sameDay = existing.filter((item) => isSameLocalDay(item.scheduledAt, candidateStart))
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

export function startOfLocalDay(value: Date): Date {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

export function endOfLocalDay(value: Date): Date {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date
}

function minutesOfDay(value: Date): number {
  return value.getHours() * 60 + value.getMinutes()
}

function clockToMinutes(value: string, fallback: string): number {
  const normalized = normalizeClock(value, fallback)
  const [hours, minutes] = normalized.split(':').map(Number)
  return hours * 60 + minutes
}

function isSameLocalDay(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()
}
