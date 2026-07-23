import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('../generated/client-postgresql')

if (!process.env.DATABASE_URL || !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)) {
  throw new Error('A PostgreSQL DATABASE_URL is required')
}

const prisma = new PrismaClient()
const email = 'growth.pro.demo@aqwelia.test'
const passwordHash = '4fb6d975525336ef930613b07cdf52f9:7a08e0411defa6ba7c256b47f074b0f9ddb64a96d5d45d98e91121e67aa95d800fde1fd6c8ab8fe55855ba4f02dd255134a8212d7b98e73405c24fa956e311f7'

try {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      ownedOrganizations: {
        where: { type: 'growth' },
        select: { id: true, plan: true, status: true },
      },
    },
  })

  if (!user) throw new Error('Growth Pro demo user not found')
  const organization = user.ownedOrganizations.find(
    (item) => item.plan === 'growth_pro' && item.status === 'active',
  )
  if (!organization) throw new Error('Active growth_pro organization not found')

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, role: 'pro' },
  })

  const verified = await prisma.user.findUnique({
    where: { email },
    select: { email: true, role: true, passwordHash: true },
  })
  if (!verified || verified.passwordHash !== passwordHash || verified.role !== 'pro') {
    throw new Error('Growth Pro password reset verification failed')
  }

  console.log(JSON.stringify({ email: verified.email, plan: organization.plan, status: organization.status, reset: true }))
} finally {
  await prisma.$disconnect()
}
