import type { GeoPoint } from '@/lib/pro/live-dispatch'

export type RouteMatrixResult = {
  originIndex: number
  distanceMeters: number
  durationSeconds: number
}

type GoogleMatrixElement = {
  originIndex?: number
  destinationIndex?: number
  distanceMeters?: number
  duration?: string
  condition?: string
  status?: { code?: number; message?: string }
}

function parseDurationSeconds(value: string | undefined): number {
  if (!value) return 0
  const match = value.match(/^([0-9]+(?:\.[0-9]+)?)s$/)
  return match ? Math.round(Number(match[1])) : 0
}

export async function computeDriveMatrix(
  origins: GeoPoint[],
  destination: GeoPoint,
): Promise<RouteMatrixResult[] | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
  if (!apiKey || origins.length === 0) return null

  const response = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration,condition,status',
    },
    body: JSON.stringify({
      origins: origins.map((point) => ({
        waypoint: {
          location: {
            latLng: {
              latitude: point.latitude,
              longitude: point.longitude,
            },
          },
        },
        routeModifiers: { avoidFerries: true },
      })),
      destinations: [{
        waypoint: {
          location: {
            latLng: {
              latitude: destination.latitude,
              longitude: destination.longitude,
            },
          },
        },
      }],
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    }),
    cache: 'no-store',
  })

  if (!response.ok) return null
  const payload = await response.json().catch(() => null) as GoogleMatrixElement[] | null
  if (!Array.isArray(payload)) return null

  return payload
    .filter((element) => (
      typeof element.originIndex === 'number'
      && (element.destinationIndex ?? 0) === 0
      && element.condition !== 'ROUTE_NOT_FOUND'
      && (!element.status?.code || element.status.code === 0)
    ))
    .map((element) => ({
      originIndex: element.originIndex as number,
      distanceMeters: Math.max(0, element.distanceMeters ?? 0),
      durationSeconds: Math.max(0, parseDurationSeconds(element.duration)),
    }))
}
