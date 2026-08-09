import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCampaignAdmin, setCampaignStatus, reallocate, seedCampaign } from '@/lib/launch-offers/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** L'admin doit avoir le rôle 'admin'. */
async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  if ((session.user as any).role !== 'admin') return null
  return session.user.id
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await seedCampaign()
  const data = await getCampaignAdmin()
  return NextResponse.json(data, { status: 200 })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  if (body.action === 'status' && typeof body.status === 'string') {
    const result = await setCampaignStatus(body.status, admin, body.reason)
    if (!result.ok) return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
    return NextResponse.json({ ok: true }, { status: 200 })
  }
  if (body.action === 'reallocate') {
    const result = await reallocate({
      variantCode: body.variantCode || '',
      platform: body.platform || '',
      newQuota: Number(body.newQuota),
      actor: admin,
      reason: body.reason,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true }, { status: 200 })
  }
  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
