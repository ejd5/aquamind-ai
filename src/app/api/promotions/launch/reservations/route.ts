import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createReservation, checkEligibility } from '@/lib/launch-offers/service'
import { seedCampaign } from '@/lib/launch-offers/admin'
import { launchOffersEnabled } from '@/lib/launch-offers/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/promotions/launch/reservations
 * Authentifié. Crée une réservation atomique de 30 min, liée à un jeton signé à
 * usage unique. Le client ne fournit ni montant ni coupon.
 */
export async function POST(req: NextRequest) {
  if (!launchOffersEnabled()) {
    return NextResponse.json({ error: 'Campaign disabled' }, { status: 403 })
  }
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await seedCampaign()

  let body: { offerCode?: string; planId?: string; platform?: string; idempotencyKey?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const offerCode = body.offerCode || ''
  const planId = body.planId || ''
  const platform = body.platform || 'WEB'
  const idempotencyKey = body.idempotencyKey || ''

  if (!offerCode || !planId || !platform || !idempotencyKey) {
    return NextResponse.json({ error: 'offerCode, planId, platform, idempotencyKey are required' }, { status: 400 })
  }
  // Le jeton client doit être un UUID valide (anti-replay).
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return NextResponse.json({ error: 'invalid idempotencyKey' }, { status: 400 })
  }

  const result = await createReservation({ userId: session.user.id, offerCode, planId, platform, idempotencyKey })
  if (!result.ok) {
    return NextResponse.json({ error: 'not_eligible', reasonCode: result.reasonCode }, { status: 409 })
  }
  return NextResponse.json({
    reservationId: result.reservationId,
    reservationToken: result.reservationToken,
    expiresAt: result.expiresAt.toISOString(),
    offerCode: result.offerCode,
  }, { status: 201 })
}
