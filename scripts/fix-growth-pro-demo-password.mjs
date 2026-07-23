import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('../generated/client-postgresql')

if (!process.env.DATABASE_URL || !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)) {
  throw new Error('A PostgreSQL DATABASE_URL is required')
}

const prisma = new PrismaClient()
const email = 'growth.pro.demo@aqwelia.test'
const passwordHash = '71bf462eab0a0d106dc139f529f07302:55e08b5d40a3a367bf623c0a7d4292b133e1ff9f4e9549f89cc5e98cd40854abe3c53ee422fbabbeccbbffe809a6fe546adfcb8e80f877360c3e65bafdad77ce'

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
    throw new Error('Growth Pro password correction verification failed')
  }

  console.log(JSON.stringify({
    email: verified.email,
    plan: organization.plan,
    status: organization.status,
    corrected: true,
  }))
} finally {
  await prisma.$disconnect()
}
