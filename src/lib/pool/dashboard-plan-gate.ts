/**
 * AQWELIA Wave A1 — fail-closed dashboard plan gate.
 *
 * A stored ActionPlan is only presented as actionable when it can be qualified
 * as compatible with the canonical scientific contract and its method versions.
 * When the scientific regeneration failed, the pool profile is missing, or the
 * stored plan lacks the canonical method versions, the dashboard returns an
 * explicit `scientificRequalificationRequired` state and NEVER exposes a legacy
 * actionable quantity / estimatedCost / validated dosing action.
 *
 * This module is PURE (no DB, no network) so it is directly testable.
 */

import { DOSAGE_METHOD_VERSION } from './scientific-action-plan'

export interface StoredActionPlanRecord {
  id?: string | null
  waterTestId?: string | null
  diagnosis?: string | null
  diagnosisKey?: string | null
  diagnosisParams?: Record<string, string | number> | null
  severity?: string | null
  confidence?: number | null
  scientificMethodVersion?: string | null
  dosageMethodVersion?: string | null
  swimSafetyMethodVersion?: string | null
  immediateActions?: string | null
  chemicalDosages?: string | null
  doNotDo?: string | null
  doNotDoKeys?: string | null
  estimatedCost?: string | null
  retestInHours?: number | null
  filtrationHours?: number | null
  [k: string]: unknown
}

export interface DashboardPlanView {
  /** True when a scientifically qualified, actionable plan is available. */
  scientificPlanAvailable: boolean
  /** True when the plan must be requalified before it can be actionable. */
  scientificRequalificationRequired: boolean
  /** True when the ephemeral regenerated plan is returned (no stored identity). */
  ephemeral?: boolean
  /** True when the stored plan did not belong to the latest test (never exposed). */
  associationMismatch?: boolean
  // Safe, non-actionable fields (always present in a fail-closed view).
  diagnosis?: string | null
  diagnosisKey?: string | null
  diagnosisParams?: Record<string, string | number> | null
  severity?: string | null
  doNotDo: unknown[]
  doNotDoKeys: unknown[]
  // Actionable content — non-empty ONLY when a qualified plan is available.
  immediateActions: unknown[]
  chemicalDosages: unknown[]
  estimatedCost: string | null
  retestInHours: number | null
  filtrationHours: number | null
  confidence?: number | null
  [k: string]: unknown
}

