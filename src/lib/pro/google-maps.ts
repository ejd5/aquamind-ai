if (typeof window !== 'undefined') {
  throw new Error('Google Maps server integration cannot run in the browser')
}

export const GOOGLE_MAPS_INTEGRATION_VERSION = 'google-maps-server-v1' as const
export const GOOGLE_GEOCODING_POLICY_VERSION = 'google-geocoding-confirmed-location-v1' as const
export const GOOGLE_COORDINATE_REFRESH_DAYS = 30
export const MAX_ROUTE_STOPS = 24

export interface LatLng {
  latitude: number
  longitude: number
}

export interface GeocodeResult {
  provider: 'google_maps_geocoding_v4'
  placeId: string
  location: LatLng
  formattedAddress: string | null
  granularity: string | null
  attributionRequired: true
  transientGoogleContent: true
  methodVersion: typeof GOOGLE_MAPS_INTEGRATION_VERSION
}

export interface RouteMatrixElement {
  originIndex: number
  destinationIndex: number
  statusCode: number
  condition: string
  distanceMeters: number | null
  durationSeconds: number | null
}

export interface RouteMatrixResult {
  provider: 'google_routes_v2' | 'haversine_fallback'
  elements: RouteMatrixElement[]
  attributionRequired: boolean
  estimated: boolean
  methodVersion: typeof GOOGLE_MAPS_INTEGRATION_VERSION
  fallbackReason: string | null
}

export interface RouteOrderResult {
  order: number[]
  totalDistanceMeters: number
  totalDurationSeconds: number | null
  usedFallbackEdges: boolean
  unreachableStopIndexes: number[]
}

export class GoogleMapsIntegrationError extends Error {
  constructor(
    public code:
      | 'MAPS_NOT_CONFIGURED'
      | 'INVALID_ADDRESS'
      | 'INVALID_COORDINATES'
      | 'GEOCODING_NOT_FOUND'
      | 'GOOGLE_API_ERROR'
      | 'GOOGLE_API_TIMEOUT'
      | 'INVALID_GOOGLE_RESPONSE'
      | 'TOO_MANY_ROUTE_STOPS'
      | 'ROUTE_NOT_FOUND',
    message: string,
    public statusCode = 502,
  ) {
    super(message)
    this.name = 'GoogleMapsIntegrationError'
  }
}

function serverApiKey(): string {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ?? ''
}

export function googleMapsConfiguration() {
  return {
    configured: serverApiKey().length > 0,
    geocodingApi: 'v4',
    routesApi: 'v2',
    serverOnly: true,
    maxRouteStops: MAX_ROUTE_STOPS,
    methodVersion: GOOGLE_MAPS_INTEGRATION_VERSION,
  }
}

export function normalizeAddress(value: unknown): string {
  const address = typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, 1_000)
    : ''
  if (address.length < 5) {
    throw new GoogleMapsIntegrationError('INVALID_ADDRESS', 'A complete address is required', 400)
  }
  return address
}

export function normalizeLatLng(value: unknown): LatLng {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const latitude = Number(record.latitude)
  const longitude = Number(record.longitude)
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    throw new GoogleMapsIntegrationError('INVALID_COORDINATES', 'Invalid latitude or longitude', 400)
  }
  return { latitude, longitude }
}

export function googleCoordinatesNeedRefresh(
  geocodedAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (!geocodedAt) return false
  const timestamp = new Date(geocodedAt).getTime()
  if (!Number.isFinite(timestamp)) return true
  return now.getTime() - timestamp >= GOOGLE_COORDINATE_REFRESH_DAYS * 24 * 60 * 60 * 1_000
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 8_000,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GoogleMapsIntegrationError('GOOGLE_API_TIMEOUT', 'Google Maps request timed out', 504)
    }
    throw new GoogleMapsIntegrationError('GOOGLE_API_ERROR', 'Google Maps request failed')
  } finally {
    clearTimeout(timeout)
  }
}

function apiHeaders(fieldMask: string): HeadersInit {
  const key = serverApiKey()
  if (!key) {
    throw new GoogleMapsIntegrationError(
      'MAPS_NOT_CONFIGURED',
      'GOOGLE_MAPS_SERVER_API_KEY is not configured',
      503,
    )
  }
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': key,
    'X-Goog-FieldMask': fieldMask,
  }
}

