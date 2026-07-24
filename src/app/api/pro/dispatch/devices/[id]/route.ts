import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getProAccess } from '@/lib/pro/access'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getProAccess(session.user.id)
  if (!access.canManage || !access.organizationId) {
    return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
  }
  const { id } = await ctx.params
  const device = await db.proTrackingDevice.findFirst({
    where: { id, organizationId: access.organizationId },
    select: { id: true, assignedUserId: true },
  })
  if (!device) return NextResponse.json({ error: 'Tracking device not found' }, { status: 404 })

  const now = new Date()
  await db.$transaction(async (tx) => {
    await tx.proTrackingDevice.update({ where: { id: device.id }, data: { status: 'revoked' } })
    await tx.proTrackingSession.updateMany({
      where: {
        organizationId: access.organizationId as string,
        userId: device.assignedUserId,
        source: 'vehicle',
        status: { in: ['active', 'paused'] },
      },
      data: { status: 'stopped', endedAt: now },
    })
    await tx.proLocationAccessLog.create({
      data: {
        organizationId: access.organizationId as string,
        actorUserId: session.user.id,
        action: 'revoke_tracking_device',
        targetId: device.id,
      },
    })
  })
  return NextResponse.json({ ok: true })
}
