/**
 * AQWELIA — Stripe webhook (P0-B: transition engine, real Price ID, payment_status).
 */
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { processEventIdempotently } from '@/lib/billing/idempotency'
import { applyTransition } from '@/lib/billing/transition'
import {
  type PlanId, type SubscriptionStatus,
  getPlanFromStripePriceId, getPlanFromProductId,
  PROVIDER_TO_DURATION, type Duration,
} from '@/lib/billing/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const result = await processEventIdempotently({
    eventId: event.id,
    source: 'stripe',
    eventType: event.type,
    payload: JSON.stringify(event),
    handler: async () => { await handleStripeEvent(event) },
  })

  if (result.error) return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  return NextResponse.json({ received: true, skipped: result.skipped })
}

async function handleStripeEvent(event: any): Promise<void> {
  const providerEventAt = new Date(event.created * 1000)

  switch (event.type) {
    case 'checkout.session.completed': {
      const cs = event.data.object
      // BLOCAGE 7: verify payment_status
      if (cs.payment_status !== 'paid') return

      const userId = cs.metadata?.userId || cs.client_reference_id
      if (!userId) return

      // BLOCAGE 7: determine plan from the REAL Price ID
      const stripeSubId = cs.subscription as string | null
      let priceId = ''

      // Try to get price from checkout session line items
      if (cs.line_items?.data?.[0]?.price?.id) {
        priceId = cs.line_items.data[0].price.id
      }

      // If no price in line items, try expanding the subscription
      if (!priceId && stripeSubId) {
        try {
          const stripe = getStripe()
          const sub = await stripe.subscriptions.retrieve(stripeSubId, {
            expand: ['items.data.price'],
          })
          priceId = sub.items?.data?.[0]?.price?.id || ''
        } catch { /* ignore — will be caught by price validation below */ }
      }

      // BLOCAGE 7: reject unknown/empty Price IDs
      if (!priceId) {
        console.warn('[stripe.webhook] No Price ID found in checkout session')
        return
      }

      const planInfo = getPlanFromStripePriceId(priceId)
      if (!planInfo) {
        console.warn('[stripe.webhook] Unknown Stripe Price ID:', priceId)
        return
      }

      // BLOCAGE 7: verify metadata.productId matches the real Price ID
      const metadataProductId = cs.metadata?.productId || ''
      if (metadataProductId) {
        const metadataPlan = getPlanFromProductId(metadataProductId)
        if (metadataPlan !== planInfo.plan) {
          console.warn('[stripe.webhook] Metadata productId does not match Price ID plan')
          return
        }
      }

      const isTrial = cs.mode === 'subscription' && cs.subscription_details?.status === 'trialing'

      await applyTransition({
        userId,
        planId: planInfo.plan,
        status: isTrial ? 'trialing' : 'active',
        duration: planInfo.duration,
        store: 'web',
        stripeCustomerId: cs.customer as string | null,
        stripeSubscriptionId: stripeSubId,
        providerSubscriptionId: stripeSubId,
        providerEventId: event.id,
        providerEventAt,
        trialEndsAt: cs.subscription_details?.trial_end
          ? new Date(cs.subscription_details.trial_end * 1000) : null,
        currentPeriodEnd: cs.expires_at ? new Date(cs.expires_at * 1000) : null,
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object
      const userId = sub.metadata?.userId
      if (!userId) return

      await applyTransition({
        userId,
        planId: (sub.metadata?.plan as PlanId) || 'oasis',
        status: mapStripeStatus(sub.status),
        stripeSubscriptionId: sub.id,
        providerSubscriptionId: sub.id,
        providerEventId: event.id,
        providerEventAt,
        expiresAt: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
        currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
        cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
        trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const userId = sub.metadata?.userId
      if (!userId) return

      // BLOCAGE 4: distinguish canceled (access until expiry) vs expired (no access)
      const isExpired = sub.ended_at != null
      await applyTransition({
        userId,
        planId: (sub.metadata?.plan as PlanId) || 'oasis',
        status: isExpired ? 'expired' : 'canceled',
        stripeSubscriptionId: sub.id,
        providerSubscriptionId: sub.id,
        providerEventId: event.id,
        providerEventAt,
        expiresAt: sub.ended_at ? new Date(sub.ended_at * 1000) : sub.current_period_end ? new Date(sub.current_period_end * 1000) : new Date(),
      })
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object
      // BLOCAGE 6: find by stripeSubscriptionId or stripeCustomerId
      const stripeSubId = invoice.subscription as string | null
      const stripeCustomerId = invoice.customer as string | null
      const userId = invoice.metadata?.userId
      if (!userId && !stripeSubId && !stripeCustomerId) return

      const periodEnd = invoice.lines?.data?.[0]?.period?.end
      // Find the subscription to get planId
      const sub = await findSubByProvider(stripeSubId, stripeCustomerId, userId)
      if (!sub) return

      await applyTransition({
        userId: sub.userId,
        planId: sub.plan as PlanId,
        status: 'active',
        stripeSubscriptionId: stripeSubId || sub.stripeSubscriptionId,
        providerSubscriptionId: stripeSubId || sub.providerSubscriptionId,
        providerEventId: event.id,
        providerEventAt,
        expiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const stripeSubId = invoice.subscription as string | null
      if (!stripeSubId) return

      const sub = await findSubByProvider(stripeSubId, null, null)
      if (!sub) return

      await applyTransition({
        userId: sub.userId,
        planId: sub.plan as PlanId,
        status: 'past_due',
        stripeSubscriptionId: stripeSubId,
        providerSubscriptionId: stripeSubId,
        providerEventId: event.id,
        providerEventAt,
      })
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object
      const stripeSubId = charge.metadata?.subscriptionId
      if (!stripeSubId) return

      const sub = await findSubByProvider(stripeSubId, null, null)
      if (!sub) return

      await applyTransition({
        userId: sub.userId,
        planId: sub.plan as PlanId,
        status: 'expired',
        stripeSubscriptionId: stripeSubId,
        providerSubscriptionId: stripeSubId,
        providerEventId: event.id,
        providerEventAt,
        expiresAt: new Date(),
      })
      break
    }

    default:
      break
  }
}

async function findSubByProvider(stripeSubId: string | null, stripeCustomerId: string | null, userId: string | null) {
  if (stripeSubId) {
    const bySub = await db.subscription.findFirst({ where: { stripeSubscriptionId: stripeSubId } })
    if (bySub) return bySub
  }
  if (stripeCustomerId) {
    const byCust = await db.subscription.findFirst({ where: { stripeCustomerId } })
    if (byCust) return byCust
  }
  if (userId) {
    return db.subscription.findFirst({ where: { userId, active: true }, orderBy: { startedAt: 'desc' } })
  }
  return null
}

// Import db at the top level (needed for findSubByProvider)
import { db } from '@/lib/db'

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'trialing': return 'trialing'
    case 'active': return 'active'
    case 'past_due': return 'past_due'
    case 'canceled': return 'canceled'
    case 'unpaid': return 'expired'
    default: return 'inactive'
  }
}
