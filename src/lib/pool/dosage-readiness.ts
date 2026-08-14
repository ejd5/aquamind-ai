import {
  resolveContextualOperatingTargets,
  type ContextualOperatingTargets,
} from './contextual-targets'
import type { ScientificProfileInput, ScientificTestInput } from './scientific-quality'

export const DOSAGE_READINESS_METHOD_VERSION = 'dosage-readiness-v1' as const

export type DosageReadinessState = 'ready' | 'deferred' | 'not_calculable'

export type DosageReadinessReason =
  | 'invalid_pool_volume'
  | 'missing_required_measurement'
  | 'wrong_treatment_type'
  | 'rebalance_ph_first'
  | 'spa_cya_not_recommended'
  | 'equipment_salt_range_required'
  | 'manufacturer_target_recalculation_required'
  | 'salt_already_within_range'
  | 'filter_type_required'
  | 'incompatible_filter_type'
  | 'manufacturer_label_verification_required'

export interface DosageReadiness {
  state: DosageReadinessState
  reasons: DosageReadinessReason[]
  methodVersion: typeof DOSAGE_READINESS_METHOD_VERSION
  recalculateAfterPrerequisite: boolean
}

export interface DosageReadinessProfile extends ScientificProfileInput {
  filterType?: string | null
  manufacturerSaltMin?: number | null
  manufacturerSaltMax?: number | null
}

function result(
  state: DosageReadinessState,
  reasons: DosageReadinessReason[],
  recalculateAfterPrerequisite = state !== 'ready',
): DosageReadiness {
  return {
    state,
    reasons,
    methodVersion: DOSAGE_READINESS_METHOD_VERSION,
    recalculateAfterPrerequisite,
  }
}

function valid(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value)
}

function contextualTargets(
  test: ScientificTestInput,
  profile: DosageReadinessProfile,
): ContextualOperatingTargets {
  return resolveContextualOperatingTargets({
    treatmentType: profile.treatmentType ?? 'other',
    saltSystem: profile.saltSystem,
    waterBodyType: profile.waterBodyType,
    cyanuricAcid: test.cyanuricAcid,
    manufacturerSaltMin: profile.manufacturerSaltMin,
    manufacturerSaltMax: profile.manufacturerSaltMax,
  })
}

export function assessDosageReadiness(
  param: string,
  test: ScientificTestInput,
  profile: DosageReadinessProfile,
): DosageReadiness {
  // P0-2: a precise dosage REQUIRES a user-confirmed pool volume. An old
  // technical value (e.g. 40 m³ from a legacy flow) must never produce a
  // precise quantity — the dosage is not calculable until volume is confirmed.
  const volumeValid = Number.isFinite(profile.volume) && profile.volume > 0
  if (profile.volumeConfirmed === false || !volumeValid) {
    return result('not_calculable', ['invalid_pool_volume'])
  }

  const targets = contextualTargets(test, profile)
  const pHReady = Number.isFinite(test.ph) && test.ph >= targets.pH.preferredLow && test.ph <= targets.pH.preferredHigh
  const chlorineTreatment = profile.saltSystem || profile.treatmentType === 'chlorine' || profile.treatmentType === 'salt'

  switch (param) {
    case 'ph_minus':
    case 'ph_plus':
      return Number.isFinite(test.ph)
        ? result('ready', ['manufacturer_label_verification_required'], false)
        : result('not_calculable', ['missing_required_measurement'])

    case 'chlorine_shock':
    case 'chlorine_slow':
      if (!chlorineTreatment) return result('not_calculable', ['wrong_treatment_type'])
      if (!valid(test.freeChlorine)) return result('not_calculable', ['missing_required_measurement'])
      if (!pHReady) return result('deferred', ['rebalance_ph_first'])
      return result('ready', ['manufacturer_label_verification_required'], false)

    case 'alkalinity_plus':
      return valid(test.alkalinity)
        ? result('ready', ['manufacturer_label_verification_required'], false)
        : result('not_calculable', ['missing_required_measurement'])

    case 'calcium_plus':
      return valid(test.calciumHardness)
        ? result('ready', ['manufacturer_label_verification_required'], false)
        : result('not_calculable', ['missing_required_measurement'])

    case 'stabilizer_plus':
      if (profile.waterBodyType === 'spa') {
        return result('not_calculable', ['spa_cya_not_recommended'])
      }
      if (!chlorineTreatment) return result('not_calculable', ['wrong_treatment_type'])
      return valid(test.cyanuricAcid)
        ? result('ready', ['manufacturer_label_verification_required'], false)
        : result('not_calculable', ['missing_required_measurement'])

    case 'salt_plus': {
      if (!profile.saltSystem && profile.treatmentType !== 'salt') {
        return result('not_calculable', ['wrong_treatment_type'])
      }
      if (!valid(test.salt)) return result('not_calculable', ['missing_required_measurement'])
      if (!targets.salt || targets.salt.minimum == null || targets.salt.maximum == null) {
        return result('not_calculable', ['equipment_salt_range_required'])
      }
      if (test.salt >= targets.salt.minimum && test.salt <= targets.salt.maximum) {
        return result('not_calculable', ['salt_already_within_range'], false)
      }
      // The legacy engine still targets a generic 5 g/L. Even with a documented
      // equipment range, that quantity must be recomputed from the actual target
      // before it can be exposed.
      return result('not_calculable', ['manufacturer_target_recalculation_required'])
    }

    case 'anti_algae':
      return pHReady
        ? result('ready', ['manufacturer_label_verification_required'], false)
        : result('deferred', ['rebalance_ph_first'])

    case 'flocculant':
      if (!profile.filterType) return result('not_calculable', ['filter_type_required'])
      if (!['sand', 'glass'].includes(profile.filterType)) {
        return result('not_calculable', ['incompatible_filter_type'])
      }
      return result('ready', ['manufacturer_label_verification_required'], false)

    default:
      return result('not_calculable', ['missing_required_measurement'])
  }
}
