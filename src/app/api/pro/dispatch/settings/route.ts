import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'
import {
  LIVE_DISPATCH_NOTICE_VERSION,
  clampRetentionDays,
} from '@/lib/pro/live-dispatch'

export const runtime = 'nodejs'

async function managerContext(userId: string) {
  const access = await getProAccess(userId)
  if (!access.canManage || !access.organizationId) return { access, organization: null }
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
  return { access, organization }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { access, organization } = await managerContext(session.user.id)
  if (!organization || !access.organizationId) {
    return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
  }

  const members = await db.organizationMember.findMany({
    where: { organizationId: access.organizationId, status: 'active' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      userId: true,
      role: true,
      dispatchEnabled: true,
      locationSharingEnabled: true,
      locationSource: true,
      locationNoticeVersion: true,
      locationNoticeAcknowledgedAt: true,
      user: { select: { name: true, email: true } },
    },
  })
  return NextResponse.json({ organization, members })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { access, organization } = await managerContext(session.user.id)
  if (!organization || !access.organizationId) {
    return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  if (typeof body.memberId === 'string') {
    const member = await db.organizationMember.findFirst({
      where: { id: body.memberId, organizationId: access.organizationId, status: 'active' },
    })
    if (!member) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })

    const enabled = body.locationSharingEnabled === true
    const source = body.locationSource === 'vehicle' ? 'vehicle' : 'mobile'
    const updated = await db.organizationMember.update({
      where: { id: member.id },
      data: {
        locationSharingEnabled: enabled,
        locationSource: source,
        ...(!enabled ? {
          locationNoticeAcknowledgedAt: null,
          locationNoticeVersion: null,
        } : {}),
      },
    })
    if (!enabled) {
      await db.proTrackingSession.updateMany({
        where: {
          organizationId: access.organizationId,
          userId: member.userId,
          status: { in: ['active', 'paused'] },
        },
        data: { status: 'stopped', endedAt: new Date() },
      })
    }
    await db.proLocationAccessLog.create({
      data: {
        organizationId: access.organizationId,
        actorUserId: session.user.id,
        action: enabled ? 'enable_member_tracking' : 'disable_member_tracking',
        targetId: member.userId,
        metadata: JSON.stringify({ source }),
      },
    })
    return NextResponse.json({ member: updated })
  }

  const enabled = typeof body.locationTrackingEnabled === 'boolean'
    ? body.locationTrackingEnabled
    : organization.locationTrackingEnabled
  const retentionDays = body.locationRetentionDays === undefined
    ? organization.locationRetentionDays
    : clampRetentionDays(body.locationRetentionDays)
  const updated = await db.organization.update({
    where: { id: access.organizationId },
    data: {
      locationTrackingEnabled: enabled,
      locationRetentionDays: retentionDays,
      locationNoticeVersion: LIVE_DISPATCH_NOTICE_VERSION,
    },
    select: {
      id: true,
      name: true,
      locationTrackingEnabled: true,
      locationRetentionDays: true,
      locationNoticeVersion: true,
    },
  })

  if (!enabled) {
    await db.proTrackingSession.updateMany({
      where: {
        organizationId: access.organizationId,
        status: { in: ['active', 'paused'] },
      },
      data: { status: 'stopped', endedAt: new Date() },
    })
  }

  await db.proLocationAccessLog.create({
    data: {
      organizationId: access.organizationId,
      actorUserId: session.user.id,
      action: enabled ? 'enable_organization_tracking' : 'disable_organization_tracking',
      metadata: JSON.stringify({ retentionDays }),
    },
  })
  return NextResponse.json({ organization: updated })
}
