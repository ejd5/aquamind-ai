import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  bearerToken,
  devicePointWithinWorkWindow,
  hashDeviceToken,
  parseDevicePoint,
  vehicleSessionDeadline,
} from '@/lib/pro/gps-device'

export const runtime = 'nodejs'
const MAX_DEVICE_BODY_BYTES = 32 * 1024
const MIN_DEVICE_INTERVAL_MS = 5_000

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'application/json is required' }, { status: 415 })
  }
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_DEVICE_BODY_BYTES) {
    return NextResponse.json({ error: 'Location payload is too large' }, { status: 413 })
  }

  const token = bearerToken(req.headers.get('authorization'))
  if (!token) return NextResponse.json({ error: 'Bearer device token required' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const now = new Date()

  const device = await db.proTrackingDevice.findUnique({
    where: { tokenHash: hashDeviceToken(token) },
  })
  if (!device || device.status !== 'active') {
    return NextResponse.json({ error: 'Unknown or revoked tracking device' }, { status: 401 })
  }
  const point = parseDevicePoint(body, device.provider, now)
  if (!point) return NextResponse.json({ error: 'Invalid location payload' }, { status: 400 })

  const [organization, member] = await Promise.all([
    db.organization.findUnique({
      where: { id: device.organizationId },
      select: { locationTrackingEnabled: true, locationRetentionDays: true, locationNoticeVersion: true },
    }),
    db.organizationMember.findFirst({
      where: {
        organizationId: device.organizationId,
        userId: device.assignedUserId,
        status: 'active',
      },
      select: {
        dispatchEnabled: true,
        workingDays: true,
        dayStart: true,
        dayEnd: true,
        timeZone: true,
        dailyCapacityMinutes: true,
        locationSharingEnabled: true,
        locationNoticeAcknowledgedAt: true,
      },
    }),
  ])
  if (!organization?.locationTrackingEnabled) {
    return NextResponse.json({ error: 'Organization tracking is disabled' }, { status: 409 })
  }
  if (!member?.locationSharingEnabled || !member.locationNoticeAcknowledgedAt) {
    return NextResponse.json({ error: 'Technician location sharing is not authorized' }, { status: 409 })
  }
  if (!devicePointWithinWorkWindow(member, point.recordedAt)) {
    return NextResponse.json({ error: 'Location rejected outside configured working hours' }, { status: 409 })
  }

  let trackingSession = await db.proTrackingSession.findFirst({
    where: {
      organizationId: device.organizationId,
      userId: device.assignedUserId,
      source: 'vehicle',
      status: 'active',
      autoStopAt: { gt: now },
    },
    orderBy: { startedAt: 'desc' },
  })
  if (!trackingSession) {
    await db.proTrackingSession.updateMany({
      where: {
        organizationId: device.organizationId,
        userId: device.assignedUserId,
        source: 'vehicle',
        status: { in: ['active', 'paused'] },
      },
      data: { status: 'stopped', endedAt: now },
    })
    trackingSession = await db.proTrackingSession.create({
      data: {
        organizationId: device.organizationId,
        userId: device.assignedUserId,
        source: 'vehicle',
        status: 'active',
        noticeVersion: organization.locationNoticeVersion,
        autoStopAt: vehicleSessionDeadline(now),
        retentionUntil: new Date(now.getTime() + Math.max(1, Math.min(60, organization.locationRetentionDays)) * 24 * 60 * 60_000),
        lastHeartbeatAt: now,
      },
    })
  }
  const activeTrackingSession = trackingSession

  if (point.externalEventId) {
    const duplicate = await db.proLocationPoint.findFirst({
      where: { sessionId: activeTrackingSession.id, externalEventId: point.externalEventId },
      select: { id: true },
    })
    if (duplicate) return NextResponse.json({ accepted: 0, duplicate: true, serverTime: now.toISOString() })
  }

  if (device.lastSeenAt && now.getTime() - device.lastSeenAt.getTime() < MIN_DEVICE_INTERVAL_MS) {
    return NextResponse.json(
      { error: 'Device update frequency is too high' },
      { status: 429, headers: { 'Retry-After': '5' } },
    )
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.proLocationPoint.create({
        data: {
          sessionId: activeTrackingSession.id,
          organizationId: device.organizationId,
          userId: device.assignedUserId,
          deviceId: device.id,
          externalEventId: point.externalEventId,
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: point.accuracy,
          altitude: point.altitude,
          speed: point.speed,
          heading: point.heading,
          battery: point.battery,
          source: 'vehicle',
          recordedAt: point.recordedAt,
          receivedAt: now,
        },
      })
      await tx.proTrackingSession.update({
        where: { id: activeTrackingSession.id },
        data: { lastHeartbeatAt: now },
      })
      await tx.proTrackingDevice.update({
        where: { id: device.id },
        data: { lastSeenAt: now },
      })
      const cutoff = new Date(now.getTime() - Math.max(1, Math.min(60, organization.locationRetentionDays)) * 24 * 60 * 60_000)
      await tx.proLocationPoint.deleteMany({
        where: { organizationId: device.organizationId, recordedAt: { lt: cutoff } },
      })
    })
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === 'P2002' && point.externalEventId) {
      return NextResponse.json({ accepted: 0, duplicate: true, serverTime: now.toISOString() })
    }
    throw error
  }

  return NextResponse.json({ accepted: 1, serverTime: now.toISOString() })
}
