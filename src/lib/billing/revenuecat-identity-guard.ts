/**
 * AQWELIA Wave A2 (Round 3) — RevenueCat client identity guard + EXPECTED-SOURCE
 * server convergence.
 *
 * Purchase / restore / getEntitlements / getProducts are only allowed once the
 * bridge is fully ready: SDK identity confirmed AND server identity bound.
 *
 * CONVERGENCE CONTRACT (Round 3, critical fix)
 * -------------------------------------------
 * A RevenueCat purchase/restore is CONVERGED only when GET /api/subscription's
 * `sources` contains a VALID source that matches EVERY expected criterion:
 *   - userId        : the authenticated AQWELIA user
 *   - provider      : 'revenuecat' (a pre-existing Stripe row of the SAME plan
 *                     is NEVER sufficient — it would be a false positive)
 *   - environment   : the expected billing environment
 *   - expectedPlans : the plan(s) bought / restored. For purchase, exactly the
 *                     purchased plan must be present. For restore, ALL restored
 *                     active RevenueCat entitlements must be present (all-required
 *                     contract — documented in restorePurchases).
 *   - store (optional): when the platform is known it is also checked.
 *
 * A source is "valid" when access.sources reports it (the projection already
 * filters by the server access environment and statusGrantsAccess).
 *
 * Bounded polling: at most `attempts` reads, tunable via env
 * (REVENUECAT_CONVERGENCE_ATTEMPTS / REVENUECAT_CONVERGENCE_INTERVAL_MS).
 */

import { revenueCatManager } from '@/lib/billing/revenuecat-manager'
import type { PlanId, BillingPlatform } from './types'

export { RevenueCatIdentityNotReadyError } from '@/lib/billing/revenuecat-manager'

export type { RevenueCatManagerSnapshot as RevenueCatBridgeSnapshot } from '@/lib/billing/revenuecat-manager'

/**
 * Waits for the identity transition queue to drain, then requires a fully ready
 * identity (SDK confirmed + server bound). Throws fail-closed otherwise.
 */
export async function requireConfirmedRevenueCatIdentity(): Promise<string> {
  return revenueCatManager.requireReady()
}

/** The source shape exposed by GET /api/subscription. */
export interface ConvergedSource {
  plan: PlanId
  provider: string
  environment: string
  store: string | null
  status: string
  expiresAt: string | null
}

export interface SubscriptionConvergencePayload {
  subscription?: {
    userId?: string
    active?: boolean
    plan?: string
    provider?: string | null
    environment?: string | null
    store?: string | null
  } | null
  plan?: { id?: string } | null
  access?: {
    hasValidAccess?: boolean
    grantedPlans?: PlanId[]
  } | null
  sources?: ConvergedSource[]
}

export interface ExpectedRevenueCatSource {
  /** Authenticated AQWELIA user. */
  userId: string
  provider: 'revenuecat'
  environment: 'sandbox' | 'production'
  /** Plans that MUST be present as valid RevenueCat sources. */
  expectedPlans: PlanId[]
  /** Optional platform hint. */
  store?: BillingPlatform | null
}

/**
 * Fetches GET /api/subscription and returns the raw convergence payload.
 */
export async function fetchSubscriptionConvergence(): Promise<SubscriptionConvergencePayload | null> {
  try {
    const res = await fetch('/api/subscription', {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as SubscriptionConvergencePayload
  } catch {
    return null
  }
}

/**
 * True ONLY when the response belongs to the expected user AND `sources`
 * contains a valid source matching every expected criterion. A pre-existing
 * Stripe subscription of the same plan NEVER counts.
 *
 * Wave A2 (Round 4): the expected `userId` is MANDATORY — the matcher is NOT
 * userId-agnostic. If `subscription` is absent or its `userId` differs from
 * `expected.userId`, convergence is false.
 */
export function subscriptionConvergesForExpectedSource(
  body: SubscriptionConvergencePayload | null,
  expected: ExpectedRevenueCatSource,
): boolean {
  if (!body) return false
  // The response must belong to the expected user.
  if (!body.subscription || body.subscription.userId !== expected.userId) return false
  if (!Array.isArray(body.sources) || body.sources.length === 0) return false
  const matching = body.sources.filter((s) => {
    if (s.provider !== expected.provider) return false
    if (s.environment !== expected.environment) return false
    if (expected.store && s.store !== null && s.store !== expected.store) return false
    return expected.expectedPlans.includes(s.plan)
  })
  if (matching.length === 0) return false
  const matchedPlans = new Set(matching.map((s) => s.plan))
  return expected.expectedPlans.every((p) => matchedPlans.has(p))
}

/**
 * DEPRECATED — kept only for callers that need the old coarse check. NOT used
 * by purchase/restore (which use the expected-source contract).
 */
export async function confirmServerAccessConverged(userId: string): Promise<boolean> {
  const body = await fetchSubscriptionConvergence()
  if (!body?.subscription || body.subscription.userId !== userId) return false
  if (body.subscription.active === true) return true
  return Boolean(body?.plan && body.plan.id !== 'decouverte')
}

/**
 * Bounded, testable poll for the EXPECTED RevenueCat source. Never loops
 * forever. Returns { converged, body } so callers can also inspect the last
 * projection.
 */
export async function awaitRevenueCatSourceConvergence(
  expected: ExpectedRevenueCatSource,
  opts?: { attempts?: number; intervalMs?: number },
): Promise<{ converged: boolean; body: SubscriptionConvergencePayload | null }> {
  const attempts = Math.max(1, Math.min(10, opts?.attempts ?? Number(process.env.REVENUECAT_CONVERGENCE_ATTEMPTS ?? 5)))
  const intervalMs = Math.max(0, opts?.intervalMs ?? Number(process.env.REVENUECAT_CONVERGENCE_INTERVAL_MS ?? 1000))
  let body: SubscriptionConvergencePayload | null = null
  for (let i = 0; i < attempts; i += 1) {
    body = await fetchSubscriptionConvergence()
    if (subscriptionConvergesForExpectedSource(body, expected)) {
      return { converged: true, body }
    }
    if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return { converged: false, body }
}

/** Backward-compatible name for the bounded expected-source poll. */
export function awaitServerConvergence(
  expected: ExpectedRevenueCatSource,
  opts?: { attempts?: number; intervalMs?: number },
): Promise<{ converged: boolean; body: SubscriptionConvergencePayload | null }> {
  return awaitRevenueCatSourceConvergence(expected, opts)
}
