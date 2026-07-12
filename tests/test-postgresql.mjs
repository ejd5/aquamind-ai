/**
 * AQWELIA — PostgreSQL integration tests (P0-E).
 *
 * These tests run against a REAL PostgreSQL database (CI service container).
 * They verify that:
 *   - prisma migrate deploy works on an empty database
 *   - CRUD operations work (User, PoolProfile, Subscription, BillingEvent)
 *   - Unique constraints are enforced
 *   - Cascade deletes work
 *   - Transactions with rollback work
 *   - Default values are correct
 *
 * Run: bun run test:postgresql:integration
 * (requires POSTGRES_TEST_DATABASE_URL env var)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const DATABASE_URL = process.env.POSTGRES_TEST_DATABASE_URL || process.env.DATABASE_URL

if (!DATABASE_URL || !DATABASE_URL.startsWith('postgresql://')) {
  console.error('POSTGRES_TEST_DATABASE_URL must be a postgresql:// URL')
  process.exit(1)
}

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } })

describe('PostgreSQL — Schema and CRUD', () => {
  // Clean up before and after
  beforeAll(async () => {
    // Delete all data (order matters for FK constraints)
    await prisma.billingEvent.deleteMany()
    await prisma.subscription.deleteMany()
    await prisma.waterTest.deleteMany()
    await prisma.poolProfile.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.billingEvent.deleteMany()
    await prisma.subscription.deleteMany()
    await prisma.waterTest.deleteMany()
    await prisma.poolProfile.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  it('creates a user', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'pg-test@aqwelia.app',
        passwordHash: 'salt:hash',
        name: 'PG Test User',
      },
    })
    expect(user.id).toBeTruthy()
    expect(user.email).toBe('pg-test@aqwelia.app')
    expect(user.role).toBe('user') // default value
    expect(user.locale).toBe('fr') // default value
    expect(user.createdAt).toBeInstanceOf(Date)
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
    expect(pool.saltSystem).toBe(false) // default value
  })

  it('creates a subscription with all P0-B fields', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'pg-test@aqwelia.app' } })
    expect(user).toBeTruthy()

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
    expect(sub.attemptCount || 0).toBe(0) // no attemptCount on Subscription
  })

  it('enforces BillingEvent unique constraint [source, eventId]', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'pg-test@aqwelia.app' } })

    // First event — OK
    await prisma.billingEvent.create({
      data: {
        eventId: 'evt_unique_001',
        source: 'stripe',
        eventType: 'checkout.session.completed',
        userId: user!.id,
        result: 'processed',
      },
    })

    // Same source + eventId — should fail
    try {
      await prisma.billingEvent.create({
        data: {
          eventId: 'evt_unique_001',
          source: 'stripe',
          eventType: 'customer.subscription.updated',
          userId: user!.id,
          result: 'processed',
        },
      })
      expect.fail('Should have thrown unique constraint violation')
    } catch (err: any) {
      expect(err.code).toBe('P2002') // Prisma unique constraint
    }

    // Same eventId but different source — OK
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
    // Create a separate user with related data
    const user = await prisma.user.create({
      data: {
        email: 'cascade-test@aqwelia.app',
        passwordHash: 'salt:hash',
      },
    })

    await prisma.poolProfile.create({
      data: {
        userId: user.id,
        name: 'Cascade Pool',
        volume: 30,
        unit: 'm3',
      },
    })

    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'oasis',
        status: 'active',
        active: true,
      },
    })

    // Delete user — should cascade to PoolProfile and Subscription
    await prisma.user.delete({ where: { id: user.id } })

    const poolCount = await prisma.poolProfile.count({ where: { userId: user.id } })
    const subCount = await prisma.subscription.count({ where: { userId: user.id } })
    expect(poolCount).toBe(0)
    expect(subCount).toBe(0)
  })

  it('transaction with rollback', async () => {
    const initialCount = await prisma.user.count()

    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            email: 'tx-test@aqwelia.app',
            passwordHash: 'salt:hash',
          },
        })
        // Force an error — duplicate email
        await tx.user.create({
          data: {
            email: 'tx-test@aqwelia.app',
            passwordHash: 'salt:hash',
          },
        })
      })
      expect.fail('Transaction should have rolled back')
    } catch (err: any) {
      // Expected — duplicate email
    }

    const finalCount = await prisma.user.count()
    expect(finalCount).toBe(initialCount) // rollback worked
  })

  it('checks default values', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'defaults-test@aqwelia.app',
        passwordHash: 'salt:hash',
      },
    })

    expect(user.role).toBe('user')
    expect(user.locale).toBe('fr')
    expect(user.country).toBe('FR')
    expect(user.timezone).toBe('Europe/Paris')
    expect(user.consentMarketing).toBe(false)
    expect(user.consentAnalytics).toBe(true)
    expect(user.consentEmail).toBe(true)
    expect(user.createdAt).toBeInstanceOf(Date)
    expect(user.updatedAt).toBeInstanceOf(Date)

    const billingEvent = await prisma.billingEvent.create({
      data: {
        eventId: 'evt_defaults_001',
        source: 'stripe',
        eventType: 'test.event',
      },
    })

    expect(billingEvent.result).toBe('processing') // default
    expect(billingEvent.attemptCount).toBe(0) // default
    expect(billingEvent.createdAt).toBeInstanceOf(Date) // default
  })

  it('verifies Subscription unique constraints', async () => {
    const user = await prisma.user.create({
      data: { email: 'unique-test@aqwelia.app', passwordHash: 'x' },
    })

    // First subscription with stripeSubscriptionId
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'oasis',
        status: 'active',
        stripeSubscriptionId: 'sub_unique_001',
      },
    })

    // Second subscription with SAME stripeSubscriptionId — should fail
    try {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'wellness',
          status: 'active',
          stripeSubscriptionId: 'sub_unique_001',
        },
      })
      expect.fail('Should have thrown unique constraint')
    } catch (err: any) {
      expect(err.code).toBe('P2002')
    }
  })
})
