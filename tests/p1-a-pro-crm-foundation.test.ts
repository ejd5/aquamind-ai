import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import {
  normalizeCurrency,
  parseOptionalAmount,
  parseOptionalDate,
  parseStoredStringArray,
  serializeShortStringArray,
} from '@/lib/pro/crm'

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
const ownerEmail = `p1-a-owner-${suffix}@aqwelia.test`
const otherEmail = `p1-a-other-${suffix}@aqwelia.test`
let ownerId = ''
let otherId = ''
let clientId = ''

beforeAll(async () => {
  const [owner, other] = await Promise.all([
    db.user.create({
      data: { email: ownerEmail, passwordHash: 'test-only', name: 'P1-A Owner', role: 'pro' },
    }),
    db.user.create({
      data: { email: otherEmail, passwordHash: 'test-only', name: 'P1-A Other', role: 'pro' },
    }),
  ])
  ownerId = owner.id
  otherId = other.id
})

afterAll(async () => {
  if (ownerId || otherId) {
    await db.user.deleteMany({ where: { id: { in: [ownerId, otherId].filter(Boolean) } } })
  }
})

describe('P1-A Pro CRM foundation', () => {
  it('normalizes tags, dates, amounts and currencies deterministically', () => {
    const stored = serializeShortStringArray([' VIP ', 'contrat annuel', 'VIP', '', 42])
    expect(parseStoredStringArray(stored)).toEqual(['VIP', 'contrat annuel'])
    expect(parseOptionalAmount('125.678')).toBe(125.68)
    expect(parseOptionalAmount('-1')).toBeUndefined()
    expect(normalizeCurrency('eur')).toBe('EUR')
    expect(normalizeCurrency('not-a-currency')).toBe('EUR')
    expect(parseOptionalDate('2026-07-24T09:00:00.000Z').valid).toBe(true)
    expect(parseOptionalDate('invalid').valid).toBe(false)
  })

  it('persists the CRM lifecycle, activity timeline and enriched pool fields', async () => {
    const client = await db.proClient.create({
      data: {
        proUserId: ownerId,
        firstName: 'Marie',
        lastName: 'Durand',
        companyName: 'Villa Azur',
        status: 'prospect',
        source: 'referral',
        preferredContact: 'phone',
        tags: serializeShortStringArray(['VIP', 'contrat annuel']),
        nextFollowUpAt: new Date('2026-08-01T08:00:00.000Z'),
      },
    })
    clientId = client.id

    const pool = await db.proPool.create({
      data: {
        proClientId: client.id,
        name: 'Piscine principale',
        status: 'seasonal',
        volume: 48,
        brand: 'AquaTest',
        model: 'Azure 48',
        serialNumber: 'AQ-48001',
        accessInstructions: 'Portail côté jardin',
        nextServiceAt: new Date('2026-08-05T07:00:00.000Z'),
      },
    })

    await db.proClientActivity.create({
      data: {
        proClientId: client.id,
        actorUserId: ownerId,
        type: 'call',
        title: 'Appel de qualification',
        details: 'Souhaite un contrat annuel.',
      },
    })

    await db.proIntervention.create({
      data: {
        proClientId: client.id,
        proPoolId: pool.id,
        type: 'maintenance',
        priority: 'high',
        status: 'scheduled',
        scheduledAt: new Date('2026-08-05T07:00:00.000Z'),
        summary: 'Visite de démarrage',
        billable: true,
        amount: 89.9,
        currency: 'EUR',
      },
    })

    const stored = await db.proClient.findUniqueOrThrow({
      where: { id: client.id },
      include: {
        pools: true,
        activities: true,
        interventions: true,
        _count: { select: { pools: true, activities: true, interventions: true } },
      },
    })

    expect(stored.companyName).toBe('Villa Azur')
    expect(stored.status).toBe('prospect')
    expect(parseStoredStringArray(stored.tags)).toEqual(['VIP', 'contrat annuel'])
    expect(stored._count).toMatchObject({ pools: 1, activities: 1, interventions: 1 })
    expect(stored.pools[0]).toMatchObject({ brand: 'AquaTest', status: 'seasonal' })
    expect(stored.activities[0]).toMatchObject({ type: 'call' })
    expect(stored.interventions[0]).toMatchObject({ priority: 'high', amount: 89.9 })
  })

  it('keeps CRM records isolated by Pro owner', async () => {
    await db.proClient.create({
      data: { proUserId: otherId, firstName: 'Autre', lastName: 'Pisciniste' },
    })

    const ownerClients = await db.proClient.findMany({ where: { proUserId: ownerId } })
    const otherClients = await db.proClient.findMany({ where: { proUserId: otherId } })

    expect(ownerClients).toHaveLength(1)
    expect(ownerClients[0].id).toBe(clientId)
    expect(otherClients).toHaveLength(1)
    expect(otherClients[0].id).not.toBe(clientId)
  })

  it('keeps SQLite and PostgreSQL CRM schemas aligned', () => {
    const sqliteSchema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')
    const postgresqlSchema = readFileSync(
      join(process.cwd(), 'prisma/postgresql/schema.prisma'),
      'utf8',
    )
    const sqliteMigration = readFileSync(
      join(
        process.cwd(),
        'prisma/migrations/20260724004500_p1_a_pro_crm_foundation/migration.sql',
      ),
      'utf8',
    )
    const postgresqlMigration = readFileSync(
      join(
        process.cwd(),
        'prisma/postgresql/migrations/20260724004500_p1_a_pro_crm_foundation/migration.sql',
      ),
      'utf8',
    )

    for (const source of [sqliteSchema, postgresqlSchema]) {
      expect(source).toContain('model ProClientActivity')
      expect(source).toContain('companyName')
      expect(source).toContain('nextFollowUpAt')
      expect(source).toContain('accessInstructions')
      expect(source).toContain('priority')
      expect(source).toContain('billable')
    }
    expect(sqliteMigration).toContain('CREATE TABLE "ProClientActivity"')
    expect(postgresqlMigration).toContain('CREATE TABLE "ProClientActivity"')
  })

  it('scopes every client timeline route through the Pro owner', () => {
    const detailRoute = readFileSync(
      join(process.cwd(), 'src/app/api/pro/clients/[id]/route.ts'),
      'utf8',
    )
    const activityRoute = readFileSync(
      join(process.cwd(), 'src/app/api/pro/clients/[id]/activities/route.ts'),
      'utf8',
    )
    expect(detailRoute).toContain('proUserId: access.ownerUserId')
    expect(activityRoute).toContain('proUserId: ownerUserId')
    expect(activityRoute).toContain('if (!access.canWrite)')
  })

  it('never stores embedded service photos in the CRM database', () => {
    const createRoute = readFileSync(
      join(process.cwd(), 'src/app/api/pro/interventions/route.ts'),
      'utf8',
    )
    const updateRoute = readFileSync(
      join(process.cwd(), 'src/app/api/pro/interventions/[id]/route.ts'),
      'utf8',
    )
    const page = readFileSync(
      join(process.cwd(), 'src/app/pro/app/interventions/[id]/page.tsx'),
      'utf8',
    )
    expect(createRoute).toContain('containsEmbeddedPhoto')
    expect(updateRoute).toContain('toSafePhotoReferences')
    expect(createRoute).not.toContain('photos: toJsonArray(body.photos)')
    expect(page).not.toContain('canvas.toDataURL')
    expect(page).not.toContain('accept="image/*"')
  })

})
