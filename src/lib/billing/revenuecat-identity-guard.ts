/**
 * AQWELIA Wave A2 — RevenueCat client identity guard + convergence.
 *
 * Purchase / restore / getEntitlements / getProducts are only allowed once the
 * bridge is fully ready: SDK identity confirmed AND server identity bound. The
 * server identity binding happens inside the manager immediately after
 * Purchases.logIn (it does NOT wait for an entitlement).
 *
 * After a purchase OR restore the client refreshes CustomerInfo but only treats
 * the server-side access as CONVERGED after reading GET /api/subscription. When
 * the webhook has not arrived yet, a BOUNDED poll (awaitServerConvergence)
 * reports 'pending' — never a definitive active from local CustomerInfo alone.
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
 * Reads GET /api/subscription and returns true when the server projection shows
 * an active (non-Free) entitlement for the user.
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

/**
 * Bounded, testable convergence poll. Never loops forever: at most `attempts`
 * reads of GET /api/subscription with `intervalMs` between them. Attempts and
 * interval are overridable via env (REVENUECAT_CONVERGENCE_ATTEMPTS /
 * REVENUECAT_CONVERGENCE_INTERVAL_MS) so tests stay fast.
 */
export async function awaitServerConvergence(
  userId: string,
  opts?: { attempts?: number; intervalMs?: number },
): Promise<{ converged: boolean }> {
  const attempts = Math.max(1, Math.min(10, opts?.attempts ?? Number(process.env.REVENUECAT_CONVERGENCE_ATTEMPTS ?? 5)))
  const intervalMs = Math.max(0, opts?.intervalMs ?? Number(process.env.REVENUECAT_CONVERGENCE_INTERVAL_MS ?? 1000))
  for (let i = 0; i < attempts; i += 1) {
    if (await confirmServerAccessConverged(userId)) return { converged: true }
    if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return { converged: false }
}
