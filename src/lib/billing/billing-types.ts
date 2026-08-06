/**
 * AQWELIA Wave A2 (Round 4) — CLIENT-SAFE billing types & pure helpers.
 *
 * This module is the ONLY place where the client (revenuecat-manager,
 * revenuecat-identity, the RevenueCat hook, Providers) may import billing
 * types. It MUST NEVER import Prisma, @/lib/db, next-auth server, server-only,
 * or any server secret. Every export here is either a type or a pure function.
 *
 * The billing ACCESS ENVIRONMENT is NEVER computed here: it is always provided
 * by the server (POST /api/billing/identity response). Server-side logic lives
 * in @/lib/billing/identity which imports @/lib/db.
 */

export type BillingEnvironment = 'sandbox' | 'production'

export type BillingProvider = 'stripe' | 'revenuecat'

export const RC_ANONYMOUS_PREFIX = '$RCAnonymousID'

/** True when the RevenueCat id is the anonymous placeholder. */
export function isRevenueCatAnonymous(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(RC_ANONYMOUS_PREFIX)
}

/**
 * Strict RevenueCat environment parsing (pure). Returns null for an absent or
 * invalid value — NEVER defaults to 'production'. Used server-side by the
 * webhook; kept here so it stays free of any server import.
 */
export function parseRevenueCatEnvironment(env: string | null | undefined): BillingEnvironment | null {
  if (typeof env !== 'string') return null
  const lower = env.toLowerCase().trim()
  if (lower === 'sandbox') return 'sandbox'
  if (lower === 'production') return 'production'
  return null
}

/** Strictly validates a server-provided billing access environment string. */
export function isBillingEnvironment(value: string | null | undefined): value is BillingEnvironment {
  return value === 'sandbox' || value === 'production'
}
