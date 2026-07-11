/**
 * AQWELIA — Admin reconciliation route (P0-B blocage 8).
 *
 * POST /api/admin/reconcile?userId=xxx
 *
 * Allows an admin to reconcile a user's subscription state from Stripe.
 * This route is:
 *   - Admin-only (ADMIN_EMAILS env var check)
 *   - Idempotent (uses the same transition engine)
 *   - Logs to BillingEvent
 *   - Never exposes secrets
 *
 * If Stripe SDK is not available or the subscription is not found,
 * returns 404 without modifying the database.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { applyTransition } from '@/lib/billing/transition'
import { getPlanFromStripePriceId, type SubscriptionStatus } from '@/lib/billing/plans'
import { processEventIdempotently } from '@/lib/billing/idempotency'

export const runtime = 'nodejs'

function isAdmin(email?: string | null): boolean {
  if (!email) return false
  const adminEmails = process.env.ADMIN_EMAILS
  if (!adminEmails) return false
  return adminEmails.split(',').map(e => e.trim().toLowerCase()).includes(email.toLowerCase())
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
  }

  // Find the user's current subscription
  const sub = await db.subscription.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
  })

  if (!sub?.stripeSubscriptionId) {
    return NextResponse.json({ error: 'No Stripe subscription found for this user' }, { status: 404 })
  }

  // Retrieve the subscription from Stripe
  let stripeSub
  try {
    const stripe = getStripe()
    stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId, {
      expand: ['items.data.price'],
    })
  } catch {
    return NextResponse.json({ error: 'Failed to retrieve subscription from Stripe' }, { status: 502 })
  }

  // Determine plan from the real Price ID
  const priceId = stripeSub.items?.data?.[0]?.price?.id || ''
  if (!priceId) {
    return NextResponse.json({ error: 'No Price ID found in Stripe subscription' }, { status: 404 })
  }

  const planInfo = getPlanFromStripePriceId(priceId)
  if (!planInfo) {
    return NextResponse.json({ error: 'Unknown Stripe Price ID: ' + priceId }, { status: 404 })
  }

  // Map Stripe status
  const status = mapStripeStatus(stripeSub.status)
  const providerEventAt = new Date()

  // Apply transition (idempotent — uses lastProviderEventAt comparison)
  const eventId = `reconcile_${userId}_${Date.now()}`
  const result = await processEventIdempotently({
    eventId,
    source: 'stripe',
    eventType: 'admin.reconcile',
    userId,
    payload: JSON.stringify({
      subscriptionId: sub.stripeSubscriptionId,
      priceId,
      status: stripeSub.status,
      reconciledBy: session.user.email,
    }),
    handler: async () => {
      await applyTransition({
        userId,
        planId: planInfo.plan,
        status,
        duration: planInfo.duration,
        store: 'web',
        stripeSubscriptionId: sub.stripeSubscriptionId!,
        providerSubscriptionId: sub.stripeSubscriptionId!,
        providerEventId: eventId,
        providerEventAt,
        expiresAt: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
        currentPeriodStart: stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000) : null,
        currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
        cancelAt: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000) : null,
        trialEndsAt: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
      })
    },
  })

  if (result.error) {
    return NextResponse.json({ error: 'Reconciliation failed: ' + result.error }, { status: 500 })
  }

  // Return the reconciled state
  const updated = await db.subscription.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
  })

  return NextResponse.json({
    reconciled: true,
    skipped: result.skipped,
    subscription: updated,
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
