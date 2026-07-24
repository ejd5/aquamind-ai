import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import { computeDriveMatrix } from '@/lib/maps/google-route-matrix'
import {
  approximateDriveMinutes,
  haversineDistanceKm,
  locationFreshness,
  scoreDispatchCandidate,
  type GeoPoint,
} from '@/lib/pro/live-dispatch'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getProAccess(session.user.id)
  if (!access.canManage || !access.organizationId) {
    return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as { interventionId?: unknown } | null
  const interventionId = typeof body?.interventionId === 'string' ? body.interventionId : ''
  if (!interventionId) return NextResponse.json({ error: 'interventionId is required' }, { status: 400 })

  const [organization, urgent] = await Promise.all([
    db.organization.findUnique({
      where: { id: access.organizationId },
      select: { locationTrackingEnabled: true },
    }),
    db.proIntervention.findFirst({
      where: { id: interventionId, client: { proUserId: access.ownerUserId } },
      select: {
        id: true,
        scheduledAt: true,
        duration: true,
        priority: true,
        status: true,
        client: { select: { latitude: true, longitude: true, city: true } },
        pool: { select: { latitude: true, longitude: true, name: true } },
      },
    }),
  ])
  if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  if (!organization.locationTrackingEnabled) {
    return NextResponse.json({ error: 'Location tracking is disabled by the organization' }, { status: 409 })
  }
  if (!urgent) return NextResponse.json({ error: 'Intervention not found' }, { status: 404 })

  const targetLatitude = urgent.pool?.latitude ?? urgent.client.latitude
  const targetLongitude = urgent.pool?.longitude ?? urgent.client.longitude
  if (targetLatitude == null || targetLongitude == null) {
    return NextResponse.json({ error: 'The intervention address must be geocoded before dispatch recommendation' }, { status: 409 })
  }
  const target: GeoPoint = { latitude: targetLatitude, longitude: targetLongitude }

  const now = new Date()
  const dayStart = new Date(urgent.scheduledAt)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  await db.proTrackingSession.updateMany({
    where: {
      organizationId: access.organizationId,
      status: { in: ['active', 'paused'] },
      autoStopAt: { lte: now },
    },
    data: { status: 'stopped', endedAt: now },
  })

  const [members, activeSessions, dayInterventions] = await Promise.all([
    db.organizationMember.findMany({
      where: {
        organizationId: access.organizationId,
        status: 'active',
        dispatchEnabled: true,
        locationSharingEnabled: true,
        role: { in: ['owner', 'admin', 'manager', 'technician'] },
      },
      select: {
        id: true,
        userId: true,
        role: true,
        dispatchColor: true,
        vehicle: true,
        user: { select: { name: true, email: true } },
      },
    }),
    db.proTrackingSession.findMany({
      where: {
        organizationId: access.organizationId,
        status: 'active',
        autoStopAt: { gt: now },
      },
      select: { id: true, userId: true, source: true },
    }),
    db.proIntervention.findMany({
      where: {
        client: { proUserId: access.ownerUserId },
        scheduledAt: { gte: dayStart, lt: dayEnd },
        status: { in: ['scheduled', 'in_progress'] },
        id: { not: urgent.id },
      },
      select: { technicianId: true, scheduledAt: true, duration: true },
    }),
  ])

  const activeSessionById = new Map(activeSessions.map((trackingSession) => [trackingSession.id, trackingSession] as const))
  const activeSessionIds = activeSessions.map((trackingSession) => trackingSession.id)
  if (activeSessionIds.length === 0) {
    return NextResponse.json({ candidates: [], source: 'no_active_tracking_sessions', advisoryOnly: true })
  }

  const recentPoints = await db.proLocationPoint.findMany({
    where: {
      organizationId: access.organizationId,
      sessionId: { in: activeSessionIds },
      recordedAt: { gte: new Date(now.getTime() - 15 * 60 * 1000) },
    },
    orderBy: { recordedAt: 'desc' },
    take: 1000,
  })

  const latest = new Map<string, (typeof recentPoints)[number]>()
  for (const point of recentPoints) {
    const trackingSession = activeSessionById.get(point.sessionId)
    if (!trackingSession || trackingSession.userId !== point.userId) continue
    if (!latest.has(point.userId)) latest.set(point.userId, point)
  }

  const eligible = members.flatMap((member) => {
    const point = latest.get(member.userId)
    if (!point) return []
    return [{ member, point }]
  })
  if (eligible.length === 0) {
    return NextResponse.json({ candidates: [], source: 'no_live_locations', advisoryOnly: true })
  }

  const matrix = await computeDriveMatrix(
    eligible.map(({ point }) => ({ latitude: point.latitude, longitude: point.longitude })),
    target,
  )
  const matrixByOrigin = new Map(matrix?.map((item) => [item.originIndex, item]) ?? [])
  const urgentStart = urgent.scheduledAt.getTime()
  const urgentEnd = urgentStart + (urgent.duration || 60) * 60 * 1000

  const candidates = eligible.map(({ member, point }, originIndex) => {
    const assigned = dayInterventions.filter((item) => item.technicianId === member.userId)
    const scheduledMinutes = assigned.reduce((total, item) => total + (item.duration || 60), 0)
    const hasScheduleConflict = assigned.some((item) => {
      const start = item.scheduledAt.getTime()
      const end = start + (item.duration || 60) * 60 * 1000
      return start < urgentEnd && end > urgentStart
    })
    const road = matrixByOrigin.get(originIndex)
    const distanceKm = road
      ? road.distanceMeters / 1000
      : haversineDistanceKm({ latitude: point.latitude, longitude: point.longitude }, target)
    const driveMinutes = road
      ? Math.max(1, Math.round(road.durationSeconds / 60))
      : approximateDriveMinutes(distanceKm)
    const freshness = locationFreshness(point.recordedAt, now)
    return {
      userId: member.userId,
      memberId: member.id,
      name: member.user.name?.trim() || member.user.email,
      role: member.role,
      color: member.dispatchColor || '#0f8b8d',
      vehicle: member.vehicle,
      locationSource: point.source,
      distanceKm: Math.round(distanceKm * 10) / 10,
      driveMinutes,
      distanceSource: road ? 'google_routes' : 'straight_line_estimate',
      locationRecordedAt: point.recordedAt,
      locationFreshness: freshness,
      activeInterventions: assigned.length,
      scheduledMinutes,
      hasScheduleConflict,
      score: scoreDispatchCandidate({
        driveMinutes,
        activeInterventions: assigned.length,
        scheduledMinutes,
        hasScheduleConflict,
        locationFreshness: freshness,
      }),
    }
  }).sort((left, right) => left.score - right.score)

  await db.proLocationAccessLog.create({
    data: {
      organizationId: access.organizationId,
      actorUserId: session.user.id,
      action: 'recommend_emergency_assignment',
      targetId: urgent.id,
      metadata: JSON.stringify({ candidateCount: candidates.length, source: matrix ? 'google_routes' : 'straight_line_estimate' }),
    },
  })

  return NextResponse.json({
    interventionId: urgent.id,
    target,
    candidates,
    advisoryOnly: true,
    source: matrix ? 'google_routes' : 'straight_line_estimate',
  })
}
