import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const suffix = 'migration-fixture'

try {
  const user = await prisma.user.create({
    data: { id: `user-${suffix}`, email: `${suffix}@aqwelia.test`, passwordHash: 'test-only' },
  })
  await prisma.poolProfile.create({
    data: { id: `pool-${suffix}`, userId: user.id, name: 'Migration pool', volume: 35 },
  })
  await prisma.subscription.create({
    data: { id: `sub-${suffix}`, userId: user.id, plan: 'oasis', status: 'active', active: true },
  })
} finally {
  await prisma.$disconnect()
}
