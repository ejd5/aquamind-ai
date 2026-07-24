export const LIVE_DISPATCH_NOTICE_VERSION = '2026-07-dispatch-live-v1'
export const LIVE_LOCATION_FRESH_MS = 2 * 60 * 1000
export const LIVE_LOCATION_STALE_MS = 15 * 60 * 1000
export const LIVE_SESSION_MAX_MS = 14 * 60 * 60 * 1000
export const DEFAULT_LOCATION_RETENTION_DAYS = 60
export const MAX_LOCATION_RETENTION_DAYS = 60

export type GeoPoint = {
  latitude: number
  longitude: number
}

export type LocationFreshness = 'live' | 'stale' | 'offline'

export function clampRetentionDays(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_LOCATION_RETENTION_DAYS
  return Math.min(MAX_LOCATION_RETENTION_DAYS, Math.max(1, Math.round(parsed)))
}

export function isValidCoordinate(point: GeoPoint): boolean {
  return Number.isFinite(point.latitude)
    && Number.isFinite(point.longitude)
    && point.latitude >= -90
    && point.latitude <= 90
    && point.longitude >= -180
    && point.longitude <= 180
}

export function haversineDistanceKm(origin: GeoPoint, destination: GeoPoint): number {
  const toRadians = (degrees: number) => degrees * Math.PI / 180
  const earthRadiusKm = 6371.0088
  const latitudeDelta = toRadians(destination.latitude - origin.latitude)
  const longitudeDelta = toRadians(destination.longitude - origin.longitude)
  const originLatitude = toRadians(origin.latitude)
  const destinationLatitude = toRadians(destination.latitude)
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude)
    * Math.sin(longitudeDelta / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function approximateDriveMinutes(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 0
  const averageSpeedKmH = distanceKm < 8 ? 28 : distanceKm < 30 ? 42 : 58
  return Math.max(1, Math.round((distanceKm / averageSpeedKmH) * 60))
}

export function locationFreshness(recordedAt: Date | string, now = new Date()): LocationFreshness {
  const timestamp = recordedAt instanceof Date ? recordedAt.getTime() : new Date(recordedAt).getTime()
  if (!Number.isFinite(timestamp)) return 'offline'
  const age = Math.max(0, now.getTime() - timestamp)
  if (age <= LIVE_LOCATION_FRESH_MS) return 'live'
  if (age <= LIVE_LOCATION_STALE_MS) return 'stale'
  return 'offline'
}

export function routeSequence<T extends { scheduledAt: Date | string; routeOrder?: number | null }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftOrder = left.routeOrder ?? Number.MAX_SAFE_INTEGER
    const rightOrder = right.routeOrder ?? Number.MAX_SAFE_INTEGER
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()
  })
}

export function scoreDispatchCandidate(input: {
  driveMinutes: number
  activeInterventions: number
  scheduledMinutes: number
  hasScheduleConflict: boolean
  locationFreshness: LocationFreshness
}): number {
  const freshnessPenalty = input.locationFreshness === 'live' ? 0 : input.locationFreshness === 'stale' ? 25 : 100
  const conflictPenalty = input.hasScheduleConflict ? 80 : 0
  const workloadPenalty = input.activeInterventions * 4 + Math.round(input.scheduledMinutes / 60) * 2
  return input.driveMinutes + workloadPenalty + conflictPenalty + freshnessPenalty
}

export function retentionCutoff(days: number, now = new Date()): Date {
  return new Date(now.getTime() - clampRetentionDays(days) * 24 * 60 * 60 * 1000)
}
