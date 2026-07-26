import {
  generateActionPlan,
  type GeneratedActionPlan,
  type PoolProfileInput,
  type WaterTestInput,
} from './action-plan'
import {
  assessScientificQuality,
  type ScientificQualityAssessment,
} from './scientific-quality'
import {
  calculateLsiAssessment,
  lsiInterpretation,
  type LsiCalculation,
} from './water-balance'

export const DOSAGE_METHOD_VERSION = 'generic-product-estimate-v1' as const

export interface QualifiedChemicalDosage {
  basis: 'generic_estimate'
  methodVersion: typeof DOSAGE_METHOD_VERSION
  requiresProductLabelVerification: true
}

export interface ScientificallyQualifiedActionPlan extends GeneratedActionPlan {
  scientificQuality: ScientificQualityAssessment
  confidenceLevel: ScientificQualityAssessment['level']
  lsiCalculation: LsiCalculation
  dosageMethodVersion: typeof DOSAGE_METHOD_VERSION
  dosageLabelVerificationRequired: true
  chemicalDosages: Array<GeneratedActionPlan['chemicalDosages'][number] & QualifiedChemicalDosage>
}

/**
 * Compatibility wrapper around the deterministic action-plan engine.
 *
 * Existing diagnosis/action ordering remains unchanged. P1 Scientific Quality
 * replaces the historical fixed confidence of 0.9 with a deterministic data-
 * quality score, attaches strict LSI provenance and marks every generic dosage
 * as an estimate that must be checked against the exact product label.
 */
export function generateScientificallyQualifiedActionPlan(
  test: WaterTestInput,
  profile: PoolProfileInput,
): ScientificallyQualifiedActionPlan {
  const plan = generateActionPlan(test, profile)
  const scientificQuality = assessScientificQuality(test, profile)
  const lsiCalculation = calculateLsiAssessment(test)
  const lsiInfo = lsiInterpretation(lsiCalculation.value)

  return {
    ...plan,
    confidence: scientificQuality.score,
    confidenceLevel: scientificQuality.level,
    scientificQuality,
    lsi: lsiCalculation.value,
    lsiLabel: lsiInfo.label,
    lsiLabelKey: lsiInfo.labelKey,
    lsiCalculation,
    dosageMethodVersion: DOSAGE_METHOD_VERSION,
    dosageLabelVerificationRequired: true,
    chemicalDosages: plan.chemicalDosages.map((dosage) => ({
      ...dosage,
      basis: 'generic_estimate',
      methodVersion: DOSAGE_METHOD_VERSION,
      requiresProductLabelVerification: true,
    })),
  }
}
