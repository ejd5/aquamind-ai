import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe, STRIPE_PRICES, isValidProductId, getPlanFromProductId } from '@/lib/stripe'

export const runtime = 'nodejs'

// Creates a Stripe Checkout Session for a subscription product.
// Auth: requires NextAuth session (web flow). Mobile uses RevenueCat instead.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { productId } = await req.json()
  if (!productId || !isValidProductId(productId)) {
    return NextResponse.json({ error: 'Produit invalide' }, { status: 400 })
  }

  const priceId = STRIPE_PRICES[productId]
  if (!priceId) {
    return NextResponse.json({ error: 'Prix non configuré' }, { status: 500 })
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
        plan: getPlanFromProductId(productId),
      },
      success_url: `${process.env.NEXTAUTH_URL}/?subscription=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/?subscription=cancelled`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          userId: session.user.id,
          productId,
          plan: getPlanFromProductId(productId),
        },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Erreur Stripe' }, { status: 500 })
  }
}
