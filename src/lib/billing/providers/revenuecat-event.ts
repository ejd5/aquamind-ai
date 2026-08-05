import {
  type PlanId, type Duration,
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

// Official RC event types
const RC_ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE',
])
const RC_DEACTIVE_EVENTS = new Set([
  'CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE',
])
// Wave A2: TRANSFER events are quarantined / ignored (documented) — they are
// never applied automatically to another user.
const RC_IGNORED_EVENTS = new Set(['TRANSFER', 'ALIAS', 'UNSUBSCRIPTION', 'SUBSCRIPTION_EXTENDED', 'SUBSCRIPTION_PAUSED'])

export async function handleRevenueCatEvent(
  event: any,
  userId: string,
  eventId: string,
  providerEventAt: Date,
  environment: BillingEnvironment = 'production',
): Promise<HandlerResult> {
  const eventType = event?.type || 'UNKNOWN'
  const productId = event?.product_id || ''

  // Wave A2: TRANSFER / ALIAS and other non-monetization events are
  // quarantined and ignored with a stable reason — never applied automatically.
  if (RC_IGNORED_EVENTS.has(eventType)) {
    return { result: 'ignored', reason: `rc_event_quarantined:${eventType.toLowerCase()}` }
  }

  const isActivation = RC_ACTIVE_EVENTS.has(eventType)
  const isDeactivation = RC_DEACTIVE_EVENTS.has(eventType)
  if (!isActivation && !isDeactivation) return { result: 'ignored', reason: 'event_type_not_supported' }

  // Wave A2: canonical identity ownership. The webhook already resolved the
  // user via BillingIdentity; here we re-assert the binding so the row records
  // the provider environment and the ownership is never silently transferred.
  const originalTransactionId = event?.original_transaction_id || event?.transaction_id || null
  if (!originalTransactionId) return { result: 'ignored', reason: 'no_subscription_link' }

  // Ownership check: the subscription (by original_transaction_id) must belong
  // to the SAME provider environment AND to the SAME user. If it already
  // belongs to a different user → conflict, ignored, never transferred.
  const existingByProvider = await db.subscription.findFirst({
    where: { providerSubscriptionId: originalTransactionId },
  })
  if (existingByProvider && existingByProvider.userId !== userId) {
    return { result: 'ignored', reason: 'transaction_ownership_conflict' }
  }
  // A/B conflict: the identity binding belongs to another user than the event's
  // resolved user — log ignored with a stable reason, never transfer.
  const identityBinding = await db.billingIdentity.findUnique({
    where: {
      provider_environment_externalUserId: {
        provider: 'revenuecat',
        environment,
        externalUserId: event?.app_user_id || '',
      },
    },
  })
  if (identityBinding && identityBinding.userId !== userId) {
    return { result: 'ignored', reason: 'identity_conflict_a_b' }
  }

  // Keep the canonical binding fresh (idempotent upsert; conflicts are ignored,
  // never transferred).
  if (event?.app_user_id && !isRevenueCatAnonymous(event.app_user_id)) {
    await upsertBillingIdentity({
      provider: 'revenuecat',
      environment,
      externalUserId: event.app_user_id,
      userId,
    }).catch(() => undefined)
  }

  // BLOCAGE 8: use exact RC product mapping
  const rcProduct = getPlanFromRCProductId(productId)
  if (!rcProduct && isActivation) return { result: 'ignored', reason: 'unknown_product' }

  const expiresAt = event?.expiration_at_ms ? new Date(event.expiration_at_ms) : null
  const purchasedAt = event?.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date()
  const existing = !rcProduct
    ? existingByProvider
    : null
  if (!rcProduct && !existing) return { result: 'ignored', reason: 'unknown_product' }
  const planId = (rcProduct?.plan || existing?.plan) as PlanId
  const store = mapRCStore(event?.store)
  const duration = rcProduct?.duration || (existing?.duration as Duration | null) || null
  const periodType = (event?.period_type || '').toUpperCase()
  const isTrial = periodType === 'TRIAL'

  // Wave A2: an activation whose expiration_at_ms is already in the past must
  // never create active=true. Treat it as expired.
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
        expiresAt: expiresAt || new Date(),
      })
      if (transition.skipped) return { result: 'ignored', reason: 'out_of_order' }
    } else if (eventType === 'BILLING_ISSUE') {
      const graceEndsAt = event?.grace_period_expiration_at_ms ? new Date(event.grace_period_expiration_at_ms) : null
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

  // Activation
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
