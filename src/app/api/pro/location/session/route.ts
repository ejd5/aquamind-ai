import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import {
  LIVE_DISPATCH_NOTICE_VERSION,
  LIVE_SESSION_MAX_MS,
  clampRetentionDays,
} from '@/lib/pro/live-dispatch'

export const runtime = 'nodejs'

type SessionAction = 'start' | 'pause' | 'resume' | 'stop'

async function contextFor(userId: string) {
  const access = await getProAccess(userId)
  if (!access.organizationId) return { access, organization: null, member: null }
  const [organization, member] = await Promise.all([
    db.organization.findUnique({
      where: { id: access.organizationId },
      select: {
        id: true,
        locationTrackingEnabled: true,
        locationRetentionDays: true,
        locationNoticeVersion: true,
      },
    }),
    db.organizationMember.findFirst({
      where: { organizationId: access.organizationId, userId, status: 'active' },
      select: {
        id: true,
        role: true,
        locationSharingEnabled: true,
        locationNoticeVersion: true,
        locationNoticeAcknowledgedAt: true,
      },
    }),
  ])
  return { access, organization, member }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { access, organization, member } = await contextFor(session.user.id)
  const activeSession = access.organizationId
    ? await db.proTrackingSession.findFirst({
        where: {
          organizationId: access.organizationId,
          userId: session.user.id,
          status: { in: ['active', 'paused'] },
        },
        orderBy: { startedAt: 'desc' },
      })
    : null

  return NextResponse.json({
    trackingAvailable: Boolean(organization?.locationTrackingEnabled),
    organizationId: access.organizationId,
    role: access.role,
    memberEnabled: access.role === 'owner' ? true : Boolean(member?.locationSharingEnabled),
    noticeVersion: organization?.locationNoticeVersion || LIVE_DISPATCH_NOTICE_VERSION,
    noticeAcknowledged: access.role === 'owner'
      || Boolean(member?.locationNoticeAcknowledgedAt && member.locationNoticeVersion === (organization?.locationNoticeVersion || LIVE_DISPATCH_NOTICE_VERSION)),
    activeSession,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const action = body?.action as SessionAction | undefined
  if (!action || !['start', 'pause', 'resume', 'stop'].includes(action)) {
    return NextResponse.json({ error: 'Invalid session action' }, { status: 400 })
  }

  const { access, organization, member } = await contextFor(session.user.id)
  if (!access.organizationId || !organization) {
    return NextResponse.json({ error: 'A Pro organization is required for team tracking' }, { status: 409 })
  }

  const existing = await db.proTrackingSession.findFirst({
    where: {
      organizationId: access.organizationId,
      userId: session.user.id,
      status: { in: ['active', 'paused'] },
    },
    orderBy: { startedAt: 'desc' },
  })

  if (action === 'stop') {
    if (!existing) return NextResponse.json({ session: null })
    const stopped = await db.proTrackingSession.update({
      where: { id: existing.id },
      data: { status: 'stopped', endedAt: new Date() },
    })
    return NextResponse.json({ session: stopped })
  }

  if (action === 'pause' || action === 'resume') {
    if (!existing) return NextResponse.json({ error: 'No active tracking session' }, { status: 404 })
    const updated = await db.proTrackingSession.update({
      where: { id: existing.id },
      data: action === 'pause'
        ? { status: 'paused', pausedAt: new Date() }
        : { status: 'active', pausedAt: null, lastHeartbeatAt: new Date() },
    })
    return NextResponse.json({ session: updated })
  }

  if (!organization.locationTrackingEnabled) {
    return NextResponse.json({ error: 'Location tracking is disabled by the organization' }, { status: 409 })
  }
  if (access.role !== 'owner' && !member?.locationSharingEnabled) {
    return NextResponse.json({ error: 'Location sharing is not enabled for this team member' }, { status: 403 })
  }

  const noticeVersion = organization.locationNoticeVersion || LIVE_DISPATCH_NOTICE_VERSION
  const acknowledged = body?.acknowledgeNotice === true
    || access.role === 'owner'
    || Boolean(member?.locationNoticeAcknowledgedAt && member.locationNoticeVersion === noticeVersion)
  if (!acknowledged) {
    return NextResponse.json({ error: 'The location tracking notice must be acknowledged' }, { status: 428 })
  }

  if (member && body?.acknowledgeNotice === true) {
    await db.organizationMember.update({
      where: { id: member.id },
      data: {
        locationNoticeVersion: noticeVersion,
        locationNoticeAcknowledgedAt: new Date(),
      },
    })
  }

  if (existing?.status === 'active') return NextResponse.json({ session: existing })
  if (existing?.status === 'paused') {
    const resumed = await db.proTrackingSession.update({
      where: { id: existing.id },
      data: { status: 'active', pausedAt: null, lastHeartbeatAt: new Date() },
    })
    return NextResponse.json({ session: resumed })
  }

  const now = new Date()
  const retentionDays = clampRetentionDays(organization.locationRetentionDays)
  const created = await db.proTrackingSession.create({
    data: {
      organizationId: access.organizationId,
      userId: session.user.id,
      // The user-facing endpoint only creates smartphone sessions. Vehicle GPS
      // sources will be accepted later through a dedicated signed connector.
      source: 'mobile',
      status: 'active',
      purpose: 'dispatch_and_emergency_reassignment',
      noticeVersion,
      startedAt: now,
      lastHeartbeatAt: now,
      autoStopAt: new Date(now.getTime() + LIVE_SESSION_MAX_MS),
      retentionUntil: new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000),
    },
  })
  return NextResponse.json({ session: created }, { status: 201 })
}
