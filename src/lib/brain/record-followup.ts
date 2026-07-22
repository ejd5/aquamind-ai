import { db } from '@/lib/db'
import { assessRecommendationOutcome } from './outcome'

interface FollowupTest {
  id: string
  clearWaterIndex: number
}

export async function recordAutomaticFollowup(
  userId: string,
  poolId: string,
  test: FollowupTest,
) {
  const now = new Date()
  const candidates = await db.recommendationOutcome.findMany({
    where: {
      userId,
      poolId,
      status: 'awaiting_retest',
      followupWaterTestId: null,
      baselineWaterTestId: { not: test.id },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  let pending: (typeof candidates)[number] | null = null
  for (const candidate of candidates) {
    const reminder = await db.brainEventOutbox.findUnique({
      where: { idempotencyKey: `retest:${candidate.actionPlanId}` },
      select: { status: true, nextAttemptAt: true },
    })
    if (
      reminder?.status === 'pending' &&
      reminder.nextAttemptAt &&
      reminder.nextAttemptAt.getTime() <= now.getTime()
    ) {
      pending = candidate
      break
    }
  }

  if (!pending) return null

  const result = assessRecommendationOutcome(
    pending.clearWaterIndexBefore,
    test.clearWaterIndex,
  )

  return db.$transaction(async (tx) => {
    const claimed = await tx.recommendationOutcome.updateMany({
      where: {
        id: pending.id,
        status: 'awaiting_retest',
        followupWaterTestId: null,
      },
      data: {
        followupWaterTestId: test.id,
        clearWaterIndexAfter: test.clearWaterIndex,
        status: result.status,
        evaluatedAt: now,
      },
    })

    if (claimed.count === 0) return null

    await tx.brainEventOutbox.updateMany({
      where: {
        idempotencyKey: `retest:${pending.actionPlanId}`,
        status: 'pending',
      },
      data: { status: 'processed', processedAt: now },
    })

    await tx.brainEventOutbox.upsert({
      where: { idempotencyKey: `outcome:${pending.id}:${test.id}` },
      update: {},
      create: {
        idempotencyKey: `outcome:${pending.id}:${test.id}`,
        type: 'outcome_measured',
        aggregateType: 'recommendation_outcome',
        aggregateId: pending.id,
        payload: JSON.stringify({
          userId,
          poolId,
          status: result.status,
          delta: result.delta,
        }),
      },
    })

    return tx.recommendationOutcome.findUnique({ where: { id: pending.id } })
  })
}
