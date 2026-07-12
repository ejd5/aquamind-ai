import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const databaseUrl = process.env.POSTGRES_TEST_DATABASE_URL
let prisma

beforeAll(async () => {
  if (!databaseUrl?.match(/^postgres(ql)?:\/\//)) {
    throw new Error('POSTGRES_TEST_DATABASE_URL must point to a PostgreSQL test database')
  }
  const loaded = await import(pathToFileURL(resolve('generated/client-postgresql/index.js')).href)
  const PrismaClient = loaded.PrismaClient || loaded.default?.PrismaClient
  if (!PrismaClient) throw new Error('PostgreSQL Prisma client is unavailable')
  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
})

afterAll(async () => {
  await prisma?.$disconnect()
})

describe('PostgreSQL schema', () => {
  it('supports related records, defaults, uniqueness, cascades and rollback', async () => {
    const suffix = Date.now().toString(36)
    const user = await prisma.user.create({
      data: { email: `pg-${suffix}@aqwelia.test`, passwordHash: 'test-only' },
    })
    expect(user.role).toBe('user')
    expect(user.locale).toBe('fr')

    const pool = await prisma.poolProfile.create({ data: { userId: user.id, name: 'Test pool', volume: 42 } })
    expect(pool.saltSystem).toBe(false)

    await prisma.subscription.create({
      data: { userId: user.id, plan: 'oasis', status: 'active', stripeSubscriptionId: `sub_${suffix}` },
    })
    await prisma.billingEvent.create({
      data: { source: 'stripe', eventId: `evt_${suffix}`, eventType: 'test', result: 'processed' },
    })
    await expect(prisma.billingEvent.create({
      data: { source: 'stripe', eventId: `evt_${suffix}`, eventType: 'duplicate' },
    })).rejects.toMatchObject({ code: 'P2002' })

    const before = await prisma.user.count()
    await expect(prisma.$transaction(async tx => {
      await tx.user.create({ data: { email: `rollback-${suffix}@aqwelia.test`, passwordHash: 'test-only' } })
      throw new Error('rollback-test')
    })).rejects.toThrow('rollback-test')
    expect(await prisma.user.count()).toBe(before)

    await prisma.user.delete({ where: { id: user.id } })
    expect(await prisma.poolProfile.count({ where: { id: pool.id } })).toBe(0)
    expect(await prisma.subscription.count({ where: { userId: user.id } })).toBe(0)
    await prisma.billingEvent.deleteMany({ where: { eventId: `evt_${suffix}` } })
  })
})
