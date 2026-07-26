import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assessScientificQuality,
  isScientificallyValidMeasurement,
} from '@/lib/pool/scientific-quality'
import {
  calculateLSI,
  calculateLsiAssessment,
  LSI_METHOD_VERSION,
} from '@/lib/pool/water-balance'
import {
  DOSAGE_METHOD_VERSION,
  generateScientificallyQualifiedActionPlan,
} from '@/lib/pool/scientific-action-plan'

const completeTest = {
  ph: 7.5,
  freeChlorine: 2,
  totalChlorine: 2.2,
  combinedChlorine: 0.2,
  alkalinity: 100,
  calciumHardness: 200,
  cyanuricAcid: 40,
  salt: 5,
  phosphates: 0.05,
  temperature: 25,
  totalDissolvedSolids: 1000,
}

const profile = {
  volume: 50,
  unit: 'm3' as const,
  treatmentType: 'chlorine',
  saltSystem: false,
}

describe('P1 Scientific Quality', () => {
  it('scores complete plausible measurements as high-quality data', () => {
    const quality = assessScientificQuality(completeTest, profile)
    expect(quality.score).toBe(1)
    expect(quality.level).toBe('high')
    expect(quality.invalidFields).toEqual([])
    expect(quality.lsiEligible).toBe(true)
    expect(quality.dosageEligible).toBe(true)
  })

  it('does not present a partial pH-only test as high confidence', () => {
    const quality = assessScientificQuality({ ph: 7.2 }, profile)
    expect(quality.score).toBe(0.25)
    expect(quality.level).toBe('insufficient')
    expect(quality.lsiEligible).toBe(false)
    expect(quality.limitations).toContain('missing_disinfectant_measurement')
    expect(quality.limitations).toContain('missing_total_dissolved_solids')
  })

  it('rejects impossible or corrupted values before scientific calculations', () => {
    expect(isScientificallyValidMeasurement('ph', 14.1)).toBe(false)
    expect(isScientificallyValidMeasurement('temperature', -1)).toBe(false)
    const quality = assessScientificQuality({ ...completeTest, ph: 17 }, profile)
    expect(quality.score).toBe(0)
    expect(quality.level).toBe('insufficient')
    expect(quality.invalidFields).toContain('ph')
  })

  it('detects internally inconsistent chlorine measurements', () => {
    const quality = assessScientificQuality(
      { ...completeTest, freeChlorine: 3, totalChlorine: 1, combinedChlorine: 0.1 },
      profile,
    )
    expect(quality.limitations).toContain('chlorine_measurements_inconsistent')
    expect(quality.score).toBeLessThan(1)
  })

  it('uses the EPA pHs equation for a complete LSI calculation', () => {
    const calculation = calculateLsiAssessment(completeTest)
    expect(calculation.methodVersion).toBe(LSI_METHOD_VERSION)
    expect(calculation.estimated).toBe(false)
    expect(calculation.missingInputs).toEqual([])
    expect(calculation.invalidInputs).toEqual([])
    expect(calculation.saturationPh).toBe(7.69)
    expect(calculation.value).toBe(-0.19)
    expect(calculateLSI(completeTest)).toBe(-0.19)
  })

  it('returns not-calculable instead of assuming temperature or TDS', () => {
    const withoutTemperature = calculateLsiAssessment({
      ph: 7.5,
      alkalinity: 100,
      calciumHardness: 200,
      totalDissolvedSolids: 1000,
    })
    expect(withoutTemperature.value).toBeNull()
    expect(withoutTemperature.missingInputs).toContain('temperature')

    const withoutTds = calculateLsiAssessment({
      ph: 7.5,
      alkalinity: 100,
      calciumHardness: 200,
      temperature: 25,
    })
    expect(withoutTds.value).toBeNull()
    expect(withoutTds.missingInputs).toContain('totalDissolvedSolids')
  })

  it('replaces fixed action-plan confidence and labels dosages as estimates', () => {
    const plan = generateScientificallyQualifiedActionPlan(
      {
        ...completeTest,
        ph: 7.8,
        freeChlorine: 0.2,
        totalChlorine: 0.4,
        combinedChlorine: 0.2,
      },
      profile,
    )
    expect(plan.confidence).toBe(1)
    expect(plan.confidenceLevel).toBe('high')
    expect(plan.scientificQuality.methodVersion).toBe('scientific-quality-v1')
    expect(plan.lsiCalculation.methodVersion).toBe(LSI_METHOD_VERSION)
    expect(plan.dosageMethodVersion).toBe(DOSAGE_METHOD_VERSION)
    expect(plan.dosageLabelVerificationRequired).toBe(true)
    expect(plan.chemicalDosages.length).toBeGreaterThan(0)
    for (const dosage of plan.chemicalDosages) {
      expect(dosage.basis).toBe('generic_estimate')
      expect(dosage.requiresProductLabelVerification).toBe(true)
      expect(dosage.methodVersion).toBe(DOSAGE_METHOD_VERSION)
    }
  })

  it('routes persisted water-test confidence through the qualified engine', () => {
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/pool/water-test/route.ts'),
      'utf8',
    )
    const balance = readFileSync(
      join(process.cwd(), 'src/lib/pool/water-balance.ts'),
      'utf8',
    )
    expect(route).toContain('generateScientificallyQualifiedActionPlan')
    expect(route).toContain('confidence: qualifiedPlan.confidence')
    expect(route).toContain('scientificQuality: qualifiedPlan?.scientificQuality')
    expect(route).toContain('calculateLsiAssessment')
    expect(balance).not.toContain('test.temperature ?? 25')
    expect(balance).toContain("LSI_METHOD_VERSION = 'epa-phs-9.3-v1'")
  })
})
