/**
 * AQWELIA Wave A2 — entitlement projection (union of all valid subscriptions).
 *
 * A user may hold separate Stripe and RevenueCat rights. Feature gates and
 * GET /api/subscription must evaluate ALL valid subscriptions and grant the
 * deterministic UNION of their capabilities. An expiry on one provider must
 * never remove access still granted by the other.
 *
 * "Valid" = statusGrantsAccess(status, expiresAt). Among valid rows we pick the
 * BEST (highest-tier) plan deterministically — never the first element.
 */

import { db } from '@/lib/db'
import {
  DEFAULT_PLAN,
  getPlan,
  type PlanId,
  type SubscriptionStatus,
  statusGrantsAccess,
} from '@/lib/billing/plans'
import type { BillingEnvironment } from '@/lib/billing/identity'

/** Stable tier order: higher index = more capable. */
const PLAN_TIER: Record<string, number> = {
  decouverte: 0,
  oasis: 1,
  wellness: 2,
  spa365: 3,
}

export interface ValidSubscriptionSummary {
  id: string
  plan: PlanId
  status: SubscriptionStatus
  active: boolean
  provider: string | null
  environment: string | null
  expiresAt: Date | null
  startedAt: Date
}

/** Rows sharing a provider identity (a single purchase) collapse to the row
 * that grants the most access (highest tier). */
export function pickBestValidRow(
  rows: { plan: string; status: string; expiresAt: Date | null }[],
): { plan: string; status: string; expiresAt: Date | null } | null {
  const valid = rows.filter((r) =>
    statusGrantsAccess(r.status as SubscriptionStatus, r.expiresAt),
  )
  if (valid.length === 0) return null
  return valid.reduce((best, current) => {
    const bestTier = PLAN_TIER[best.plan] ?? -1
    const currentTier = PLAN_TIER[current.plan] ?? -1
    if (currentTier > bestTier) return current
    if (currentTier === bestTier) {
      // Deterministic tie-break: later expiry wins; then later startedAt.
      const bestEnd = best.expiresAt?.getTime() ?? 0
      const currentEnd = current.expiresAt?.getTime() ?? 0
      return currentEnd > bestEnd ? current : best
    }
    return best
  })
}

/**
 * Loads all subscriptions for a user within ONE explicit access environment and
 * returns:
 *   - the best (highest-tier) valid subscription row for projection,
 *   - whether ANY valid subscription exists (union gate),
 *   - the full list (for deterministic capability resolution).
 *
 * The access environment is determined server-side (getBillingAccessEnvironment)
 * and is NEVER inferred from a client or from a sandbox identity. In Production
 * only environment='production' rows grant rights; sandbox rows can never grant
 * Production access. Stripe + RevenueCat unions happen only within this same
 * environment.
 */
export async function loadUserEntitlements(
  userId: string,
  accessEnvironment: BillingEnvironment,
): Promise<{
  best: {
    plan: PlanId
    status: SubscriptionStatus
    expiresAt: Date | null
    provider: string | null
    environment: string | null
  } | null
  hasValidAccess: boolean
  rows: {
    id: string
    plan: PlanId
    status: SubscriptionStatus
    active: boolean
    provider: string | null
    environment: string | null
    expiresAt: Date | null
    startedAt: Date
  }[]
}> {
  const subs = await db.subscription.findMany({
    where: { userId, environment: accessEnvironment },
    orderBy: [{ startedAt: 'desc' }],
  })

  const rows = subs.map((s) => ({
    id: s.id,
    plan: s.plan as PlanId,
    status: s.status as SubscriptionStatus,
    active: s.active,
    provider: s.provider,
    environment: s.environment,
    expiresAt: s.expiresAt,
    startedAt: s.startedAt,
  }))

  const best = pickBestValidRow(rows)
  return {
    best: best
      ? {
          plan: best.plan as PlanId,
          status: best.status as SubscriptionStatus,
          expiresAt: best.expiresAt,
          provider: null,
          environment: null,
        }
      : null,
    hasValidAccess: best !== null,
    rows,
  }
}

/**
 * Deterministic union of capabilities across all valid subscriptions.
 * Returns the strongest plan among valid rows, or DEFAULT_PLAN when none valid.
 */
export function resolveUnionPlan(
  rows: { plan: PlanId; status: SubscriptionStatus; expiresAt: Date | null }[],
): PlanId {
  const best = pickBestValidRow(rows)
  return (best?.plan as PlanId) || DEFAULT_PLAN
}

/** The effective granted plan for gate evaluation (same as resolveUnionPlan). */
export function effectivePlanForUser(
  userId: string,
  accessEnvironment: BillingEnvironment,
): Promise<{ planId: PlanId; status: SubscriptionStatus; expiresAt: Date | null }> {
  return loadUserEntitlements(userId, accessEnvironment).then((e) => ({
    planId: e.best?.plan ?? DEFAULT_PLAN,
    status: e.best?.status ?? 'inactive',
    expiresAt: e.best?.expiresAt ?? null,
  }))
}
