/**
 * AQWELIA Wave A2 — canonical billing identity (server side).
 *
 * Resolves a provider's external user id (RevenueCat `app_user_id`, Stripe
 * `customer`) to exactly one AQWELIA User via the `BillingIdentity` table.
 * Uniqueness is (provider, environment, externalUserId). An externalUserId can
 * only ever belong to one User.
 *
 * The RevenueCat webhook MUST resolve `app_user_id` through this module:
 *   - missing app_user_id        → ignored (missing_user_identity)
 *   - `$RCAnonymousID*`           → ignored (anonymous_identity)
 *   - unknown BillingIdentity     → ignored (unknown_user_identity) unless it
 *     matches the current user's own id (upsert path used by the client bridge)
 *   - ownership conflict A/B      → ignored with a stable reason, never moved
 */

import { db } from '@/lib/db'

export type BillingProvider = 'stripe' | 'revenuecat'
export type BillingEnvironment = 'sandbox' | 'production'

export const RC_ANONYMOUS_PREFIX = '$RCAnonymousID'

export interface BillingIdentityRow {
  id: string
  userId: string
  provider: string
  environment: string
  externalUserId: string
  createdAt: Date
  updatedAt: Date
}

/** True when the RevenueCat id is the anonymous placeholder. */
export function isRevenueCatAnonymous(appUserId: string | null | undefined): boolean {
  return typeof appUserId === 'string' && appUserId.startsWith(RC_ANONYMOUS_PREFIX)
}

/** Normalizes a RevenueCat environment string into our enum. */
export function normalizeRevenueCatEnvironment(env: string | null | undefined): BillingEnvironment {
  const lower = String(env ?? '').toLowerCase()
  if (lower.includes('sandbox')) return 'sandbox'
  return 'production'
}

/**
 * Resolves an external user id to an AQWELIA User id, scoped by provider +
 * environment. Returns null when unknown.
 */
export async function resolveBillingIdentityUserId(
  provider: BillingProvider,
  environment: BillingEnvironment,
  externalUserId: string,
): Promise<string | null> {
  if (!externalUserId) return null
  const row = await db.billingIdentity.findUnique({
    where: {
      provider_environment_externalUserId: {
        provider,
        environment,
        externalUserId,
      },
    },
  })
  return row?.userId ?? null
}

/**
 * Verifies the User actually exists for a resolved id.
 */
export async function billingUserExists(userId: string): Promise<boolean> {
  if (!userId) return false
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } })
  return Boolean(user)
}

/**
 * Upserts a billing identity binding. If the same (provider, environment,
 * externalUserId) is already bound to a DIFFERENT user, the conflict is
 * returned as an error — it is never silently transferred.
 *
 * Returns { ok: true, row } on success, or { ok: false, code, reason } on
 * conflict.
 */
export async function upsertBillingIdentity(args: {
  provider: BillingProvider
  environment: BillingEnvironment
  externalUserId: string
  userId: string
}): Promise<
  | { ok: true; row: BillingIdentityRow }
  | { ok: false; code: 'identity_conflict'; reason: string }
> {
  const { provider, environment, externalUserId, userId } = args
  if (!externalUserId || isRevenueCatAnonymous(externalUserId)) {
    return { ok: false, code: 'identity_conflict', reason: 'invalid_external_user_id' }
  }
  const existing = await db.billingIdentity.findUnique({
    where: {
      provider_environment_externalUserId: { provider, environment, externalUserId },
    },
  })
  if (existing) {
    if (existing.userId !== userId) {
      return {
        ok: false,
        code: 'identity_conflict',
        reason: `external_user_id_belongs_to_another_user`,
      }
    }
    return { ok: true, row: existing }
  }
  const row = await db.billingIdentity.create({
    data: { provider, environment, externalUserId, userId },
  })
  return { ok: true, row }
}
