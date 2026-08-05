/**
 * AQWELIA Wave A1 — fail-closed dashboard plan gate.
 *
 * A stored ActionPlan is only presented as actionable when a FRESH canonical
 * scientific plan was regenerated from the latest test + profile. When the
 * scientific regeneration failed, the pool profile is missing, the stored plan
 * belongs to another test, or the stored plan lacks the canonical method
 * versions, the dashboard returns an explicit `scientificRequalificationRequired`
 * state and NEVER exposes a legacy actionable quantity / estimatedCost /
 * validated dosing action.
 *
 * This module is PURE (no DB, no network) so it is directly testable.
 * The public DTO contract lives in `dashboard-contract.ts` (client-safe).
 */

import { DOSAGE_METHOD_VERSION } from './scientific-action-plan'
import {
  DashboardPlanMetadata,
  DashboardPlanView,
  safeParseJsonArray,
} from './dashboard-contract'

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

export interface DashboardSourceMetadata {
  sourceWaterTestId: string | null
  sourceMeasuredAt: string | Date | null
  /** injectable for deterministic tests; defaults to now. */
  generatedAt?: string | Date
}

export type { DashboardPlanView }
export { safeParseJsonArray }

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

function buildMetadata(
  source: DashboardSourceMetadata,
  storedPlan: StoredActionPlanRecord | null,
  storedPlanBelongsToLatestTest: boolean,
): DashboardPlanMetadata {
  const generatedAt = source.generatedAt
    ? (source.generatedAt instanceof Date ? source.generatedAt.toISOString() : String(source.generatedAt))
    : new Date().toISOString()
  return {
    sourceWaterTestId: source.sourceWaterTestId ?? null,
    sourceMeasuredAt: source.sourceMeasuredAt ?? null,
    generatedAt,
    // storedActionPlanId is present ONLY when a stored plan belongs exactly to
    // the latest test. It is NEVER the identity of a freshPlan.
    storedActionPlanId:
      storedPlan && storedPlanBelongsToLatestTest ? (storedPlan.id ?? null) : null,
  }
}

function failClosedView(
  stored: StoredActionPlanRecord | null,
  associationMismatch: boolean,
  source: DashboardSourceMetadata,
): DashboardPlanView {
  return {
    ...buildMetadata(source, stored, !associationMismatch),
    scientificPlanAvailable: false,
    scientificRequalificationRequired: true,
    associationMismatch,
    // Informational: whether the stored plan was produced by the canonical
    // engine. This NEVER makes it actionable — a stored plan is only actionable
    // through a fresh regeneration.
    storedPlanIsCanonical: stored ? storedPlanIsCanonical(stored) : false,
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
 * @param args.freshPlan regenerated canonical scientific plan (null if
 *   regeneration failed or the pool profile is missing)
 * @param args.storedPlan persisted ActionPlan (may be legacy)
 * @param args.storedPlanBelongsToLatestTest whether the stored plan belongs to
 *   the latest WaterTest
 * @param args.sourceMetadata safe metadata derived from the latest test
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
  sourceMetadata?: DashboardSourceMetadata
}): DashboardPlanView | null {
  const { freshPlan, storedPlan, storedPlanBelongsToLatestTest } = args
  const sourceMetadata: DashboardSourceMetadata = args.sourceMetadata ?? {
    sourceWaterTestId: null,
    sourceMeasuredAt: null,
    generatedAt: new Date(),
  }

  // 1) A fresh canonical scientific plan is available: it is an EPHEMERAL plan
  //    derived from the latest test + profile — it never reuses the identity of
  //    a stored (possibly other-test) plan. This is the ONLY actionable view.
  if (freshPlan) {
    return {
      ...buildMetadata(sourceMetadata, storedPlan, storedPlanBelongsToLatestTest),
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
  return failClosedView(storedPlan, !storedPlanBelongsToLatestTest, sourceMetadata)
}

// ---------------------------------------------------------------------------
// Wave A1 Round 3/4 — public response sanitization + fail-closed swim
// ---------------------------------------------------------------------------

/**
 * Strips the nested Prisma relations and HISTORICAL SCIENTIFIC CONCLUSIONS from
 * the LATEST TEST BEFORE it is serialized into the public dashboard response:
 *   - `actionPlans` (and inside them `executions` / `outcome`);
 *   - `swimSafety` (may carry a historical swim method);
 *   - `status` (may carry a historical status method).
 *
 * The plan is exposed ONLY through the secured `latestPlan` view and swimming
 * safety ONLY through the secured top-level `swim` object — a raw stored
 * dosage or an unqualified swim conclusion can never leak via `latestTest`.
 *
 * PURE and testable. The returned type reflects the absence of these three
 * properties via `Omit`.
 */
export function sanitizeDashboardLatestTest<T extends Record<string, unknown>>(
  latestTest: T | null,
): Omit<T, 'actionPlans' | 'swimSafety' | 'status'> | null {
  if (!latestTest) return null
  const { actionPlans: _droppedPlans, swimSafety: _droppedSwim, status: _droppedStatus, ...rest } = latestTest
  void _droppedPlans
  void _droppedSwim
  void _droppedStatus
  return rest as Omit<T, 'actionPlans' | 'swimSafety' | 'status'>
}

export interface DashboardSwimView {
  status: 'allowed' | 'avoid' | 'forbidden' | 'unknown'
  reasons: string[]
  /** True when the swim conclusion is NOT backed by a fresh canonical engine. */
  scientificRequalificationRequired: boolean
}

/**
 * FAIL-CLOSED swim safety for the dashboard header.
 *
 * - When a fresh canonical scientific plan exists: the contextual swim safety
 *   from that plan is authoritative.
 * - When no fresh plan exists: the stored `latestTest.swimSafety` is NEVER
 *   presented as a current scientific conclusion (it may carry the historical
 *   method). Returns `status='unknown'`, empty reasons and
 *   `scientificRequalificationRequired: true`.
 */
export function buildDashboardSwim(args: {
  freshPlan: { swimSafety: string; swimReasons: string[] } | null
  hasLatestTest: boolean
}): DashboardSwimView | null {
  if (args.freshPlan) {
    return {
      status: (args.freshPlan.swimSafety as DashboardSwimView['status']) || 'unknown',
      reasons: args.freshPlan.swimReasons,
      scientificRequalificationRequired: false,
    }
  }
  if (!args.hasLatestTest) return null
  return {
    status: 'unknown',
    reasons: [],
    scientificRequalificationRequired: true,
  }
}
