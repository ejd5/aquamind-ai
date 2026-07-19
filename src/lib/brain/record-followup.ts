import { db } from '@/lib/db'
import { assessRecommendationOutcome } from './outcome'

export async function recordAutomaticFollowup(userId: string, poolId: string, test: { id: string; clearWaterIndex: number }) {
  const pending = await db.recommendationOutcome.findFirst({ where: { userId, poolId, status: 'awaiting_retest', followupWaterTestId: null, baselineWaterTestId: { not: test.id } }, orderBy: { createdAt: 'desc' } })
  if (!pending) return null
  const result = assessRecommendationOutcome(pending.clearWaterIndexBefore, test.clearWaterIndex)
  return db.$transaction(async (tx) => {
    const outcome = await tx.recommendationOutcome.update({ where: { id: pending.id }, data: { followupWaterTestId: test.id, clearWaterIndexAfter: test.clearWaterIndex, status: result.status, evaluatedAt: new Date() } })
    await tx.brainEventOutbox.upsert({ where: { idempotencyKey: `outcome:${pending.id}:${test.id}` }, update: {}, create: { idempotencyKey: `outcome:${pending.id}:${test.id}`, type: 'outcome_measured', aggregateType: 'recommendation_outcome', aggregateId: pending.id, payload: JSON.stringify({ userId, poolId, status: result.status, delta: result.delta }) } })
    return outcome
  })
}
