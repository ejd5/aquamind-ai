import type { MeasurementMethod } from './measurement-provenance'
import type { ScientificQualityAssessment, ScientificQualityLevel } from './scientific-quality'

export const MEASUREMENT_CONFIDENCE_METHOD_VERSION = 'measurement-confidence-v1' as const

export type MeasurementConfidenceLimitation =
  | 'measurement_older_than_6_hours'
  | 'measurement_older_than_12_hours'
  | 'measurement_older_than_24_hours'
  | 'measurement_older_than_72_hours'
  | 'measurement_date_in_future'
  | 'measurement_method_unspecified'
  | 'lower_precision_measurement_method'
  | 'calibration_not_documented'
  | 'calibration_date_invalid'
  | 'calibration_date_after_measurement'
  | 'calibration_interval_requires_manufacturer'

export interface MeasurementConfidenceInput {
  measuredAt: Date
  measurementMethod: MeasurementMethod
  measurementMetadata: string | null
}

export interface MeasurementConfidenceFactors {
  freshness: number
  method: number
  calibration: number
}

export interface MeasurementConfidenceAssessment {
  score: number
  level: ScientificQualityLevel
  baseQualityScore: number
  ageHours: number
  factors: MeasurementConfidenceFactors
  limitations: MeasurementConfidenceLimitation[]
  methodVersion: typeof MEASUREMENT_CONFIDENCE_METHOD_VERSION
  policyBasis: 'aqwelia_operational_policy'
  manufacturerCalibrationIntervalVerified: false
  provenanceApplied: boolean
}

function level(score: number): ScientificQualityLevel {
  if (score >= 0.85) return 'high'
  if (score >= 0.65) return 'medium'
  if (score >= 0.4) return 'low'
  return 'insufficient'
}

function freshnessFactor(ageHours: number, limitations: Set<MeasurementConfidenceLimitation>): number {
  if (ageHours < -5 / 60) {
    limitations.add('measurement_date_in_future')
    return 0
  }
  if (ageHours <= 6) return 1
  if (ageHours <= 12) {
    limitations.add('measurement_older_than_6_hours')
    return 0.9
  }
  if (ageHours <= 24) {
    limitations.add('measurement_older_than_12_hours')
    return 0.75
  }
  if (ageHours <= 72) {
    limitations.add('measurement_older_than_24_hours')
    return 0.5
  }
  limitations.add('measurement_older_than_72_hours')
  return 0.25
}

function methodFactor(
  method: MeasurementMethod,
  limitations: Set<MeasurementConfidenceLimitation>,
): number {
  switch (method) {
    case 'photometer':
      return 1
    case 'kit_drop':
      return 0.95
    case 'probe':
    case 'device':
      return 0.95
    case 'strip':
      limitations.add('lower_precision_measurement_method')
      return 0.8
    case 'imported':
      limitations.add('lower_precision_measurement_method')
      return 0.8
    case 'manual':
    default:
      limitations.add('measurement_method_unspecified')
      return 0.75
  }
}

function parseMetadata(value: string | null): Record<string, unknown> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function calibrationFactor(
  input: MeasurementConfidenceInput,
  limitations: Set<MeasurementConfidenceLimitation>,
): number {
  if (!['photometer', 'probe', 'device'].includes(input.measurementMethod)) return 1

  const metadata = parseMetadata(input.measurementMetadata)
  const calibrationAtRaw = metadata.calibrationAt
  if (typeof calibrationAtRaw !== 'string' || calibrationAtRaw.trim() === '') {
    limitations.add('calibration_not_documented')
    return 0.85
  }

  const calibrationAt = new Date(calibrationAtRaw)
  if (Number.isNaN(calibrationAt.getTime())) {
    limitations.add('calibration_date_invalid')
    return 0.65
  }
  if (calibrationAt.getTime() > input.measuredAt.getTime() + 5 * 60 * 1000) {
    limitations.add('calibration_date_after_measurement')
    return 0.65
  }

  // AQWELIA records the evidence but never invents a universal validity period.
  // The calibration interval remains defined by the equipment manufacturer.
  limitations.add('calibration_interval_requires_manufacturer')
  return 1
}

export function createUnadjustedMeasurementConfidence(
  baseQuality: ScientificQualityAssessment,
): MeasurementConfidenceAssessment {
  return {
    score: baseQuality.score,
    level: baseQuality.level,
    baseQualityScore: baseQuality.score,
    ageHours: 0,
    factors: { freshness: 1, method: 1, calibration: 1 },
    limitations: [],
    methodVersion: MEASUREMENT_CONFIDENCE_METHOD_VERSION,
    policyBasis: 'aqwelia_operational_policy',
    manufacturerCalibrationIntervalVerified: false,
    provenanceApplied: false,
  }
}

/**
 * Applies transparent operational factors to the deterministic measurement-
 * completeness score. The result is a product confidence score, not a
 * statistical probability and not a substitute for the equipment manual.
 */
export function assessMeasurementConfidence(
  baseQuality: ScientificQualityAssessment,
  input: MeasurementConfidenceInput,
  now = new Date(),
): MeasurementConfidenceAssessment {
  const limitations = new Set<MeasurementConfidenceLimitation>()
  const ageHours = (now.getTime() - input.measuredAt.getTime()) / 3_600_000
  const factors: MeasurementConfidenceFactors = {
    freshness: freshnessFactor(ageHours, limitations),
    method: methodFactor(input.measurementMethod, limitations),
    calibration: calibrationFactor(input, limitations),
  }
  const score = Math.round(
    Math.max(0, Math.min(1,
      baseQuality.score * factors.freshness * factors.method * factors.calibration,
    )) * 100,
  ) / 100

  return {
    score,
    level: level(score),
    baseQualityScore: baseQuality.score,
    ageHours: Math.round(Math.max(0, ageHours) * 100) / 100,
    factors,
    limitations: [...limitations],
    methodVersion: MEASUREMENT_CONFIDENCE_METHOD_VERSION,
    policyBasis: 'aqwelia_operational_policy',
    manufacturerCalibrationIntervalVerified: false,
    provenanceApplied: true,
  }
}
