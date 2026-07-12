/**
 * AQWELIA — PostgreSQL integration tests (P0-E).
 *
 * Uses a SEPARATE Prisma client generated from prisma/postgresql/schema.prisma
 * (output: node_modules/.prisma/client-postgresql).
 *
 * These tests FAIL if PostgreSQL is not available (no silent skip).
 *
 * Run: bun run test:postgresql:integration
 * (requires POSTGRES_TEST_DATABASE_URL env var pointing to a postgresql:// URL)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const DATABASE_URL = process.env.POSTGRES_TEST_DATABASE_URL

if (!DATABASE_URL || !DATABASE_URL.startsWith('postgresql://')) {
  console.error('ERROR: POSTGRES_TEST_DATABASE_URL must be a postgresql:// URL')
  console.error('These tests require a real PostgreSQL server. They cannot be skipped.')
  process.exit(1)
}

// Import from the SEPARATE PostgreSQL client (not the default SQLite client)
const { PrismaClient } = require(
  require('path').join(process.cwd(), 'node_modules', '.prisma', 'client-postgresql')
)
const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } })

describe('PostgreSQL — Schema and CRUD', () => {
  beforeAll(async () => {
    // Clean all data in FK-safe order
    const models = [
      'billingEvent', 'subscription', 'waterTest', 'photoDiagnostic',
      'actionPlan', 'equipment', 'productInventory', 'chatMessage',
      'maintenanceTask', 'poolDesign', 'reminder', 'guideView',
      'analyticsEvent', 'poolProfile', 'account', 'user',
    ]
    for (const m of models) {
      try { await prisma[m].deleteMany() } catch { /* table may not exist */ }
    }
  })

  afterAll(async () => {
    const models = [
      'billingEvent', 'subscription', 'waterTest', 'photoDiagnostic',
      'actionPlan', 'equipment', 'productInventory', 'chatMessage',
      'maintenanceTask', 'poolDesign', 'reminder', 'guideView',
      'analyticsEvent', 'poolProfile', 'account', 'user',
    ]
    for (const m of models) {
      try { await prisma[m].deleteMany() } catch { /* ignore */ }
    }
    await prisma.$disconnect()
  })

  it('creates a user with correct defaults', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'pg-test@aqwelia.app',
        passwordHash: 'salt:hash',
        name: 'PG Test User',
      },
    })
    expect(user.id).toBeTruthy()
    expect(user.email).toBe('pg-test@aqwelia.app')
    expect(user.role).toBe('user')
    expect(user.locale).toBe('fr')
    expect(user.country).toBe('FR')
    expect(user.timezone).toBe('Europe/Paris')
    expect(user.consentMarketing).toBe(false)
    expect(user.consentAnalytics).toBe(true)
    expect(user.consentEmail).toBe(true)
    expect(user.createdAt).toBeInstanceOf(Date)
    expect(user.updatedAt).toBeInstanceOf(Date)
  })

  it('creates a pool profile linked to user', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'pg-test@aqwelia.app' } })
    expect(user).toBeTruthy()

    const pool = await prisma.poolProfile.create({
      data: {
        userId: user!.id,
        name: 'PG Test Pool',
        volume: 50,
        unit: 'm3',
        shape: 'rectangular',
        surfaceType: 'liner',
        treatmentType: 'chlorine',
        filterType: 'sand',
      },
    })
    expect(pool.id).toBeTruthy()
    expect(pool.volume).toBe(50)
    expect(pool.saltSystem).toBe(false)
  })

  it('creates a subscription with all P0-B fields', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'pg-test@aqwelia.app' } })
    const sub = await prisma.subscription.create({
      data: {
        userId: user!.id,
        plan: 'oasis',
        status: 'active',
        duration: 'month',
        store: 'web',
        active: true,
        stripeSubscriptionId: 'sub_test_123',
        providerSubscriptionId: 'sub_test_123',
        lastProviderEventId: 'evt_001',
        lastProviderEventAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
    expect(sub.id).toBeTruthy()
    expect(sub.status).toBe('active')
    expect(sub.store).toBe('web')
    expect(sub.stripeSubscriptionId).toBe('sub_test_123')
  })

  it('enforces BillingEvent unique constraint [source, eventId]', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'pg-test@aqwelia.app' } })

    await prisma.billingEvent.create({
      data: {
        eventId: 'evt_unique_001',
        source: 'stripe',
        eventType: 'checkout.session.completed',
        userId: user!.id,
        result: 'processed',
      },
    })

    // Same source + eventId → must fail
    await expect(
      prisma.billingEvent.create({
        data: {
          eventId: 'evt_unique_001',
          source: 'stripe',
          eventType: 'customer.subscription.updated',
          userId: user!.id,
          result: 'processed',
        },
      })
    ).rejects.toThrow()

    // Same eventId, different source → OK
    const rcEvent = await prisma.billingEvent.create({
      data: {
        eventId: 'evt_unique_001',
        source: 'revenuecat',
        eventType: 'INITIAL_PURCHASE',
        userId: user!.id,
        result: 'processed',
      },
    })
    expect(rcEvent.id).toBeTruthy()
  })

  it('cascade deletes on user deletion', async () => {
    const user = await prisma.user.create({
      data: { email: 'cascade-test@aqwelia.app', passwordHash: 'salt:hash' },
    })

    await prisma.poolProfile.create({
      data: { userId: user.id, name: 'Cascade Pool', volume: 30, unit: 'm3' },
    })

    await prisma.subscription.create({
      data: { userId: user.id, plan: 'oasis', status: 'active', active: true },
    })

    await prisma.user.delete({ where: { id: user.id } })

    expect(await prisma.poolProfile.count({ where: { userId: user.id } })).toBe(0)
    expect(await prisma.subscription.count({ where: { userId: user.id } })).toBe(0)
  })

  it('transaction with rollback', async () => {
    const initialCount = await prisma.user.count()

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: { email: 'tx-test@aqwelia.app', passwordHash: 'salt:hash' },
        })
        // Force error — duplicate email
        await tx.user.create({
          data: { email: 'tx-test@aqwelia.app', passwordHash: 'salt:hash' },
        })
      })
    ).rejects.toThrow()

    expect(await prisma.user.count()).toBe(initialCount)
  })

  it('verifies BillingEvent defaults', async () => {
    const be = await prisma.billingEvent.create({
      data: { eventId: 'evt_defaults_001', source: 'stripe', eventType: 'test.event' },
    })
    expect(be.result).toBe('processing')
    expect(be.attemptCount).toBe(0)
    expect(be.createdAt).toBeInstanceOf(Date)
  })

  it('verifies Subscription unique constraint (stripeSubscriptionId)', async () => {
    const user = await prisma.user.create({
      data: { email: 'unique-test@aqwelia.app', passwordHash: 'x' },
    })

    await prisma.subscription.create({
      data: {
        userId: user.id, plan: 'oasis', status: 'active',
        stripeSubscriptionId: 'sub_unique_001',
      },
    })

    await expect(
      prisma.subscription.create({
        data: {
          userId: user.id, plan: 'wellness', status: 'active',
          stripeSubscriptionId: 'sub_unique_001',
        },
      })
    ).rejects.toThrow()
  })
})
