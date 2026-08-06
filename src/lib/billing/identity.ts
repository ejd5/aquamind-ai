/**
 * AQWELIA Wave A2 (Round 1) — canonical billing identity (server side).
 *
 * RevenueCat uses the SAME App User ID for sandbox and production, so the
 * canonical identity is scoped by (provider, externalUserId) only — the billing
 * ENVIRONMENT is never stored here and is always determined server-side:
 *   - the webhook records the payload environment (validated, never defaulted);
 *   - entitlement access uses getBillingAccessEnvironment() (fail-closed).
 *
 * The webhook resolves app_user_id / original_app_user_id / aliases through
 * resolveRevenueCatIdentity(): candidates are filtered, anonymous ids are
 * recognised, all non-anonymous ids must converge on ONE User (multiple Users =
 * identity_conflict / quarantine), no resolved User = transient (retryable),
 * and the User must really exist.
 */

import { db } from '@/lib/db'

// Wave A2 (Round 4): types + pure helpers are CLIENT-SAFE and live in
// billing-types.ts (no db / Prisma / server import). This server module
// imports them for local use and re-exports so existing server callers keep
// working unchanged.
import {
  isRevenueCatAnonymous,
  parseRevenueCatEnvironment,
  RC_ANONYMOUS_PREFIX,
  type BillingEnvironment,
  type BillingProvider,
} from './billing-types'

export { isRevenueCatAnonymous, parseRevenueCatEnvironment, RC_ANONYMOUS_PREFIX }
export type { BillingEnvironment, BillingProvider }

export interface BillingIdentityRow {
  id: string
  userId: string
  provider: string
  externalUserId: string
  createdAt: Date
  updatedAt: Date
}

export type DeploymentEnvironment = 'production' | 'staging' | 'development'

const VALID_DEPLOYMENT_ENVS: ReadonlySet<string> = new Set(['production', 'staging', 'development'])

/**
 * Canonical server-side source of the billing access environment (fail-closed).
 *
 * The deployment is determined by the EXPLICIT variable AQWELIA_DEPLOYMENT_ENV
 * (production | staging | development) — NOT by NODE_ENV (Vercel sets
 * NODE_ENV=production on BOTH Production and Staging). Rules:
 *   - production  : ONLY environment='production' grants access. BILLING_ALLOW_SANDBOX
 *                   can NEVER override this.
 *   - staging     : sandbox is allowed ONLY when BILLING_ALLOW_SANDBOX=true;
 *                   otherwise 'production' (fail-closed).
 *   - development : sandbox allowed only when BILLING_ALLOW_SANDBOX=true;
 *                   otherwise 'production'.
 *   - absent or INVALID AQWELIA_DEPLOYMENT_ENV : FAIL-CLOSED to 'production'
 *     (never grants sandbox by default). An invalid configuration behaves like
 *     production — no sandbox access is ever leaked.
 *
 * The client can never choose the environment: it is always server-derived.
 * Testable via the overrides parameter.
 */
export function getBillingAccessEnvironment(overrides?: {
  deploymentEnv?: string
  allowSandbox?: boolean | string
}): BillingEnvironment {
  const deploymentEnv =
    overrides?.deploymentEnv ??
    process.env.AQWELIA_DEPLOYMENT_ENV ??
    ''

  // Absent or invalid → fail-closed to production (sandbox never granted).
  if (!VALID_DEPLOYMENT_ENVS.has(deploymentEnv.trim().toLowerCase())) {
    return 'production'
  }
  const normalized = deploymentEnv.trim().toLowerCase() as DeploymentEnvironment

  // Production NEVER allows sandbox, whatever BILLING_ALLOW_SANDBOX says.
  if (normalized === 'production') return 'production'

  // staging / development: sandbox only when explicitly enabled.
  const allow = overrides?.allowSandbox ?? process.env.BILLING_ALLOW_SANDBOX
  if (allow === true || allow === 'true') return 'sandbox'
  return 'production'
}

/**
 * Resolves an external user id to an AQWELIA User id. Canonical per provider —
 * the environment is intentionally absent: RevenueCat reuses the same App User
 * ID for sandbox and production. Returns null when unknown.
 */
