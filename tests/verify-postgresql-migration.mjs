import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const loaded = await import(pathToFileURL(resolve('generated/client-postgresql/index.js')).href)
const PrismaClient = loaded.PrismaClient || loaded.default?.PrismaClient
const prisma = new PrismaClient({ datasources: { db: { url: process.env.POSTGRES_URL } } })

try {
  const expectedEmpty = process.argv.includes('--expect-empty')
  const [users, pools, subscriptions, markers] = await Promise.all([
    prisma.user.count(),
    prisma.poolProfile.count(),
    prisma.subscription.count(),
    prisma.billingEvent.count({ where: { source: 'data_migration', result: 'processed' } }),
  ])
  if (expectedEmpty) {
    if (users || pools || subscriptions || markers) throw new Error('Rollback database is not empty')
  } else if (users !== 1 || pools !== 1 || subscriptions !== 1 || markers !== 1) {
    throw new Error(`Unexpected migrated counts: users=${users}, pools=${pools}, subscriptions=${subscriptions}, markers=${markers}`)
  }
} finally {
  await prisma.$disconnect()
}
