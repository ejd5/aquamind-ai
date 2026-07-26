// P1 Scientific Quality — deterministic assessment of measurement completeness,
// plausibility and internal consistency. This score describes data quality; it
// is not a probability that a diagnosis is correct.

export type ScientificMeasurementKey =
  | 'ph'
  | 'freeChlorine'
  | 'totalChlorine'
  | 'combinedChlorine'
  | 'bromine'
  | 'alkalinity'
  | 'calciumHardness'
  | 'cyanuricAcid'
  | 'salt'
  | 'phosphates'
  | 'temperature'
  | 'totalDissolvedSolids'

export type ScientificQualityLevel = 'high' | 'medium' | 'low' | 'insufficient'

export type ScientificLimitationCode =
  | 'missing_disinfectant_measurement'
  | 'missing_temperature'
  | 'missing_alkalinity'
  | 'missing_calcium_hardness'
  | 'missing_total_dissolved_solids'
  | 'missing_cyanuric_acid'
  | 'invalid_pool_volume'
  | 'invalid_measurement'
  | 'chlorine_measurements_inconsistent'

export interface ScientificTestInput {
  ph: number
  freeChlorine?: number | null
  totalChlorine?: number | null
  combinedChlorine?: number | null
  bromine?: number | null
  alkalinity?: number | null
  calciumHardness?: number | null
  cyanuricAcid?: number | null
  salt?: number | null
  phosphates?: number | null
  temperature?: number | null
  totalDissolvedSolids?: number | null
}

export interface ScientificProfileInput {
  volume: number
  treatmentType?: string | null
  saltSystem?: boolean
  waterBodyType?: string | null
}

export interface ScientificQualityAssessment {
  /** 0..1 deterministic data-quality score, not a statistical probability. */
  score: number
  level: ScientificQualityLevel
  disinfectantField: 'freeChlorine' | 'bromine'
  measuredFields: ScientificMeasurementKey[]
  missingFields: ScientificMeasurementKey[]
  invalidFields: ScientificMeasurementKey[]
  limitations: ScientificLimitationCode[]
  dosageEligible: boolean
  lsiEligible: boolean
  methodVersion: 'scientific-quality-v1'
}

interface PlausibleRange {
  min: number
  max: number
}

// Broad physical/plausibility bounds. Operational target ranges live in
// targets.ts; these limits only reject impossible or clearly corrupted inputs.
const PLAUSIBLE_RANGES: Record<ScientificMeasurementKey, PlausibleRange> = {
  ph: { min: 0, max: 14 },
  freeChlorine: { min: 0, max: 50 },
  totalChlorine: { min: 0, max: 50 },
  combinedChlorine: { min: 0, max: 50 },
  bromine: { min: 0, max: 50 },
  alkalinity: { min: 0, max: 1000 },
  calciumHardness: { min: 0, max: 2000 },
  cyanuricAcid: { min: 0, max: 500 },
  salt: { min: 0, max: 20 },
  phosphates: { min: 0, max: 20 },
  temperature: { min: 0, max: 60 },
  totalDissolvedSolids: { min: 1, max: 50_000 },
}

export function isScientificallyValidMeasurement(
  key: ScientificMeasurementKey,
  value: number | null | undefined,
): value is number {
  if (value == null || !Number.isFinite(value)) return false
  const range = PLAUSIBLE_RANGES[key]
  return value >= range.min && value <= range.max
}

function qualityLevel(score: number): ScientificQualityLevel {
  if (score >= 0.85) return 'high'
  if (score >= 0.65) return 'medium'
  if (score >= 0.4) return 'low'
  return 'insufficient'
}

function disinfectantField(profile: ScientificProfileInput): 'freeChlorine' | 'bromine' {
  return profile.treatmentType === 'bromine' && !profile.saltSystem
    ? 'bromine'
    : 'freeChlorine'
}

function qualityWeights(
  profile: ScientificProfileInput,
  disinfectant: 'freeChlorine' | 'bromine',
): Partial<Record<ScientificMeasurementKey, number>> {
  const chlorineBased = disinfectant === 'freeChlorine'
  const spaOnly = profile.waterBodyType === 'spa'
  return {
    ph: 0.25,
    [disinfectant]: 0.25,
    alkalinity: 0.15,
    temperature: 0.1,
    calciumHardness: 0.1,
    totalDissolvedSolids: 0.05,
    ...(chlorineBased ? { combinedChlorine: 0.05 } : {}),
    ...(chlorineBased && !spaOnly ? { cyanuricAcid: 0.05 } : {}),
  }
}

