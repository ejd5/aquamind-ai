/**
 * AQWELIA — Billing event idempotency helper.
 *
 * Ensures each webhook event is processed exactly once.
 * Uses the BillingEvent Prisma model with a unique constraint on `eventId`.
 */

import { db } from '@/lib/db'

/**
 * Check if a billing event has already been processed.
 * Returns true if the event exists in the BillingEvent table.
 */
export async function isEventProcessed(
  source: 'stripe' | 'revenuecat',
  eventId: string
): Promise<boolean> {
  const existing = await db.billingEvent.findUnique({
    where: { eventId },
    select: { id: true },
  })
  return !!existing
}

/**
 * Record a processed billing event.
 * If the eventId already exists (race condition), the unique constraint
 * will throw — the caller should catch and treat as idempotent success.
 */
export async function recordBillingEvent(params: {
  eventId: string
  source: 'stripe' | 'revenuecat'
  eventType: string
  userId?: string
  payload: string
  result: 'success' | 'error' | 'ignored'
  errorMessage?: string
}): Promise<void> {
  try {
    await db.billingEvent.create({
      data: {
        eventId: params.eventId,
        source: params.source,
        eventType: params.eventType,
        userId: params.userId || null,
        payload: params.payload.slice(0, 10000), // Cap at 10KB to avoid DB bloat
        result: params.result,
        errorMessage: params.errorMessage || null,
      },
    })
  } catch (err: any) {
    // If it's a unique constraint violation, the event was already processed
    // by a concurrent request — this is expected (idempotent).
    if (err?.code === 'P2002') {
      throw new Error('DUPLICATE_EVENT')
    }
    throw err
  }
}

/**
 * Safely process a webhook event with idempotency.
 *
 * 1. Check if the event was already processed → return early.
 * 2. Execute the handler.
 * 3. Record the result in BillingEvent.
 * 4. If the handler throws, record the error and re-throw.
 *
 * If a duplicate event arrives (same eventId), it is silently ignored
 * (returns { skipped: true }).
 */
export async function processEventIdempotently(params: {
  eventId: string
  source: 'stripe' | 'revenuecat'
  eventType: string
  userId?: string
  payload: string
  handler: () => Promise<void>
}): Promise<{ skipped: boolean; error?: string }> {
  // 1. Idempotency check
  const alreadyProcessed = await isEventProcessed(params.source, params.eventId)
  if (alreadyProcessed) {
    return { skipped: true }
  }

  // 2. Execute handler
  try {
    await params.handler()

    // 3. Record success
    await recordBillingEvent({
      eventId: params.eventId,
      source: params.source,
      eventType: params.eventType,
      userId: params.userId,
      payload: params.payload,
      result: 'success',
    })

    return { skipped: false }
  } catch (err: any) {
    // Check if it's a duplicate (race condition)
    if (err?.message === 'DUPLICATE_EVENT') {
      return { skipped: true }
    }

    // 4. Record error
    const errorMessage = err instanceof Error ? err.message : String(err)
    try {
      await recordBillingEvent({
        eventId: params.eventId,
        source: params.source,
        eventType: params.eventType,
        userId: params.userId,
        payload: params.payload,
        result: 'error',
        errorMessage: errorMessage.slice(0, 500),
      })
    } catch {
      // If recording the error also fails (e.g. duplicate), ignore.
    }

    return { skipped: false, error: errorMessage }
  }
}
