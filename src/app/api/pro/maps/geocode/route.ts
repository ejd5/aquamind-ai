import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import { proClientAccessWhere, proPoolAccessWhere } from '@/lib/pro/intervention-scope'
import {
  GOOGLE_COORDINATE_REFRESH_DAYS,
  GOOGLE_GEOCODING_POLICY_VERSION,
  GoogleMapsIntegrationError,
  geocodeAddress,
  googleMapsConfiguration,
  normalizeAddress,
} from '@/lib/pro/google-maps'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

function text(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : ''
}

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

async function accessFor(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const message = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return { response: NextResponse.json({ error: message }, { status: 401 }) } as const
  }
  const access = await getProAccess(session.user.id)
  if (!access.canManage) {
    return { response: NextResponse.json({ error: 'Maps management access required' }, { status: 403 }) } as const
  }
  return { access, actorUserId: session.user.id, locale } as const
}

export async function POST(req: NextRequest) {
  const auth = await accessFor(req)
  if ('response' in auth) return auth.response

  if (!googleMapsConfiguration().configured) {
    return NextResponse.json(
      {
        error: 'Google Maps server integration is not configured',
        code: 'MAPS_NOT_CONFIGURED',
        configured: false,
      },
      { status: 503 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const targetType = body.targetType === 'pool' ? 'pool' : body.targetType === 'client' ? 'client' : null
  const targetId = text(body.targetId, 120)
  if (!targetType || !targetId) {
    return NextResponse.json({ error: 'targetType and targetId are required' }, { status: 400 })
  }

  let proClientId: string
  let storedAddress: string
  if (targetType === 'client') {
    const client = await db.proClient.findFirst({
      where: { id: targetId, ...proClientAccessWhere(auth.access, auth.actorUserId) },
      select: { id: true, address: true, city: true, zipCode: true },
    })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    proClientId = client.id
    storedAddress = [client.address, client.zipCode, client.city, 'France'].filter(Boolean).join(', ')
  } else {
    const pool = await db.proPool.findFirst({
      where: { id: targetId, ...proPoolAccessWhere(auth.access, auth.actorUserId) },
      select: {
        id: true,
        address: true,
        proClientId: true,
        client: { select: { address: true, city: true, zipCode: true } },
      },
    })
    if (!pool) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    proClientId = pool.proClientId
    storedAddress = pool.address || [pool.client.address, pool.client.zipCode, pool.client.city, 'France'].filter(Boolean).join(', ')
  }

  try {
    const address = normalizeAddress(body.address || storedAddress)
    const result = await geocodeAddress(address, {
      regionCode: text(body.regionCode, 2) || 'FR',
      languageCode: text(body.languageCode, 12) || auth.locale,
    })
    const confirmed = body.confirmLocation === true
    const geocodedAt = new Date()

    if (confirmed) {
      await db.$transaction(async (tx) => {
        if (targetType === 'client') {
          await tx.proClient.update({
            where: { id: targetId },
            data: {
              latitude: result.location.latitude,
              longitude: result.location.longitude,
              geocodedAt,
            },
          })
        } else {
          await tx.proPool.update({
            where: { id: targetId },
            data: {
              latitude: result.location.latitude,
              longitude: result.location.longitude,
              geocodedAt,
            },
          })
        }
        await tx.proClientActivity.create({
          data: {
            proClientId,
            actorUserId: auth.actorUserId,
            type: 'geocoding_confirmed',
            title: 'maps.location_confirmed',
            details: JSON.stringify({
              version: GOOGLE_GEOCODING_POLICY_VERSION,
              provider: result.provider,
              targetType,
              targetId,
              placeId: result.placeId,
              addressFingerprint: fingerprint(address),
              confirmedByUser: true,
              geocodedAt: geocodedAt.toISOString(),
              coordinateRefreshRecommendedAt: new Date(
                geocodedAt.getTime() + GOOGLE_COORDINATE_REFRESH_DAYS * 24 * 60 * 60 * 1_000,
              ).toISOString(),
              storedGoogleContent: ['placeId', 'latitude', 'longitude'],
            }),
            occurredAt: geocodedAt,
          },
        })
      })
    }

    return NextResponse.json({
      geocode: {
        ...result,
        confirmed,
        persisted: confirmed,
        targetType,
        targetId,
        geocodedAt: confirmed ? geocodedAt.toISOString() : null,
        formattedAddressTransient: true,
      },
      attribution: 'Google Maps',
    })
  } catch (error) {
    if (error instanceof GoogleMapsIntegrationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode })
    }
    console.error('[pro/maps/geocode] error:', error)
    return NextResponse.json({ error: 'Unable to geocode address' }, { status: 500 })
  }
}
