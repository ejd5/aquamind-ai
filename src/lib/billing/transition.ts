/**
 * AQWELIA — Single subscription transition engine (P0-B blocage 3).
 *
 * ALL events that modify a subscription MUST go through `applyTransition`.
 * No direct db.subscription writes are allowed outside this function.
 *
 * Out-of-order protection:
 *   - Compares providerEventAt (Stripe event.created / RC event_timestamp_ms)
 *   - If incoming event is older than lastProviderEventAt → skip
 *   - Finds subscription by providerSubscriptionId (not just active=true)
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
  providerSubscriptionId?: string | null // RC original_transaction_id or Stripe sub ID
  providerEventId: string
  providerEventAt: Date // Stripe event.created * 1000 or RC event_timestamp_ms
  expiresAt?: Date | null
  trialEndsAt?: Date | null
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  cancelAt?: Date | null
}

/**
 * Apply a subscription transition with out-of-order protection.
 *
 * 1. Find existing subscription by providerSubscriptionId or stripeSubscriptionId
 * 2. If found: compare providerEventAt with lastProviderEventAt
 *    - If incoming event is older → skip (return { skipped: true })
 * 3. Apply the transition (update or create)
 * 4. Set lastProviderEventId + lastProviderEventAt
 *
 * Returns { skipped: true } if the event was out-of-order.
 */
export async function applyTransition(params: TransitionParams): Promise<{ skipped: boolean }> {
  // 1. Find existing subscription by provider identity
  const existing = await findSubscriptionByProvider(params)

  // 2. Out-of-order protection
  if (existing?.lastProviderEventAt && params.providerEventAt <= existing.lastProviderEventAt) {
    return { skipped: true }
  }

  // 3. Apply transition
  const active = statusGrantsAccess(params.status, params.expiresAt ?? null)

  if (existing) {
    // Update existing subscription
    await db.subscription.update({
      where: { id: existing.id },
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
  } else {
    // Create new subscription (deactivate any previous active ones first)
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
  }

  return { skipped: false }
}

/**
 * Find a subscription by provider identity.
 * Searches by: providerSubscriptionId, then stripeSubscriptionId, then userId+active.
 */
async function findSubscriptionByProvider(params: TransitionParams) {
  // Try providerSubscriptionId first (most stable)
  if (params.providerSubscriptionId) {
    const byProvider = await db.subscription.findFirst({
      where: { providerSubscriptionId: params.providerSubscriptionId },
    })
    if (byProvider) return byProvider
  }

  // Try stripeSubscriptionId
  if (params.stripeSubscriptionId) {
    const byStripe = await db.subscription.findFirst({
      where: { stripeSubscriptionId: params.stripeSubscriptionId },
    })
    if (byStripe) return byStripe
  }

  // Fallback: user's most recent active subscription
  return db.subscription.findFirst({
    where: { userId: params.userId },
    orderBy: { startedAt: 'desc' },
  })
}
