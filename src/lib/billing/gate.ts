/**
 * AQWELIA — Server-side feature gate helper.
 *
 * This module provides a single function `requireFeatureAccess` that
 * API routes call to enforce subscription-based feature gates.
 *
 * Wave A2 (Round 2): gates evaluate the TRUE capability union of ALL valid
 * subscriptions (Stripe + RevenueCat, within the billing access environment),
 * never a single ranked plan.
 *
 * Usage:
 *   import { requireFeatureAccess } from '@/lib/billing/gate'
 *
 *   export async function POST(req) {
 *     const gate = await requireFeatureAccess(req, 'pdf_report')
 *     if (gate.denied) return gate.response
 *     const userId = gate.userId
 *     // ... handler logic
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  type PlanId,
  type SubscriptionStatus,
  type FeatureGate,
  unionCanAccess,
  DEFAULT_PLAN,
} from '@/lib/billing/plans'
import { loadUserEntitlements } from '@/lib/billing/entitlement-projection'
import { getBillingAccessEnvironment } from '@/lib/billing/identity'
import { pickLocale, translate } from '@/lib/i18n-api'

export interface GateResult {
  denied: boolean
  response?: NextResponse
  userId?: string
  planId?: PlanId
  status?: SubscriptionStatus
  grantedPlans?: PlanId[]
}

/**
 * Check if the authenticated user has access to a feature, evaluating the union
 * of all valid subscriptions' capabilities.
 *
 * Returns:
 *   - { denied: true, response: 401 } if not authenticated
 *   - { denied: true, response: 403 } if the union does not grant the feature
 *   - { denied: false, userId, planId, status, grantedPlans } otherwise
 */
export async function requireFeatureAccess(
  req: NextRequest,
  feature: FeatureGate,
  options?: { photoScansThisMonth?: number }
): Promise<GateResult> {
  const locale = pickLocale(req)
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    const msg = await translate(locale, 'common.errors.unauthorized', 'Non autorisé')
    return {
      denied: true,
      response: NextResponse.json({ error: msg }, { status: 401 }),
    }
  }

  const userId = session.user.id

  // Wave A2 (Round 2): true capability union across providers within the
  // server-determined billing access environment.
  const accessEnvironment = getBillingAccessEnvironment()
  const projection = await loadUserEntitlements(userId, accessEnvironment)

  const result = unionCanAccess(
    projection.effectiveLimits,
    projection.hasValidAccess,
    feature,
    options,
  )

  if (!result.allowed) {
    const msg = result.reasonKey
      ? await translate(locale, `gates.${feature}`, result.reason || 'Access denied')
      : 'Access denied'

    return {
      denied: true,
      response: NextResponse.json(
        {
          error: msg,
          ctaPlan: result.ctaPlan,
        },
        { status: 403 }
      ),
      userId,
      planId: projection.displayPlan,
      status: projection.displayStatus,
      grantedPlans: projection.grantedPlans,
    }
  }

  return {
    denied: false,
    userId,
    planId: projection.displayPlan,
    status: projection.displayStatus,
    grantedPlans: projection.grantedPlans,
  }
}

/**
 * Get the user's current plan and subscription status (display projection).
 * Used by routes that need the plan but don't gate on a specific feature.
 */
export async function getUserPlan(req: NextRequest): Promise<{
  userId: string | null
  planId: PlanId
  status: SubscriptionStatus
  expiresAt: Date | null
}> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { userId: null, planId: DEFAULT_PLAN, status: 'inactive', expiresAt: null }
  }

  // Wave A2 (Round 2): union projection across providers within the billing
  // access environment.
  const accessEnvironment = getBillingAccessEnvironment()
  const projection = await loadUserEntitlements(session.user.id, accessEnvironment)

  return {
    userId: session.user.id,
    planId: projection.displayPlan,
    status: projection.displayStatus,
    expiresAt: projection.displayExpiresAt,
  }
}
