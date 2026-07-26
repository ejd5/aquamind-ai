import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: await translate(locale, 'common.errors.unauthorized', 'Non autorisé') }, { status: 401 })
  }

  try {
    const subscription = await db.subscription.findFirst({
      where: {
        userId: session.user.id,
        stripeCustomerId: { not: null },
      },
      orderBy: { startedAt: 'desc' },
      select: { stripeCustomerId: true },
    })
    const stripeCustomerId = subscription?.stripeCustomerId
    if (!stripeCustomerId) {
      const msg = await translate(locale, 'common.errors.noStripeCustomer', 'Aucun client Stripe trouvé')
      return NextResponse.json({ error: msg }, { status: 404 })
    }

    const origin = req.nextUrl.origin
    if (!origin.startsWith('http')) {
      const msg = await translate(locale, 'common.errors.stripeError', 'Erreur Stripe')
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/settings`,
    })
    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    const msg = await translate(locale, 'common.errors.stripeError', 'Erreur Stripe')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
