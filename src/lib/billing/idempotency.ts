/**
 * AQWELIA — Atomic billing event idempotency (P0-B fix).
 *
 * Pattern: INSERT-first (atomic reservation), then process.
 *
 * 1. ATTEMPT INSERT into BillingEvent with result='processing'
 *    - If unique constraint fails → event already processed → skip
 * 2. Execute handler (business logic)
 * 3. UPDATE BillingEvent to 'processed' or 'failed'
 *
 * This is atomic because the INSERT + unique constraint is a single DB operation.
 * Two concurrent requests cannot both pass step 1.
 */

import { db } from '@/lib/db'

export type EventSource = 'stripe' | 'revenuecat'
export type EventResult = 'processing' | 'processed' | 'failed' | 'ignored'

export interface ProcessEventParams {
  eventId: string
  source: EventSource
  eventType: string
  userId?: string
  payload: string
  handler: () => Promise<void>
}

export interface ProcessEventResult {
  skipped: boolean
  error?: string
}

/**
 * Generate a deterministic SHA-256 fingerprint when no stable event ID is provided.
 * Uses stable fields from the event to create a unique identifier.
 */
export async function generateEventFingerprint(
  source: EventSource,
  eventType: string,
  stableFields: Record<string, unknown>
): Promise<string> {
  const crypto = await import('crypto')
  const data = JSON.stringify({ source, eventType, ...stableFields })
  return `${source}_${crypto.createHash('sha256').update(data).digest('hex').slice(0, 32)}`
}

/**
 * Redact sensitive data from payload before storing.
 * Removes: card numbers, CVCs, bank accounts, API keys, tokens.
 */
export function redactPayload(payload: string): string {
  try {
    const data = JSON.parse(payload)
    const redacted = JSON.parse(JSON.stringify(data), (key, value) => {
      const lower = key.toLowerCase()
      if (
        lower.includes('card') && lower.includes('number') ||
        lower === 'cvc' || lower === 'cvv' ||
        lower.includes('bank_account') ||
        lower.includes('api_key') || lower.includes('secret') ||
        lower.includes('token') && !lower.includes('event_token')
      ) {
        return '[REDACTED]'
      }
      return value
    })
    return JSON.stringify(redacted).slice(0, 10000)
  } catch {
    // If not JSON, return as-is but capped
    return payload.slice(0, 10000)
  }
}

/**
 * Process a webhook event with ATOMIC idempotency.
 *
 * Flow:
 *   1. INSERT BillingEvent with result='processing' (atomic reservation)
 *      → If unique constraint (P2002) → already processed → return { skipped: true }
 *   2. Execute handler
 *   3. UPDATE BillingEvent to 'processed' or 'failed'
 *
 * This prevents the race condition where two concurrent requests
 * both pass the check-then-act pattern.
 */
export async function processEventIdempotently(
  params: ProcessEventParams
): Promise<ProcessEventResult> {
  const redactedPayload = redactPayload(params.payload)

  // 1. ATOMIC RESERVATION: insert with 'processing' status
  try {
    await db.billingEvent.create({
      data: {
        eventId: params.eventId,
        source: params.source,
        eventType: params.eventType,
        userId: params.userId || null,
        payload: redactedPayload,
        result: 'processing',
      },
    })
  } catch (err: any) {
    // P2002 = unique constraint violation = event already being processed or done
    if (err?.code === 'P2002') {
      return { skipped: true }
    }
    throw err
  }

  // 2. EXECUTE HANDLER
  try {
    await params.handler()

    // 3a. Mark as processed
    await db.billingEvent.updateMany({
      where: { eventId: params.eventId },
      data: { result: 'processed' },
    })

    return { skipped: false }
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    // 3b. Mark as failed
    await db.billingEvent.updateMany({
      where: { eventId: params.eventId },
      data: {
        result: 'failed',
        errorMessage: errorMessage.slice(0, 500),
      },
    })

    return { skipped: false, error: errorMessage }
  }
}

/**
 * Check if an event has already been fully processed.
 * Used for debugging/monitoring.
 */
export async function getEventStatus(
  source: EventSource,
  eventId: string
): Promise<EventResult | null> {
  const event = await db.billingEvent.findUnique({
    where: { eventId },
    select: { result: true },
  })
  return event?.result as EventResult | null
}
