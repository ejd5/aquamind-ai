import { PrismaClient as SqlitePrismaClient } from '@prisma/client'
import { resolveDatabaseProvider } from '@/lib/database-provider'

type DatabaseClient = SqlitePrismaClient

const globalForPrisma = globalThis as unknown as {
  prisma: DatabaseClient | undefined
  prismaProvider: string | undefined
}

function createDatabaseClient(): DatabaseClient {
  const provider = resolveDatabaseProvider(process.env.DATABASE_PROVIDER, process.env.DATABASE_URL)
  const log: Array<'query' | 'error'> = process.env.NODE_ENV === 'production'
    ? ['error']
    : ['query', 'error']

  if (provider === 'postgresql') {
    // Generated before every production build by `db:generate:all`.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient: PostgresqlPrismaClient } = require('../../generated/client-postgresql')
    return new PostgresqlPrismaClient({ log }) as DatabaseClient
  }

  return new SqlitePrismaClient({ log })
}

const provider = process.env.DATABASE_PROVIDER || 'sqlite'
if (globalForPrisma.prisma && globalForPrisma.prismaProvider !== provider) {
  void globalForPrisma.prisma.$disconnect()
  globalForPrisma.prisma = undefined
}

export const db = globalForPrisma.prisma ?? createDatabaseClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  globalForPrisma.prismaProvider = provider
}
