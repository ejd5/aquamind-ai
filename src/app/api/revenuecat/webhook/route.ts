/**
 * AQWELIA — RevenueCat webhook (P0-B: official fields, transition engine).
 *
 * The server-side AQWELIA subscription projection is authoritative. RevenueCat
 * payload identities are resolved through BillingIdentity before any access is
 * granted, and every state-changing event is idempotent per environment.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { processEventIdempotently, generateEventFingerprint } from '@/lib/billing/idempotency'
import { handleRevenueCatEvent } from '@/lib/billing/providers/revenuecat-event'
import { parseRevenueCatEnvironment, resolveRevenueCatIdentity } from '@/lib/billing/identity'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (!webhookSecret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })

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

  const event = body.event
  if (!event || typeof event !== 'object') {
    return NextResponse.json({ error: 'Invalid event envelope' }, { status: 400 })
  }

  const eventType = event?.type || 'UNKNOWN'
  const environment = parseRevenueCatEnvironment(event?.environment)
  if (!environment) {
    return NextResponse.json({ error: 'Invalid or missing event environment' }, { status: 400 })
  }

  const eventId = event?.id || await generateEventFingerprint('revenuecat', eventType, {
    original_transaction_id: event?.original_transaction_id || '',
    transaction_id: event?.transaction_id || '',
    purchased_at_ms: event?.purchased_at_ms || 0,
  })

  // Events that must never mutate access are acknowledged before identity
  // resolution. PRODUCT_CHANGE may describe a deferred Store switch; only the
  // subsequent effective purchase/renewal is allowed to change AQWELIA plan.
  const controlReason = RC_CONTROL_REASONS[eventType]
  if (controlReason) {
    const result = await processEventIdempotently({
      eventId,
      source: 'revenuecat',
      environment,
      eventType,
      payload: JSON.stringify(redactEvent(event)),
      handler: async () => ({ result: 'ignored' as const, reason: controlReason }),
    })
    if (result.error) return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    return NextResponse.json({ received: true, ignored: true, skipped: result.skipped, reason: controlReason })
  }

  // Never promote a missing timestamp to `now`: that can make malformed or
  // replayed payloads look newer than the real subscription state and bypass
  // the out-of-order protection.
  const timestampCandidate = Number(event?.event_timestamp_ms ?? event?.purchased_at_ms)
  if (!Number.isFinite(timestampCandidate) || timestampCandidate <= 0) {
    return NextResponse.json({ error: 'Invalid or missing event timestamp' }, { status: 400 })
  }
  const providerEventAt = new Date(timestampCandidate)
  if (Number.isNaN(providerEventAt.getTime())) {
    return NextResponse.json({ error: 'Invalid event timestamp' }, { status: 400 })
  }

  // Resolve the canonical AQWELIA user before reserving a state-changing event.
  // An unbound identity remains retryable and does not consume the event ID.
  const resolution = await resolveRevenueCatIdentity(event)

  if (!resolution.ok) {
    if (resolution.code === 'identity_conflict') {
      const result = await processEventIdempotently({
        eventId,
        source: 'revenuecat',
        environment,
        eventType,
        payload: JSON.stringify(redactEvent(event)),
        handler: async () => ({ result: 'ignored' as const, reason: 'identity_conflict' }),
      })
      if (result.error) return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
      return NextResponse.json({ received: true, ignored: true, reason: 'identity_conflict' })
    }

    return NextResponse.json(
      { error: 'Identity not resolvable yet', reason: resolution.reason },
      { status: 503 },
    )
  }

  const resolvedUserId = resolution.userId
  const result = await processEventIdempotently({
    eventId,
    source: 'revenuecat',
    environment,
    eventType,
    userId: resolvedUserId,
    payload: JSON.stringify(redactEvent(event)),
    handler: async () => {
      return handleRevenueCatEvent(event, resolvedUserId, eventId, providerEventAt, environment)
    },
  })

  if (result.error) return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  return NextResponse.json({ received: true, skipped: result.skipped })
}

/** Never persist RevenueCat customer identifiers in webhook payload logs. */
function redactEvent(event: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = { ...event }
  for (const key of ['app_user_id', 'original_app_user_id']) {
    const value = redacted[key]
    redacted[key] = typeof value === 'string'
      ? `redacted:${crypto.createHash('sha256').update(value).digest('hex').slice(0, 16)}`
      : null
  }
  if (Array.isArray(redacted.aliases)) {
    redacted.aliases = (redacted.aliases as unknown[]).map((alias) =>
      typeof alias === 'string'
        ? `redacted:${crypto.createHash('sha256').update(alias).digest('hex').slice(0, 16)}`
        : alias,
    )
  }
  return redacted
}

const RC_CONTROL_REASONS: Record<string, string> = {
  TEST: 'event_type_not_supported',
  TRANSFER: 'rc_event_quarantined:transfer',
  ALIAS: 'rc_event_quarantined:alias',
  UNSUBSCRIPTION: 'rc_event_quarantined:unsubscription',
  PRODUCT_CHANGE: 'rc_event_deferred_to_effective_purchase:product_change',
}
