import {
  type PlanId, type Duration, type SubscriptionStatus,
  getPlanFromRCProductId,
} from '@/lib/billing/plans'
import type { HandlerResult } from '@/lib/billing/idempotency'
import { applyTransition } from '@/lib/billing/transition'
import { db } from '@/lib/db'
import {
  upsertBillingIdentity,
  isRevenueCatAnonymous,
  type BillingEnvironment,
} from '@/lib/billing/identity'

// RevenueCat lifecycle events that represent an effective entitlement state.
// PRODUCT_CHANGE is deliberately NOT an activation: RevenueCat can emit it for
// a deferred change, and the effective product is later confirmed by a RENEWAL
// or INITIAL_PURCHASE. Applying PRODUCT_CHANGE directly can project the wrong
// AQWELIA plan and can also block the effective event when timestamps match.
const RC_ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'NON_RENEWING_PURCHASE',
  'UNCANCELLATION',
  'REFUND_REVERSED',
])
const RC_DEACTIVE_EVENTS = new Set([
  'CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE',
])
const RC_STATE_PRESERVING_EVENTS = new Set([
  'SUBSCRIPTION_EXTENDED', 'SUBSCRIPTION_PAUSED',
])
const RC_IGNORED_EVENTS = new Map<string, string>([
  ['TRANSFER', 'rc_event_quarantined:transfer'],
  ['ALIAS', 'rc_event_quarantined:alias'],
  ['UNSUBSCRIPTION', 'rc_event_quarantined:unsubscription'],
  ['PRODUCT_CHANGE', 'rc_event_deferred_to_effective_purchase:product_change'],
])

