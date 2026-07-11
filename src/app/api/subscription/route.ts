/**
 * AQWELIA — Subscription API (P0-B: secure).
 *
 * GET  — returns the user's current plan + subscription state.
 * POST — REMOVED. Subscriptions can only be activated via Stripe checkout
 *        or RevenueCat purchase. Direct POST activation was a CRITICAL
 *        vulnerability (P0-B fix).
 *
 * To change plan, the client must:
 *   1. POST /api/stripe/checkout → get a Stripe Checkout URL
 *   2. Complete payment on Stripe
 *   3. Stripe webhook activates the subscription
 *
 * On mobile, the client uses RevenueCat SDK directly.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PLANS, DEFAULT_PLAN, getPlan, type PlanId, type SubscriptionStatus } from '@/lib/billing/plans'
import { pickLocale, translate } from '@/lib/i18n-api'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return NextResponse.json({ error: msg }, { status: 401 })
  }
  const userId = session.user.id

  // Get the most recent subscription (active or not)
  const sub = await db.subscription.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
  })

  const planId: PlanId = (sub?.plan as PlanId) || DEFAULT_PLAN
  const plan = getPlan(planId) || PLANS[0]
  const status: SubscriptionStatus = (sub?.status as SubscriptionStatus) || 'inactive'

  return NextResponse.json({
    plan,
    subscription: sub ? {
      ...sub,
      status,
    } : null,
    allPlans: PLANS,
  })
}

/**
 * POST is DISABLED in P0-B.
 * Subscriptions can only be activated via payment (Stripe checkout or RevenueCat).
 * The previous implementation allowed any authenticated user to activate any
 * plan by directly writing to the Subscription table — a CRITICAL vulnerability.
 *
 * If a client needs to downgrade to the free plan, it should use:
 *   DELETE /api/subscription (to be implemented in a future lot)
 *   or the Stripe Customer Portal (/api/stripe/portal)
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Direct subscription activation is not allowed. Use Stripe checkout or RevenueCat.' },
    { status: 403 }
  )
}
