import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assessMeasurementConfidence,
  createUnadjustedMeasurementConfidence,
  MEASUREMENT_CONFIDENCE_METHOD_VERSION,
} from '@/lib/pool/measurement-confidence'
import { generateScientificallyQualifiedActionPlan } from '@/lib/pool/scientific-action-plan'
import { assessScientificQuality } from '@/lib/pool/scientific-quality'

const completeTest = {
  ph: 7.4,
  freeChlorine: 2,
  totalChlorine: 2.2,
  combinedChlorine: 0.2,
  alkalinity: 100,
  calciumHardness: 200,
  cyanuricAcid: 40,
  salt: 5,
  bromine: null,
  phosphates: 0.05,
  temperature: 25,
  totalDissolvedSolids: 1000,
}

const profile = {
  volume: 50,
  unit: 'm3' as const,
  treatmentType: 'chlorine',
  saltSystem: false,
  waterBodyType: 'pool',
  filterType: 'sand',
}

const now = new Date('2026-07-26T18:00:00.000Z')
const quality = assessScientificQuality(completeTest, profile)

describe('P1 Scientific provenance-adjusted confidence', () => {
  it('keeps a fresh calibrated photometer result at full confidence', () => {
    const confidence = assessMeasurementConfidence(
      quality,
      {
        measuredAt: new Date('2026-07-26T17:55:00.000Z'),
        measurementMethod: 'photometer',
        measurementMetadata: JSON.stringify({ calibrationAt: '2026-07-26T17:00:00.000Z' }),
      },
      now,
    )
    expect(confidence.methodVersion).toBe(MEASUREMENT_CONFIDENCE_METHOD_VERSION)
    expect(confidence.score).toBe(1)
    expect(confidence.level).toBe('high')
    expect(confidence.factors).toEqual({ freshness: 1, method: 1, calibration: 1 })
    expect(confidence.limitations).toContain('calibration_interval_requires_manufacturer')
    expect(confidence.manufacturerCalibrationIntervalVerified).toBe(false)
  })

  it('reduces confidence as a measurement ages beyond twice-daily monitoring', () => {
    const twelveHours = assessMeasurementConfidence(
      quality,
      {
        measuredAt: new Date('2026-07-26T06:00:00.000Z'),
        measurementMethod: 'kit_drop',
        measurementMetadata: null,
      },
      now,
    )
    expect(twelveHours.score).toBe(0.86)
    expect(twelveHours.factors.freshness).toBe(0.9)
    expect(twelveHours.limitations).toContain('measurement_older_than_6_hours')

    const twentyFourHours = assessMeasurementConfidence(
      quality,
      {
        measuredAt: new Date('2026-07-25T18:00:00.000Z'),
        measurementMethod: 'kit_drop',
        measurementMetadata: null,
      },
      now,
    )
    expect(twentyFourHours.score).toBe(0.71)
    expect(twentyFourHours.level).toBe('medium')
    expect(twentyFourHours.limitations).toContain('measurement_older_than_12_hours')

    const olderThanThreeDays = assessMeasurementConfidence(
      quality,
      {
        measuredAt: new Date('2026-07-22T18:00:00.000Z'),
        measurementMethod: 'kit_drop',
        measurementMetadata: null,
      },
      now,
    )
    expect(olderThanThreeDays.score).toBe(0.24)
    expect(olderThanThreeDays.level).toBe('insufficient')
    expect(olderThanThreeDays.limitations).toContain('measurement_older_than_72_hours')
  })

  it('distinguishes method evidence without claiming statistical accuracy', () => {
    const strip = assessMeasurementConfidence(
      quality,
      { measuredAt: now, measurementMethod: 'strip', measurementMetadata: null },
      now,
    )
    expect(strip.score).toBe(0.8)
    expect(strip.limitations).toContain('lower_precision_measurement_method')
    expect(strip.policyBasis).toBe('aqwelia_operational_policy')

    const unspecified = assessMeasurementConfidence(
      quality,
      { measuredAt: now, measurementMethod: 'manual', measurementMetadata: null },
      now,
    )
    expect(unspecified.score).toBe(0.75)
    expect(unspecified.limitations).toContain('measurement_method_unspecified')
  })

  it('penalizes an instrument when calibration evidence is missing or invalid', () => {
    const missing = assessMeasurementConfidence(
      quality,
      { measuredAt: now, measurementMethod: 'device', measurementMetadata: null },
      now,
    )
    expect(missing.score).toBe(0.81)
    expect(missing.factors.calibration).toBe(0.85)
    expect(missing.limitations).toContain('calibration_not_documented')

    const invalid = assessMeasurementConfidence(
      quality,
      {
        measuredAt: now,
        measurementMethod: 'probe',
        measurementMetadata: JSON.stringify({ calibrationAt: 'not-a-date' }),
      },
      now,
    )
    expect(invalid.score).toBe(0.62)
    expect(invalid.factors.calibration).toBe(0.65)
    expect(invalid.limitations).toContain('calibration_date_invalid')
  })

  it('preserves compatibility for internal calls without provenance', () => {
    const unadjusted = createUnadjustedMeasurementConfidence(quality)
    expect(unadjusted.score).toBe(quality.score)
    expect(unadjusted.provenanceApplied).toBe(false)
    expect(unadjusted.factors).toEqual({ freshness: 1, method: 1, calibration: 1 })
  })

  it('uses adjusted confidence in qualified plans when provenance is supplied', () => {
    const plan = generateScientificallyQualifiedActionPlan(
      completeTest,
      profile,
      'fr',
      {
        measuredAt: now,
        measurementMethod: 'strip',
        measurementMetadata: null,
      },
      now,
    )
    expect(plan.scientificQuality.score).toBe(1)
    expect(plan.scientificConfidence.score).toBe(0.8)
    expect(plan.confidence).toBe(0.8)
    expect(plan.confidenceLevel).toBe('medium')
  })

  it('persists and exposes adjusted confidence through the water-test API', () => {
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/pool/water-test/route.ts'),
      'utf8',
    )
    expect(route).toContain('assessMeasurementConfidence')
    expect(route).toContain('scientificQualityScore: standaloneConfidence.score')
    expect(route).toContain('scientificMethodVersion: standaloneConfidence.methodVersion')
    expect(route).toContain('scientificMethodVersion: qualifiedPlan.scientificConfidence.methodVersion')
    expect(route).toContain('scientificConfidence: qualifiedPlan.scientificConfidence')
    expect(route).toContain('scientificConfidence: qualifiedPlan?.scientificConfidence ?? standaloneConfidence')
    expect(route).toContain('measurementAgeHours: standaloneConfidence.ageHours')
  })
})
