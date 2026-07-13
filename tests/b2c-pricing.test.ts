import { describe, expect, it } from 'vitest'
import {
  DURATIONS,
  PLANS,
  getPlanFromRCProductId,
  getPlanFromWebProductId,
} from '@/lib/billing/plans'

describe('AQWELIA B2C launch pricing', () => {
  it('publishes the validated monthly commercial names and prices', () => {
    expect(PLANS.map(({ id, name, price }) => ({ id, name, monthly: price.month }))).toEqual([
      { id: 'decouverte', name: 'Free', monthly: 0 },
      { id: 'oasis', name: 'Pool', monthly: 5.99 },
      { id: 'wellness', name: 'Complete', monthly: 8.99 },
      { id: 'spa365', name: 'Spa', monthly: 3.99 },
    ])
  })

  it('offers monthly billing only at launch', () => {
    expect(DURATIONS.map(({ id }) => id)).toEqual(['month'])
    expect(getPlanFromWebProductId('oasis_monthly')).toEqual({ plan: 'oasis', duration: 'month' })
    expect(getPlanFromWebProductId('spa365_monthly')).toEqual({ plan: 'spa365', duration: 'month' })
    expect(getPlanFromWebProductId('wellness_monthly')).toEqual({ plan: 'wellness', duration: 'month' })
    expect(getPlanFromWebProductId('oasis_weekly')).toBeNull()
    expect(getPlanFromWebProductId('wellness_yearly')).toBeNull()
  })

  it('does not expose non-monthly RevenueCat launch products', () => {
    expect(getPlanFromRCProductId('aqwelia_oasis_monthly')).toEqual({ plan: 'oasis', duration: 'month' })
    expect(getPlanFromRCProductId('aqwelia_oasis_weekly')).toBeNull()
    expect(getPlanFromRCProductId('aqwelia_spa365_yearly')).toBeNull()
  })
})
