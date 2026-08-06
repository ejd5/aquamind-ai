/**
 * AQWELIA — Subscription API (P0-B: secure).
 *
 * GET  — returns the user's TRUE capability union (consistent with the feature
 *        gates) plus a display projection.
 * POST — REMOVED. Subscriptions can only be activated via Stripe checkout
 *        or RevenueCat purchase. Direct POST activation was a CRITICAL
 *        vulnerability (P0-B fix).
 *
 * Wave A2 (Round 2):
 *   - `access` exposes the capability union (grantedPlans, grantedFeatures,
 *     effectiveLimits, hasValidAccess) — the SAME evaluation the gates use.
 *   - `sources` exposes each valid entitlement source with provider /
 *     environment / store preserved; never a provider-sensitive id
 *     (stripeCustomerId, stripeSubscriptionId, providerSubscriptionId,
 *     lastProviderEventId).
 *   - `subscription` is the DISPLAY row: its id/startedAt/provider/store/
 *     environment all come from the SAME row — never mixed across rows, never
 *     an arbitrary 'ios'.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PLANS, DEFAULT_PLAN, getPlan, type PlanId, type SubscriptionStatus } from '@/lib/billing/plans'
import { loadUserEntitlements, type GrantSource } from '@/lib/billing/entitlement-projection'
import { getBillingAccessEnvironment } from '@/lib/billing/identity'
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

  // Wave A2 (Round 2): the SAME evaluation the feature gates use.
  const accessEnvironment = getBillingAccessEnvironment()
  const projection = await loadUserEntitlements(userId, accessEnvironment)

  const displayRow = pickDisplaySource(projection.sources, projection.displayPlan)

  const planId: PlanId = projection.displayPlan
  const plan = getPlan(planId) || PLANS[0]
  const status: SubscriptionStatus = projection.displayStatus

  const subscription = displayRow
    ? {
        id: displayRow.id,
        userId,
        plan: displayRow.plan,
        status,
        active: projection.hasValidAccess,
        duration: null,
        // Store/provider/environment come from THIS row — never guessed.
        store: displayRow.store,
        provider: displayRow.provider,
        environment: displayRow.environment,
        startedAt: displayRow.startedAt.toISOString(),
        expiresAt: displayRow.expiresAt?.toISOString() ?? null,
        cancelAt: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        lastProviderEventAt: null,
      }
    : null

  return NextResponse.json({
    plan,
    subscription,
    access: {
      hasValidAccess: projection.hasValidAccess,
      grantedPlans: projection.grantedPlans,
      grantedFeatures: projection.grantedFeatures,
      effectiveLimits: projection.effectiveLimits,
    },
    sources: projection.sources.map((s) => ({
      id: s.id,
      plan: s.plan,
      status: s.status,
      provider: s.provider,
      environment: s.environment,
      store: s.store,
      expiresAt: s.expiresAt?.toISOString() ?? null,
      startedAt: s.startedAt.toISOString(),
    })),
    allPlans: PLANS,
  })
}

/**
 * Deterministically picks the source row used for the DISPLAY projection: the
 * valid source matching displayPlan (latest expiry, then earliest start);
 * otherwise the first valid source.
 */
function pickDisplaySource(sources: GrantSource[], displayPlan: PlanId): GrantSource | null {
  if (sources.length === 0) return null
  const matching = sources.filter((s) => s.plan === displayPlan)
  const pool = matching.length > 0 ? matching : sources
  return [...pool].sort((a, b) => {
    const aEnd = a.expiresAt?.getTime() ?? 0
    const bEnd = b.expiresAt?.getTime() ?? 0
    if (bEnd !== aEnd) return bEnd - aEnd
    return a.startedAt.getTime() - b.startedAt.getTime()
  })[0]
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
