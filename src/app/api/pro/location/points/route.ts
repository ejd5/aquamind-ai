import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import { isValidCoordinate, retentionCutoff } from '@/lib/pro/live-dispatch'

export const runtime = 'nodejs'

type IncomingPoint = {
  latitude?: unknown
  longitude?: unknown
  accuracy?: unknown
  altitude?: unknown
  speed?: unknown
  heading?: unknown
  battery?: unknown
  recordedAt?: unknown
}

function optionalNumber(value: unknown, minimum: number, maximum: number): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.min(maximum, Math.max(minimum, parsed))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getProAccess(session.user.id)
  if (!access.organizationId) {
    return NextResponse.json({ error: 'A Pro organization is required' }, { status: 409 })
  }

  const body = await req.json().catch(() => null) as { sessionId?: unknown; points?: unknown } | null
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
  const incoming = Array.isArray(body?.points) ? body.points.slice(0, 25) as IncomingPoint[] : []
  if (!sessionId || incoming.length === 0) {
    return NextResponse.json({ error: 'sessionId and points are required' }, { status: 400 })
  }

  const trackingSession = await db.proTrackingSession.findFirst({
    where: {
      id: sessionId,
      organizationId: access.organizationId,
      userId: session.user.id,
      status: 'active',
    },
  })
  if (!trackingSession) return NextResponse.json({ error: 'Active tracking session not found' }, { status: 404 })

  const now = new Date()
  if (trackingSession.autoStopAt <= now) {
    await db.proTrackingSession.update({
      where: { id: trackingSession.id },
      data: { status: 'stopped', endedAt: now },
    })
    return NextResponse.json({ error: 'Tracking session expired and was stopped' }, { status: 410 })
  }

  const futureLimit = now.getTime() + 5 * 60 * 1000
  const historyLimit = now.getTime() - 24 * 60 * 60 * 1000
  const normalized = incoming.flatMap((point) => {
    const latitude = Number(point.latitude)
    const longitude = Number(point.longitude)
    const recordedAt = new Date(typeof point.recordedAt === 'string' ? point.recordedAt : now)
    if (!isValidCoordinate({ latitude, longitude })) return []
    if (Number.isNaN(recordedAt.getTime()) || recordedAt.getTime() > futureLimit || recordedAt.getTime() < historyLimit) return []
    return [{
      sessionId: trackingSession.id,
      organizationId: access.organizationId as string,
      userId: session.user.id,
      latitude,
      longitude,
      accuracy: optionalNumber(point.accuracy, 0, 10000),
      altitude: optionalNumber(point.altitude, -1000, 20000),
      speed: optionalNumber(point.speed, 0, 150),
      heading: optionalNumber(point.heading, 0, 360),
      battery: optionalNumber(point.battery, 0, 1),
      source: trackingSession.source,
      recordedAt,
      receivedAt: now,
    }]
  })

  if (normalized.length === 0) return NextResponse.json({ error: 'No valid location points' }, { status: 400 })

  const organization = await db.organization.findUnique({
    where: { id: access.organizationId },
    select: { locationRetentionDays: true },
  })

  const result = await db.$transaction(async (tx) => {
    const created = await tx.proLocationPoint.createMany({ data: normalized })
    await tx.proTrackingSession.update({
      where: { id: trackingSession.id },
      data: { lastHeartbeatAt: now },
    })
    await tx.proLocationPoint.deleteMany({
      where: {
        organizationId: access.organizationId as string,
        recordedAt: { lt: retentionCutoff(organization?.locationRetentionDays ?? 60, now) },
      },
    })
    return created.count
  })

  return NextResponse.json({ accepted: result, serverTime: now.toISOString() })
}
