/**
 * AQWELIA Wave A2 (Round 2) — entitlement projection = TRUE capability union.
 *
 * A user may hold separate Stripe and RevenueCat rights (and several plans). We
 * never collapse them into a single ranked plan. Instead we compute:
 *   - grantedPlans        : the set of valid paid plans held (deterministic order)
 *   - grantedFeatures     : union of the feature strings of all granted plans
 *   - effectiveLimits     : combined PlanLimits (see combineLimits in plans.ts)
 *   - displayPlan         : DISPLAY-ONLY selection, fully separated from the
 *                           authorization decision
 *   - sources             : each valid source with provider / environment /
 *                           store preserved
 *
 * No capability is lost when one provider expires while the other remains
 * valid: the union only contains the still-valid sources.
 *
 * The access environment is determined server-side (getBillingAccessEnvironment)
 * and is NEVER inferred from a client or from a sandbox identity. In Production
 * only environment='production' rows grant rights; sandbox rows can never grant
 * Production access. Stripe + RevenueCat unions happen only within this same
 * environment.
 */

import { db } from '@/lib/db'
import {
  DEFAULT_PLAN,
  getPlan,
  PLANS,
  combineLimits,
  type PlanId,
  type PlanLimits,
  type SubscriptionStatus,
  statusGrantsAccess,
} from '@/lib/billing/plans'
import type { BillingEnvironment } from '@/lib/billing/identity'

export interface GrantSource {
  id: string
  plan: PlanId
  status: SubscriptionStatus
  active: boolean
  provider: string
  environment: string
  /** 'web' | 'ios' | 'android' | null when unknown — never guessed. */
  store: string | null
  expiresAt: Date | null
  startedAt: Date
  valid: boolean
}

export interface EntitlementProjection {
  hasValidAccess: boolean
  grantedPlans: PlanId[]
  grantedFeatures: string[]
  effectiveLimits: PlanLimits
  /** DISPLAY-ONLY. Never used for authorization. */
  displayPlan: PlanId
  displayStatus: SubscriptionStatus
  displayExpiresAt: Date | null
  /** Valid sources only — provider/environment/store preserved. */
  sources: GrantSource[]
  /** All rows in the access environment (valid + invalid). */
  rows: GrantSource[]
  /** Backward-compatible display row (deprecated for authorization). */
  best: {
    plan: PlanId
    status: SubscriptionStatus
    expiresAt: Date | null
    provider: string | null
    environment: string | null
  } | null
}

/** Catalog order (deterministic, not a capability ranking). */
const CATALOG_ORDER: Record<string, number> = { decouverte: 0, oasis: 1, wellness: 2, spa365: 3 }

/** Highest annual price wins for DISPLAY only (deterministic). */
function displayRank(plan: PlanId): number {
  const p = getPlan(plan)
  return p?.price.year ?? 0
}

/** Deterministic display selection: highest price, then catalog order. */
export function pickDisplayPlan(plans: PlanId[]): PlanId {
  if (plans.length === 0) return DEFAULT_PLAN
  return [...plans].sort((a, b) => {
    const pa = displayRank(a)
    const pb = displayRank(b)
    if (pb !== pa) return pb - pa
    return (CATALOG_ORDER[a] ?? 0) - (CATALOG_ORDER[b] ?? 0)
  })[0]
}

/** Deterministic granted-plans order: catalog order. */
function sortGrantedPlans(plans: PlanId[]): PlanId[] {
  return [...new Set(plans)].sort((a, b) => (CATALOG_ORDER[a] ?? 0) - (CATALOG_ORDER[b] ?? 0))
}

/** Union of the feature strings of all granted paid plans. */
function unionFeatures(plans: PlanId[]): string[] {
  const seen = new Set<string>()
  const features: string[] = []
  for (const plan of sortGrantedPlans(plans)) {
    const def = getPlan(plan)
    if (!def || plan === 'decouverte') continue
    for (const f of def.features) {
      if (!seen.has(f)) {
        seen.add(f)
        features.push(f)
      }
    }
  }
  return features
}

