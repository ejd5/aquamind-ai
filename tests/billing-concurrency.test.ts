import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { processEventIdempotently } from '@/lib/billing/idempotency'
import { applyTransition } from '@/lib/billing/transition'

const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })
const prefix = `p0b_atomic_${Date.now()}`
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
let userId: string

describe('P0-B atomicity and convergence', () => {
  beforeAll(async () => {
    userId = (await db.user.findUniqueOrThrow({ where: { email: 'test@aqwelia.app' } })).id
  })

  afterAll(async () => {
    await db.billingEvent.deleteMany({ where: { eventId: { startsWith: prefix } } })
    await db.subscription.deleteMany({
      where: { OR: [
        { providerSubscriptionId: { startsWith: prefix } },
        { stripeSubscriptionId: { startsWith: prefix } },
      ] },
    })
    await db.$disconnect()
  })

  it('processes twelve concurrent deliveries exactly once', async () => {
    const eventId = `${prefix}_duplicate`
    let calls = 0
    const results = await Promise.all(Array.from({ length: 12 }, () => processEventIdempotently({
      eventId, source: 'revenuecat', eventType: 'RENEWAL', userId, payload: '{}',
      handler: async () => { calls += 1; await pause(50) },
    })))
    expect(calls).toBe(1)
    expect(results.filter(result => !result.skipped)).toHaveLength(1)
    expect(await db.billingEvent.count({ where: { source: 'revenuecat', eventId } })).toBe(1)
  })

  it('honours retry time and allows a single concurrent retry', async () => {
    const eventId = `${prefix}_retry`
    await db.billingEvent.create({ data: {
      eventId, source: 'stripe', eventType: 'invoice.paid', userId,
      result: 'failed', payload: '{}', attemptCount: 1,
      nextRetryAt: new Date(Date.now() + 60_000),
    } })
    let calls = 0
    expect((await processEventIdempotently({
      eventId, source: 'stripe', eventType: 'invoice.paid', userId, payload: '{}',
      handler: async () => { calls += 1 },
    })).skipped).toBe(true)
    expect(calls).toBe(0)
    await db.billingEvent.update({
      where: { source_eventId: { source: 'stripe', eventId } },
      data: { nextRetryAt: new Date(Date.now() - 1_000) },
    })
    const results = await Promise.all(Array.from({ length: 8 }, () => processEventIdempotently({
      eventId, source: 'stripe', eventType: 'invoice.paid', userId, payload: '{}',
      handler: async () => { calls += 1; await pause(40) },
    })))
    expect(calls).toBe(1)
    expect(results.filter(result => !result.skipped)).toHaveLength(1)
    const event = await db.billingEvent.findUnique({ where: { source_eventId: { source: 'stripe', eventId } } })
    expect(event?.result).toBe('processed')
    expect(event?.attemptCount).toBe(2)
  })

  it('reclaims one expired lease without allowing a stale owner to finalize', async () => {
    const eventId = `${prefix}_lease`
    await db.billingEvent.create({ data: {
      eventId, source: 'stripe', eventType: 'customer.subscription.updated', userId,
      result: 'processing', payload: '{}', attemptCount: 1,
      processingStartedAt: new Date(Date.now() - 10 * 60_000), processingToken: 'abandoned',
    } })
    let calls = 0
    const results = await Promise.all(Array.from({ length: 8 }, () => processEventIdempotently({
      eventId, source: 'stripe', eventType: 'customer.subscription.updated', userId, payload: '{}',
      handler: async () => { calls += 1; await pause(40) },
    })))
    expect(calls).toBe(1)
    expect(results.filter(result => !result.skipped)).toHaveLength(1)
    const event = await db.billingEvent.findUnique({ where: { source_eventId: { source: 'stripe', eventId } } })
    expect(event?.result).toBe('processed')
    expect(event?.processingToken).toBeNull()
  })

  it('converges to expiration for equal timestamps regardless of order', async () => {
    const timestamp = new Date('2026-07-11T10:00:00Z')
    for (const order of [['active', 'expired'], ['expired', 'active']] as const) {
      const providerSubscriptionId = `${prefix}_${order.join('_')}`
      for (const status of order) {
        await applyTransition({
          userId, planId: 'oasis', status, duration: 'month', store: 'ios',
          providerSubscriptionId, providerEventId: `${providerSubscriptionId}_${status}`,
          providerEventAt: timestamp,
          expiresAt: status === 'expired' ? timestamp : new Date('2026-08-11T10:00:00Z'),
        })
      }
      const subscription = await db.subscription.findUnique({ where: { providerSubscriptionId } })
      expect(subscription?.status).toBe('expired')
      expect(subscription?.active).toBe(false)
    }
  })

  it('keeps the newest event and replays a post-transition crash safely', async () => {
    const providerSubscriptionId = `${prefix}_crash_sub`
    const eventId = `${prefix}_crash_event`
    const newer = new Date('2026-08-11T10:00:00Z')
    await applyTransition({
      userId, planId: 'spa365', status: 'active', duration: 'year', store: 'ios',
      providerSubscriptionId, providerEventId: `${eventId}_new`, providerEventAt: newer,
      expiresAt: new Date('2027-08-11T10:00:00Z'),
    })
    const stale = await applyTransition({
      userId, planId: 'spa365', status: 'expired', duration: 'year', store: 'ios',
      providerSubscriptionId, providerEventId: `${eventId}_old`,
      providerEventAt: new Date('2026-07-11T10:00:00Z'),
    })
    expect(stale.skipped).toBe(true)

    let crash = true
    const handler = async () => {
      await applyTransition({
        userId, planId: 'spa365', status: 'active', duration: 'year', store: 'ios',
        providerSubscriptionId, providerEventId: eventId, providerEventAt: newer,
      })
      if (crash) { crash = false; throw new Error('simulated crash') }
    }
    expect((await processEventIdempotently({
      eventId, source: 'revenuecat', eventType: 'RENEWAL', userId, payload: '{}', handler,
    })).error).toContain('simulated crash')
    await db.billingEvent.update({
      where: { source_eventId: { source: 'revenuecat', eventId } },
      data: { nextRetryAt: new Date(Date.now() - 1_000) },
    })
    expect((await processEventIdempotently({
      eventId, source: 'revenuecat', eventType: 'RENEWAL', userId, payload: '{}', handler,
    })).skipped).toBe(false)
    expect(await db.subscription.count({ where: { providerSubscriptionId } })).toBe(1)
  })
})
