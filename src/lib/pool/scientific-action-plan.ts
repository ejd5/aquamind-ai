import type { Locale } from '@/i18n/config'
import {
  generateActionPlan,
  type GeneratedActionPlan,
  type PoolProfileInput,
  type WaterTestInput,
} from './action-plan'
import {
  assessContextualSwimSafety,
  type ContextualSwimAssessment,
} from './contextual-swim-safety'
import {
  assessDosageReadiness,
  type DosageReadiness,
  type DosageReadinessProfile,
} from './dosage-readiness'
import {
  assessScientificQuality,
  type ScientificQualityAssessment,
  type ScientificTestInput,
} from './scientific-quality'
import {
  calculateLsiAssessment,
  lsiInterpretation,
  type LsiCalculation,
} from './water-balance'

export const DOSAGE_METHOD_VERSION = 'generic-product-estimate-v1' as const

export type QualifiedWaterTestInput = WaterTestInput & ScientificTestInput
export type QualifiedPoolProfileInput = PoolProfileInput & DosageReadinessProfile & {
  manufacturerChlorineMax?: number | null
}

export interface QualifiedChemicalDosage {
  basis: 'generic_estimate'
  methodVersion: typeof DOSAGE_METHOD_VERSION
  requiresProductLabelVerification: true
  readiness: DosageReadiness
  calculationSuppressed: boolean
}

export interface ScientificallyQualifiedActionPlan extends GeneratedActionPlan {
  scientificQuality: ScientificQualityAssessment
  confidenceLevel: ScientificQualityAssessment['level']
  lsiCalculation: LsiCalculation
  contextualSwimSafety: ContextualSwimAssessment
  dosageMethodVersion: typeof DOSAGE_METHOD_VERSION
  dosageLabelVerificationRequired: true
  chemicalDosages: Array<GeneratedActionPlan['chemicalDosages'][number] & QualifiedChemicalDosage>
}

const ACTION_KEY_BY_DOSAGE: Record<string, string> = {
  alkalinity_plus: 'iaAdjustTac',
  ph_minus: 'iaLowerPh',
  ph_plus: 'iaRaisePh',
  chlorine_shock: 'iaChlorineShock',
  chlorine_slow: 'iaAddSlowChlorine',
  stabilizer_plus: 'iaAddStabilizer',
  salt_plus: 'iaAddSalt',
}

function severityForContextualSafety(
  severity: GeneratedActionPlan['severity'],
  safety: ContextualSwimAssessment['status'],
): GeneratedActionPlan['severity'] {
  if (safety === 'forbidden' && severity === 'low') return 'high'
  if (safety === 'forbidden' && severity === 'medium') return 'high'
  if (safety === 'avoid' && severity === 'low') return 'medium'
  return severity
}

function diagnosisSwimParam(status: ContextualSwimAssessment['status']): string {
  if (status === 'allowed') return 'swimLabelAllowed'
  if (status === 'avoid') return 'swimLabelAvoid'
  if (status === 'forbidden') return 'swimLabelForbidden'
  return 'swimLabelUnknown'
}

function numericEstimatedCost(value: string): number {
  const match = value.match(/[\d.]+/)
  return match ? Number.parseFloat(match[0]) : 0
}

/**
 * Compatibility wrapper around the deterministic action-plan engine.
 *
 * The legacy engine still generates the ordered candidate plan. This wrapper
 * qualifies it before exposure: dynamic measurement confidence, strict LSI,
 * contextual swimming safety and dosage readiness. A deferred or non-
 * calculable dosage never exposes an actionable quantity or cost.
 */
export function generateScientificallyQualifiedActionPlan(
  test: QualifiedWaterTestInput,
  profile: QualifiedPoolProfileInput,
  locale: Locale = 'fr',
): ScientificallyQualifiedActionPlan {
  const plan = generateActionPlan(test, profile)
  const scientificQuality = assessScientificQuality(test, profile)
  const lsiCalculation = calculateLsiAssessment(test)
  const lsiInfo = lsiInterpretation(lsiCalculation.value)
  const contextualSwimSafety = assessContextualSwimSafety(
    test,
    {
      treatmentType: profile.treatmentType,
      saltSystem: profile.saltSystem,
      waterBodyType: profile.waterBodyType,
      cyanuricAcid: test.cyanuricAcid,
      manufacturerSaltMin: profile.manufacturerSaltMin,
      manufacturerSaltMax: profile.manufacturerSaltMax,
      manufacturerChlorineMax: profile.manufacturerChlorineMax,
    },
    locale,
  )

  const qualifiedDosages = plan.chemicalDosages.map((dosage) => {
    const readiness = assessDosageReadiness(dosage.param, test, profile)
    const calculationSuppressed = readiness.state !== 'ready'
    return {
      ...dosage,
      quantity: calculationSuppressed ? '—' : dosage.quantity,
      estimatedCost: calculationSuppressed ? '—' : dosage.estimatedCost,
      basis: 'generic_estimate' as const,
      methodVersion: DOSAGE_METHOD_VERSION,
      requiresProductLabelVerification: true as const,
      readiness,
      calculationSuppressed,
    }
  })

  const blockedActionKeys = new Set(
    qualifiedDosages
      .filter((dosage) => dosage.readiness.state === 'not_calculable')
      .map((dosage) => ACTION_KEY_BY_DOSAGE[dosage.param])
      .filter(Boolean),
  )
  const immediateActions = plan.immediateActions.filter(
    (action) => !blockedActionKeys.has(action.actionKey),
  )

  const readyDosages = qualifiedDosages.filter((dosage) => dosage.readiness.state === 'ready')
  const filtrationHours = readyDosages.reduce(
    (maximum, dosage) => Math.max(maximum, dosage.filtrationHours),
    0,
  )
  const retestInHours = readyDosages.length > 0
    ? readyDosages.reduce(
        (minimum, dosage) => Math.min(minimum, dosage.retestInHours),
        24,
      )
    : 24
  const totalCost = readyDosages.reduce(
    (sum, dosage) => sum + numericEstimatedCost(dosage.estimatedCost),
    0,
  )

  return {
    ...plan,
    diagnosisParams: {
      ...plan.diagnosisParams,
      swim: diagnosisSwimParam(contextualSwimSafety.status),
    },
    severity: severityForContextualSafety(plan.severity, contextualSwimSafety.status),
    confidence: scientificQuality.score,
    confidenceLevel: scientificQuality.level,
    scientificQuality,
    immediateActions,
    swimSafety: contextualSwimSafety.status,
    swimReasons: contextualSwimSafety.reasons.map((reason) => reason.message),
    swimReasonKeys: contextualSwimSafety.reasons.map((reason) => reason.code),
    swimReasonParams: contextualSwimSafety.reasons.map((reason) => reason.params),
    contextualSwimSafety,
    lsi: lsiCalculation.value,
    lsiLabel: lsiInfo.label,
    lsiLabelKey: lsiInfo.labelKey,
    lsiCalculation,
    dosageMethodVersion: DOSAGE_METHOD_VERSION,
    dosageLabelVerificationRequired: true,
    chemicalDosages: qualifiedDosages,
    filtrationHours,
    retestInHours,
    estimatedCost: totalCost > 0 ? `≈ ${totalCost.toFixed(2)} €` : '—',
  }
}
