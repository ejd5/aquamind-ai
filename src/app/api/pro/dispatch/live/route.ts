import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import { locationFreshness, retentionCutoff, routeSequence } from '@/lib/pro/live-dispatch'

export const runtime = 'nodejs'

function dateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date
}

function displayName(member: { user: { name: string | null; email: string } }): string {
  return member.user.name?.trim() || member.user.email
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getProAccess(session.user.id)
  if (!access.canManage || !access.organizationId) {
    return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
  }

  const now = new Date()
  const defaultFrom = new Date(now)
  defaultFrom.setHours(0, 0, 0, 0)
  const defaultTo = new Date(defaultFrom)
  defaultTo.setDate(defaultTo.getDate() + 1)
  const url = new URL(req.url)
  const from = dateParam(url.searchParams.get('from'), defaultFrom)
  const to = dateParam(url.searchParams.get('to'), defaultTo)
  if (to <= from || to.getTime() - from.getTime() > 8 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Invalid dispatch range' }, { status: 400 })
  }

  const organization = await db.organization.findUnique({
    where: { id: access.organizationId },
    select: {
      id: true,
      name: true,
      locationTrackingEnabled: true,
      locationRetentionDays: true,
      locationNoticeVersion: true,
    },
  })
  if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  await Promise.all([
    db.proTrackingSession.updateMany({
      where: {
        organizationId: access.organizationId,
        status: { in: ['active', 'paused'] },
        autoStopAt: { lte: now },
      },
      data: { status: 'stopped', endedAt: now },
    }),
    db.proLocationPoint.deleteMany({
      where: {
        organizationId: access.organizationId,
        recordedAt: { lt: retentionCutoff(organization.locationRetentionDays, now) },
      },
    }),
  ])

  const [members, activeSessions, interventions] = await Promise.all([
    db.organizationMember.findMany({
      where: {
        organizationId: access.organizationId,
        status: 'active',
        dispatchEnabled: true,
        role: { in: ['owner', 'admin', 'manager', 'technician'] },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        userId: true,
        role: true,
        dispatchColor: true,
        phone: true,
        vehicle: true,
        dayStart: true,
        dayEnd: true,
        locationSharingEnabled: true,
        locationSource: true,
        locationNoticeAcknowledgedAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    organization.locationTrackingEnabled
      ? db.proTrackingSession.findMany({
          where: {
            organizationId: access.organizationId,
            status: 'active',
            autoStopAt: { gt: now },
          },
          orderBy: { startedAt: 'desc' },
          select: { id: true, userId: true, startedAt: true, lastHeartbeatAt: true, autoStopAt: true },
        })
      : Promise.resolve([]),
    db.proIntervention.findMany({
      where: {
        client: { proUserId: access.ownerUserId },
        scheduledAt: { gte: from, lt: to },
        status: { not: 'cancelled' },
      },
      orderBy: [{ routeOrder: 'asc' }, { scheduledAt: 'asc' }],
      select: {
        id: true,
        technicianId: true,
        routeOrder: true,
        type: true,
        status: true,
        priority: true,
        scheduledAt: true,
        duration: true,
        summary: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            phone: true,
            address: true,
            city: true,
            zipCode: true,
            latitude: true,
            longitude: true,
          },
        },
        pool: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    }),
  ])

  const activeSessionByUser = new Map<string, (typeof activeSessions)[number]>()
  for (const trackingSession of activeSessions) {
    if (!activeSessionByUser.has(trackingSession.userId)) {
      activeSessionByUser.set(trackingSession.userId, trackingSession)
    }
  }

  const activeSessionIds = [...activeSessionByUser.values()].map((trackingSession) => trackingSession.id)
  const points = activeSessionIds.length > 0
    ? await db.proLocationPoint.findMany({
        where: {
          organizationId: access.organizationId,
          sessionId: { in: activeSessionIds },
          recordedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { recordedAt: 'desc' },
        take: 3000,
      })
    : []

  const latestPointByUser = new Map<string, (typeof points)[number]>()
  for (const point of points) {
    const activeSession = activeSessionByUser.get(point.userId)
    if (!activeSession || activeSession.id !== point.sessionId) continue
    if (!latestPointByUser.has(point.userId)) latestPointByUser.set(point.userId, point)
  }

  const routesByUser = new Map<string, typeof interventions>()
  const unassigned = [] as typeof interventions
  for (const intervention of interventions) {
    if (!intervention.technicianId) {
      unassigned.push(intervention)
      continue
    }
    const current = routesByUser.get(intervention.technicianId) ?? []
    current.push(intervention)
    routesByUser.set(intervention.technicianId, current)
  }

  const technicians = members.map((member) => {
    const activeSession = activeSessionByUser.get(member.userId)
    const point = organization.locationTrackingEnabled && member.locationSharingEnabled && activeSession
      ? latestPointByUser.get(member.userId)
      : undefined
    const route = routeSequence(routesByUser.get(member.userId) ?? []).map((intervention, index) => {
      const latitude = intervention.pool?.latitude ?? intervention.client.latitude
      const longitude = intervention.pool?.longitude ?? intervention.client.longitude
      return {
        ...intervention,
        sequence: index + 1,
        location: latitude != null && longitude != null ? { latitude, longitude } : null,
      }
    })
    return {
      memberId: member.id,
      userId: member.userId,
      name: displayName(member),
      email: member.user.email,
      role: member.role,
      color: member.dispatchColor || '#0f8b8d',
      phone: member.phone,
      vehicle: member.vehicle,
      dayStart: member.dayStart,
      dayEnd: member.dayEnd,
      sharingEnabled: member.locationSharingEnabled,
      source: member.locationSource,
      noticeAcknowledged: Boolean(member.locationNoticeAcknowledgedAt),
      trackingActive: Boolean(activeSession),
      trackingStartedAt: activeSession?.startedAt ?? null,
      trackingAutoStopAt: activeSession?.autoStopAt ?? null,
      location: point ? {
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: point.accuracy,
        speed: point.speed,
        heading: point.heading,
        recordedAt: point.recordedAt,
        freshness: locationFreshness(point.recordedAt, now),
      } : null,
      route,
      activeCount: route.filter((item) => ['scheduled', 'in_progress'].includes(item.status)).length,
      urgentCount: route.filter((item) => item.priority === 'urgent' && item.status !== 'completed').length,
    }
  })

  const auditWindow = new Date(now.getTime() - 15 * 60 * 1000)
  const previousAudit = await db.proLocationAccessLog.findFirst({
    where: {
      organizationId: access.organizationId,
      actorUserId: session.user.id,
      action: 'view_live_dispatch',
      createdAt: { gte: auditWindow },
    },
    select: { id: true },
  })
  if (!previousAudit) {
    await db.proLocationAccessLog.create({
      data: {
        organizationId: access.organizationId,
        actorUserId: session.user.id,
        action: 'view_live_dispatch',
        metadata: JSON.stringify({ from: from.toISOString(), to: to.toISOString() }),
      },
    })
  }

  return NextResponse.json({
    organization,
    serverTime: now.toISOString(),
    range: { from: from.toISOString(), to: to.toISOString() },
    technicians,
    unassigned: routeSequence(unassigned).map((intervention, index) => {
      const latitude = intervention.pool?.latitude ?? intervention.client.latitude
      const longitude = intervention.pool?.longitude ?? intervention.client.longitude
      return {
        ...intervention,
        sequence: index + 1,
        location: latitude != null && longitude != null ? { latitude, longitude } : null,
      }
    }),
  })
}
