/**
 * AQWELIA — Stripe webhook handler (P0-B: secure + idempotent).
 *
 * Security:
 *   - Raw body signature verification (Stripe SDK constructEvent)
 *   - Idempotency via BillingEvent table (event.id unique)
 *   - No information leakage in error responses
 *   - Out-of-order event handling: status is set from event data, not
 *     derived from event sequence
 */
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import {
  type PlanId,
  type SubscriptionStatus,
  type Duration,
  getPlanFromProductId,
  PROVIDER_TO_DURATION,
  statusGrantsAccess,
} from '@/lib/billing/plans'
import { processEventIdempotently } from '@/lib/billing/idempotency'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Verify signature
  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    // Do NOT leak the verification error details
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Process with idempotency
  const result = await processEventIdempotently({
    eventId: event.id,
    source: 'stripe',
    eventType: event.type,
    payload: JSON.stringify(event),
    handler: async () => {
      await handleStripeEvent(event)
    },
  })

  if (result.error) {
    console.error('[stripe.webhook] processing error:', result.error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true, skipped: result.skipped })
}

/**
 * Handle a verified Stripe event.
 * Each case sets the subscription status deterministically from the event data
 * (not from the previous state), so out-of-order events don't cause regressions.
 */
async function handleStripeEvent(event: any): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const cs = event.data.object
      const userId = cs.metadata?.userId || cs.client_reference_id
      const productId = cs.metadata?.productId || ''
      const planId = getPlanFromProductId(productId) as PlanId
      const duration = inferDuration(productId)

      if (!userId || planId === 'decouverte') return

      // Deactivate previous active subscriptions for this user
      await db.subscription.updateMany({
        where: { userId, active: true },
        data: { active: false, status: 'inactive' },
      })

      // Create new active subscription
      const isTrial = cs.mode === 'setup' || !!cs.subscription_details?.status
      await db.subscription.create({
        data: {
          userId,
          plan: planId,
          status: isTrial ? 'trialing' : 'active',
          duration,
          store: 'web',
          startedAt: new Date(),
          expiresAt: null,
          active: true,
          stripeCustomerId: cs.customer as string | null,
          stripeSubscriptionId: (cs.subscription as string) || null,
          trialEndsAt: cs.subscription_details?.trial_end
            ? new Date(cs.subscription_details.trial_end * 1000)
            : null,
        },
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object
      const userId = sub.metadata?.userId
      if (!userId) return

      const status = mapStripeStatus(sub.status)
      await db.subscription.updateMany({
        where: { userId, stripeSubscriptionId: sub.id },
        data: {
          status,
          active: statusGrantsAccess(status, null),
          expiresAt: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null,
          currentPeriodStart: sub.current_period_start
            ? new Date(sub.current_period_start * 1000)
            : null,
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null,
          cancelAt: sub.cancel_at
            ? new Date(sub.cancel_at * 1000)
            : null,
          trialEndsAt: sub.trial_end
            ? new Date(sub.trial_end * 1000)
            : null,
        },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const userId = sub.metadata?.userId
      if (!userId) return

      await db.subscription.updateMany({
        where: { userId, stripeSubscriptionId: sub.id },
        data: {
          status: 'expired',
          active: false,
          expiresAt: sub.ended_at ? new Date(sub.ended_at * 1000) : new Date(),
        },
      })
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object
      const userId = invoice.metadata?.userId
      if (!userId) return

      const periodEnd = invoice.lines?.data?.[0]?.period?.end
      await db.subscription.updateMany({
        where: { userId, active: true },
        data: {
          status: 'active',
          active: true,
          expiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        },
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const userId = invoice.metadata?.userId
      if (!userId) return

      await db.subscription.updateMany({
        where: { userId, active: true },
        data: {
          status: 'past_due',
          active: true, // Still active during grace period
        },
      })
      break
    }

    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object
      const userId = sub.metadata?.userId
      if (!userId) return

      // Just update the expiry — don't change status yet
      await db.subscription.updateMany({
        where: { userId, stripeSubscriptionId: sub.id },
        data: {
          expiresAt: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null,
          trialEndsAt: sub.trial_end
            ? new Date(sub.trial_end * 1000)
            : null,
        },
      })
      break
    }

    default:
      // Ignore non-subscription events
      break
  }
}

/**
 * Map Stripe subscription status to AQWELIA SubscriptionStatus.
 */
function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    case 'unpaid':
      return 'expired'
    case 'incomplete':
    case 'incomplete_expired':
      return 'inactive'
    default:
      return 'inactive'
  }
}

/**
 * Infer duration from a product ID string.
 */
function inferDuration(productId: string): Duration | null {
  if (!productId) return null
  for (const [provider, internal] of Object.entries(PROVIDER_TO_DURATION)) {
    if (productId.includes(provider)) return internal as Duration
  }
  return null
}
