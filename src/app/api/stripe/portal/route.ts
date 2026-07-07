import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

// Creates a Stripe Customer Portal session so the user can manage their
// subscription (update card, cancel, view invoices) directly on Stripe.
// Auth: requires NextAuth session. The customer is resolved by email.
export async function POST(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: await translate(locale, 'common.errors.unauthorized', 'Non autorisé') }, { status: 401 })
  }

  try {
    const stripe = getStripe()

    // Find customer by email
    const customers = await stripe.customers.list({
      email: session.user.email || undefined,
      limit: 1,
    })

    if (customers.data.length === 0) {
      const msg = await translate(locale, 'common.errors.noStripeCustomer', 'Aucun client Stripe trouvé')
      return NextResponse.json({ error: msg }, { status: 404 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${process.env.NEXTAUTH_URL}/`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    const msg = await translate(locale, 'common.errors.stripeError', 'Erreur Stripe')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
