/**
 * AQWELIA Wave A1 — shared dashboard API contract (client-safe).
 *
 * This module is the SINGLE contract between GET /api/dashboard and its
 * React/mobile consumers. It is pure type + tiny pure helpers with NO server
 * dependency, so client bundles can `import type` safely.
 *
 * Key guarantees:
 *   - `latestTest` (DashboardLatestTestView) NEVER carries `actionPlans`,
 *     `swimSafety` or `status` — no historical scientific conclusion can leak.
 *   - `latestPlan` (DashboardPlanView) is actionable ONLY when
 *     `scientificPlanAvailable === true`; otherwise it is a fail-closed view
 *     with `scientificRequalificationRequired === true` and NO actionable
 *     quantity / cost / validated dosing action.
 *   - `swim` (DashboardSwimView) is the ONLY current public source of bathing
 *     safety (contextual canonical when a fresh plan exists, `unknown`
 *     otherwise).
 */

export type DashboardSwimStatus = 'allowed' | 'avoid' | 'forbidden' | 'unknown'

export interface DashboardSwimView {
  status: DashboardSwimStatus
  reasons: string[]
  /** True when the swim conclusion is NOT backed by a fresh canonical engine. */
  scientificRequalificationRequired: boolean
}

/**
 * Public view of the latest WaterTest. Measurements, dates and provenance only.
 * `actionPlans`, `swimSafety` and `status` are REMOVED server-side.
 */
export interface DashboardLatestTestView {
  id: string
  ph: number
  freeChlorine?: number | null
  totalChlorine?: number | null
  combinedChlorine?: number | null
  alkalinity?: number | null
  calciumHardness?: number | null
  cyanuricAcid?: number | null
  salt?: number | null
  bromine?: number | null
  phosphates?: number | null
  temperature?: number | null
  totalDissolvedSolids?: number | null
  measuredAt?: string | Date | null
  measurementMethod?: string | null
  measurementMetadata?: string | null
  clearWaterIndex?: number | null
  createdAt?: string | Date
  [k: string]: unknown
}

/** Safe metadata attached to the plan view, derived from the LATEST TEST (never
 *  from the historical plan content). */
export interface DashboardPlanMetadata {
  /** id of the last WaterTest actually used for the plan. */
  sourceWaterTestId: string | null
  /** the measurement time of that test (or its creation time when absent). */
  sourceMeasuredAt: string | Date | null
  /** time of the current (possibly ephemeral) generation. */
  generatedAt: string
  /** id of the stored ActionPlan when it belongs exactly to the latest test,
   *  else null. NEVER the identity of a freshPlan. */
  storedActionPlanId: string | null
}

export interface DashboardPlanView extends DashboardPlanMetadata {
  /** True when a scientifically qualified, actionable plan is available. */
  scientificPlanAvailable: boolean
  /** True when the plan must be requalified before it can be actionable. */
  scientificRequalificationRequired: boolean
  /** True when the regenerated plan is ephemeral (no stored identity reused). */
  ephemeral?: boolean
  /** True when the stored plan did not belong to the latest test. */
  associationMismatch?: boolean
  /** Informational: was the stored plan produced by the canonical engine? */
  storedPlanIsCanonical?: boolean
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
  swimSafety?: string
  swimReasons?: string[]
  swimReasonKeys?: string[]
  swimReasonParams?: Record<string, string | number>[]
  lsiLabelKey?: string
  whenToCallProfessionalKey?: string | null
  whenToCallProfessionalParams?: Record<string, string | number> | null | undefined
  contextualSwimSafety?: unknown
  scientificMethodVersion?: string
  dosageMethodVersion?: string
}

export interface DashboardApiResponse {
  profile: unknown
  latestTest: DashboardLatestTestView | null
  latestPlan: DashboardPlanView | null
  clearWaterIndex: number | null
  clarity: { label?: string; color?: string } | null
  swim: DashboardSwimView | null
  testsCount: number
  trend: unknown[]
  diagnosticsCount: number
  latestDiagnostic: unknown
  equipmentCount: number
  productsCount: number
  chatCount: number
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

/** True when the plan is actionable: a qualified plan with a finite retest. */
export function isActionableDashboardPlan(plan: DashboardPlanView | null): plan is DashboardPlanView & { scientificPlanAvailable: true } {
  return Boolean(plan && plan.scientificPlanAvailable === true)
}
