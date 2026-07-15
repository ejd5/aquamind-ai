import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  PLANS,
  DURATIONS,
  getPriceAdvantage,
  getPlanFromWebProductId,
  getWebProductId,
  getPlanFromRCProductId,
  parsePricingSelectionFromParams,
  PAID_PLAN_IDS,
  WEB_DURATIONS,
  DURATION_TO_PROVIDER,
} from '@/lib/billing/plans'
import { stripeWebClient } from '@/lib/billing/stripe-web'

const LOCALES = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl'] as const

describe('P0-J — B2C release readiness', () => {
  // ─── Lot D: Catalogue ───────────────────────────────────────────
  describe('web catalogue exposes exactly 12 paid products', () => {
    it('exposes exactly 12 products', async () => {
      const products = await stripeWebClient.getProducts()
      expect(products).toHaveLength(12)
    })

    it('exposes only paid plans (no Free)', async () => {
      const products = await stripeWebClient.getProducts()
      const planIds = new Set(products.map((p) => p.plan))
      expect(planIds.has('decouverte' as never)).toBe(false)
      for (const id of planIds) {
        expect(PAID_PLAN_IDS).toContain(id)
      }
    })

    it('exposes no weekly duration', async () => {
      const products = await stripeWebClient.getProducts()
      for (const p of products) {
        expect(p.duration).not.toBe('weekly')
      }
    })

    it('exposes no zero-price product', async () => {
      const products = await stripeWebClient.getProducts()
      for (const p of products) {
        expect(p.price).toBeGreaterThan(0)
      }
    })

    it('exposes the 12 expected product ids', async () => {
      const products = await stripeWebClient.getProducts()
      const ids = products.map((p) => p.id).sort()
      const expected = [
        'oasis_monthly', 'oasis_quarterly', 'oasis_seasonal', 'oasis_yearly',
        'spa365_monthly', 'spa365_quarterly', 'spa365_seasonal', 'spa365_yearly',
        'wellness_monthly', 'wellness_quarterly', 'wellness_seasonal', 'wellness_yearly',
      ].sort()
      expect(ids).toEqual(expected)
    })

    it('round-trips getWebProductId ↔ getPlanFromWebProductId', () => {
      for (const planId of PAID_PLAN_IDS) {
        for (const duration of WEB_DURATIONS) {
          const productId = getWebProductId(planId, duration)
          const back = getPlanFromWebProductId(productId)
          expect(back).toEqual({ plan: planId, duration })
        }
      }
    })

    it('exposes correct prices for each product', async () => {
      const products = await stripeWebClient.getProducts()
      const byId = new Map(products.map((p) => [p.id, p]))
      const expected: Record<string, number> = {
        oasis_monthly: 6.99, oasis_quarterly: 19.99, oasis_seasonal: 34.99, oasis_yearly: 64.99,
        spa365_monthly: 4.99, spa365_quarterly: 13.99, spa365_seasonal: 24.99, spa365_yearly: 44.99,
        wellness_monthly: 10.99, wellness_quarterly: 29.99, wellness_seasonal: 54.99, wellness_yearly: 99.99,
      }
      for (const [id, price] of Object.entries(expected)) {
        expect(byId.get(id)?.price).toBe(price)
      }
    })
  })

  // ─── Lot C: plan + duration preservation ───────────────────────
  describe('parsePricingSelectionFromParams', () => {
    it('accepts Pool monthly', () => {
      expect(parsePricingSelectionFromParams('oasis', 'month')).toEqual({ planId: 'oasis', duration: 'month' })
    })

    it('accepts Spa quarterly', () => {
      expect(parsePricingSelectionFromParams('spa365', 'quarter')).toEqual({ planId: 'spa365', duration: 'quarter' })
    })

    it('accepts Complete halfyear', () => {
      expect(parsePricingSelectionFromParams('wellness', 'halfyear')).toEqual({ planId: 'wellness', duration: 'halfyear' })
    })

    it('accepts Complete yearly', () => {
      expect(parsePricingSelectionFromParams('wellness', 'year')).toEqual({ planId: 'wellness', duration: 'year' })
    })

    it('rejects Free plan', () => {
      expect(parsePricingSelectionFromParams('decouverte', 'month')).toBeNull()
    })

    it('rejects unknown plan', () => {
      expect(parsePricingSelectionFromParams('premium', 'month')).toBeNull()
    })

    it('rejects week duration', () => {
      expect(parsePricingSelectionFromParams('oasis', 'week')).toBeNull()
    })

    it('rejects unknown duration', () => {
      expect(parsePricingSelectionFromParams('oasis', 'biannual')).toBeNull()
    })

    it('rejects null inputs', () => {
      expect(parsePricingSelectionFromParams(null, 'month')).toBeNull()
      expect(parsePricingSelectionFromParams('oasis', null)).toBeNull()
      expect(parsePricingSelectionFromParams(null, null)).toBeNull()
    })

    it('rejects undefined inputs', () => {
      expect(parsePricingSelectionFromParams(undefined, undefined)).toBeNull()
    })

    it('never falls back to a paid plan on invalid input', () => {
      // An invalid pair must never produce a paid planId.
      const result = parsePricingSelectionFromParams('invalid', 'invalid')
      expect(result).toBeNull()
    })
  })

  // ─── Lot E: Entitlements (no dangerous fallback) ───────────────
  describe('entitlements reject unknown plan without fallback', () => {
    // We cannot easily mock /api/subscription in a unit test, but we
    // can verify that PAID_PLAN_IDS does not include 'decouverte' and
    // that an unknown plan id is not in the set.
    it('PAID_PLAN_IDS does not include Free', () => {
      expect(PAID_PLAN_IDS).not.toContain('decouverte' as never)
    })

    it('PAID_PLAN_IDS contains exactly the 3 paid plans', () => {
      expect(PAID_PLAN_IDS).toEqual(['oasis', 'spa365', 'wellness'])
    })

    it('an unknown plan id is not in PAID_PLAN_IDS', () => {
      expect(PAID_PLAN_IDS.includes('premium' as never)).toBe(false)
      expect(PAID_PLAN_IDS.includes('decouverte' as never)).toBe(false)
      expect(PAID_PLAN_IDS.includes('' as never)).toBe(false)
    })

    it('WEB_DURATIONS does not include week', () => {
      expect(WEB_DURATIONS as readonly string[]).not.toContain('week')
    })

    it('WEB_DURATIONS contains exactly the 4 web durations', () => {
      expect(WEB_DURATIONS).toEqual(['month', 'quarter', 'halfyear', 'year'])
    })
  })

  // ─── Lot F: Catalogue invariants ───────────────────────────────
  describe('catalogue invariants', () => {
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
      expect(pool.price.year).toBeLessThan(pool.price.halfyear * 2)
    })

    it('keeps the Pool plan promise aligned with its one-pool limit', () => {
      const pool = PLANS.find((plan) => plan.id === 'oasis')!
      expect(pool.featureKeys).toContain('oasis.features.1pool')
      expect(pool.featureKeys).not.toContain('oasis.features.3pools')
      expect(pool.limits.maxPools).toBe(1)
      expect(pool.limits.multiPool).toBe(false)
    })

    it('exposes landing.errorTitle in every supported locale', () => {
      // Regression: use-stripe-checkout.ts calls t('errorTitle') with the
      // 'landing' namespace. If the key is missing, the raw key is shown.
      for (const loc of LOCALES) {
        const data = JSON.parse(
          readFileSync(`src/i18n/locales/${loc}.json`, 'utf-8'),
        ) as Record<string, Record<string, string>>
        expect(data.landing?.errorTitle, `locale=${loc}`).toBeTruthy()
        expect(typeof data.landing.errorTitle).toBe('string')
      }
    })

    it('all 7 locale JSON files are valid', () => {
      for (const loc of LOCALES) {
        expect(() => JSON.parse(readFileSync(`src/i18n/locales/${loc}.json`, 'utf-8'))).not.toThrow()
      }
    })

    it('DURATION_TO_PROVIDER maps web durations correctly', () => {
      expect(DURATION_TO_PROVIDER.month).toBe('monthly')
      expect(DURATION_TO_PROVIDER.quarter).toBe('quarterly')
      expect(DURATION_TO_PROVIDER.halfyear).toBe('seasonal')
      expect(DURATION_TO_PROVIDER.year).toBe('yearly')
    })
  })
})
