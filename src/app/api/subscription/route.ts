/**
 * AQWELIA — Subscription API (P0-B: secure, no internal fields exposed).
 *
 * GET  — returns the user's current plan + public subscription state.
 * POST — DISABLED. Use Stripe checkout or RevenueCat.
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

  // Select active subscription in priority, then most recent
  const sub = await db.subscription.findFirst({
    where: { userId, active: true },
    orderBy: { startedAt: 'desc' },
  }) || await db.subscription.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
  })

  const planId: PlanId = (sub?.plan as PlanId) || DEFAULT_PLAN
  const plan = getPlan(planId) || PLANS[0]
  const status: SubscriptionStatus = (sub?.status as SubscriptionStatus) || 'inactive'

  // Return ONLY public fields — never expose internal provider fields
  const publicSub = sub ? {
    plan: sub.plan,
    status,
    duration: sub.duration,
    store: sub.store,
    startedAt: sub.startedAt,
    expiresAt: sub.expiresAt,
    trialEndsAt: sub.trialEndsAt,
    active: sub.active,
    cancelAt: sub.cancelAt,
    currentPeriodEnd: sub.currentPeriodEnd,
  } : null

  // Return public plan info (no stripePrices, no revenueCatEntitlement)
  const publicPlans = PLANS.map(p => ({
    id: p.id,
    name: p.name,
    nameKey: p.nameKey,
    tagline: p.tagline,
    taglineKey: p.taglineKey,
    price: p.price,
    features: p.features,
    featureKeys: p.featureKeys,
    limits: p.limits,
    highlighted: p.highlighted,
    color: p.color,
    icon: p.icon,
    active: p.active,
    platform: p.platform,
  }))

  return NextResponse.json({
    plan: {
      id: plan.id,
      name: plan.name,
      nameKey: plan.nameKey,
      tagline: plan.tagline,
      taglineKey: plan.taglineKey,
      price: plan.price,
      features: plan.features,
      featureKeys: plan.featureKeys,
      limits: plan.limits,
      highlighted: plan.highlighted,
      color: plan.color,
      icon: plan.icon,
      active: plan.active,
      platform: plan.platform,
    },
    subscription: publicSub,
    allPlans: publicPlans,
  })
}

export async function POST() {
  return NextResponse.json(
    { error: 'Direct subscription activation is not allowed. Use Stripe checkout or RevenueCat.' },
    { status: 403 }
  )
}