/** Kept for backwards compatibility with callers that expect a single row. */
export function pickBestValidRow(
  rows: { plan: string; status: string; expiresAt: Date | null }[],
): { plan: string; status: string; expiresAt: Date | null } | null {
  const valid = rows.filter((r) => statusGrantsAccess(r.status as SubscriptionStatus, r.expiresAt))
  if (valid.length === 0) return null
  return valid.reduce((best, current) => {
    const bestRank = displayRank(current.plan as PlanId) - displayRank(best.plan as PlanId)
    if (bestRank > 0) return current
    if (bestRank === 0) {
      const bestEnd = best.expiresAt?.getTime() ?? 0
      const currentEnd = current.expiresAt?.getTime() ?? 0
      return currentEnd > bestEnd ? current : best
    }
    return best
  })
}

/**
 * Loads all subscriptions for a user within ONE explicit access environment and
 * returns the TRUE capability union.
 */
export async function loadUserEntitlements(
  userId: string,
  accessEnvironment: BillingEnvironment,
): Promise<EntitlementProjection> {
  const subs = await db.subscription.findMany({
    where: { userId, environment: accessEnvironment },
    orderBy: [{ startedAt: 'desc' }],
  })

  const rows: GrantSource[] = subs.map((s) => ({
    id: s.id,
    plan: s.plan as PlanId,
    status: s.status as SubscriptionStatus,
    active: s.active,
    provider: s.provider,
    environment: s.environment,
    store: s.store ?? inferStore(s.provider),
    expiresAt: s.expiresAt,
    startedAt: s.startedAt,
    valid: statusGrantsAccess(s.status as SubscriptionStatus, s.expiresAt),
  }))

  const validRows = rows.filter((r) => r.valid && r.plan !== 'decouverte')
  const grantedPlans = sortGrantedPlans(validRows.map((r) => r.plan))
  const hasValidAccess = grantedPlans.length > 0

  const grantedDefs = grantedPlans
    .map((p) => getPlan(p))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  const effectiveLimits = combineLimits(grantedDefs)

  const displayPlan = pickDisplayPlan(grantedPlans.length > 0 ? grantedPlans : [DEFAULT_PLAN])
  const displayRow = validRows.find((r) => r.plan === displayPlan) || validRows[0] || null

  return {
    hasValidAccess,
    grantedPlans,
    grantedFeatures: unionFeatures(grantedPlans),
    effectiveLimits,
    displayPlan,
    displayStatus: displayRow?.status ?? 'inactive',
    displayExpiresAt: displayRow?.expiresAt ?? null,
    sources: validRows,
    rows,
    best: displayRow
      ? {
          plan: displayRow.plan,
          status: displayRow.status,
          expiresAt: displayRow.expiresAt,
          provider: displayRow.provider,
          environment: displayRow.environment,
        }
      : null,
  }
}

function inferStore(provider: string | null): string | null {
  if (provider === 'stripe') return 'web'
  if (provider === 'revenuecat') return null
  return null
}

/** The effective granted plans for gate evaluation (union). */
export function grantedPlansForUser(
  userId: string,
  accessEnvironment: BillingEnvironment,
): Promise<PlanId[]> {
  return loadUserEntitlements(userId, accessEnvironment).then((e) => e.grantedPlans)
}

/** Backward-compatible single-plan resolver (deprecated, kept for callers). */
export function resolveUnionPlan(
  rows: { plan: PlanId; status: SubscriptionStatus; expiresAt: Date | null }[],
): PlanId {
  const best = pickBestValidRow(rows)
  return (best?.plan as PlanId) || DEFAULT_PLAN
}

/** Backward-compatible single-plan helper (deprecated). */
export async function effectivePlanForUser(
  userId: string,
  accessEnvironment: BillingEnvironment,
): Promise<{ planId: PlanId; status: SubscriptionStatus; expiresAt: Date | null }> {
  const e = await loadUserEntitlements(userId, accessEnvironment)
  return {
    planId: e.displayPlan ?? DEFAULT_PLAN,
    status: e.displayStatus,
    expiresAt: e.displayExpiresAt,
  }
}
