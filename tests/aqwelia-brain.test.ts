import { describe, it, expect } from 'vitest'
import { assessRecommendationOutcome, clampRating } from '@/lib/brain/outcome'

function parseJsonArray(value: string | null): unknown[] {
  try {
    const parsed = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

describe('AQWELIA Brain — outcome', () => {
  it('measures meaningful outcomes without overclaiming noise', () => {
    expect(assessRecommendationOutcome(58, 70)).toEqual({ status: 'improved', delta: 12 })
    expect(assessRecommendationOutcome(70, 73).status).toBe('stable')
    expect(assessRecommendationOutcome(70, 61).status).toBe('worsened')
  })

  it('keeps missing data inconclusive', () => {
    expect(assessRecommendationOutcome(undefined, 80).status).toBe('inconclusive')
    expect(assessRecommendationOutcome(80, undefined).status).toBe('inconclusive')
    expect(assessRecommendationOutcome(null, 80).status).toBe('inconclusive')
    expect(assessRecommendationOutcome(80, null).status).toBe('inconclusive')
  })

  it('treats identical values as stable (delta=0)', () => {
    const result = assessRecommendationOutcome(65, 65)
    expect(result.status).toBe('stable')
    expect(result.delta).toBe(0)
  })

  it('improves at exactly +5 threshold', () => {
    expect(assessRecommendationOutcome(50, 55).status).toBe('improved')
  })

  it('worsens at exactly -5 threshold', () => {
    expect(assessRecommendationOutcome(50, 45).status).toBe('worsened')
  })

  it('handles NaN inputs as inconclusive', () => {
    expect(assessRecommendationOutcome(NaN, 80).status).toBe('inconclusive')
    expect(assessRecommendationOutcome(80, NaN).status).toBe('inconclusive')
  })

  it('handles Infinity inputs as inconclusive', () => {
    expect(assessRecommendationOutcome(Infinity, 80).status).toBe('inconclusive')
    expect(assessRecommendationOutcome(80, Infinity).status).toBe('inconclusive')
  })

  it('validates ratings', () => {
    expect(clampRating(5)).toBe(5)
    expect(clampRating(1)).toBe(1)
    expect(clampRating(3)).toBe(3)
    expect(clampRating(0)).toBeNull()
    expect(clampRating(6)).toBeNull()
    expect(clampRating(-1)).toBeNull()
    expect(clampRating(2.5)).toBeNull()
    expect(clampRating(null)).toBeNull()
    expect(clampRating(undefined)).toBeNull()
    expect(clampRating('abc')).toBeNull()
  })
})

describe('AQWELIA Brain — parseJsonArray (pure)', () => {
  it('parses valid JSON array', () => {
    expect(parseJsonArray('["a","b","c"]')).toEqual(['a', 'b', 'c'])
  })

  it('returns empty array for null', () => {
    expect(parseJsonArray(null)).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(parseJsonArray('')).toEqual([])
  })

  it('returns empty array for invalid JSON', () => {
    expect(parseJsonArray('not json')).toEqual([])
  })

  it('returns empty array for non-array JSON', () => {
    expect(parseJsonArray('{"key":"value"}')).toEqual([])
    expect(parseJsonArray('"string"')).toEqual([])
    expect(parseJsonArray('42')).toEqual([])
  })

  it('handles nested arrays', () => {
    expect(parseJsonArray('[["a","b"],["c"]]')).toEqual([['a', 'b'], ['c']])
  })

  it('handles empty array', () => {
    expect(parseJsonArray('[]')).toEqual([])
  })
})
