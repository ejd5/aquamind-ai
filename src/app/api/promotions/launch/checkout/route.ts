import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { launchOffersEnabled } from '@/lib/launch-offers/config'
import { createLaunchCheckoutSession } from '@/lib/launch-offers/checkout'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/promotions/launch/checkout
 * Body: { offerCode, planId, idempotencyKey }
 * Authentifié. Crée une réservation atomique 30 min puis une session Stripe
 * Checkout. Prix et éligibilité résolus exclusivement côté serveur.
 * La plateforme est TOUJOURS WEB (le checkout de cette route est web/Stripe) :
 * body.platform est ignoré.
 */
export async function POST(req: NextRequest) {
  if (!launchOffersEnabled()) {
    return NextResponse.json({ error: 'Campaign disabled' }, { status: 403 })
  }
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const locale = pickLocale(req)

  let body: { offerCode?: string; planId?: string; idempotencyKey?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const offerCode = body.offerCode || ''
  const planId = body.planId || ''
  const platform = 'WEB'
  const idempotencyKey = body.idempotencyKey || ''

  if (!offerCode || !planId || !idempotencyKey) {
    return NextResponse.json({ error: 'offerCode, planId, idempotencyKey are required' }, { status: 400 })
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return NextResponse.json({ error: 'invalid idempotencyKey' }, { status: 400 })
  }

  const origin = req.nextUrl.origin
  if (!origin.startsWith('http')) {
    return NextResponse.json({ error: 'invalid origin' }, { status: 500 })
  }

  const result = await createLaunchCheckoutSession({
    userId: session.user.id,
    userEmail: session.user.email || undefined,
    offerCode,
    planId,
    platform,
    idempotencyKey,
    origin,
    locale,
  })

  if (!result.ok) {
    const status = result.reasonCode === 'STRIPE_NOT_CONFIGURED'
      ? 503
      : result.reasonCode === 'STRIPE_ERROR'
        ? 502
        : result.reasonCode === 'INVALID_REQUEST'
          ? 400
          : 409
    const msg = await translate(locale, 'common.errors.notEligible', 'Non éligible')
    return NextResponse.json({ error: msg, reasonCode: result.reasonCode }, { status })
  }

  return NextResponse.json({
    url: result.url,
    sessionId: result.sessionId,
    reservationId: result.reservationId,
    expiresAt: result.expiresAt.toISOString(),
  }, { status: 201 })
}