export function assessScientificQuality(
  test: ScientificTestInput,
  profile: ScientificProfileInput,
): ScientificQualityAssessment {
  const measuredFields: ScientificMeasurementKey[] = []
  const missingFields: ScientificMeasurementKey[] = []
  const invalidFields: ScientificMeasurementKey[] = []
  const limitations = new Set<ScientificLimitationCode>()
  const requiredDisinfectant = disinfectantField(profile)
  const weights = qualityWeights(profile, requiredDisinfectant)

  const values: Record<ScientificMeasurementKey, number | null | undefined> = {
    ph: test.ph,
    freeChlorine: test.freeChlorine,
    totalChlorine: test.totalChlorine,
    combinedChlorine: test.combinedChlorine,
    bromine: test.bromine,
    alkalinity: test.alkalinity,
    calciumHardness: test.calciumHardness,
    cyanuricAcid: test.cyanuricAcid,
    salt: test.salt,
    phosphates: test.phosphates,
    temperature: test.temperature,
    totalDissolvedSolids: test.totalDissolvedSolids,
  }

  for (const key of Object.keys(values) as ScientificMeasurementKey[]) {
    const value = values[key]
    if (value == null) {
      if (weights[key]) missingFields.push(key)
      continue
    }
    if (isScientificallyValidMeasurement(key, value)) measuredFields.push(key)
    else invalidFields.push(key)
  }

  if (values[requiredDisinfectant] == null) limitations.add('missing_disinfectant_measurement')
  if (test.temperature == null) limitations.add('missing_temperature')
  if (test.alkalinity == null) limitations.add('missing_alkalinity')
  if (test.calciumHardness == null) limitations.add('missing_calcium_hardness')
  if (test.totalDissolvedSolids == null) limitations.add('missing_total_dissolved_solids')
  if (weights.cyanuricAcid && test.cyanuricAcid == null) limitations.add('missing_cyanuric_acid')
  if (invalidFields.length > 0) limitations.add('invalid_measurement')

  const validVolume = Number.isFinite(profile.volume) && profile.volume > 0
  if (!validVolume) limitations.add('invalid_pool_volume')

  const validFree = isScientificallyValidMeasurement('freeChlorine', test.freeChlorine)
  const validTotal = isScientificallyValidMeasurement('totalChlorine', test.totalChlorine)
  const validCombined = isScientificallyValidMeasurement('combinedChlorine', test.combinedChlorine)
  let chlorineInconsistent = false

  if (requiredDisinfectant === 'freeChlorine') {
    if (validFree && validTotal && test.totalChlorine! + 0.05 < test.freeChlorine!) {
      chlorineInconsistent = true
    }
    if (validCombined && validTotal && test.combinedChlorine! > test.totalChlorine! + 0.05) {
      chlorineInconsistent = true
    }
    if (validFree && validTotal && validCombined) {
      const calculatedCombined = Math.max(0, test.totalChlorine! - test.freeChlorine!)
      if (Math.abs(calculatedCombined - test.combinedChlorine!) > 0.5) chlorineInconsistent = true
    }
    if (chlorineInconsistent) limitations.add('chlorine_measurements_inconsistent')
  }

  const weightEntries = Object.entries(weights) as [ScientificMeasurementKey, number][]
  const totalWeight = weightEntries.reduce((sum, [, weight]) => sum + weight, 0)
  let earnedWeight = 0
  for (const [key, weight] of weightEntries) {
    if (isScientificallyValidMeasurement(key, values[key])) earnedWeight += weight
  }
  let score = totalWeight > 0 ? earnedWeight / totalWeight : 0

  if (!validVolume) score = Math.min(score, 0.35)
  if (!isScientificallyValidMeasurement('ph', test.ph)) score = 0
  if (!isScientificallyValidMeasurement(requiredDisinfectant, values[requiredDisinfectant])) {
    score = Math.min(score, 0.55)
  }
  if (chlorineInconsistent) score = Math.max(0, score - 0.15)
  if (invalidFields.length > 0) score = Math.max(0, score - Math.min(0.2, invalidFields.length * 0.05))

  score = Math.round(Math.max(0, Math.min(1, score)) * 100) / 100

  const lsiEligible =
    isScientificallyValidMeasurement('ph', test.ph) &&
    isScientificallyValidMeasurement('temperature', test.temperature) &&
    isScientificallyValidMeasurement('calciumHardness', test.calciumHardness) &&
    isScientificallyValidMeasurement('alkalinity', test.alkalinity) &&
    isScientificallyValidMeasurement('totalDissolvedSolids', test.totalDissolvedSolids)

  return {
    score,
    level: qualityLevel(score),
    disinfectantField: requiredDisinfectant,
    measuredFields,
    missingFields,
    invalidFields,
    limitations: [...limitations],
    dosageEligible: validVolume && isScientificallyValidMeasurement('ph', test.ph),
    lsiEligible,
    methodVersion: 'scientific-quality-v1',
  }
}
