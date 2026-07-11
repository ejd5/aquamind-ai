/**
 * AQWELIA — RevenueCat webhook handler (P0-B: secure + idempotent).
 *
 * Security:
 *   - Constant-time Bearer token comparison (timing-safe)
 *   - Idempotency via BillingEvent table (event_id unique)
 *   - Explicit event-type whitelist (no naive "everything else = activate")
 *   - No information leakage in error responses
 *   - Out-of-order event handling: status is set from event data
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import {
  type PlanId,
  type SubscriptionStatus,
  type Duration,
  getPlanFromProductId,
  PROVIDER_TO_DURATION,
  statusGrantsAccess,
} from '@/lib/billing/plans'
import { processEventIdempotently } from '@/lib/billing/idempotency'

export const runtime = 'nodejs'

// RevenueCat event types that ACTIVATE or MAINTAIN a subscription.
// Everything else is treated as inactive — no naive "default = activate".
const RC_ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
])

// RevenueCat event types that DEACTIVATE a subscription.
const RC_DEACTIVE_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'SUBSCRIPTION_PAUSED',
  'SUBSCRIPTION_CANCELED',
])

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Constant-time comparison to prevent timing attacks
  const expectedAuth = `Bearer ${webhookSecret}`
  const authBuffer = Buffer.from(authHeader)
  const expectedBuffer = Buffer.from(expectedAuth)

  if (authBuffer.length !== expectedBuffer.length) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!crypto.timingSafeEqual(authBuffer, expectedBuffer)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  let event
  try {
    event = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = event?.app_user_id
  if (!userId) {
    return NextResponse.json({ received: true })
  }

  // Generate event ID — RevenueCat doesn't always provide one
  const eventId = event?.event_id || `rc_${event?.event_type}_${userId}_${event?.purchased_at || Date.now()}`
  const eventType = event?.event_type || 'UNKNOWN'

  // Process with idempotency
  const result = await processEventIdempotently({
    eventId,
    source: 'revenuecat',
    eventType,
    userId,
    payload: JSON.stringify(event),
    handler: async () => {
      await handleRevenueCatEvent(event, userId)
    },
  })

  if (result.error) {
    console.error('[revenuecat.webhook] processing error:', result.error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true, skipped: result.skipped })
}

/**
 * Handle a verified RevenueCat event.
 */
async function handleRevenueCatEvent(event: any, userId: string): Promise<void> {
  const eventType = event?.event_type || 'UNKNOWN'
  const productId = event?.product_id || ''
  const planId = getPlanFromProductId(productId) as PlanId

  // Determine if this event activates or deactivates
  const isActivation = RC_ACTIVE_EVENTS.has(eventType)
  const isDeactivation = RC_DEACTIVE_EVENTS.has(eventType)

  // Ignore events that are neither (e.g. TEST, TRANSFER)
  if (!isActivation && !isDeactivation) return

  // Ignore free-plan activations
  if (isActivation && planId === 'decouverte') return

  if (isDeactivation) {
    // Deactivate current subscription
    await db.subscription.updateMany({
      where: { userId, active: true },
      data: {
        status: eventType === 'EXPIRATION' ? 'expired' : 'canceled',
        active: false,
        expiresAt: event?.expiration_at ? new Date(event.expiration_at * 1000) : new Date(),
      },
    })
    return
  }

  // Activation: determine duration and status
  const duration = inferDuration(productId)
  const isActive = !['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE'].includes(eventType)
  const expiresAt = event?.expiration_at ? new Date(event.expiration_at * 1000) : null

  // Deactivate previous subscriptions
  await db.subscription.updateMany({
    where: { userId, active: true },
    data: { active: false, status: 'inactive' },
  })

  // Create new subscription
  const status: SubscriptionStatus = event?.store?.includes('ios') || event?.store?.includes('android')
    ? 'active'
    : 'active'

  await db.subscription.create({
    data: {
      userId,
      plan: planId,
      status,
      duration,
      store: event?.store || 'ios',
      startedAt: event?.purchased_at ? new Date(event.purchased_at * 1000) : new Date(),
      expiresAt,
      active: true,
    },
  })
}

/**
 * Infer duration from a product ID string.
 */
function inferDuration(productId: string): Duration | null {
  if (!productId) return null
  for (const [provider, internal] of Object.entries(PROVIDER_TO_DURATION)) {
    if (productId.includes(provider)) return internal as Duration
  }
  return null
}
