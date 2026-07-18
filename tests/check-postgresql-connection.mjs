import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl?.match(/^postgres(ql)?:\/\//)) throw new Error('A PostgreSQL DATABASE_URL is required')

const loaded = await import(pathToFileURL(resolve('generated/client-postgresql/index.js')).href)
const PrismaClient = loaded.PrismaClient || loaded.default?.PrismaClient
if (!PrismaClient) throw new Error('PostgreSQL Prisma client is unavailable')

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
try {
  await Promise.all([
    prisma.user.count(),
    prisma.poolProfile.count(),
    prisma.subscription.count(),
    prisma.billingEvent.count(),
  ])
  console.log('PostgreSQL schema and pooled connection are ready')
} finally {
  await prisma.$disconnect()
}