export function safeParseJsonArray(value: string | null | unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * True when the stored plan carries the canonical scientific method versions
 * (dosage + confidence + swim-safety), i.e. it was produced by the canonical
 * scientific engine and its quantities are already readiness-masked.
 */
export function storedPlanIsCanonical(plan: StoredActionPlanRecord): boolean {
  return (
    plan?.dosageMethodVersion === DOSAGE_METHOD_VERSION &&
    typeof plan?.scientificMethodVersion === 'string' &&
    typeof plan?.swimSafetyMethodVersion === 'string'
  )
}

function failClosedView(stored: StoredActionPlanRecord | null, associationMismatch: boolean): DashboardPlanView {
  return {
    scientificPlanAvailable: false,
    scientificRequalificationRequired: true,
    associationMismatch,
    // Only safe, non-actionable info is preserved (historical diagnosis +
    // interdictions) when the stored plan belongs to the latest test. A plan
    // belonging to ANOTHER test is not exposed at all (diagnosis included).
    diagnosis: associationMismatch ? null : (stored?.diagnosis ?? null),
    diagnosisKey: associationMismatch ? null : (stored?.diagnosisKey ?? null),
    diagnosisParams: associationMismatch ? null : (stored?.diagnosisParams ?? null),
    severity: associationMismatch ? null : (stored?.severity ?? null),
    doNotDo: associationMismatch ? [] : safeParseJsonArray(stored?.doNotDo),
    doNotDoKeys: associationMismatch ? [] : safeParseJsonArray(stored?.doNotDoKeys),
    immediateActions: [],
    chemicalDosages: [],
    estimatedCost: null,
    retestInHours: null,
    filtrationHours: null,
    confidence: null,
  }
}

/**
 * Builds the dashboard plan view in a FAIL-CLOSED manner.
 *
 * A stored ActionPlan is actionable ONLY when a FRESH canonical scientific plan
 * was regenerated from the latest test + profile (returned as an ephemeral
 * plan, never reusing a stored identity). When regeneration fails, the pool
 * profile is missing, the stored plan belongs to another test, or the stored
 * plan lacks the canonical method versions, the dashboard returns an explicit
 * `scientificRequalificationRequired` state and NEVER exposes an actionable
 * legacy quantity / estimatedCost / validated dosing action.
 *
 * @param freshPlan regenerated canonical scientific plan (null if regeneration
 *   failed or the pool profile is missing)
 * @param storedPlan persisted ActionPlan (may be legacy)
 * @param storedPlanBelongsToLatestTest whether the stored plan belongs to the
 *   latest WaterTest
 */
export function buildDashboardPlanView(args: {
  freshPlan: {
    diagnosis: string
    diagnosisKey: string
    diagnosisParams: Record<string, string | number>
    severity: string
    confidence: number
    immediateActions: unknown[]
    chemicalDosages: unknown[]
    doNotDo: unknown[]
    doNotDoKeys: unknown[]
    estimatedCost: string
    retestInHours: number
    filtrationHours: number
    swimSafety: string
    swimReasons: string[]
    swimReasonKeys: string[]
    swimReasonParams: Record<string, string | number>[]
    lsiLabelKey: string
    whenToCallProfessionalKey: string | null
    whenToCallProfessionalParams?: Record<string, string | number> | null | undefined
    contextualSwimSafety: unknown
    scientificConfidence: { methodVersion: string }
    dosageMethodVersion: string
  } | null
  storedPlan: StoredActionPlanRecord | null
  storedPlanBelongsToLatestTest: boolean
}): DashboardPlanView | null {
  const { freshPlan, storedPlan, storedPlanBelongsToLatestTest } = args

  // 1) A fresh canonical scientific plan is available: it is an EPHEMERAL plan
  //    derived from the latest test + profile — it never reuses the identity of
  //    a stored (possibly other-test) plan. This is the ONLY actionable view.
  if (freshPlan) {
    return {
      scientificPlanAvailable: true,
      scientificRequalificationRequired: false,
      ephemeral: true,
      diagnosis: freshPlan.diagnosis,
      diagnosisKey: freshPlan.diagnosisKey,
      diagnosisParams: freshPlan.diagnosisParams,
      severity: freshPlan.severity,
      confidence: freshPlan.confidence,
      immediateActions: freshPlan.immediateActions,
      chemicalDosages: freshPlan.chemicalDosages,
      doNotDo: freshPlan.doNotDo,
      doNotDoKeys: freshPlan.doNotDoKeys,
      estimatedCost: freshPlan.estimatedCost,
      retestInHours: freshPlan.retestInHours,
      filtrationHours: freshPlan.filtrationHours,
      swimSafety: freshPlan.swimSafety,
      swimReasons: freshPlan.swimReasons,
      swimReasonKeys: freshPlan.swimReasonKeys,
      swimReasonParams: freshPlan.swimReasonParams,
      lsiLabelKey: freshPlan.lsiLabelKey,
      whenToCallProfessionalKey: freshPlan.whenToCallProfessionalKey,
      whenToCallProfessionalParams: freshPlan.whenToCallProfessionalParams,
      contextualSwimSafety: freshPlan.contextualSwimSafety,
      scientificMethodVersion: freshPlan.scientificConfidence.methodVersion,
      dosageMethodVersion: freshPlan.dosageMethodVersion,
    }
  }

  // 2) No fresh plan (regeneration failed or no profile) and no stored plan.
  if (!storedPlan) return null

  // 3) A stored plan — canonical or legacy — is NEVER exposed as actionable
  //    when no fresh qualified plan was produced. The dashboard is fail-closed:
  //    only the safe, non-actionable historical info (diagnosis + interdictions)
  //    may be kept, and only when the plan belongs to the latest test.
  return failClosedView(storedPlan, !storedPlanBelongsToLatestTest)
}