export async function geocodeAddress(
  rawAddress: unknown,
  options: { regionCode?: string; languageCode?: string } = {},
): Promise<GeocodeResult> {
  const address = normalizeAddress(rawAddress)
  const regionCode = (options.regionCode ?? 'FR').trim().slice(0, 2).toUpperCase()
  const languageCode = (options.languageCode ?? 'fr').trim().slice(0, 12)
  const params = new URLSearchParams({ regionCode, languageCode })
  const url = `https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(address)}?${params}`
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: apiHeaders('results.placeId,results.location,results.formattedAddress,results.granularity'),
  })
  const raw = await response.text()
  if (!response.ok) {
    throw new GoogleMapsIntegrationError(
      'GOOGLE_API_ERROR',
      `Google Geocoding API returned ${response.status}`,
      response.status >= 400 && response.status < 500 ? 400 : 502,
    )
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    throw new GoogleMapsIntegrationError('INVALID_GOOGLE_RESPONSE', 'Invalid geocoding response')
  }
  const results = payload && typeof payload === 'object'
    ? (payload as Record<string, unknown>).results
    : null
  const first = Array.isArray(results) ? results[0] : null
  if (!first || typeof first !== 'object') {
    throw new GoogleMapsIntegrationError('GEOCODING_NOT_FOUND', 'No geocoding result found', 404)
  }
  const record = first as Record<string, unknown>
  const placeId = typeof record.placeId === 'string' ? record.placeId : ''
  if (!placeId) {
    throw new GoogleMapsIntegrationError('INVALID_GOOGLE_RESPONSE', 'Geocoding response has no Place ID')
  }

  return {
    provider: 'google_maps_geocoding_v4',
    placeId,
    location: normalizeLatLng(record.location),
    formattedAddress: typeof record.formattedAddress === 'string' ? record.formattedAddress : null,
    granularity: typeof record.granularity === 'string' ? record.granularity : null,
    attributionRequired: true,
    transientGoogleContent: true,
    methodVersion: GOOGLE_MAPS_INTEGRATION_VERSION,
  }
}

function durationSeconds(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = /^(-?\d+(?:\.\d+)?)s$/.exec(value)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function parseRouteMatrixResponse(raw: string): RouteMatrixElement[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^,|,$/g, ''))
      .filter((line) => line && line !== '[' && line !== ']')
    try {
      parsed = lines.map((line) => JSON.parse(line))
    } catch {
      throw new GoogleMapsIntegrationError('INVALID_GOOGLE_RESPONSE', 'Invalid route matrix response')
    }
  }
  const entries = Array.isArray(parsed) ? parsed : [parsed]
  return entries.map((entry) => {
    const record = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
    const status = record.status && typeof record.status === 'object'
      ? record.status as Record<string, unknown>
      : {}
    return {
      originIndex: Number(record.originIndex),
      destinationIndex: Number(record.destinationIndex),
      statusCode: Number.isFinite(Number(status.code)) ? Number(status.code) : 0,
      condition: typeof record.condition === 'string' ? record.condition : 'ROUTE_MATRIX_ELEMENT_CONDITION_UNSPECIFIED',
      distanceMeters: Number.isFinite(Number(record.distanceMeters)) ? Number(record.distanceMeters) : null,
      durationSeconds: durationSeconds(record.duration),
    }
  }).filter((entry) =>
    Number.isInteger(entry.originIndex) && entry.originIndex >= 0 &&
    Number.isInteger(entry.destinationIndex) && entry.destinationIndex >= 0,
  )
}

export async function computeGoogleRouteMatrix(
  origins: LatLng[],
  destinations: LatLng[],
  options: { languageCode?: string; departureTime?: Date } = {},
): Promise<RouteMatrixResult> {
  if (origins.length === 0 || destinations.length === 0) {
    throw new GoogleMapsIntegrationError('ROUTE_NOT_FOUND', 'Origins and destinations are required', 400)
  }
  if (origins.length * destinations.length > 625) {
    throw new GoogleMapsIntegrationError('TOO_MANY_ROUTE_STOPS', 'Google route matrix element limit exceeded', 400)
  }
  const body = {
    origins: origins.map((location) => ({ waypoint: { location: { latLng: normalizeLatLng(location) } } })),
    destinations: destinations.map((location) => ({ waypoint: { location: { latLng: normalizeLatLng(location) } } })),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    departureTime: (options.departureTime ?? new Date()).toISOString(),
    languageCode: options.languageCode ?? 'fr-FR',
    units: 'METRIC',
  }
  const response = await fetchWithTimeout(
    'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
    {
      method: 'POST',
      headers: apiHeaders('originIndex,destinationIndex,status,condition,distanceMeters,duration'),
      body: JSON.stringify(body),
    },
    12_000,
  )
  const raw = await response.text()
  if (!response.ok) {
    throw new GoogleMapsIntegrationError(
      'GOOGLE_API_ERROR',
      `Google Routes API returned ${response.status}`,
      response.status >= 400 && response.status < 500 ? 400 : 502,
    )
  }
  return {
    provider: 'google_routes_v2',
    elements: parseRouteMatrixResponse(raw),
    attributionRequired: true,
    estimated: false,
    methodVersion: GOOGLE_MAPS_INTEGRATION_VERSION,
    fallbackReason: null,
  }
}

