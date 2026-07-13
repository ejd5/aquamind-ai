import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe, STRIPE_PRICES, isValidProductId, getPlanFromWebProductId } from '@/lib/stripe'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

// Creates a Stripe Checkout Session for a subscription product.
// Auth: requires NextAuth session (web flow). Mobile uses RevenueCat instead.
export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: await translate(locale, 'common.errors.unauthorized', 'Non autorisé') }, { status: 401 })
  }

  const { productId } = await req.json()
  const product = typeof productId === 'string' ? getPlanFromWebProductId(productId) : null
  if (!productId || !isValidProductId(productId) || !product) {
    const msg = await translate(locale, 'common.errors.invalidProduct', 'Produit invalide')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const priceId = STRIPE_PRICES[productId]
  if (!priceId) {
    const msg = await translate(locale, 'common.errors.priceNotConfigured', 'Prix non configuré')
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  try {
    const stripe = getStripe()

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: session.user.email || undefined,
      client_reference_id: session.user.id,
      metadata: {
        userId: session.user.id,
        productId,
        plan: product.plan,
      },
      success_url: `${process.env.NEXTAUTH_URL}/?subscription=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/?subscription=cancelled`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          userId: session.user.id,
          productId,
          plan: product.plan,
        },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    const msg = await translate(locale, 'common.errors.stripeError', 'Erreur Stripe')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
