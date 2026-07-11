/**
 * AQWELIA — Server-side feature gate helper.
 *
 * This module provides a single function `requireFeatureAccess` that
 * API routes call to enforce subscription-based feature gates.
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
import { db } from '@/lib/db'
import {
  type PlanId,
  type SubscriptionStatus,
  type FeatureGate,
  canAccess,
  getPlan,
  DEFAULT_PLAN,
  statusGrantsAccess,
} from '@/lib/billing/plans'
import { pickLocale, translate } from '@/lib/i18n-api'

export interface GateResult {
  denied: boolean
  response?: NextResponse
  userId?: string
  planId?: PlanId
  status?: SubscriptionStatus
}

/**
 * Check if the authenticated user has access to a feature.
 *
 * Returns:
 *   - { denied: true, response: 401 } if not authenticated
 *   - { denied: true, response: 403 } if feature is not available on their plan
 *   - { denied: false, userId, planId, status } if access is granted
 *
 * Also checks photo scan quota if feature is 'photo_scan'.
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

  // Get the user's current subscription
  const sub = await db.subscription.findFirst({
    where: { userId, active: true },
    orderBy: { startedAt: 'desc' },
  })

  const planId: PlanId = (sub?.plan as PlanId) || DEFAULT_PLAN
  const status: SubscriptionStatus = (sub?.status as SubscriptionStatus) || 'inactive'
  const expiresAt = sub?.expiresAt || null

  // Check feature access
  const result = canAccess(planId, status, feature, options, expiresAt)

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
      planId,
      status,
    }
  }

  return { denied: false, userId, planId, status }
}

/**
 * Get the user's current plan and subscription status.
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

  const sub = await db.subscription.findFirst({
    where: { userId: session.user.id, active: true },
    orderBy: { startedAt: 'desc' },
  })

  return {
    userId: session.user.id,
    planId: (sub?.plan as PlanId) || DEFAULT_PLAN,
    status: (sub?.status as SubscriptionStatus) || 'inactive',
    expiresAt: sub?.expiresAt || null,
  }
}