export async function resolveBillingIdentityUserId(
  provider: BillingProvider,
  externalUserId: string,
): Promise<string | null> {
  if (!externalUserId) return null
  const row = await db.billingIdentity.findUnique({
    where: {
      provider_externalUserId: { provider, externalUserId },
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
 * Concurrent-safe upsert of a billing identity binding. If the same
 * (provider, externalUserId) is already bound to a DIFFERENT user, the conflict
 * is returned as an error — it is never silently transferred. A unique-race
 * (P2002) is resolved by re-reading the winner instead of throwing a 500.
 *
 * Returns { ok: true, row } on success, or { ok: false, code, reason } on
 * conflict.
 */
export async function upsertBillingIdentity(args: {
  provider: BillingProvider
  externalUserId: string
  userId: string
}): Promise<
  | { ok: true; row: BillingIdentityRow }
  | { ok: false; code: 'identity_conflict'; reason: string }
> {
  const { provider, externalUserId, userId } = args
  if (!externalUserId || isRevenueCatAnonymous(externalUserId)) {
    return { ok: false, code: 'identity_conflict', reason: 'invalid_external_user_id' }
  }
  const existing = await db.billingIdentity.findUnique({
    where: { provider_externalUserId: { provider, externalUserId } },
  })
  if (existing) {
    if (existing.userId !== userId) {
      return { ok: false, code: 'identity_conflict', reason: 'external_user_id_belongs_to_another_user' }
    }
    return { ok: true, row: existing }
  }
  try {
    const row = await db.billingIdentity.create({
      data: { provider, externalUserId, userId },
    })
    return { ok: true, row }
  } catch (err) {
    // Concurrent upsert race: someone else created the binding first.
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
      const winner = await db.billingIdentity.findUnique({
        where: { provider_externalUserId: { provider, externalUserId } },
      })
      if (!winner) throw err
      if (winner.userId !== userId) {
        return { ok: false, code: 'identity_conflict', reason: 'external_user_id_belongs_to_another_user' }
      }
      return { ok: true, row: winner }
    }
    throw err
  }
}

/**
 * Canonical RevenueCat identity resolution — used by the webhook BEFORE any
 * transition or idempotency reservation.
 *
 * Candidates are taken from app_user_id, original_app_user_id and aliases[].
 * Empty / missing candidates are dropped and anonymous ($RCAnonymousID*) ids
 * are recognised. All NON-anonymous candidates are looked up in BillingIdentity
 * and must converge on a single User:
 *   - several distinct Users → { conflict } (quarantine, never transferred);
 *   - no resolved User → { transient } (retryable 503, never a definitive
 *     accept or reject);
 *   - exactly one User that does not exist → { transient };
 *   - exactly one existing User → { ok }.
 *
 * An anonymous app_user_id is only accepted when a non-anonymous alias resolves
 * to a known canonical identity.
 */
export async function resolveRevenueCatIdentity(
  event: Record<string, unknown>,
): Promise<
  | { ok: true; userId: string; matchedExternalId: string }
  | { ok: false; code: 'identity_conflict' | 'transient_unknown'; reason: string }
> {
  const candidates = collectCandidateIds(event)
  if (candidates.length === 0) {
    return { ok: false, code: 'transient_unknown', reason: 'no_identity_candidates' }
  }

  // Non-anonymous candidates are the only trustworthy ones.
  const canonicalIds = candidates.filter((id) => !isRevenueCatAnonymous(id))

  const resolved = new Map<string, string>() // externalId -> userId
  for (const id of canonicalIds) {
    const userId = await resolveBillingIdentityUserId('revenuecat', id)
    if (userId) resolved.set(id, userId)
  }

  if (resolved.size === 0) {
    // No canonical candidate is bound yet (the client may still be logging in
    // and binding the identity). This is transient, not a definitive reject.
    return { ok: false, code: 'transient_unknown', reason: 'no_bound_identity' }
  }

  const distinctUsers = new Set(resolved.values())
  if (distinctUsers.size > 1) {
    return { ok: false, code: 'identity_conflict', reason: 'identity_aliases_conflict' }
  }

  const userId = resolved.values().next().value as string
  if (!(await billingUserExists(userId))) {
    return { ok: false, code: 'transient_unknown', reason: 'resolved_user_missing' }
  }

  const matchedExternalId = resolved.keys().next().value as string
  return { ok: true, userId, matchedExternalId }
}

/**
 * Collects non-empty identity candidates from app_user_id, original_app_user_id
 * and aliases[]. Duplicates are removed.
 */
function collectCandidateIds(event: Record<string, unknown>): string[] {
  const ids = new Set<string>()
  for (const key of ['app_user_id', 'original_app_user_id'] as const) {
    const value = event[key]
    if (typeof value === 'string' && value.trim() !== '') ids.add(value.trim())
  }
  const aliases = event.aliases
  if (Array.isArray(aliases)) {
    for (const alias of aliases) {
      if (typeof alias === 'string' && alias.trim() !== '') ids.add(alias.trim())
    }
  }
  return [...ids]
}
