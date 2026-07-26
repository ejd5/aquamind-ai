// P1 Scientific Quality — contextual operating targets.
//
// These targets are deliberately separate from product dosing coefficients.
// They identify the measurement range to maintain and when a manufacturer or
// local rule must supply an upper limit. They do not authorize a chemical dose.

export const CONTEXTUAL_TARGET_METHOD_VERSION = 'cdc-operational-targets-v1' as const

export type WaterBodyType = 'pool' | 'spa' | 'both' | string
export type TreatmentType = 'chlorine' | 'salt' | 'bromine' | 'active_oxygen' | 'uv' | 'other' | string

export type ContextualTargetLimitation =
  | 'manufacturer_upper_limit_required'
  | 'equipment_salt_range_required'
  | 'cyanuric_acid_not_recommended_for_spa'
  | 'unsupported_primary_disinfectant'
  | 'water_body_type_unspecified'

export interface ContextualTargetContext {
  treatmentType: TreatmentType
  saltSystem?: boolean
  waterBodyType?: WaterBodyType | null
  cyanuricAcid?: number | null
  manufacturerSaltMin?: number | null
  manufacturerSaltMax?: number | null
}

export interface NumericOperatingTarget {
  parameter: string
  unit: string
  minimum: number
  preferredLow: number
  preferredHigh: number
  maximum: number | null
  upperLimitBasis: 'operational_range' | 'manufacturer_label'
}

export interface SaltOperatingTarget {
  parameter: 'salt'
  unit: 'g/L'
  minimum: number | null
  preferredLow: number | null
  preferredHigh: number | null
  maximum: number | null
  basis: 'equipment_manual' | 'manufacturer_range'
}

export interface ContextualOperatingTargets {
  methodVersion: typeof CONTEXTUAL_TARGET_METHOD_VERSION
  pH: NumericOperatingTarget
  disinfectant: NumericOperatingTarget | null
  cyanuricAcid: {
    allowed: boolean
    measured: number | null
    implication: 'raises_minimum_free_chlorine' | 'not_recommended_for_spa' | 'none'
  }
  salt: SaltOperatingTarget | null
  limitations: ContextualTargetLimitation[]
  sourceCodes: Array<'CDC_HOME_POOL_2024' | 'CDC_HEALTHY_SWIMMING_2025'>
}

function normalizedWaterBody(value: WaterBodyType | null | undefined): 'pool' | 'spa' | 'both' | 'unknown' {
  if (value === 'pool' || value === 'spa' || value === 'both') return value
  return 'unknown'
}

export function resolveContextualOperatingTargets(
  context: ContextualTargetContext,
): ContextualOperatingTargets {
  const limitations = new Set<ContextualTargetLimitation>()
  const waterBody = normalizedWaterBody(context.waterBodyType)
  const isSpa = waterBody === 'spa'
  const usesCya = Number.isFinite(context.cyanuricAcid) && (context.cyanuricAcid as number) > 0
  const treatment = context.saltSystem ? 'salt' : context.treatmentType

  if (waterBody === 'unknown') limitations.add('water_body_type_unspecified')

  const pH: NumericOperatingTarget = {
    parameter: 'ph',
    unit: '',
    minimum: 7.0,
    preferredLow: 7.2,
    preferredHigh: 7.6,
    maximum: 7.8,
    upperLimitBasis: 'operational_range',
  }

  let disinfectant: NumericOperatingTarget | null = null

  if (treatment === 'chlorine' || treatment === 'salt') {
    const minimum = isSpa ? 3 : usesCya ? 2 : 1
    disinfectant = {
      parameter: 'freeChlorine',
      unit: 'mg/L',
      minimum,
      preferredLow: minimum,
      preferredHigh: isSpa ? 5 : usesCya ? 4 : 3,
      maximum: null,
      upperLimitBasis: 'manufacturer_label',
    }
    limitations.add('manufacturer_upper_limit_required')
  } else if (treatment === 'bromine') {
    disinfectant = {
      parameter: 'bromine',
      unit: 'mg/L',
      minimum: 3,
      preferredLow: 3,
      preferredHigh: 8,
      maximum: 8,
      upperLimitBasis: 'operational_range',
    }
  } else {
    limitations.add('unsupported_primary_disinfectant')
  }

  const cyaAllowed = !isSpa
  if (isSpa && usesCya) limitations.add('cyanuric_acid_not_recommended_for_spa')

  let salt: SaltOperatingTarget | null = null
  if (treatment === 'salt') {
    const hasManufacturerRange =
      Number.isFinite(context.manufacturerSaltMin) &&
      Number.isFinite(context.manufacturerSaltMax) &&
      (context.manufacturerSaltMin as number) >= 0 &&
      (context.manufacturerSaltMax as number) > (context.manufacturerSaltMin as number)

    salt = hasManufacturerRange
      ? {
          parameter: 'salt',
          unit: 'g/L',
          minimum: context.manufacturerSaltMin as number,
          preferredLow: context.manufacturerSaltMin as number,
          preferredHigh: context.manufacturerSaltMax as number,
          maximum: context.manufacturerSaltMax as number,
          basis: 'manufacturer_range',
        }
      : {
          parameter: 'salt',
          unit: 'g/L',
          minimum: null,
          preferredLow: null,
          preferredHigh: null,
          maximum: null,
          basis: 'equipment_manual',
        }

    if (!hasManufacturerRange) limitations.add('equipment_salt_range_required')
  }

  return {
    methodVersion: CONTEXTUAL_TARGET_METHOD_VERSION,
    pH,
    disinfectant,
    cyanuricAcid: {
      allowed: cyaAllowed,
      measured: Number.isFinite(context.cyanuricAcid) ? context.cyanuricAcid as number : null,
      implication: isSpa && usesCya
        ? 'not_recommended_for_spa'
        : usesCya && (treatment === 'chlorine' || treatment === 'salt')
          ? 'raises_minimum_free_chlorine'
          : 'none',
    },
    salt,
    limitations: [...limitations],
    sourceCodes: ['CDC_HOME_POOL_2024', 'CDC_HEALTHY_SWIMMING_2025'],
  }
}
