/**
 * AQWELIA — RevenueCat webhook (P0-B: atomic idempotency + real payload + out-of-order).
 *
 * RevenueCat webhook payload structure (official):
 *   POST body = { event: { event_type, app_user_id, product_id, ... } }
 *   OR flat body = { event_type, app_user_id, product_id, ... }
 *
 * Stable event ID: RevenueCat doesn't always provide event_id.
 * We generate a SHA-256 fingerprint from stable fields.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import {
  type PlanId, type SubscriptionStatus, type Duration,
  getPlanFromProductId, PROVIDER_TO_DURATION, statusGrantsAccess,
} from '@/lib/billing/plans'
import { processEventIdempotently, generateEventFingerprint } from '@/lib/billing/idempotency'

export const runtime = 'nodejs'

const RC_ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE',
])
const RC_DEACTIVE_EVENTS = new Set([
  'CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE', 'SUBSCRIPTION_PAUSED',
])

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

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

  // BLOCK 5: RevenueCat wraps the event in body.event
  const event = body.event || body
  const userId = event?.app_user_id
  if (!userId) {
    return NextResponse.json({ received: true })
  }

  const eventType = event?.event_type || 'UNKNOWN'

  // BLOCK 5: stable event ID via SHA-256 fingerprint (never Date.now())
  const eventId = event?.event_id || await generateEventFingerprint('revenuecat', eventType, {
    app_user_id: userId,
    product_id: event?.product_id || '',
    purchased_at: event?.purchased_at || 0,
    event_type: eventType,
  })

  const result = await processEventIdempotently({
    eventId,
    source: 'revenuecat',
    eventType,
    userId,
    payload: JSON.stringify(event),
    handler: async () => { await handleRevenueCatEvent(event, userId) },
  })

  if (result.error) {
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true, skipped: result.skipped })
}

async function handleRevenueCatEvent(event: any, userId: string): Promise<void> {
  const eventType = event?.event_type || 'UNKNOWN'
  const productId = event?.product_id || ''
  const planId = getPlanFromProductId(productId) as PlanId

  // Ignore events that are neither active nor deactive (e.g. TEST, TRANSFER)
  const isActivation = RC_ACTIVE_EVENTS.has(eventType)
  const isDeactivation = RC_DEACTIVE_EVENTS.has(eventType)
  if (!isActivation && !isDeactivation) return
  if (isActivation && planId === 'decouverte') return

  // RevenueCat timestamps are in SECONDS (Unix epoch)
  const providerEventAt = event?.purchased_at
    ? new Date(event.purchased_at * 1000)
    : event?.event_timestamp_ms
    ? new Date(event.event_timestamp_ms)
    : new Date()

  const expiresAt = event?.expiration_at ? new Date(event.expiration_at * 1000) : null
  const store = event?.store || 'ios'

  if (isDeactivation) {
    // BLOCK 4: out-of-order protection
    const existing = await db.subscription.findFirst({
      where: { userId, active: true },
      orderBy: { startedAt: 'desc' },
    })

    if (existing?.lastProviderEventAt && providerEventAt <= existing.lastProviderEventAt) {
      console.log('[rc.webhook] Skipping out-of-order event:', eventType)
      return
    }

    const status: SubscriptionStatus = eventType === 'EXPIRATION' ? 'expired' : 'canceled'
    await db.subscription.updateMany({
      where: { userId, active: true },
      data: {
        status,
        active: false,
        expiresAt: expiresAt || new Date(),
        lastProviderEventId: await generateEventFingerprint('revenuecat', eventType, {
          app_user_id: userId, product_id: productId, event_type: eventType,
        }),
        lastProviderEventAt: providerEventAt,
      },
    })
    return
  }

  // Activation
  const duration = inferDuration(productId)

  // BLOCK 4: out-of-order protection
  const existing = await db.subscription.findFirst({
    where: { userId, active: true },
    orderBy: { startedAt: 'desc' },
  })

  if (existing?.lastProviderEventAt && providerEventAt <= existing.lastProviderEventAt) {
    console.log('[rc.webhook] Skipping out-of-order event:', eventType)
    return
  }

  await db.subscription.updateMany({
    where: { userId, active: true },
    data: { active: false, status: 'inactive' },
  })

  await db.subscription.create({
    data: {
      userId,
      plan: planId,
      status: 'active',
      duration,
      store,
      startedAt: event?.purchased_at ? new Date(event.purchased_at * 1000) : new Date(),
      expiresAt,
      active: true,
      lastProviderEventId: await generateEventFingerprint('revenuecat', eventType, {
        app_user_id: userId, product_id: productId, event_type: eventType,
      }),
      lastProviderEventAt: providerEventAt,
    },
  })
}

function inferDuration(productId: string): Duration | null {
  if (!productId) return null
  for (const [provider, internal] of Object.entries(PROVIDER_TO_DURATION)) {
    if (productId.includes(provider)) return internal as Duration
  }
  return null
}
