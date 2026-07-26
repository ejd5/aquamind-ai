import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Locale } from '@/i18n/config'
import {
  assessContextualSwimSafety,
  CONTEXTUAL_SWIM_SAFETY_METHOD_VERSION,
} from '@/lib/pool/contextual-swim-safety'
import {
  assessDosageReadiness,
  DOSAGE_READINESS_METHOD_VERSION,
} from '@/lib/pool/dosage-readiness'
import { generateScientificallyQualifiedActionPlan } from '@/lib/pool/scientific-action-plan'

const completeTest = {
  ph: 7.4,
  freeChlorine: 2,
  totalChlorine: 2.2,
  combinedChlorine: 0.2,
  bromine: null,
  alkalinity: 100,
  calciumHardness: 200,
  cyanuricAcid: 0,
  salt: null,
  phosphates: 0.05,
  temperature: 27,
  totalDissolvedSolids: 1000,
}

const chlorinePool = {
  volume: 50,
  unit: 'm3' as const,
  treatmentType: 'chlorine',
  saltSystem: false,
  waterBodyType: 'pool',
  filterType: 'sand',
}

describe('P1 Scientific contextual swimming safety', () => {
  it('forbids swimming below the chlorine minimum selected from CYA context', () => {
    const withoutCya = assessContextualSwimSafety(
      { ...completeTest, freeChlorine: 0.8 },
      { treatmentType: 'chlorine', waterBodyType: 'pool', cyanuricAcid: 0 },
      'en',
    )
    expect(withoutCya.status).toBe('forbidden')
    expect(withoutCya.reasons[0]?.code).toBe('free_chlorine_below_contextual_minimum')
    expect(withoutCya.reasons[0]?.params.minimum).toBe(1)

    const withCya = assessContextualSwimSafety(
      { ...completeTest, freeChlorine: 1.5, cyanuricAcid: 30 },
      { treatmentType: 'chlorine', waterBodyType: 'pool', cyanuricAcid: 30 },
      'fr',
    )
    expect(withCya.status).toBe('forbidden')
    expect(withCya.reasons[0]?.params.minimum).toBe(2)
  })

  it('uses bromine rather than free chlorine for a bromine spa', () => {
    const allowed = assessContextualSwimSafety(
      { ph: 7.4, bromine: 4, cyanuricAcid: 0 },
      { treatmentType: 'bromine', waterBodyType: 'spa' },
      'en',
    )
    expect(allowed.methodVersion).toBe(CONTEXTUAL_SWIM_SAFETY_METHOD_VERSION)
    expect(allowed.status).toBe('allowed')
    expect(allowed.reasons).toEqual([])

    const high = assessContextualSwimSafety(
      { ph: 7.4, bromine: 9 },
      { treatmentType: 'bromine', waterBodyType: 'spa' },
      'en',
    )
    expect(high.status).toBe('forbidden')
    expect(high.reasons[0]?.code).toBe('bromine_above_maximum')
  })

  it('does not invent a chlorine maximum without a manufacturer limit', () => {
    const unbounded = assessContextualSwimSafety(
      { ...completeTest, freeChlorine: 6 },
      { treatmentType: 'chlorine', waterBodyType: 'pool' },
      'fr',
    )
    expect(unbounded.status).toBe('allowed')
    expect(unbounded.limitations).toContain('manufacturer_chlorine_maximum_required')

    const bounded = assessContextualSwimSafety(
      { ...completeTest, freeChlorine: 6 },
      {
        treatmentType: 'chlorine',
        waterBodyType: 'pool',
        manufacturerChlorineMax: 5,
      },
      'fr',
    )
    expect(bounded.status).toBe('forbidden')
    expect(bounded.reasons[0]?.code).toBe('free_chlorine_above_manufacturer_maximum')
  })

  it('localizes structured safety reasons in all seven supported languages', () => {
    const locales: Locale[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']
    for (const locale of locales) {
      const assessment = assessContextualSwimSafety(
        { ph: 7.4, bromine: null },
        { treatmentType: 'bromine', waterBodyType: 'spa' },
        locale,
      )
      expect(assessment.status).toBe('unknown')
      expect(assessment.reasons[0]?.message.length).toBeGreaterThan(20)
      expect(assessment.reasons[0]?.message).not.toContain('{parameter}')
    }
  })
})

describe('P1 Scientific dosage readiness', () => {
  it('defers a chlorine shock until pH is rebalanced and hides the quantity', () => {
    const plan = generateScientificallyQualifiedActionPlan(
      {
        ...completeTest,
        ph: 7.8,
        freeChlorine: 0.2,
        totalChlorine: 0.4,
      },
      chlorinePool,
      'fr',
    )
    const shock = plan.chemicalDosages.find((dosage) => dosage.param === 'chlorine_shock')
    expect(shock?.readiness).toMatchObject({
      state: 'deferred',
      methodVersion: DOSAGE_READINESS_METHOD_VERSION,
      recalculateAfterPrerequisite: true,
    })
    expect(shock?.readiness.reasons).toContain('rebalance_ph_first')
    expect(shock?.quantity).toBe('—')
    expect(shock?.estimatedCost).toBe('—')
    expect(shock?.calculationSuppressed).toBe(true)
    expect(plan.immediateActions.some((action) => action.actionKey === 'iaChlorineShock')).toBe(true)
  })

  it('exposes a chlorine shock quantity only when pH and measurements are ready', () => {
    const plan = generateScientificallyQualifiedActionPlan(
      {
        ...completeTest,
        freeChlorine: 0.2,
        totalChlorine: 0.4,
      },
      chlorinePool,
      'en',
    )
    const shock = plan.chemicalDosages.find((dosage) => dosage.param === 'chlorine_shock')
    expect(shock?.readiness.state).toBe('ready')
    expect(shock?.quantity).not.toBe('—')
    expect(shock?.calculationSuppressed).toBe(false)
  })

  it('removes a stabilizer action and quantity from a spa', () => {
    const plan = generateScientificallyQualifiedActionPlan(
      {
        ...completeTest,
        cyanuricAcid: 0,
      },
      {
        ...chlorinePool,
        volume: 2,
        waterBodyType: 'spa',
      },
      'fr',
    )
    const stabilizer = plan.chemicalDosages.find((dosage) => dosage.param === 'stabilizer_plus')
    expect(stabilizer?.readiness.state).toBe('not_calculable')
    expect(stabilizer?.readiness.reasons).toContain('spa_cya_not_recommended')
    expect(stabilizer?.quantity).toBe('—')
    expect(plan.immediateActions.some((action) => action.actionKey === 'iaAddStabilizer')).toBe(false)
  })

  it('blocks the legacy generic salt target even when an equipment range is supplied', () => {
    const plan = generateScientificallyQualifiedActionPlan(
      {
        ...completeTest,
        salt: 2,
      },
      {
        ...chlorinePool,
        treatmentType: 'salt',
        saltSystem: true,
        manufacturerSaltMin: 3,
        manufacturerSaltMax: 4,
      },
      'fr',
    )
    const salt = plan.chemicalDosages.find((dosage) => dosage.param === 'salt_plus')
    expect(salt?.readiness.state).toBe('not_calculable')
    expect(salt?.readiness.reasons).toContain('manufacturer_target_recalculation_required')
    expect(salt?.quantity).toBe('—')
    expect(plan.immediateActions.some((action) => action.actionKey === 'iaAddSalt')).toBe(false)
  })

  it('qualifies filter-dependent products before exposing a quantity', () => {
    expect(
      assessDosageReadiness('flocculant', completeTest, {
        ...chlorinePool,
        filterType: null,
      }).state,
    ).toBe('not_calculable')
    expect(
      assessDosageReadiness('flocculant', completeTest, {
        ...chlorinePool,
        filterType: 'cartridge',
      }).reasons,
    ).toContain('incompatible_filter_type')
    expect(
      assessDosageReadiness('flocculant', completeTest, chlorinePool).state,
    ).toBe('ready')
  })

  it('persists contextual safety and readiness metadata through the API', () => {
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/pool/water-test/route.ts'),
      'utf8',
    )
    const plan = readFileSync(
      join(process.cwd(), 'src/lib/pool/scientific-action-plan.ts'),
      'utf8',
    )
    expect(route).toContain('assessContextualSwimSafety')
    expect(route).toContain('swimSafety: contextualSwimSafety.status')
    expect(route).toContain('contextualSwimSafety,')
    expect(route).toContain('manufacturerChlorineMax')
    expect(plan).toContain('assessDosageReadiness')
    expect(plan).toContain("quantity: calculationSuppressed ? '—' : dosage.quantity")
    expect(plan).toContain("readiness.state === 'not_calculable'")
  })
})
