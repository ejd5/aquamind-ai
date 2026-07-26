import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  GoogleMapsIntegrationError,
  MAX_ROUTE_STOPS,
  buildHaversineMatrix,
  googleCoordinatesNeedRefresh,
  googleMapsConfiguration,
  normalizeAddress,
  normalizeLatLng,
  optimizeRouteOrder,
  parseRouteMatrixResponse,
} from '@/lib/pro/google-maps'

const root = process.cwd()
const originalKey = process.env.GOOGLE_MAPS_SERVER_API_KEY

afterEach(() => {
  if (originalKey === undefined) delete process.env.GOOGLE_MAPS_SERVER_API_KEY
  else process.env.GOOGLE_MAPS_SERVER_API_KEY = originalKey
})

describe('P1 Pro geolocation and Google Maps', () => {
  it('keeps server configuration secret and supports disabled mode', () => {
    delete process.env.GOOGLE_MAPS_SERVER_API_KEY
    expect(googleMapsConfiguration()).toMatchObject({
      configured: false,
      serverOnly: true,
      maxRouteStops: MAX_ROUTE_STOPS,
    })
    process.env.GOOGLE_MAPS_SERVER_API_KEY = 'server-secret-test-key'
    expect(googleMapsConfiguration().configured).toBe(true)
    expect(JSON.stringify(googleMapsConfiguration())).not.toContain('server-secret-test-key')
  })

  it('normalizes addresses and validates coordinates', () => {
    expect(normalizeAddress('  10   rue de la Paix, 75002 Paris  '))
      .toBe('10 rue de la Paix, 75002 Paris')
    expect(normalizeLatLng({ latitude: 43.2965, longitude: 5.3698 }))
      .toEqual({ latitude: 43.2965, longitude: 5.3698 })
    expect(() => normalizeAddress('A')).toThrowError(GoogleMapsIntegrationError)
    expect(() => normalizeLatLng({ latitude: 91, longitude: 5 })).toThrowError(/Invalid/)
  })

  it('flags Google-derived coordinates after the operational refresh window', () => {
    const now = new Date('2026-07-26T12:00:00.000Z')
    expect(googleCoordinatesNeedRefresh(null, now)).toBe(false)
    expect(googleCoordinatesNeedRefresh('2026-07-01T12:00:00.000Z', now)).toBe(false)
    expect(googleCoordinatesNeedRefresh('2026-06-20T12:00:00.000Z', now)).toBe(true)
  })

  it('parses Google route matrix arrays and streamed lines', () => {
    const array = parseRouteMatrixResponse(JSON.stringify([
      {
        originIndex: 0,
        destinationIndex: 1,
        status: { code: 0 },
        condition: 'ROUTE_EXISTS',
        distanceMeters: 1250,
        duration: '300s',
      },
    ]))
    expect(array[0]).toMatchObject({ distanceMeters: 1250, durationSeconds: 300 })

    const streamed = parseRouteMatrixResponse([
      '{"originIndex":0,"destinationIndex":0,"status":{"code":0},"condition":"ROUTE_EXISTS","distanceMeters":0,"duration":"0s"}',
      '{"originIndex":0,"destinationIndex":1,"status":{"code":0},"condition":"ROUTE_EXISTS","distanceMeters":800,"duration":"120.5s"}',
    ].join('\n'))
    expect(streamed).toHaveLength(2)
    expect(streamed[1].durationSeconds).toBe(120.5)
  })

  it('optimizes a tour from a start point using the matrix metric', () => {
    const origins = [
      { latitude: 43.30, longitude: 5.37 },
      { latitude: 43.31, longitude: 5.38 },
      { latitude: 43.40, longitude: 5.45 },
      { latitude: 43.32, longitude: 5.39 },
    ]
    const destinations = origins.slice(1)
    const matrix = buildHaversineMatrix(origins, destinations, 'TEST_FALLBACK')
    const result = optimizeRouteOrder(matrix.elements, 3, true)
    expect(result.order).toEqual([0, 2, 1])
    expect(result.totalDistanceMeters).toBeGreaterThan(0)
    expect(result.totalDurationSeconds).toBeNull()
    expect(result.usedFallbackEdges).toBe(true)
  })

  it('keeps the first stop when no start point is supplied', () => {
    const points = [
      { latitude: 43.30, longitude: 5.37 },
      { latitude: 43.31, longitude: 5.38 },
      { latitude: 43.50, longitude: 5.60 },
    ]
    const matrix = buildHaversineMatrix(points, points, 'NO_KEY')
    const result = optimizeRouteOrder(matrix.elements, points.length, false)
    expect(result.order[0]).toBe(0)
    expect(new Set(result.order)).toEqual(new Set([0, 1, 2]))
  })

  it('ships server-only status, confirmed geocoding and non-persistent route matrices', () => {
    const helper = readFileSync(join(root, 'src/lib/pro/google-maps.ts'), 'utf8')
    const status = readFileSync(join(root, 'src/app/api/pro/maps/status/route.ts'), 'utf8')
    const geocode = readFileSync(join(root, 'src/app/api/pro/maps/geocode/route.ts'), 'utf8')
    const routePlan = readFileSync(join(root, 'src/app/api/pro/maps/route-plan/route.ts'), 'utf8')

    expect(helper).toContain("typeof window !== 'undefined'")
    expect(helper).toContain('cannot run in the browser')
    expect(helper).toContain("'X-Goog-Api-Key': key")
    expect(helper).toContain("'X-Goog-FieldMask': fieldMask")
    expect(helper).toContain('https://geocode.googleapis.com/v4/geocode/address/')
    expect(helper).toContain('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix')
    expect(status).toContain('serverKeyExposed: false')
    expect(status).not.toContain('GOOGLE_MAPS_SERVER_API_KEY:')
    expect(geocode).toContain('confirmLocation === true')
    expect(geocode).toContain("type: 'geocoding_confirmed'")
    expect(geocode).toContain('placeId: result.placeId')
    expect(geocode).not.toContain('formattedAddress: result.formattedAddress')
    expect(routePlan).toContain('computeRouteMatrixWithFallback')
    expect(routePlan).toContain('googleMatrixPersisted: false')
    expect(routePlan).toContain('matrixPersisted: false')
    expect(routePlan).toContain('data: { routeOrder: item.routeOrder }')
  })

  it('uses Pro server-side access scopes for every mutable maps operation', () => {
    const geocode = readFileSync(join(root, 'src/app/api/pro/maps/geocode/route.ts'), 'utf8')
    const routePlan = readFileSync(join(root, 'src/app/api/pro/maps/route-plan/route.ts'), 'utf8')
    expect(geocode).toContain('getProAccess')
    expect(geocode).toContain('access.canManage')
    expect(geocode).toContain('proClientAccessWhere')
    expect(geocode).toContain('proPoolAccessWhere')
    expect(routePlan).toContain('proInterventionAccessWhere')
    expect(routePlan).toContain('applyOrder && !auth.access.canManage')
    expect(routePlan).toContain('interventionIds.length > MAX_ROUTE_STOPS')
  })
})
