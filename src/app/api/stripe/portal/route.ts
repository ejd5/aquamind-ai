import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

// Creates a Stripe Customer Portal session so the user can manage their
// subscription (update card, cancel, view invoices) directly on Stripe.
// Auth: requires NextAuth session. The customer is resolved by email.
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const stripe = getStripe()

    // Find customer by email
    const customers = await stripe.customers.list({
      email: session.user.email || undefined,
      limit: 1,
    })

    if (customers.data.length === 0) {
      return NextResponse.json({ error: 'Aucun client Stripe trouvé' }, { status: 404 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${process.env.NEXTAUTH_URL}/`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    return NextResponse.json({ error: 'Erreur Stripe' }, { status: 500 })
  }
}
