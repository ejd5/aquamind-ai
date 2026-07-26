import {
  type PlanId, type Duration,
  getPlanFromRCProductId,
} from '@/lib/billing/plans'
import type { HandlerResult } from '@/lib/billing/idempotency'
import { applyTransition } from '@/lib/billing/transition'
import { db } from '@/lib/db'

// Official RC event types
const RC_ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE',
])
const RC_DEACTIVE_EVENTS = new Set([
  'CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE',
])

export async function handleRevenueCatEvent(
  event: any,
  userId: string,
  eventId: string,
  providerEventAt: Date
): Promise<HandlerResult> {
  const eventType = event?.type || 'UNKNOWN'
  const productId = event?.product_id || ''

  // Ignore non-subscription events (TEST, TRANSFER, etc.)
  const isActivation = RC_ACTIVE_EVENTS.has(eventType)
  const isDeactivation = RC_DEACTIVE_EVENTS.has(eventType)
  if (!isActivation && !isDeactivation) return { result: 'ignored', reason: 'event_type_not_supported' }

  // BLOCAGE 8: use exact RC product mapping
  const rcProduct = getPlanFromRCProductId(productId)
  if (!rcProduct && isActivation) return { result: 'ignored', reason: 'unknown_product' }

  // BLOCAGE 1: official field names (milliseconds, not seconds)
  const expiresAt = event?.expiration_at_ms ? new Date(event.expiration_at_ms) : null
  const purchasedAt = event?.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date()
  const originalTransactionId = event?.original_transaction_id || event?.transaction_id || null
  if (!originalTransactionId) return { result: 'ignored', reason: 'no_subscription_link' }
  const existing = !rcProduct
    ? await db.subscription.findUnique({ where: { providerSubscriptionId: originalTransactionId } })
    : null
  if (!rcProduct && !existing) return { result: 'ignored', reason: 'unknown_product' }
  const planId = (rcProduct?.plan || existing?.plan) as PlanId
  const store = mapRCStore(event?.store)
  const duration = rcProduct?.duration || (existing?.duration as Duration | null) || null
  const periodType = (event?.period_type || '').toUpperCase()

  // BLOCAGE 8: normalize period_type with uppercase
  // TRIAL → trialing, NORMAL → active, INTRO → active, GRACE → grace_period
  const isTrial = periodType === 'TRIAL'

  if (isDeactivation) {
    // BLOCAGE 4: CANCELLATION ≠ EXPIRATION
    if (eventType === 'CANCELLATION') {
      // Cancellation: status=canceled, access KEPT until expiration_at_ms
      const transition = await applyTransition({
        userId,
        planId,
        status: 'canceled',
        duration,
        store,
        providerSubscriptionId: originalTransactionId,
        providerEventId: eventId,
        providerEventAt,
        expiresAt, // User keeps access until this date
      })
      if (transition.skipped) return { result: 'ignored', reason: 'out_of_order' }
    } else if (eventType === 'EXPIRATION') {
      // Expiration: status=expired, access REMOVED
      const transition = await applyTransition({
        userId,
        planId,
        status: 'expired',
        duration,
        store,
        providerSubscriptionId: originalTransactionId,
        providerEventId: eventId,
        providerEventAt,
        expiresAt: expiresAt || new Date(),
      })
      if (transition.skipped) return { result: 'ignored', reason: 'out_of_order' }
    } else if (eventType === 'BILLING_ISSUE') {
      // Billing issue: status=past_due, access kept during grace period
      const graceEndsAt = event?.grace_period_expiration_at_ms ? new Date(event.grace_period_expiration_at_ms) : null
      const transition = await applyTransition({
        userId,
        planId,
        status: graceEndsAt && graceEndsAt > new Date() ? 'grace_period' : 'past_due',
        duration,
        store,
        providerSubscriptionId: originalTransactionId,
        providerEventId: eventId,
        providerEventAt,
        expiresAt: graceEndsAt || expiresAt,
      })
      if (transition.skipped) return { result: 'ignored', reason: 'out_of_order' }
    }
    return
  }

  // Activation
  const transition = await applyTransition({
    userId,
    planId,
    status: isTrial ? 'trialing' : 'active',
    duration,
    store,
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
