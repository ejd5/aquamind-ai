/**
 * AQWELIA Home™ — IoT sensors API.
 *
 * URL: /api/pool/iot
 *
 * GET                  → list the user's configured sensors (apiKey stripped).
 * POST   { provider, label, deviceId?, apiUrl?, apiKey?, poolId? }
 *                      → register a new sensor (validates config via connectSensor).
 * PATCH  ?id=xxx       → update a sensor's label/config.
 * DELETE ?id=xxx       → delete a sensor.
 *
 * URL: /api/pool/iot?sync=xxx
 * POST ?id=xxx&sync=1  → trigger a sync: fetch latest reading via fetchSensorData
 *                        and (TODO v2) write a WaterTest row. For v1 we just
 *                        update lastSyncAt + status.
 *
 * Auth: NextAuth session required. Every record is scoped to `userId`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { pickLocale, translate } from '@/lib/i18n-api'
import {
  connectSensor,
  disconnectSensor,
  fetchSensorData,
  getProvider,
  PROVIDERS,
  type IotProvider,
  type IotSensorConfig,
} from '@/lib/pool/iot-integration'

export const runtime = 'nodejs'

function sanitize<T extends Record<string, any>>(s: T): Omit<T, 'apiKey'> {
  const { apiKey: _apiKey, ...rest } = s
  return rest as Omit<T, 'apiKey'>
}

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const sensors = await db.iotSensor.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  // Strip apiKey before returning to the client.
  const safe = sensors.map((s) => ({
    id: s.id,
    userId: s.userId,
    poolId: s.poolId,
    provider: s.provider,
    label: s.label,
    deviceId: s.deviceId,
    apiUrl: s.apiUrl,
    config: s.config ? JSON.parse(s.config) : null,
    status: s.status,
    lastSyncAt: s.lastSyncAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    hasApiKey: !!s.apiKey,
  }))

  return NextResponse.json({ sensors: safe, providers: PROVIDERS })
}

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const url = new URL(req.url)
  const isSync = url.searchParams.get('sync') === '1'

  if (isSync) {
    // Sync mode: ?id=xxx&sync=1 → fetch latest reading + update lastSyncAt.
    const id = typeof body?.id === 'string' ? body.id : url.searchParams.get('id')
    if (!id) {
      const msg = await translate(locale, 'common.errors.idRequired', 'id requis')
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const sensor = await db.iotSensor.findFirst({ where: { id, userId } })
    if (!sensor) {
      const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    try {
      const config: IotSensorConfig = {
        provider: sensor.provider as IotProvider,
        label: sensor.label,
        deviceId: sensor.deviceId,
        apiUrl: sensor.apiUrl,
        apiKey: sensor.apiKey,
        options: sensor.config ? JSON.parse(sensor.config) : null,
      }
      const reading = await fetchSensorData(sensor.provider as IotProvider, config)
      await db.iotSensor.update({
        where: { id },
        data: { status: 'connected', lastSyncAt: new Date() },
      })
      // TODO v2: persist the reading as a WaterTest row (source: 'device').
      return NextResponse.json({ reading, syncedAt: new Date() })
    } catch (e) {
      await db.iotSensor.update({
        where: { id },
        data: { status: 'error' },
      }).catch(() => null)
      const msg = e instanceof Error ? e.message : 'Sync failed'
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  }

  // Register mode: create a new sensor.
  const config: IotSensorConfig = {
    provider: body?.provider,
    label: typeof body?.label === 'string' ? body.label.trim() : '',
    deviceId: body?.deviceId || null,
    apiUrl: body?.apiUrl || null,
    apiKey: body?.apiKey || null,
    options: body?.options || null,
  }

  // Validate config + (eventually) test the connection.
  try {
    await connectSensor(config)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid sensor config'
    return NextResponse.json({ error: msg, code: 'CONFIG_INVALID' }, { status: 400 })
  }

  const provider = getProvider(config.provider)
  if (!provider) {
    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
  }

  const sensor = await db.iotSensor.create({
    data: {
      userId,
      poolId: typeof body?.poolId === 'string' ? body.poolId : null,
      provider: config.provider,
      label: config.label,
      deviceId: config.deviceId,
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      config: config.options ? JSON.stringify(config.options) : null,
      status: 'connected',
      lastSyncAt: new Date(),
    },
  })

  return NextResponse.json({ sensor: sanitize(sensor) }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) {
    const msg = await translate(locale, 'common.errors.idRequired', 'id requis')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const existing = await db.iotSensor.findFirst({ where: { id, userId } })
  if (!existing) {
    const msg = await translate(locale, 'common.errors.notFound', 'Non trouvé')
    return NextResponse.json({ error: msg }, { status: 404 })
  }

  try {
    await disconnectSensor(existing.provider as IotProvider)
  } catch {
    // Best-effort: still delete the local record.
  }

  await db.iotSensor.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
