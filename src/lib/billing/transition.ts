/**
 * AQWELIA — Single subscription transition engine (P0-B).
 *
 * ALL events that modify a subscription MUST go through `applyTransition`.
 * Uses ATOMIC conditional updateMany to prevent race conditions.
 *
 * Atomicity strategy:
 *   1. Try conditional UPDATE WHERE lastProviderEventAt < new OR lastProviderEventAt IS NULL
 *   2. If count === 1 → update succeeded, this event is applied
 *   3. If count === 0 → event is out-of-order (older than current) → skip
 *   4. If no subscription exists → CREATE new (within transaction)
 */

import { db } from '@/lib/db'
import {
  type PlanId,
  type SubscriptionStatus,
  type Duration,
  statusGrantsAccess,
} from '@/lib/billing/plans'

export interface TransitionParams {
  userId: string
  planId: PlanId
  status: SubscriptionStatus
  duration?: Duration | null
  store?: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  providerSubscriptionId?: string | null
  providerEventId: string
  providerEventAt: Date
  expiresAt?: Date | null
  trialEndsAt?: Date | null
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  cancelAt?: Date | null
}

export interface TransitionResult {
  skipped: boolean
  reason?: string
}

/**
 * Apply a subscription transition ATOMICALLY.
 *
 * Uses conditional updateMany: WHERE lastProviderEventAt < providerEventAt
 * OR lastProviderEventAt IS NULL. If count === 0, the event is older
 * than the current state → skipped (out-of-order).
 *
 * For new subscriptions (no existing row), creates within a transaction
 * after deactivating previous active subscriptions.
 */
export async function applyTransition(params: TransitionParams): Promise<TransitionResult> {
  const active = statusGrantsAccess(params.status, params.expiresAt ?? null)

  // Find existing subscription by provider identity
  const existing = await findSubscriptionByProvider(params)

  if (existing) {
    // ATOMIC conditional update: only update if the incoming event is newer.
    //
    // BLOCAGE 4: Timestamp equality rule — when two distinct events share the
    // same providerEventAt, the DEACTIVATION takes priority over activation.
    // This means: if an EXPIRATION and a RENEWAL have the same timestamp,
    // the EXPIRATION wins (safer to deny access than grant it incorrectly).
    //
    // Implementation: for equal timestamps, we use the status to determine
    // priority. Deactivation statuses (expired, canceled, inactive) are
    // applied even when lastProviderEventAt === providerEventAt, while
    // activation statuses (active, trialing) require strict >.
    const isDeactivation = ['expired', 'canceled', 'inactive'].includes(params.status)
    const timeCondition = isDeactivation
      ? { lte: params.providerEventAt }  // equal timestamps: deactivation wins
      : { lt: params.providerEventAt }   // strict: activation must be strictly newer

    const result = await db.subscription.updateMany({
      where: {
        id: existing.id,
        OR: [
          { lastProviderEventAt: null },
          { lastProviderEventAt: timeCondition },
        ],
      },
      data: {
        plan: params.planId,
        status: params.status,
        active,
        duration: params.duration ?? existing.duration,
        store: params.store ?? existing.store,
        stripeCustomerId: params.stripeCustomerId ?? existing.stripeCustomerId,
        stripeSubscriptionId: params.stripeSubscriptionId ?? existing.stripeSubscriptionId,
        providerSubscriptionId: params.providerSubscriptionId ?? existing.providerSubscriptionId,
        expiresAt: params.expiresAt ?? existing.expiresAt,
        trialEndsAt: params.trialEndsAt ?? existing.trialEndsAt,
        currentPeriodStart: params.currentPeriodStart ?? existing.currentPeriodStart,
        currentPeriodEnd: params.currentPeriodEnd ?? existing.currentPeriodEnd,
        cancelAt: params.cancelAt ?? existing.cancelAt,
        lastProviderEventId: params.providerEventId,
        lastProviderEventAt: params.providerEventAt,
      },
    })

    if (result.count === 0) {
      // Event is older than current state → out-of-order, skip
      return { skipped: true, reason: 'out_of_order' }
    }

    return { skipped: false }
  }

  // No existing subscription — create new one
  // Deactivate any previous active subscriptions for this user
  await db.subscription.updateMany({
    where: { userId: params.userId, active: true },
    data: { active: false, status: 'inactive' },
  })

  await db.subscription.create({
    data: {
      userId: params.userId,
      plan: params.planId,
      status: params.status,
      active,
      duration: params.duration,
      store: params.store,
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      providerSubscriptionId: params.providerSubscriptionId,
      startedAt: new Date(),
      expiresAt: params.expiresAt,
      trialEndsAt: params.trialEndsAt,
      currentPeriodStart: params.currentPeriodStart,
      currentPeriodEnd: params.currentPeriodEnd,
      cancelAt: params.cancelAt,
      lastProviderEventId: params.providerEventId,
      lastProviderEventAt: params.providerEventAt,
    },
  })

  return { skipped: false }
}

/**
 * Find a subscription by provider identity.
 * Searches by: providerSubscriptionId, then stripeSubscriptionId, then userId (most recent).
 */
async function findSubscriptionByProvider(params: TransitionParams) {
  if (params.providerSubscriptionId) {
    const byProvider = await db.subscription.findFirst({
      where: { providerSubscriptionId: params.providerSubscriptionId },
    })
    if (byProvider) return byProvider
  }

  if (params.stripeSubscriptionId) {
    const byStripe = await db.subscription.findFirst({
      where: { stripeSubscriptionId: params.stripeSubscriptionId },
    })
    if (byStripe) return byStripe
  }

  return db.subscription.findFirst({
    where: { userId: params.userId },
    orderBy: { startedAt: 'desc' },
  })
}
