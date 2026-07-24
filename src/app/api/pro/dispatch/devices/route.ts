import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess, type ProAccess } from '@/lib/pro/access'
import { createDeviceToken, GPS_DEVICE_PROVIDERS } from '@/lib/pro/gps-device'

export const runtime = 'nodejs'
type ManagerAccess = ProAccess & { organizationId: string }

function clean(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximum) : ''
}

async function requireManager(userId: string): Promise<ManagerAccess | null> {
  const access = await getProAccess(userId)
  if (!access.canManage || !access.organizationId) return null
  return { ...access, organizationId: access.organizationId }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await requireManager(session.user.id)
  if (!access) return NextResponse.json({ error: 'Manager access required' }, { status: 403 })

  const [devices, members] = await Promise.all([
    db.proTrackingDevice.findMany({
      where: { organizationId: access.organizationId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        assignedUserId: true,
        provider: true,
        externalDeviceId: true,
        label: true,
        vehicle: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
      },
    }),
    db.organizationMember.findMany({
      where: { organizationId: access.organizationId, status: 'active' },
      select: {
        id: true,
        userId: true,
        role: true,
        dispatchEnabled: true,
        locationSharingEnabled: true,
        locationNoticeAcknowledgedAt: true,
        vehicle: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ])
  const memberByUser = new Map(members.map((member) => [member.userId, member] as const))
  return NextResponse.json({
    devices: devices.map((device) => ({ ...device, member: memberByUser.get(device.assignedUserId) ?? null })),
    members,
    ingestPath: '/api/pro/location/device',
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await requireManager(session.user.id)
  if (!access) return NextResponse.json({ error: 'Manager access required' }, { status: 403 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  const assignedUserId = clean(body.assignedUserId, 120)
  const provider = clean(body.provider, 30).toLowerCase()
  const externalDeviceId = clean(body.externalDeviceId, 120)
  const label = clean(body.label, 120)
  const vehicle = clean(body.vehicle, 160) || null
  if (!assignedUserId || !externalDeviceId || !label || !(GPS_DEVICE_PROVIDERS as readonly string[]).includes(provider)) {
    return NextResponse.json({ error: 'assignedUserId, provider, externalDeviceId and label are required' }, { status: 400 })
  }

  const member = await db.organizationMember.findFirst({
    where: { organizationId: access.organizationId, userId: assignedUserId, status: 'active' },
    select: {
      id: true,
      dispatchEnabled: true,
      locationSharingEnabled: true,
      locationNoticeAcknowledgedAt: true,
    },
  })
  if (!member || !member.dispatchEnabled) {
    return NextResponse.json({ error: 'Active dispatch member not found' }, { status: 404 })
  }
  if (!member.locationSharingEnabled || !member.locationNoticeAcknowledgedAt) {
    return NextResponse.json({ error: 'The technician must be authorized and acknowledge the location notice first' }, { status: 409 })
  }

  const { token, tokenHash } = createDeviceToken()
  try {
    const device = await db.$transaction(async (tx) => {
      const created = await tx.proTrackingDevice.create({
        data: {
          organizationId: access.organizationId,
          assignedUserId,
          provider,
          externalDeviceId,
          label,
          vehicle,
          tokenHash,
        },
        select: {
          id: true,
          assignedUserId: true,
          provider: true,
          externalDeviceId: true,
          label: true,
          vehicle: true,
          status: true,
          lastSeenAt: true,
          createdAt: true,
        },
      })
      await tx.organizationMember.update({
        where: { id: member.id },
        data: { locationSource: 'vehicle' },
      })
      await tx.proLocationAccessLog.create({
        data: {
          organizationId: access.organizationId,
          actorUserId: session.user.id,
          action: 'register_tracking_device',
          targetId: created.id,
          metadata: JSON.stringify({ provider, externalDeviceId, assignedUserId }),
        },
      })
      return created
    })
    return NextResponse.json({ device, token, tokenShownOnce: true }, { status: 201 })
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === 'P2002') return NextResponse.json({ error: 'This provider device is already registered' }, { status: 409 })
    throw error
  }
}
