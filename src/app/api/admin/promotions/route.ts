import { NextRequest, NextResponse } from 'next/server'
import { requireAdminFromDb } from '@/lib/admin-auth'
import { getCampaignAdmin, setCampaignStatus, reallocate, restoreRedemptionSlot, seedCampaign } from '@/lib/launch-offers/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Autorisation admin de la campagne.
 *
 * - session absente/invalide → 401 (non autorisé) ;
 * - utilisateur authentifié mais rôle en base ≠ `admin` → 403 (interdit).
 * Le rôle est chargé depuis la base au moment du contrôle (jamais depuis une
 * valeur fournie par le client, le corps de requête ou un champ de session
 * falsifiable). Les deux routes GET/PATCH passent par ce même garde.
 */
async function requireAdmin() {
  const auth = await requireAdminFromDb()
  if (auth.authorized) return { ok: true as const, userId: auth.userId }
  return { ok: false as const, status: auth.reason === 'no-session' ? 401 : 403 }
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: admin.status })
  await seedCampaign()
  const data = await getCampaignAdmin()
  return NextResponse.json(data, { status: 200 })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ error: admin.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: admin.status })
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  if (body.action === 'status' && typeof body.status === 'string') {
    const result = await setCampaignStatus(body.status, admin.userId, body.reason)
    if (!result.ok) return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
    return NextResponse.json({ ok: true }, { status: 200 })
  }
  if (body.action === 'reallocate') {
    const result = await reallocate({
      variantCode: body.variantCode || '',
      platform: body.platform || '',
      newQuota: Number(body.newQuota),
      actor: admin.userId,
      reason: body.reason,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true }, { status: 200 })
  }
  if (body.action === 'restore_slot') {
    const result = await restoreRedemptionSlot({
      redemptionId: body.redemptionId || '',
      actor: admin.userId,
      reason: body.reason || 'admin restore',
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true }, { status: 200 })
  }
  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
