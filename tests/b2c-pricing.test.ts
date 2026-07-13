import { describe, expect, it } from 'vitest'
import {
  DURATIONS,
  PLANS,
  getPriceAdvantage,
  getPlanFromRCProductId,
  getPlanFromWebProductId,
} from '@/lib/billing/plans'

describe('AQWELIA B2C launch pricing', () => {
  it('publishes the validated commercial names and prices', () => {
    expect(PLANS.map(({ id, name, price }) => ({ id, name, price }))).toEqual([
      { id: 'decouverte', name: 'Free', price: { week: 0, month: 0, quarter: 0, halfyear: 0, year: 0 } },
      { id: 'oasis', name: 'Pool', price: { week: 0, month: 6.99, quarter: 19.99, halfyear: 34.99, year: 64.99 } },
      { id: 'wellness', name: 'Complete', price: { week: 0, month: 10.99, quarter: 29.99, halfyear: 54.99, year: 99.99 } },
      { id: 'spa365', name: 'Spa', price: { week: 0, month: 4.99, quarter: 13.99, halfyear: 24.99, year: 44.99 } },
    ])
  })

  it('offers 1, 3, 6 and 12 month billing', () => {
    expect(DURATIONS.map(({ id }) => id)).toEqual(['month', 'quarter', 'halfyear', 'year'])
    expect(getPlanFromWebProductId('oasis_monthly')).toEqual({ plan: 'oasis', duration: 'month' })
    expect(getPlanFromWebProductId('spa365_quarterly')).toEqual({ plan: 'spa365', duration: 'quarter' })
    expect(getPlanFromWebProductId('wellness_seasonal')).toEqual({ plan: 'wellness', duration: 'halfyear' })
    expect(getPlanFromWebProductId('oasis_yearly')).toEqual({ plan: 'oasis', duration: 'year' })
    expect(getPlanFromWebProductId('oasis_weekly')).toBeNull()
  })

  it('maps the exact RevenueCat product catalog', () => {
    expect(getPlanFromRCProductId('aqwelia_oasis_monthly')).toEqual({ plan: 'oasis', duration: 'month' })
    expect(getPlanFromRCProductId('aqwelia_oasis_quarterly')).toEqual({ plan: 'oasis', duration: 'quarter' })
    expect(getPlanFromRCProductId('aqwelia_spa365_yearly')).toEqual({ plan: 'spa365', duration: 'year' })
    expect(getPlanFromRCProductId('aqwelia_oasis_weekly')).toBeNull()
  })

  it('keeps six months as the core value offer', () => {
    const pool = PLANS.find((plan) => plan.id === 'oasis')!
    const advantage = getPriceAdvantage(pool, 'halfyear')
    expect(advantage.savedPercent).toBe(17)
    expect(advantage.freeMonths).toBeCloseTo(0.99, 1)
    expect(pool.price.year).toBeLessThan(pool.price.halfyear * 2)
  })

  it('keeps the Pool plan promise aligned with its one-pool server limit', () => {
    const pool = PLANS.find((plan) => plan.id === 'oasis')!
    expect(pool.featureKeys).toContain('oasis.features.1pool')
    expect(pool.featureKeys).not.toContain('oasis.features.3pools')
    expect(pool.limits.maxPools).toBe(1)
    expect(pool.limits.multiPool).toBe(false)
  })
})
