import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

// Uses DATABASE_URL from the environment (set by run-smoke-tests.sh).
// NEVER reads or modifies .env.
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error('DATABASE_URL env var required')
  process.exit(1)
}

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })
const salt = crypto.randomBytes(16).toString('hex')
const hash = crypto.scryptSync('test-password-2026', salt, 64).toString('hex')

// Delete existing test user if any
await prisma.user.deleteMany({ where: { email: 'test@aqwelia.app' } }).catch(() => {})

await prisma.user.create({
  data: { email: 'test@aqwelia.app', passwordHash: salt + ':' + hash, name: 'Test User' }
})
console.log('✅ Test user created: test@aqwelia.app')
await prisma.$disconnect()
