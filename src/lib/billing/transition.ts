/**
 * AQWELIA — Single subscription transition engine (P0-B final).
 *
 * ALL events that modify a subscription MUST go through `applyTransition`.
 *
 * Rules:
 * 1. Atomic CAS: updateMany WHERE lastProviderEventAt < new OR NULL
 * 2. Equal timestamps: priority expired > canceled > past_due > grace_period > active > trialing > inactive
 * 3. Cancellation without expiresAt preserves existing expiry
 * 4. Expired/inactive for old providerSubscriptionId never deactivates current active sub
 * 5. New active sub with older event than current → ignored
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

// Priority for equal timestamps: higher number = wins
const STATUS_PRIORITY: Record<string, number> = {
  expired: 6,
  canceled: 5,
  past_due: 4,
  grace_period: 3,
  active: 2,
  trialing: 1,
  inactive: 0,
}

export async function applyTransition(params: TransitionParams): Promise<TransitionResult> {
  // Calculate effective expiry: don't overwrite existing expiry with null on cancellation
  const existing = await findSubscriptionByProvider(params)

  if (existing) {
    // Rule 4: expired/inactive for OLD provider should never deactivate current ACTIVE sub
    // If the found subscription is NOT the current active one, and the event is a deactivation,
    // only apply if it's the same provider identity
    const isDeactivation = ['expired', 'canceled', 'inactive'].includes(params.status)
    const isCurrentActive = existing.active === true

    // If this is a deactivation event and the found sub is NOT the active one,
    // try to find the active sub instead
    if (isDeactivation && !isCurrentActive) {
      const activeSub = await db.subscription.findFirst({
        where: { userId: params.userId, active: true },
        orderBy: { startedAt: 'desc' },
      })
      if (activeSub && activeSub.id !== existing.id) {
        // The deactivation is for an old subscription — don't touch the active one
        return { skipped: true, reason: 'old_provider_deactivation' }
      }
    }

    // Effective expiresAt: preserve existing if new is null (cancellation without new date)
    const effectiveExpiresAt = params.expiresAt ?? existing.expiresAt ?? null
    const active = statusGrantsAccess(params.status, effectiveExpiresAt)

    // Rule 2: equal timestamps — priority-based
    const incomingPriority = STATUS_PRIORITY[params.status] ?? 0
    const existingPriority = STATUS_PRIORITY[existing.status] ?? 0

    let timeCondition
    if (existing.lastProviderEventAt) {
      const cmp = params.providerEventAt.getTime() - existing.lastProviderEventAt.getTime()
      if (cmp < 0) {
        // Strictly older → skip (Rule 5)
        return { skipped: true, reason: 'out_of_order' }
      } else if (cmp === 0) {
        // Equal timestamps: apply only if incoming has higher priority
        if (incomingPriority <= existingPriority) {
          return { skipped: true, reason: 'equal_timestamp_lower_priority' }
        }
        timeCondition = { lte: params.providerEventAt }
      } else {
        // Strictly newer → apply
        timeCondition = { lt: params.providerEventAt }
      }
    } else {
      timeCondition = undefined // no previous event → apply
    }

    // Build WHERE condition for atomic CAS
    const whereCondition: any = { id: existing.id }
    if (timeCondition) {
      whereCondition.OR = [
        { lastProviderEventAt: null },
        { lastProviderEventAt: timeCondition },
      ]
    }

    const result = await db.subscription.updateMany({
      where: whereCondition,
      data: {
        plan: params.planId,
        status: params.status,
        active,
        duration: params.duration ?? existing.duration,
        store: params.store ?? existing.store,
        stripeCustomerId: params.stripeCustomerId ?? existing.stripeCustomerId,
        stripeSubscriptionId: params.stripeSubscriptionId ?? existing.stripeSubscriptionId,
        providerSubscriptionId: params.providerSubscriptionId ?? existing.providerSubscriptionId,
        expiresAt: effectiveExpiresAt,
        trialEndsAt: params.trialEndsAt ?? existing.trialEndsAt,
        currentPeriodStart: params.currentPeriodStart ?? existing.currentPeriodStart,
        currentPeriodEnd: params.currentPeriodEnd ?? existing.currentPeriodEnd,
        cancelAt: params.cancelAt ?? existing.cancelAt,
        lastProviderEventId: params.providerEventId,
        lastProviderEventAt: params.providerEventAt,
      },
    })

    if (result.count === 0) {
      return { skipped: true, reason: 'cas_failed' }
    }

    return { skipped: false }
  }

  // No existing subscription — create new one
  const active = statusGrantsAccess(params.status, params.expiresAt ?? null)

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

  // Fallback: user's most recent active subscription, then most recent overall
  const active = await db.subscription.findFirst({
    where: { userId: params.userId, active: true },
    orderBy: { startedAt: 'desc' },
  })
  if (active) return active

  return db.subscription.findFirst({
    where: { userId: params.userId },
    orderBy: { startedAt: 'desc' },
  })
}
