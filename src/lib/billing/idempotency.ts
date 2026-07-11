/**
 * AQWELIA — Atomic billing event idempotency with retry support (P0-B).
 *
 * Pattern: INSERT-first (atomic reservation), then process.
 *
 * 1. ATTEMPT INSERT into BillingEvent with result='processing'
 *    - If unique constraint [source, eventId] fails:
 *      a. If existing result='processed' → skip (idempotent)
 *      b. If existing result='processing' and lease not expired → skip
 *      c. If existing result='processing' and lease expired → reclaim (retry)
 *      d. If existing result='failed' and retries < MAX → retry
 * 2. Execute handler (business logic)
 * 3. UPDATE BillingEvent to 'processed' or 'failed'
 */

import { db } from '@/lib/db'

export type EventSource = 'stripe' | 'revenuecat'
export type EventResult = 'processing' | 'processed' | 'failed' | 'ignored'

const MAX_RETRIES = 3
const PROCESSING_LEASE_MS = 5 * 60 * 1000 // 5 minutes

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
 */
export function redactPayload(payload: string): string {
  try {
    const data = JSON.parse(payload)
    const redacted = JSON.parse(JSON.stringify(data), (key, value) => {
      const lower = key.toLowerCase()
      if (
        (lower.includes('card') && lower.includes('number')) ||
        lower === 'cvc' || lower === 'cvv' ||
        lower.includes('bank_account') ||
        lower.includes('api_key') || lower.includes('secret') ||
        (lower.includes('token') && !lower.includes('event_token') && !lower.includes('transaction_id'))
      ) {
        return '[REDACTED]'
      }
      return value
    })
    return JSON.stringify(redacted).slice(0, 10000)
  } catch {
    return payload.slice(0, 10000)
  }
}

/**
 * Process a webhook event with ATOMIC idempotency and retry support.
 *
 * Flow:
 *   1. Try INSERT BillingEvent (result='processing', attemptCount=1)
 *      → P2002 = already exists → check existing state
 *   2. Execute handler
 *   3. UPDATE to 'processed' or 'failed' (with nextRetryAt if failed)
 */
export async function processEventIdempotently(
  params: ProcessEventParams
): Promise<ProcessEventResult> {
  const redactedPayload = redactPayload(params.payload)
  const now = new Date()

  // 1. ATOMIC RESERVATION
  try {
    await db.billingEvent.create({
      data: {
        eventId: params.eventId,
        source: params.source,
        eventType: params.eventType,
        userId: params.userId || null,
        payload: redactedPayload,
        result: 'processing',
        attemptCount: 1,
        processingStartedAt: now,
      },
    })
  } catch (err: any) {
    if (err?.code !== 'P2002') throw err

    // Event already exists — check its state
    const existing = await db.billingEvent.findUnique({
      where: { source_eventId: { source: params.source, eventId: params.eventId } },
    })

    if (!existing) {
      // Shouldn't happen, but handle gracefully
      return { skipped: true }
    }

    // Already processed → skip
    if (existing.result === 'processed' || existing.result === 'ignored') {
      return { skipped: true }
    }

    // Processing but lease expired → reclaim
    if (existing.result === 'processing' && existing.processingStartedAt) {
      const leaseExpiry = new Date(existing.processingStartedAt.getTime() + PROCESSING_LEASE_MS)
      if (now < leaseExpiry) {
        // Lease still active — skip
        return { skipped: true }
      }
      // Lease expired — reclaim with incremented attemptCount
      if (existing.attemptCount >= MAX_RETRIES) {
        // Too many retries — mark as failed permanently
        await db.billingEvent.update({
          where: { id: existing.id },
          data: {
            result: 'failed',
            errorMessage: 'Max retries exceeded',
            processingStartedAt: null,
          },
        })
        return { skipped: true }
      }
      // Reclaim
      await db.billingEvent.update({
        where: { id: existing.id },
        data: {
          result: 'processing',
          attemptCount: { increment: 1 },
          processingStartedAt: now,
        },
      })
    }

    // Failed and retries available → retry
    if (existing.result === 'failed' && existing.attemptCount < MAX_RETRIES) {
      await db.billingEvent.update({
        where: { id: existing.id },
        data: {
          result: 'processing',
          attemptCount: { increment: 1 },
          processingStartedAt: now,
        },
      })
    } else if (existing.result === 'failed') {
      // Max retries exceeded — skip
      return { skipped: true }
    }
  }

  // 2. EXECUTE HANDLER
  try {
    await params.handler()

    // 3a. Mark as processed
    await db.billingEvent.updateMany({
      where: { source: params.source, eventId: params.eventId },
      data: {
        result: 'processed',
        processedAt: new Date(),
        processingStartedAt: null,
        nextRetryAt: null,
      },
    })

    return { skipped: false }
  } catch (err: any) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    const attemptCount = await getAttemptCount(params.source, params.eventId)

    // 3b. Mark as failed (with nextRetryAt if retries remaining)
    const nextRetryAt = attemptCount < MAX_RETRIES
      ? new Date(Date.now() + 60 * 1000) // Retry in 1 minute
      : null

    await db.billingEvent.updateMany({
      where: { source: params.source, eventId: params.eventId },
      data: {
        result: 'failed',
        errorMessage: errorMessage.slice(0, 500),
        processingStartedAt: null,
        nextRetryAt,
      },
    })

    return { skipped: false, error: errorMessage }
  }
}

async function getAttemptCount(source: EventSource, eventId: string): Promise<number> {
  const event = await db.billingEvent.findUnique({
    where: { source_eventId: { source, eventId } },
    select: { attemptCount: true },
  })
  return event?.attemptCount ?? 0
}

/**
 * Check if an event has already been fully processed.
 */
export async function getEventStatus(
  source: EventSource,
  eventId: string
): Promise<EventResult | null> {
  const event = await db.billingEvent.findUnique({
    where: { source_eventId: { source, eventId } },
    select: { result: true },
  })
  return event?.result as EventResult | null
}