function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const radius = 6_371_000
  const radians = (degrees: number) => degrees * Math.PI / 180
  const dLat = radians(b.latitude - a.latitude)
  const dLon = radians(b.longitude - a.longitude)
  const lat1 = radians(a.latitude)
  const lat2 = radians(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * radius * Math.asin(Math.sqrt(h)))
}

export function buildHaversineMatrix(origins: LatLng[], destinations: LatLng[], reason: string): RouteMatrixResult {
  const elements: RouteMatrixElement[] = []
  origins.forEach((origin, originIndex) => {
    destinations.forEach((destination, destinationIndex) => {
      elements.push({
        originIndex,
        destinationIndex,
        statusCode: 0,
        condition: 'STRAIGHT_LINE_ESTIMATE',
        distanceMeters: haversineDistanceMeters(origin, destination),
        durationSeconds: null,
      })
    })
  })
  return {
    provider: 'haversine_fallback',
    elements,
    attributionRequired: false,
    estimated: true,
    methodVersion: GOOGLE_MAPS_INTEGRATION_VERSION,
    fallbackReason: reason,
  }
}

export async function computeRouteMatrixWithFallback(
  origins: LatLng[],
  destinations: LatLng[],
): Promise<RouteMatrixResult> {
  if (!googleMapsConfiguration().configured) {
    return buildHaversineMatrix(origins, destinations, 'GOOGLE_MAPS_SERVER_API_KEY_NOT_CONFIGURED')
  }
  try {
    return await computeGoogleRouteMatrix(origins, destinations)
  } catch (error) {
    if (error instanceof GoogleMapsIntegrationError && error.statusCode >= 500) {
      return buildHaversineMatrix(origins, destinations, error.code)
    }
    throw error
  }
}

export function optimizeRouteOrder(
  matrix: RouteMatrixElement[],
  stopCount: number,
  hasStart: boolean,
): RouteOrderResult {
  if (stopCount < 1 || stopCount > MAX_ROUTE_STOPS) {
    throw new GoogleMapsIntegrationError('TOO_MANY_ROUTE_STOPS', `Route requires 1 to ${MAX_ROUTE_STOPS} stops`, 400)
  }
  const byPair = new Map(matrix.map((entry) => [`${entry.originIndex}:${entry.destinationIndex}`, entry]))
  const remaining = new Set(Array.from({ length: stopCount }, (_, index) => index))
  const order: number[] = []
  const unreachableStopIndexes: number[] = []
  let totalDistanceMeters = 0
  let totalDurationSeconds = 0
  let allDurationsKnown = true
  let usedFallbackEdges = false
  let currentOriginIndex = 0

  if (!hasStart) {
    order.push(0)
    remaining.delete(0)
  }

  while (remaining.size > 0) {
    let selected: number | null = null
    let selectedEntry: RouteMatrixElement | null = null
    for (const destinationIndex of remaining) {
      const entry = byPair.get(`${currentOriginIndex}:${destinationIndex}`)
      if (!entry || entry.statusCode !== 0 || entry.distanceMeters == null || entry.condition === 'ROUTE_NOT_FOUND') continue
      const currentMetric = selectedEntry?.durationSeconds ?? selectedEntry?.distanceMeters ?? Number.POSITIVE_INFINITY
      const candidateMetric = entry.durationSeconds ?? entry.distanceMeters
      if (candidateMetric < currentMetric) {
        selected = destinationIndex
        selectedEntry = entry
      }
    }

    if (selected == null || !selectedEntry) {
      selected = Math.min(...remaining)
      unreachableStopIndexes.push(selected)
      usedFallbackEdges = true
    } else {
      totalDistanceMeters += selectedEntry.distanceMeters ?? 0
      if (selectedEntry.durationSeconds == null) allDurationsKnown = false
      else totalDurationSeconds += selectedEntry.durationSeconds
      if (selectedEntry.condition === 'STRAIGHT_LINE_ESTIMATE') usedFallbackEdges = true
    }

    order.push(selected)
    remaining.delete(selected)
    currentOriginIndex = selected + (hasStart ? 1 : 0)
  }

  return {
    order,
    totalDistanceMeters,
    totalDurationSeconds: allDurationsKnown ? Math.round(totalDurationSeconds) : null,
    usedFallbackEdges,
    unreachableStopIndexes,
  }
}
