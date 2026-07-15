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

    // Use the request origin (dynamic) instead of process.env.NEXTAUTH_URL,
    // which is often missing or scoped to Production only on Vercel Preview.
    // req.nextUrl.origin returns the full URL including scheme + host, so
    // success/cancel URLs work correctly across Production, Preview and local.
    const origin = req.nextUrl.origin
    if (!origin.startsWith('http')) {
      const msg = await translate(locale, 'common.errors.stripeError', 'Erreur Stripe')
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: session.user.email || undefined,
      client_reference_id: session.user.id,
      // Force the Stripe Checkout language to match the AQWELIA locale.
      // Without this, Stripe auto-detects from browser/IP and may display
      // in an unexpected language (e.g. Chinese for users in Asia).
      locale: locale,
      metadata: {
        userId: session.user.id,
        productId,
        plan: product.plan,
      },
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/?subscription=cancelled`,
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
