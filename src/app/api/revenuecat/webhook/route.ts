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
 *   event.app_user_id       = RevenueCat App User ID (NOT trusted raw)
 *   event.original_app_user_id = previous App User ID
 *   event.aliases           = list of App User IDs aliased to this one
 *   event.environment       = 'SANDBOX' | 'PRODUCTION' (strictly validated)
 *
 * Wave A2 (Round 1) — canonical identity resolution:
 *   1. The payload environment is STRICTLY validated. An absent or invalid
 *      environment is rejected (400) — it is NEVER defaulted to production.
 *   2. The identity is resolved BEFORE any idempotency reservation:
 *        - all candidates (app_user_id, original_app_user_id, aliases) must
 *          converge on a single existing User;
 *        - several distinct Users → identity_conflict → quarantined (ignored),
 *          200, never transferred;
 *        - no bound identity → 503 retryable, NO event is reserved, so the
 *          provider can re-deliver after the client binds BillingIdentity;
 *        - resolved User does not exist → 503 retryable.
 *   3. Only after a canonical User is resolved is the event processed through
 *      processEventIdempotently (the same contract used by the internal retry),
 *      which keeps [source, environment, eventId] idempotency and out-of-order
 *      protection.
 *   The stored payload is redacted: raw app_user_id / original_app_user_id /
 *   aliases are replaced by a short hash — never stored in clear.
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

  // BLOCAGE 1: use event.type (official), not event_type
  const eventType = event?.type || 'UNKNOWN'

  // Wave A2 (Round 1): strict environment validation — absent or invalid is
  // REJECTED, never defaulted to production.
  const environment = parseRevenueCatEnvironment(event?.environment)
  if (!environment) {
    return NextResponse.json({ error: 'Invalid or missing event environment' }, { status: 400 })
  }

  // BLOCAGE 1: use event.id (official), fingerprint as fallback only
  const eventId = event?.id || await generateEventFingerprint('revenuecat', eventType, {
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

  // ── Wave A2 (Round 1): control events (TEST / TRANSFER / ALIAS / …) can
  // never carry a transition and must not wait on identity resolution. They are
  // acknowledged and recorded as ignored with a stable reason (quarantine) —
  // a TEST/TRANSFER is never granted access and never retried forever. ──
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

  // ── Wave A2 (Round 1): resolve the canonical identity BEFORE reservation ──
  const resolution = await resolveRevenueCatIdentity(event)

  if (!resolution.ok) {
    if (resolution.code === 'identity_conflict') {
      // Quarantine: multiple distinct Users resolved. Record a definitive
      // ignored event (never transferred) and acknowledge.
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
    // transient_unknown: the identity is not bound (or the resolved User does
    // not exist). Return a RETRYABLE 503 WITHOUT reserving the event so the
    // provider can re-deliver after the client binds BillingIdentity. No
    // BillingEvent row is created, so there is no double-transition risk.
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

/**
 * Redacts personal identifiers from the event before it is stored. Never log a
 * raw app_user_id / original_app_user_id / alias or a secret in clear.
 */
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

/**
 * Control events (TEST / TRANSFER / ALIAS / …) can never carry a monetization
 * transition and are quarantined (recorded ignored) without requiring identity
 * resolution. Each maps to a stable ignore reason.
 */
const RC_CONTROL_REASONS: Record<string, string> = {
  TEST: 'event_type_not_supported',
  TRANSFER: 'rc_event_quarantined:transfer',
  ALIAS: 'rc_event_quarantined:alias',
  UNSUBSCRIPTION: 'rc_event_quarantined:unsubscription',
  SUBSCRIPTION_EXTENDED: 'rc_event_quarantined:subscription_extended',
  SUBSCRIPTION_PAUSED: 'rc_event_quarantined:subscription_paused',
}
