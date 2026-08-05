/**
 * AQWELIA Wave A2 — RevenueCat client identity guard + server convergence.
 *
 * Purchase / restore / getEntitlements are only allowed once the expected
 * AQWELIA identity is confirmed with the RevenueCat SDK (see
 * revenuecat-identity.ts). After a purchase or restore the client refreshes
 * CustomerInfo but only treats the server-side access as CONVERGED after
 * reading GET /api/subscription.
 */

import { isNative } from '@/lib/platform'
import { revenueCatIdentityBridge, identityQueueDrained } from '@/lib/billing/revenuecat-identity'

export class RevenueCatIdentityNotConfirmedError extends Error {
  constructor() {
    super('RevenueCat identity is not confirmed for the current user')
    this.name = 'RevenueCatIdentityNotConfirmedError'
  }
}

/**
 * Waits for the identity transition queue to drain, then verifies that an
 * identity is confirmed. Throws fail-closed otherwise.
 */
export async function requireConfirmedRevenueCatIdentity(): Promise<void> {
  await identityQueueDrained()
  if (!isNative()) return
  const snap = revenueCatIdentityBridge.snapshot()
  if (snap.state !== 'ready' || !snap.confirmedUserId || snap.expectedUserId !== snap.confirmedUserId) {
    throw new RevenueCatIdentityNotConfirmedError()
  }
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
    // Server access is converged when an active subscription exists.
    if (sub.active === true) return true
    // Otherwise fall back to the plan projection (non-decouverte).
    return Boolean(body?.plan && body.plan.id !== 'decouverte')
  } catch {
    return false
  }
}

/** Registers (or re-asserts) the canonical billing identity with the server. */
export async function registerRevenueCatIdentityServerSide(args: {
  userId: string
  environment?: string
  externalUserId: string
}): Promise<{ ok: boolean }> {
  if (!isNative()) return { ok: true }
  try {
    const res = await fetch('/api/billing/identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'revenuecat',
        environment: args.environment ?? 'production',
        externalUserId: args.externalUserId,
        userId: args.userId,
      }),
    })
    if (!res.ok) return { ok: false }
    const body = (await res.json()) as { ok?: boolean }
    return { ok: body.ok === true }
  } catch {
    return { ok: false }
  }
}