export async function handleRevenueCatEvent(
  event: any,
  userId: string,
  eventId: string,
  providerEventAt: Date,
  environment: BillingEnvironment = 'production',
): Promise<HandlerResult> {
  const eventType = event?.type || 'UNKNOWN'
  const productId = event?.product_id || ''

  const ignoredReason = RC_IGNORED_EVENTS.get(eventType)
  if (ignoredReason) return { result: 'ignored', reason: ignoredReason }

  const isActivation = RC_ACTIVE_EVENTS.has(eventType)
  const isDeactivation = RC_DEACTIVE_EVENTS.has(eventType)
  const preservesState = RC_STATE_PRESERVING_EVENTS.has(eventType)
  if (!isActivation && !isDeactivation && !preservesState) {
    return { result: 'ignored', reason: 'event_type_not_supported' }
  }

  const originalTransactionId = event?.original_transaction_id || event?.transaction_id || null
  if (!originalTransactionId) return { result: 'ignored', reason: 'no_subscription_link' }

  const existingByProvider = await db.subscription.findFirst({
    where: {
      providerSubscriptionId: originalTransactionId,
      provider: 'revenuecat',
      environment,
    },
  })
  if (existingByProvider && existingByProvider.userId !== userId) {
    return { result: 'ignored', reason: 'transaction_ownership_conflict' }
  }

  const appUserId = typeof event?.app_user_id === 'string' ? event.app_user_id : ''
  if (appUserId && !isRevenueCatAnonymous(appUserId)) {
    const identityBinding = await db.billingIdentity.findUnique({
      where: {
        provider_externalUserId: { provider: 'revenuecat', externalUserId: appUserId },
      },
    })
    if (identityBinding && identityBinding.userId !== userId) {
      return { result: 'ignored', reason: 'identity_conflict_a_b' }
    }
  }

  if (appUserId && !isRevenueCatAnonymous(appUserId)) {
    await upsertBillingIdentity({
      provider: 'revenuecat',
      externalUserId: appUserId,
      userId,
    }).catch(() => undefined)
  }

  const rcProduct = getPlanFromRCProductId(productId)
  const expiresAt = event?.expiration_at_ms ? new Date(event.expiration_at_ms) : null
  const store = mapRCStore(event?.store)
  const periodType = (event?.period_type || '').toUpperCase()
  const isTrial = periodType === 'TRIAL'

  // SUBSCRIPTION_PAUSED must not revoke access; EXPIRATION does that later.
  // SUBSCRIPTION_EXTENDED only moves the current period end forward and keeps
  // the current AQWELIA state (including a prior cancellation) intact.
  if (preservesState) {
    if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
      return { result: 'ignored', reason: 'invalid_expiration' }
    }

    if (eventType === 'SUBSCRIPTION_EXTENDED' && existingByProvider?.expiresAt) {
      if (expiresAt.getTime() <= existingByProvider.expiresAt.getTime()) {
        return { result: 'ignored', reason: 'extension_not_forward' }
      }
    }

    const planId = (existingByProvider?.plan || rcProduct?.plan) as PlanId | undefined
    if (!planId) return { result: 'ignored', reason: 'unknown_product' }

    const currentStatus = existingByProvider?.status as SubscriptionStatus | undefined
    const status: SubscriptionStatus = currentStatus || (isTrial ? 'trialing' : 'active')
    const duration = (existingByProvider?.duration as Duration | null)
      || rcProduct?.duration
      || null

    const transition = await applyTransition({
      userId,
      planId,
      status,
      duration,
      store: existingByProvider?.store || store,
      provider: 'revenuecat',
      environment,
      providerSubscriptionId: originalTransactionId,
      providerEventId: eventId,
      providerEventAt,
      expiresAt,
      trialEndsAt: status === 'trialing' ? expiresAt : existingByProvider?.trialEndsAt || null,
      currentPeriodEnd: expiresAt,
    })
    if (transition.skipped) return { result: 'ignored', reason: 'out_of_order' }
    return { result: 'processed' }
  }

  if (!rcProduct && isActivation) return { result: 'ignored', reason: 'unknown_product' }
  const existing = !rcProduct ? existingByProvider : null
  if (!rcProduct && !existing) return { result: 'ignored', reason: 'unknown_product' }
  const planId = (rcProduct?.plan || existing?.plan) as PlanId
  const duration = rcProduct?.duration || (existing?.duration as Duration | null) || null

  if (isActivation && expiresAt && expiresAt.getTime() <= Date.now()) {
    const transition = await applyTransition({
      userId,
      planId,
      status: 'expired',
      duration,
      store,
      provider: 'revenuecat',
      environment,
      providerSubscriptionId: originalTransactionId,
      providerEventId: eventId,
      providerEventAt,
      expiresAt,
    })
    if (transition.skipped) return { result: 'ignored', reason: 'out_of_order' }
    return { result: 'processed' }
  }

  if (isDeactivation) {
    if (eventType === 'CANCELLATION') {
      const cancelReason = String(event?.cancel_reason || '').toUpperCase()

      // RevenueCat emits BILLING_ISSUE plus CANCELLATION(BILLING_ERROR).
      // BILLING_ISSUE owns grace/past-due state; EXPIRATION ends access.
      if (cancelReason === 'BILLING_ERROR') {
        return { result: 'ignored', reason: 'billing_error_cancellation_deferred_to_billing_issue' }
      }

      // Store/customer-support refunds revoke the current entitlement now.
      if (cancelReason === 'CUSTOMER_SUPPORT') {
        const transition = await applyTransition({
          userId,
          planId,
          status: 'expired',
          duration,
          store,
          provider: 'revenuecat',
          environment,
          providerSubscriptionId: originalTransactionId,
          providerEventId: eventId,
          providerEventAt,
          expiresAt: providerEventAt,
        })
        if (transition.skipped) return { result: 'ignored', reason: 'out_of_order' }
        return { result: 'processed' }
      }

      const transition = await applyTransition({
        userId,
        planId,
        status: 'canceled',
        duration,
        store,
        provider: 'revenuecat',
        environment,
        providerSubscriptionId: originalTransactionId,
        providerEventId: eventId,
        providerEventAt,
        expiresAt,
      })
      if (transition.skipped) return { result: 'ignored', reason: 'out_of_order' }
    } else if (eventType === 'EXPIRATION') {
      const transition = await applyTransition({
        userId,
        planId,
        status: 'expired',
        duration,
        store,
        provider: 'revenuecat',
        environment,
        providerSubscriptionId: originalTransactionId,
        providerEventId: eventId,
        providerEventAt,
        expiresAt: expiresAt || providerEventAt,
      })
      if (transition.skipped) return { result: 'ignored', reason: 'out_of_order' }
    } else if (eventType === 'BILLING_ISSUE') {
      const graceEndsAt = event?.grace_period_expiration_at_ms
        ? new Date(event.grace_period_expiration_at_ms)
        : null
      const transition = await applyTransition({
        userId,
        planId,
        status: graceEndsAt && graceEndsAt > new Date() ? 'grace_period' : 'past_due',
        duration,
        store,
        provider: 'revenuecat',
        environment,
        providerSubscriptionId: originalTransactionId,
        providerEventId: eventId,
        providerEventAt,
        expiresAt: graceEndsAt || expiresAt,
      })
      if (transition.skipped) return { result: 'ignored', reason: 'out_of_order' }
    }
    return { result: 'processed' }
  }

  const transition = await applyTransition({
    userId,
    planId,
    status: isTrial ? 'trialing' : 'active',
    duration,
    store,
    provider: 'revenuecat',
    environment,
    providerSubscriptionId: originalTransactionId,
    providerEventId: eventId,
    providerEventAt,
    expiresAt,
    trialEndsAt: isTrial ? expiresAt : null,
    currentPeriodEnd: expiresAt,
  })
  if (transition.skipped) return { result: 'ignored', reason: 'out_of_order' }
  return { result: 'processed' }
}

function mapRCStore(rcStore: string): string {
  if (!rcStore) return 'ios'
  const lower = rcStore.toLowerCase()
  if (lower.includes('play') || lower.includes('android')) return 'android'
  if (lower.includes('amazon')) return 'android'
  return 'ios'
}
