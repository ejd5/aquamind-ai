import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import { proInterventionAccessWhere } from '@/lib/pro/intervention-scope'
import {
  GoogleMapsIntegrationError,
  MAX_ROUTE_STOPS,
  computeRouteMatrixWithFallback,
  googleCoordinatesNeedRefresh,
  normalizeLatLng,
  optimizeRouteOrder,
  type LatLng,
} from '@/lib/pro/google-maps'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

function uniqueIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, 120))
    .filter(Boolean))]
}

function storedLocation(input: {
  latitude: number | null
  longitude: number | null
  geocodedAt: Date | null
}): { location: LatLng | null; staleGoogleCache: boolean } {
  if (input.latitude == null || input.longitude == null) {
    return { location: null, staleGoogleCache: false }
  }
  try {
    return {
      location: normalizeLatLng({ latitude: input.latitude, longitude: input.longitude }),
      staleGoogleCache: googleCoordinatesNeedRefresh(input.geocodedAt),
    }
  } catch {
    return { location: null, staleGoogleCache: false }
  }
}

async function accessFor(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const message = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return { response: NextResponse.json({ error: message }, { status: 401 }) } as const
  }
  const access = await getProAccess(session.user.id)
  if (!access.canWrite) {
    return { response: NextResponse.json({ error: 'Route planning access required' }, { status: 403 }) } as const
  }
  return { access, actorUserId: session.user.id } as const
}

export async function POST(req: NextRequest) {
  const auth = await accessFor(req)
  if ('response' in auth) return auth.response

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const interventionIds = uniqueIds(body.interventionIds)
  if (interventionIds.length < 1 || interventionIds.length > MAX_ROUTE_STOPS) {
    return NextResponse.json(
      { error: `interventionIds must contain 1 to ${MAX_ROUTE_STOPS} unique items` },
      { status: 400 },
    )
  }
  const applyOrder = body.applyOrder === true
  if (applyOrder && !auth.access.canManage) {
    return NextResponse.json({ error: 'Only managers can apply a route order' }, { status: 403 })
  }

  const interventions = await db.proIntervention.findMany({
    where: {
      AND: [
        proInterventionAccessWhere(auth.access, auth.actorUserId),
        { id: { in: interventionIds }, status: { in: ['scheduled', 'in_progress'] } },
      ],
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          latitude: true,
          longitude: true,
          geocodedAt: true,
        },
      },
      pool: {
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          geocodedAt: true,
        },
      },
    },
  })

  if (interventions.length !== interventionIds.length) {
    const found = new Set(interventions.map((item) => item.id))
    return NextResponse.json({
      error: 'Some interventions are missing, inaccessible or not active',
      missingInterventionIds: interventionIds.filter((id) => !found.has(id)),
    }, { status: 404 })
  }

  const byId = new Map(interventions.map((item) => [item.id, item]))
  const orderedInterventions = interventionIds.map((id) => byId.get(id)!)
  const missingCoordinates: string[] = []
  const staleCoordinates: string[] = []
  const stops = orderedInterventions.map((intervention) => {
    const poolLocation = intervention.pool ? storedLocation(intervention.pool) : null
    const clientLocation = storedLocation(intervention.client)
    const selected = poolLocation?.location ? poolLocation : clientLocation
    if (!selected.location) missingCoordinates.push(intervention.id)
    if (selected.staleGoogleCache) staleCoordinates.push(intervention.id)
    return selected.location
  })

  if (missingCoordinates.length > 0) {
    return NextResponse.json({
      error: 'Some interventions have no confirmed coordinates',
      code: 'MISSING_COORDINATES',
      missingInterventionIds: missingCoordinates,
    }, { status: 422 })
  }
  if (staleCoordinates.length > 0 && body.allowStaleCoordinates !== true) {
    return NextResponse.json({
      error: 'Some Google-derived coordinates require refresh',
      code: 'STALE_GOOGLE_COORDINATES',
      staleInterventionIds: staleCoordinates,
    }, { status: 409 })
  }

  let start: LatLng | null = null
  if (body.startCoordinates !== undefined && body.startCoordinates !== null) {
    try {
      start = normalizeLatLng(body.startCoordinates)
    } catch (error) {
      if (error instanceof GoogleMapsIntegrationError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
      }
      throw error
    }
  }

  try {
    const destinations = stops as LatLng[]
    const origins = start ? [start, ...destinations] : destinations
    const matrix = await computeRouteMatrixWithFallback(origins, destinations)
    const optimization = optimizeRouteOrder(matrix.elements, destinations.length, Boolean(start))
    const optimizedInterventions = optimization.order.map((stopIndex, routeIndex) => ({
      routeOrder: routeIndex + 1,
      interventionId: orderedInterventions[stopIndex].id,
      scheduledAt: orderedInterventions[stopIndex].scheduledAt,
      technicianId: orderedInterventions[stopIndex].technicianId,
      client: {
        id: orderedInterventions[stopIndex].client.id,
        name: orderedInterventions[stopIndex].client.companyName ||
          `${orderedInterventions[stopIndex].client.firstName} ${orderedInterventions[stopIndex].client.lastName}`,
      },
      pool: orderedInterventions[stopIndex].pool
        ? { id: orderedInterventions[stopIndex].pool!.id, name: orderedInterventions[stopIndex].pool!.name }
        : null,
    }))

    if (applyOrder) {
      await db.$transaction(async (tx) => {
        for (const item of optimizedInterventions) {
          await tx.proIntervention.update({
            where: { id: item.interventionId },
            data: { routeOrder: item.routeOrder },
          })
        }
        await tx.proClientActivity.create({
          data: {
            proClientId: optimizedInterventions[0].client.id,
            actorUserId: auth.actorUserId,
            type: 'route_order_applied',
            title: 'maps.route_order_applied',
            details: JSON.stringify({
              version: 'pro-route-plan-v1',
              provider: matrix.provider,
              interventionIds: optimizedInterventions.map((item) => item.interventionId),
              routeOrders: optimizedInterventions.map((item) => item.routeOrder),
              usedFallback: matrix.estimated || optimization.usedFallbackEdges,
              googleMatrixPersisted: false,
              appliedAt: new Date().toISOString(),
            }),
            occurredAt: new Date(),
          },
        })
      })
    }

    return NextResponse.json({
      routePlan: {
        provider: matrix.provider,
        estimated: matrix.estimated,
        fallbackReason: matrix.fallbackReason,
        attributionRequired: matrix.attributionRequired,
        attribution: matrix.attributionRequired ? 'Google Maps' : null,
        interventions: optimizedInterventions,
        totalDistanceMeters: optimization.totalDistanceMeters,
        totalDurationSeconds: optimization.totalDurationSeconds,
        unreachableInterventionIds: optimization.unreachableStopIndexes.map(
          (index) => orderedInterventions[index]?.id,
        ).filter(Boolean),
        applied: applyOrder,
        matrixPersisted: false,
      },
    })
  } catch (error) {
    if (error instanceof GoogleMapsIntegrationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
    }
    console.error('[pro/maps/route-plan] error:', error)
    return NextResponse.json({ error: 'Unable to compute route plan' }, { status: 500 })
  }
}
