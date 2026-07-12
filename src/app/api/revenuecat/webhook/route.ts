/**
 * AQWELIA — RevenueCat webhook (P0-B: official fields, transition engine).
 *
 * Official RevenueCat webhook payload:
 *   body = { event: { ... } }
 *   event.type         = 'INITIAL_PURCHASE' | 'RENEWAL' | 'CANCELLATION' | etc.
 *   event.id           = stable event identifier (use for idempotency)
 *   event.event_timestamp_ms = milliseconds since epoch
 *   event.purchased_at_ms    = milliseconds since epoch
 *   event.expiration_at_ms   = milliseconds since epoch
 *   event.original_transaction_id = stable subscription identifier
 *   event.transaction_id           = individual transaction
 *   event.product_id        = e.g. 'aqwelia_wellness_monthly'
 *   event.period_type       = 'normal' | 'trial' | 'intro' | 'grace'
 *   event.store             = 'APP_STORE' | 'PLAY_STORE' | 'AMAZON' | etc.
 *   event.app_user_id       = our userId
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  type PlanId, type Duration,
  getPlanFromRCProductId,
} from '@/lib/billing/plans'
import { processEventIdempotently, generateEventFingerprint, type HandlerResult } from '@/lib/billing/idempotency'
import { applyTransition } from '@/lib/billing/transition'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// Official RC event types
const RC_ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE',
])
const RC_DEACTIVE_EVENTS = new Set([
  'CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE',
])

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (!webhookSecret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })

  // Constant-time Bearer comparison
  const expectedAuth = `Bearer ${webhookSecret}`
  const authBuffer = Buffer.from(authHeader)
  const expectedBuffer = Buffer.from(expectedAuth)
  if (authBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(authBuffer, expectedBuffer)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // BLOCAGE 1: use official body.event envelope
  const event = body.event
  if (!event || typeof event !== 'object') return NextResponse.json({ error: 'Invalid event envelope' }, { status: 400 })
  const userId = event?.app_user_id

  // BLOCAGE 1: use event.type (official), not event_type
  const eventType = event?.type || 'UNKNOWN'

  // BLOCAGE 1: use event.id (official), fingerprint as fallback only
  const eventId = event?.id || await generateEventFingerprint('revenuecat', eventType, {
    app_user_id: userId || '',
    original_transaction_id: event?.original_transaction_id || '',
    transaction_id: event?.transaction_id || '',
    purchased_at_ms: event?.purchased_at_ms || 0,
  })

  // BLOCAGE 1: use event_timestamp_ms (milliseconds), not purchased_at (seconds)
  const providerEventAt = event?.event_timestamp_ms
    ? new Date(event.event_timestamp_ms)
    : event?.purchased_at_ms
    ? new Date(event.purchased_at_ms)
    : new Date()

  const result = await processEventIdempotently({
    eventId,
    source: 'revenuecat',
    eventType,
    userId: userId || undefined,
    payload: JSON.stringify(event),
    handler: async () => {
      if (!userId) return { result: 'ignored', reason: 'missing_user_mapping' }
      return await handleRevenueCatEvent(event, userId, eventId, providerEventAt)
    },
  })

  if (result.error) return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  return NextResponse.json({ received: true, skipped: result.skipped })
}

async function handleRevenueCatEvent(
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
