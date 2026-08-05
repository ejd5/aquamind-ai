/**
 * AQWELIA Wave A2 (Round 1) — RevenueCat client identity guard + convergence.
 *
 * Purchase / restore / getEntitlements / getProducts are only allowed once the
 * bridge is fully ready: SDK identity confirmed AND server identity bound. The
 * server identity binding happens inside the manager immediately after
 * Purchases.logIn (it does NOT wait for an entitlement).
 *
 * After a purchase the client refreshes CustomerInfo but only treats the
 * server-side access as CONVERGED after reading GET /api/subscription.
 */

import { revenueCatManager } from '@/lib/billing/revenuecat-manager'

export { RevenueCatIdentityNotReadyError } from '@/lib/billing/revenuecat-manager'

export type { RevenueCatManagerSnapshot as RevenueCatBridgeSnapshot } from '@/lib/billing/revenuecat-manager'

/**
 * Waits for the identity transition queue to drain, then requires a fully ready
 * identity (SDK confirmed + server bound). Throws fail-closed otherwise.
 */
export async function requireConfirmedRevenueCatIdentity(): Promise<string> {
  return revenueCatManager.requireReady()
}

/**
 * After a successful purchase/restore the client refreshes CustomerInfo, then
 * reads GET /api/subscription to confirm the server projection converged.
 * Returns true when the server sees an active subscription for the user.
 */
export async function confirmServerAccessConverged(userId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/subscription', {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return false
    const body = (await res.json()) as {
      subscription?: { userId?: string; active?: boolean } | null
      plan?: { id?: string } | null
    }
    const sub = body?.subscription
    if (!sub || sub.userId !== userId) return false
    if (sub.active === true) return true
    return Boolean(body?.plan && body.plan.id !== 'decouverte')
  } catch {
    return false
  }
}
