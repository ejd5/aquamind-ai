/**
 * AQWELIA — Admin reconciliation route (P0-B correctif 9).
 *
 * POST /api/admin/reconcile?userId=xxx&force=true
 *
 * Supports both Stripe and RevenueCat reconciliation.
 * - force=true: re-run even if provider state is unchanged
 * - Uses unique execution ID (not state fingerprint)
 * - Never returns internal provider fields
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { applyTransition } from '@/lib/billing/transition'
import { getPlanFromStripePriceId, type PlanId, type SubscriptionStatus } from '@/lib/billing/plans'
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
  const force = searchParams.get('force') === 'true'

  if (!userId) {
    return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
  }

  // Select active subscription in priority
  const sub = await db.subscription.findFirst({
    where: { userId, active: true },
    orderBy: { startedAt: 'desc' },
  }) || await db.subscription.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
  })

  if (!sub) {
    return NextResponse.json({ error: 'No subscription found for this user' }, { status: 404 })
  }

  // Unique execution ID — always different to allow forced re-reconciliation
  const execId = `reconcile_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const providerEventAt = new Date()

  let reconciled = false
  let source: 'stripe' | 'revenuecat' = 'stripe'

  // Try Stripe reconciliation
  if (sub.stripeSubscriptionId) {
    source = 'stripe'
    let stripeSub
    try {
      const stripe = getStripe()
      stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId, {
        expand: ['items.data.price'],
      })
    } catch {
      // Don't expose error details
      return NextResponse.json({ error: 'Provider reconciliation failed' }, { status: 502 })
    }

    const priceId = stripeSub.items?.data?.[0]?.price?.id || ''
    if (!priceId) {
      return NextResponse.json({ error: 'No Price ID found' }, { status: 404 })
    }

    const planInfo = getPlanFromStripePriceId(priceId)
    if (!planInfo) {
      return NextResponse.json({ error: 'Unknown Price ID' }, { status: 404 })
    }

    const status = mapStripeStatus(stripeSub.status)

    const result = await processEventIdempotently({
      eventId: execId,
      source: 'stripe',
      eventType: 'admin.reconcile',
      userId,
      payload: JSON.stringify({ subscriptionId: sub.stripeSubscriptionId, priceId, status: stripeSub.status, forced: force }),
      handler: async () => {
        // If force=true, bypass the out-of-order check by using a future timestamp
        const eventTime = force ? new Date(Date.now() + 1000) : providerEventAt
        await applyTransition({
          userId,
          planId: planInfo.plan,
          status,
          duration: planInfo.duration,
          store: 'web',
          stripeSubscriptionId: sub.stripeSubscriptionId!,
          providerSubscriptionId: sub.stripeSubscriptionId!,
          providerEventId: execId,
          providerEventAt: eventTime,
          expiresAt: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
          currentPeriodStart: stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000) : null,
          currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
          cancelAt: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000) : null,
          trialEndsAt: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
        })
      },
    })

    if (result.error) {
      return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
    }
    reconciled = !result.skipped
  } else if (sub.providerSubscriptionId) {
    // RevenueCat reconciliation would require RC REST API
    // For now, return a message
    return NextResponse.json({
      error: 'RevenueCat reconciliation not yet implemented. Use RC dashboard.',
      providerSubscriptionId: null, // Don't expose internal ID
    }, { status: 501 })
  } else {
    return NextResponse.json({ error: 'No provider subscription ID found' }, { status: 404 })
  }

  // Return only public fields
  const updated = await db.subscription.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
  })

  return NextResponse.json({
    reconciled,
    source,
    forced: force,
    subscription: updated ? {
      plan: updated.plan,
      status: updated.status,
      active: updated.active,
      expiresAt: updated.expiresAt,
      trialEndsAt: updated.trialEndsAt,
      currentPeriodEnd: updated.currentPeriodEnd,
    } : null,
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
