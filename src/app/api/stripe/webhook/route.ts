import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Stripe webhook handler — syncs subscription state to the Prisma DB.
//
// IMPORTANT: Stripe requires the RAW request body for signature verification.
// We use `req.text()` (not `req.json()`) and pass it directly to
// `stripe.webhooks.constructEvent`. Next.js does not buffer the body when
// `.text()` is called, so the signature check is performed against the exact
// bytes Stripe sent.
//
// Auth: NONE. This route is server-to-server (Stripe → our backend). The
// `STRIPE_WEBHOOK_SECRET` env var replaces session-based auth.
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const cs = event.data.object
        const userId = cs.metadata?.userId || cs.client_reference_id
        const productId = cs.metadata?.productId
        const plan = cs.metadata?.plan as 'oasis' | 'wellness'

        if (userId && plan) {
          // Deactivate previous subscriptions for this user
          await db.subscription.updateMany({
            where: { userId, active: true },
            data: { active: false },
          })
          // Create the new active subscription
          await db.subscription.create({
            data: {
              userId,
              plan,
              duration: productId?.includes('yearly')
                ? 'year'
                : productId?.includes('seasonal')
                ? 'halfyear'
                : productId?.includes('weekly')
                ? 'week'
                : 'month',
              startedAt: new Date(),
              expiresAt: null, // Will be updated by subsequent invoice/subscription events
              active: true,
            },
          })
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const userId = sub.metadata?.userId

        if (userId) {
          if (event.type === 'customer.subscription.deleted') {
            await db.subscription.updateMany({
              where: { userId, active: true },
              data: { active: false },
            })
          } else {
            // Refresh expiry date from the Stripe subscription object
            await db.subscription.updateMany({
              where: { userId, active: true },
              data: {
                expiresAt: sub.current_period_end
                  ? new Date(sub.current_period_end * 1000)
                  : null,
              },
            })
          }
        }
        break
      }

      case 'invoice.paid': {
        // Subscription renewed — refresh the expiry date from the invoice line period.
        const invoice = event.data.object
        const userId = invoice.metadata?.userId
        if (userId) {
          await db.subscription.updateMany({
            where: { userId, active: true },
            data: {
              expiresAt: invoice.lines?.data?.[0]?.period?.end
                ? new Date(invoice.lines.data[0].period.end * 1000)
                : null,
            },
          })
        }
        break
      }

      default:
        // Ignore other event types — only the 4 above are subscription-relevant.
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook processing error:', err)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
