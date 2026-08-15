/**
 * AQWELIA — CANONICAL single source of the user-facing action plan.
 *
 * `generateScientificallyQualifiedActionPlan` is the UNIQUE public engine that
 * produces recommendations / quantities / bathing indications / dosing for
 * every user-facing path:
 *   - POST /api/pool/water-test
 *   - POST /api/pool/action-plan
 *   - POST /api/pool/strip-scan (save=true)
 *   - GET /api/dashboard (plan regeneration)
 *
 * Wave A1 (fix/wave-a-scientific-single-path): the legacy
 * `generateActionPlan` is no longer imported by any public route. It remains an
 * internal deterministic candidate generator that this wrapper qualifies
 * (measurement completeness, provenance-adjusted confidence, strict LSI,
 * contextual swimming safety, dosage readiness). A deferred or non-calculable
 * dosage NEVER exposes an actionable quantity, and no route falls back to the
 * legacy engine.
 */
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
  assessMeasurementConfidence,
  createUnadjustedMeasurementConfidence,
  type MeasurementConfidenceAssessment,
  type MeasurementConfidenceInput,
} from './measurement-confidence'
import {
  assessScientificQuality,
  isInsufficientAssessment,
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
  scientificConfidence: MeasurementConfidenceAssessment
  confidenceLevel: MeasurementConfidenceAssessment['level']
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

// PR #96 — French fallback for the contextual swim status in the diagnosis
// literals (the module prefers translation keys, these are only fallbacks).
const SWIM_FR: Record<ContextualSwimAssessment['status'], string> = {
  allowed: 'autorisée',
  avoid: 'déconseillée',
  forbidden: 'interdite',
  unknown: 'à confirmer après mesures',
}

/**
 * PR #96 — an INSUFFICIENT assessment must never be presented as a complete
 * global water-balance conclusion. pH in target + insufficient data → explicit
 * partial wording. pH out of target + insufficient data → the measured anomaly
 * stays visible AND the partial wording is appended. No global CWI score is
 * claimed in either case.
 */
function buildQualifiedDiagnosis(
  plan: GeneratedActionPlan,
  swimStatus: ContextualSwimAssessment['status'],
  insufficient: boolean,
): { diagnosis: string; diagnosisKey: string; diagnosisParams: Record<string, string | number> } {
  const swim = diagnosisSwimParam(swimStatus)
  const swimFr = SWIM_FR[swimStatus]
  const hasIssues = plan.diagnosisKey === 'diagIssues'
  if (!insufficient) {
    return {
      diagnosis: plan.diagnosis,
      diagnosisKey: plan.diagnosisKey,
      diagnosisParams: { ...plan.diagnosisParams, swim },
    }
  }
  if (!hasIssues) {
    return {
      diagnosis: `pH dans la plage cible. Données insuffisantes pour évaluer l'équilibre global de l'eau. Baignade : ${swimFr}.`,
      diagnosisKey: 'diagPartial',
      diagnosisParams: { swim },
    }
  }
  return {
    diagnosis: `Anomalie détectée : ${plan.diagnosisParams.issues ?? ''}. Données insuffisantes pour évaluer l'équilibre global de l'eau. Baignade : ${swimFr}.`,
    diagnosisKey: 'diagPartialIssues',
    diagnosisParams: {
      issues: plan.diagnosisParams.issues ?? '',
      issueKeys: plan.diagnosisParams.issueKeys ?? '',
      issueParams: plan.diagnosisParams.issueParams ?? '{}',
      swim,
    },
  }
}

/**
 * Compatibility wrapper around the deterministic action-plan engine.
 *
 * The legacy engine still generates the ordered candidate plan. This wrapper
 * qualifies it before exposure: measurement completeness, provenance-adjusted
 * confidence, strict LSI, contextual swimming safety and dosage readiness.
 * A deferred or non-calculable dosage never exposes an actionable quantity.
 *
 * CANONICAL (Wave A1): every public route producing a user-facing plan calls
 * this function — see the module header for the route list.
 */
export function generateScientificallyQualifiedActionPlan(
  test: QualifiedWaterTestInput,
  profile: QualifiedPoolProfileInput,
  locale: Locale = 'fr',
  measurementConfidenceInput?: MeasurementConfidenceInput,
  now = new Date(),
): ScientificallyQualifiedActionPlan {
  const plan = generateActionPlan(test, profile)
  const scientificQuality = assessScientificQuality(test, profile)
  const scientificConfidence = measurementConfidenceInput
    ? assessMeasurementConfidence(scientificQuality, measurementConfidenceInput, now)
    : createUnadjustedMeasurementConfidence(scientificQuality)
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

  // PR #96: an insufficient assessment must never read as a complete global
  // balance conclusion, and its severity must not read as "Équilibrée".
  const insufficient = isInsufficientAssessment(scientificQuality)
  const qualifiedDiagnosis = buildQualifiedDiagnosis(
    plan,
    contextualSwimSafety.status,
    insufficient,
  )
  const severity: GeneratedActionPlan['severity'] =
    insufficient && plan.diagnosisKey === 'diagBalanced'
      ? 'insufficient'
      : severityForContextualSafety(plan.severity, contextualSwimSafety.status)

  return {
    ...plan,
    diagnosis: qualifiedDiagnosis.diagnosis,
    diagnosisKey: qualifiedDiagnosis.diagnosisKey,
    diagnosisParams: qualifiedDiagnosis.diagnosisParams,
    severity,
    confidence: scientificConfidence.score,
    confidenceLevel: scientificConfidence.level,
    scientificQuality,
    scientificConfidence,
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
