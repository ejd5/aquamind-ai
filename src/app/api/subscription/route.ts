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
import { PLANS, DEFAULT_PLAN, getPlan, type PlanId, type SubscriptionStatus } from '@/lib/billing/plans'
import { loadUserEntitlements } from '@/lib/billing/entitlement-projection'
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

  // Wave A2: union projection across providers — the same evaluation the
  // feature gates use. Never exposes provider-sensitive ids (stripeCustomerId,
  // stripeSubscriptionId, providerSubscriptionId, lastProviderEventId).
  const projection = await loadUserEntitlements(userId)
  const best = projection.best

  const planId: PlanId = best?.plan || DEFAULT_PLAN
  const plan = getPlan(planId) || PLANS[0]
  const status: SubscriptionStatus = best?.status || 'inactive'

  const subscription = projection.rows.length > 0
    ? {
        id: projection.rows[0].id,
        userId,
        plan: best?.plan || DEFAULT_PLAN,
        status,
        active: best ? true : false,
        duration: null,
        store: best?.provider === 'stripe' ? 'web' : best?.environment === 'sandbox' ? 'ios' : 'ios',
        provider: best?.provider ?? null,
        environment: best?.environment ?? null,
        startedAt: projection.rows[0].startedAt.toISOString(),
        expiresAt: best?.expiresAt?.toISOString() ?? null,
        lastProviderEventAt: null,
      }
    : null

  return NextResponse.json({
    plan,
    subscription,
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
