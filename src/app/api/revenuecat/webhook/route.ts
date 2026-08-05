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
import { processEventIdempotently, generateEventFingerprint } from '@/lib/billing/idempotency'
import { handleRevenueCatEvent } from '@/lib/billing/providers/revenuecat-event'
import {
  isRevenueCatAnonymous,
  normalizeRevenueCatEnvironment,
  resolveBillingIdentityUserId,
} from '@/lib/billing/identity'

export const runtime = 'nodejs'

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
  const rawUserId = event?.app_user_id
  const environment = normalizeRevenueCatEnvironment(event?.environment)

  // BLOCAGE 1: use event.type (official), not event_type
  const eventType = event?.type || 'UNKNOWN'

  // BLOCAGE 1: use event.id (official), fingerprint as fallback only
  const eventId = event?.id || await generateEventFingerprint('revenuecat', eventType, {
    app_user_id: rawUserId || '',
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
    environment,
    eventType,
    userId: typeof rawUserId === 'string' ? rawUserId : undefined,
    payload: JSON.stringify(redactEvent(event)),
    handler: async () => {
      // Wave A2 — canonical identity:
      //   1. app_user_id absent → ignored
      //   2. $RCAnonymousID* → ignored
      //   3. resolve through BillingIdentity (provider + environment);
      //      if not bound, fall back to the raw id only when it is NOT an
      //      anonymous placeholder (client logIn sets app_user_id = user id,
      //      and registerRevenueCatIdentityServerSide bound it).
      if (!rawUserId) return { result: 'ignored', reason: 'missing_user_identity' }
      if (isRevenueCatAnonymous(rawUserId)) return { result: 'ignored', reason: 'anonymous_identity' }

      const resolvedUserId =
        (await resolveBillingIdentityUserId('revenuecat', environment, rawUserId)) ??
        (await resolveBillingIdentityUserId('revenuecat', 'production', rawUserId))

      if (!resolvedUserId) {
        // Without a bound identity the event cannot be safely associated with a
        // user. The client registers the identity at logIn/purchase time.
        return { result: 'ignored', reason: 'unknown_user_identity' }
      }

      return await handleRevenueCatEvent(event, resolvedUserId, eventId, providerEventAt, environment)
    },
  })

  if (result.error) return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  return NextResponse.json({ received: true, skipped: result.skipped })
}

/** Redacts the event payload before it is stored (never log secrets/PII). */
function redactEvent(event: Record<string, unknown>): Record<string, unknown> {
  const { app_user_id, ...rest } = event
  return {
    ...rest,
    // Keep a hashed marker so support can correlate without storing the raw id.
    app_user_id: typeof app_user_id === 'string' ? `redacted:${crypto.createHash('sha256').update(app_user_id).digest('hex').slice(0, 16)}` : null,
  }
}
