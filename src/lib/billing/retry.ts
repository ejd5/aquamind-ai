import { db } from '@/lib/db'
import { processEventIdempotently, MAX_BILLING_RETRIES } from '@/lib/billing/idempotency'
import { handleStripeEvent } from '@/lib/billing/providers/stripe-event'
import { handleRevenueCatEvent } from '@/lib/billing/providers/revenuecat-event'
import { trackEventServer } from '@/lib/analytics-server'

export type BillingRetrySummary = {
  claimed: number
  processed: number
  skipped: number
  failed: number
  permanentFailures: number
}

export async function retryDueBillingEvents(limit = 20): Promise<BillingRetrySummary> {
  const now = new Date()
  const due = await db.billingEvent.findMany({
    where: {
      result: 'failed',
      attemptCount: { lt: MAX_BILLING_RETRIES },
      nextRetryAt: { lte: now },
    },
    orderBy: [{ nextRetryAt: 'asc' }, { createdAt: 'asc' }],
    take: Math.max(1, Math.min(50, limit)),
  })

  const summary: BillingRetrySummary = { claimed: due.length, processed: 0, skipped: 0, failed: 0, permanentFailures: 0 }
  for (const row of due) {
    try {
      const result = await processEventIdempotently({
        eventId: row.eventId,
        source: row.source as 'stripe' | 'revenuecat',
        eventType: row.eventType,
        userId: row.userId || undefined,
        payload: row.payload || '{}',
        handler: async () => {
          const payload = JSON.parse(row.payload || '{}')
          if (row.source === 'stripe') return handleStripeEvent(payload)
          const userId = row.userId || payload?.app_user_id
          if (!userId) return { result: 'ignored', reason: 'missing_user_mapping' }
          const providerEventAt = payload?.event_timestamp_ms
            ? new Date(payload.event_timestamp_ms)
            : payload?.purchased_at_ms
              ? new Date(payload.purchased_at_ms)
              : row.createdAt
          return handleRevenueCatEvent(payload, userId, row.eventId, providerEventAt)
        },
      })
      if (result.error) summary.failed += 1
      else if (result.skipped) summary.skipped += 1
      else summary.processed += 1
    } catch (error) {
      summary.failed += 1
      console.error('[billing.retry] Unexpected retry failure', { eventId: row.eventId, source: row.source, error })
    }
  }

  const permanent = await db.billingEvent.findMany({
    where: { result: 'failed', attemptCount: { gte: MAX_BILLING_RETRIES }, nextRetryAt: null },
    select: { id: true, eventId: true, source: true, eventType: true, attemptCount: true, errorMessage: true },
    take: 20,
  })
  summary.permanentFailures = permanent.length
  if (permanent.length > 0) {
    console.error('[billing.retry] Permanent billing failures require review', permanent)
    void trackEventServer('billing_retry_exhausted', { count: permanent.length, events: permanent.map((event) => ({ source: event.source, type: event.eventType, attempts: event.attemptCount })) })
  }
  return summary
}
