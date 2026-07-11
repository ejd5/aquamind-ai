/**
 * AQWELIA — Stripe webhook (P0-B: atomic idempotency + payment_status + out-of-order).
 */
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import {
  type PlanId, type SubscriptionStatus, type Duration,
  getPlanFromProductId, PROVIDER_TO_DURATION, statusGrantsAccess,
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

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
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

  if (result.error) {
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true, skipped: result.skipped })
}

async function handleStripeEvent(event: any): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const cs = event.data.object

      // BLOCK 6: verify payment_status — don't activate blindly
      if (cs.payment_status !== 'paid') return

      const userId = cs.metadata?.userId || cs.client_reference_id
      if (!userId) return

      // BLOCK 6: determine plan from the actual Price ID purchased
      const priceId = cs.metadata?.priceId || ''
      const productId = cs.metadata?.productId || ''
      const planId = getPlanFromProductId(productId) as PlanId

      // Reject unknown/empty price IDs for paid plans
      if (planId === 'decouverte' && productId) {
        console.warn('[stripe.webhook] Unknown product ID:', productId)
        return
      }
      if (planId === 'decouverte') return

      const duration = inferDuration(productId)
      const isTrial = cs.mode === 'subscription' && cs.subscription_details?.status === 'trialing'

      await applySubscriptionUpdate({
        userId,
        planId,
        status: isTrial ? 'trialing' : 'active',
        duration,
        store: 'web',
        stripeCustomerId: cs.customer as string | null,
        stripeSubscriptionId: (cs.subscription as string) || null,
        providerEventId: event.id,
        providerEventAt: new Date(event.created * 1000),
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

      const status = mapStripeStatus(sub.status)
      await updateSubscriptionByStripeId({
        stripeSubscriptionId: sub.id,
        userId,
        status,
        providerEventId: event.id,
        providerEventAt: new Date(event.created * 1000),
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

      // BLOCK 6: distinguish cancellation vs expiration
      const isExpired = sub.ended_at != null
      await updateSubscriptionByStripeId({
        stripeSubscriptionId: sub.id,
        userId,
        status: isExpired ? 'expired' : 'canceled',
        providerEventId: event.id,
        providerEventAt: new Date(event.created * 1000),
        expiresAt: sub.ended_at ? new Date(sub.ended_at * 1000) : new Date(),
        active: false,
      })
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object
      // BLOCK 6: find subscription by stripeSubscriptionId, not just metadata
      const stripeSubId = invoice.subscription as string | null
      const stripeCustomerId = invoice.customer as string | null
      const userId = invoice.metadata?.userId

      if (!userId && !stripeSubId && !stripeCustomerId) return

      const periodEnd = invoice.lines?.data?.[0]?.period?.end
      await db.subscription.updateMany({
        where: {
          OR: [
            { stripeSubscriptionId: stripeSubId || undefined },
            { stripeCustomerId: stripeCustomerId || undefined },
          ].filter(c => Object.values(c)[0]),
        },
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
      const stripeSubId = invoice.subscription as string | null
      if (!stripeSubId) return

      await db.subscription.updateMany({
        where: { stripeSubscriptionId: stripeSubId },
        data: { status: 'past_due', active: true },
      })
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object
      const stripeSubId = charge.metadata?.subscriptionId
      if (!stripeSubId) return

      await db.subscription.updateMany({
        where: { stripeSubscriptionId: stripeSubId },
        data: { status: 'expired', active: false },
      })
      break
    }

    default:
      break
  }
}

/**
 * Apply a subscription update with OUT-OF-ORDER protection.
 * Checks lastProviderEventAt — if the incoming event is older, skip it.
 */
async function applySubscriptionUpdate(params: {
  userId: string
  planId: PlanId
  status: SubscriptionStatus
  duration: Duration | null
  store: string
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  providerEventId: string
  providerEventAt: Date
  trialEndsAt?: Date | null
  currentPeriodEnd?: Date | null
}): Promise<void> {
  // BLOCK 4: out-of-order protection
  const existing = await db.subscription.findFirst({
    where: { userId: params.userId, active: true },
    orderBy: { startedAt: 'desc' },
  })

  if (existing?.lastProviderEventAt && params.providerEventAt <= existing.lastProviderEventAt) {
    // This event is older than the last applied event — skip to prevent regression
    console.log('[stripe.webhook] Skipping out-of-order event:', params.providerEventId)
    return
  }

  // Deactivate previous subscriptions
  await db.subscription.updateMany({
    where: { userId: params.userId, active: true },
    data: { active: false, status: 'inactive' },
  })

  // Create new subscription
  await db.subscription.create({
    data: {
      userId: params.userId,
      plan: params.planId,
      status: params.status,
      duration: params.duration,
      store: params.store,
      startedAt: new Date(),
      expiresAt: params.currentPeriodEnd || null,
      active: true,
      stripeCustomerId: params.stripeCustomerId || null,
      stripeSubscriptionId: params.stripeSubscriptionId || null,
      trialEndsAt: params.trialEndsAt || null,
      currentPeriodEnd: params.currentPeriodEnd || null,
      lastProviderEventId: params.providerEventId,
      lastProviderEventAt: params.providerEventAt,
    },
  })
}

/**
 * Update a subscription by Stripe ID with out-of-order protection.
 */
async function updateSubscriptionByStripeId(params: {
  stripeSubscriptionId: string
  userId: string
  status: SubscriptionStatus
  providerEventId: string
  providerEventAt: Date
  expiresAt?: Date | null
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  cancelAt?: Date | null
  trialEndsAt?: Date | null
  active?: boolean
}): Promise<void> {
  // BLOCK 4: out-of-order protection
  const existing = await db.subscription.findFirst({
    where: { stripeSubscriptionId: params.stripeSubscriptionId },
  })

  if (existing?.lastProviderEventAt && params.providerEventAt <= existing.lastProviderEventAt) {
    console.log('[stripe.webhook] Skipping out-of-order event:', params.providerEventId)
    return
  }

  await db.subscription.updateMany({
    where: { stripeSubscriptionId: params.stripeSubscriptionId },
    data: {
      status: params.status,
      active: params.active ?? statusGrantsAccess(params.status, params.expiresAt ?? null),
      expiresAt: params.expiresAt ?? null,
      currentPeriodStart: params.currentPeriodStart ?? null,
      currentPeriodEnd: params.currentPeriodEnd ?? null,
      cancelAt: params.cancelAt ?? null,
      trialEndsAt: params.trialEndsAt ?? null,
      lastProviderEventId: params.providerEventId,
      lastProviderEventAt: params.providerEventAt,
    },
  })
}

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

function inferDuration(productId: string): Duration | null {
  if (!productId) return null
  for (const [provider, internal] of Object.entries(PROVIDER_TO_DURATION)) {
    if (productId.includes(provider)) return internal as Duration
  }
  return null
}
