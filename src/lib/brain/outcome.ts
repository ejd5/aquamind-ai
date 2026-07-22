export type OutcomeStatus = 'improved' | 'stable' | 'worsened' | 'inconclusive'
export function assessRecommendationOutcome(before: number | null | undefined, after: number | null | undefined) {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return { status: 'inconclusive' as OutcomeStatus, delta: null }
  const delta = Number(after) - Number(before)
  if (delta >= 5) return { status: 'improved' as OutcomeStatus, delta }
  if (delta <= -5) return { status: 'worsened' as OutcomeStatus, delta }
  return { status: 'stable' as OutcomeStatus, delta }
}
export function clampRating(value: unknown) { const rating = Number(value); return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null }
