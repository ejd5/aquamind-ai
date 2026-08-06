/**
 * AQWELIA Wave A2 (Round 2) — deterministic entitlement resolution.
 *
 * Removes every business selection based on `entitlements.find((e) => e.isActive)`
 * (which is iteration-order dependent). This module provides the ONE canonical,
 * deterministic resolution used by:
 *   - purchase
 *   - restore
 *   - getActivePlan
 *   - client display
 *
 * Active entitlements are sorted by a total order (highest annual price, then
 * catalog order) so the result is identical whatever the input order.
 */

import type { Entitlement, PlanId } from './types'
import { getPlan } from './plans'

const CATALOG_ORDER: Record<string, number> = { oasis: 1, spa365: 2, wellness: 3 }

/**
 * Returns the ACTIVE entitlements sorted deterministically. Inactive
 * entitlements are excluded.
 */
export function resolveActiveEntitlements(entitlements: Entitlement[]): Entitlement[] {
  return entitlements
    .filter((e) => e.isActive)
    .sort((a, b) => {
      const pa = getPlan(a.plan)?.price.year ?? 0
      const pb = getPlan(b.plan)?.price.year ?? 0
      if (pb !== pa) return pb - pa
      return (CATALOG_ORDER[a.plan] ?? 0) - (CATALOG_ORDER[b.plan] ?? 0)
    })
}

/** The display entitlement (first in the canonical order), or null. */
export function pickDisplayEntitlement(entitlements: Entitlement[]): Entitlement | null {
  return resolveActiveEntitlements(entitlements)[0] ?? null
}

/** The active plans, sorted deterministically. */
export function plansFromEntitlements(entitlements: Entitlement[]): PlanId[] {
  return resolveActiveEntitlements(entitlements).map((e) => e.plan)
}

/** True when at least one entitlement is active. */
export function hasActiveEntitlement(entitlements: Entitlement[]): boolean {
  return entitlements.some((e) => e.isActive)
}
