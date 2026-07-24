import { createHash, randomBytes } from 'node:crypto'
import { parseWorkingDays, validateTechnicianSchedule } from '@/lib/pro/dispatch'
import { isValidCoordinate, LIVE_SESSION_MAX_MS } from '@/lib/pro/live-dispatch'

export const GPS_DEVICE_PROVIDERS = ['generic', 'traccar', 'samsara', 'geotab', 'webfleet'] as const
export type GpsDeviceProvider = (typeof GPS_DEVICE_PROVIDERS)[number]

export function createDeviceToken(): { token: string; tokenHash: string } {
  const token = `aqg_${randomBytes(32).toString('base64url')}`
  return { token, tokenHash: hashDeviceToken(token) }
}

export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function bearerToken(header: string | null): string | null {
  if (!header) return null
  const match = header.match(/^Bearer\s+([A-Za-z0-9._~-]{30,200})$/i)
  return match?.[1] ?? null
}

export type IncomingDevicePoint = {
  latitude: number
  longitude: number
  accuracy: number | null
  altitude: number | null
  speed: number | null
  heading: number | null
  battery: number | null
  externalEventId: string | null
  recordedAt: Date
}

function optionalNumber(value: unknown, minimum: number, maximum: number): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return null
  return Math.max(minimum, Math.min(maximum, number))
}

function text(value: unknown, maximum = 160): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const normalized = String(value).trim()
  return normalized ? normalized.slice(0, maximum) : null
}

export function parseDevicePoint(body: unknown, provider: string, now = new Date()): IncomingDevicePoint | null {
  if (!body || typeof body !== 'object') return null
  const root = body as Record<string, unknown>
  const candidate = root.position && typeof root.position === 'object'
    ? root.position as Record<string, unknown>
    : root
  const latitude = Number(candidate.latitude ?? candidate.lat)
  const longitude = Number(candidate.longitude ?? candidate.lng ?? candidate.lon)
  if (!isValidCoordinate({ latitude, longitude })) return null

  const dateValue = candidate.recordedAt ?? candidate.fixTime ?? candidate.deviceTime ?? candidate.serverTime ?? root.recordedAt
  const recordedAt = dateValue ? new Date(String(dateValue)) : now
  if (Number.isNaN(recordedAt.getTime())) return null
  const futureLimit = now.getTime() + 5 * 60_000
  const historyLimit = now.getTime() - 24 * 60 * 60_000
  if (recordedAt.getTime() > futureLimit || recordedAt.getTime() < historyLimit) return null

  const rawSpeed = optionalNumber(candidate.speed, 0, 500)
  const speed = provider === 'traccar' && rawSpeed != null ? rawSpeed * 0.514444 : rawSpeed
  const attributes = candidate.attributes && typeof candidate.attributes === 'object'
    ? candidate.attributes as Record<string, unknown>
    : {}
  const rawBattery = candidate.battery ?? attributes.batteryLevel ?? attributes.battery
  const batteryNumber = optionalNumber(rawBattery, 0, 100)
  const battery = batteryNumber == null ? null : batteryNumber > 1 ? batteryNumber / 100 : batteryNumber

  return {
    latitude,
    longitude,
    accuracy: optionalNumber(candidate.accuracy, 0, 10_000),
    altitude: optionalNumber(candidate.altitude, -1_000, 20_000),
    speed,
    heading: optionalNumber(candidate.heading ?? candidate.course, 0, 360),
    battery,
    externalEventId: text(candidate.externalEventId ?? candidate.id ?? root.eventId),
    recordedAt,
  }
}

export function devicePointWithinWorkWindow(member: {
  dispatchEnabled: boolean
  workingDays: string | null
  dayStart: string
  dayEnd: string
  timeZone: string
  dailyCapacityMinutes: number
}, recordedAt: Date): boolean {
  return validateTechnicianSchedule({
    dispatchEnabled: member.dispatchEnabled,
    workingDays: parseWorkingDays(member.workingDays),
    dayStart: member.dayStart,
    dayEnd: member.dayEnd,
    timeZone: member.timeZone,
    dailyCapacityMinutes: member.dailyCapacityMinutes,
  }, {
    scheduledAt: recordedAt,
    durationMinutes: 1,
  }, []).ok
}

export function vehicleSessionDeadline(now = new Date()): Date {
  return new Date(now.getTime() + LIVE_SESSION_MAX_MS)
}
