/**
 * ARQWELIA Lot 2 — benchmark-only provider interface.
 *
 * This module defines the contract that every AI provider candidate must
 * satisfy inside the benchmark HARNESS. It is deliberately isolated from the
 * future production tunnel and from the app routes.
 *
 * DRY-RUN SAFETY: the runtime helpers (`ensureNoRealCall`, the env constants,
 * `redactSecrets`) are the shared runtime from `candidates-registry.mjs` — a
 * plain ESM module so the plain-`node` CLI can consume the exact same objects
 * (Node 20 in this repo cannot import TypeScript directly).
 *
 * No candidate adapter in this harness performs a real provider network call.
 */

import {
  ARQWELIA_BENCHMARK_AUTHORIZED as _AUTHORIZED,
  ARQWELIA_BENCHMARK_MAX_BUDGET_EUR as _BUDGET,
  ensureNoRealCall as _ensureNoRealCall,
  redactSecrets as _redactSecrets,
  redactedEnvSummary as _redactedEnvSummary,
  billingSnapshot as _billingSnapshot,
  billingSummaryLines as _billingSummaryLines,
} from './candidates-registry.mjs'

export interface SmokeOptions {
  providerId: string
  model: string
  /** Absolute or relative path to the (normalized) source photo. Optional. */
  imagePath?: string
  /** Prompt of Concept A for the edit request. Optional. */
  promptConceptA?: string
  /** Directory where artifacts (PNG, JSON, Markdown) are written. */
  outDir: string
  budgetMaxEur: number
  realCallAuthorized: boolean
}

export interface SmokeResult {
  providerId: string
  model: string
  ok: boolean
  /** Number of external provider calls actually made. 0 for dry run / not implemented. */
  externalCalls: number
  /**
   * Proven cost in EUR, or `null` when the cost of a real call was NOT proven
   * (billingStatus 'unknown'). Never `0` after a real call whose cost is unproven.
   */
  actualCostEur: number | null
  billingStatus: 'not_called' | 'measured' | 'unknown'
  /** Public pricing doc used for a measured cost, or null when unknown/not called. */
  officialPricingSource: string | null
  durationMs: number
  outputWidth?: number
  outputHeight?: number
  outputPath?: string
  error?: string
}

export interface ArqweliaBenchmarkProvider {
  id: string
  model: string
  supportsImageEditing: boolean
  /** True when `runSmoke` can be executed safely during a dry run (no real call). */
  dryRunSafe?: boolean
  dryRunDescription: string
  validateConfiguration(): { ok: boolean; reason?: string }
  estimateOfficialCost(): { known: boolean; costPerImageEur?: number; note?: string }
  runSmoke?(opts: SmokeOptions): Promise<SmokeResult>
}

export type RealCallGuard = Pick<SmokeOptions, 'realCallAuthorized' | 'budgetMaxEur'>

// ---------------------------------------------------------------------------
// Runtime helpers (single source of truth lives in candidates-registry.mjs).
// ---------------------------------------------------------------------------

/** `true` only when ARQWELIA_BENCHMARK_AUTHORIZED === 'true'. */
export const ARQWELIA_BENCHMARK_AUTHORIZED: boolean = _AUTHORIZED

/** `Number(ARQWELIA_BENCHMARK_MAX_BUDGET_EUR || 0)`. */
export const ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: number = _BUDGET

/**
 * Throws if a real provider call is not allowed:
 * - `realCallAuthorized` is false, or
 * - `budgetMaxEur` is missing / <= 0.
 *
 * Use this as the first statement of every real-provider `runSmoke` adapter.
 */
export const ensureNoRealCall: (opts: RealCallGuard) => void = _ensureNoRealCall

/** Redacts credential-shaped values so they can never reach stdout or reports. */
export const redactSecrets: (text: string) => string = _redactSecrets

/** Redacted per-var summary of an env object (secret-named vars are counted only). */
export const redactedEnvSummary: (env?: Record<string, string | undefined>) => string[] = _redactedEnvSummary

export interface BillingSnapshot {
  billingStatus: 'not_called' | 'measured' | 'unknown'
  externalCalls: number
  paidCostEur: number | null
  officialPricingSource: string | null
}

export type BillingInput = Pick<
  SmokeResult,
  'billingStatus' | 'actualCostEur' | 'externalCalls' | 'officialPricingSource'
>

/**
 * Single source of truth for billing output: the console line, the JSON report
 * and the Markdown report are all derived from `billingSnapshot`.
 * - 'not_called' → paidCostEur = 0 (dry run / not implemented).
 * - 'measured'   → paidCostEur = actualCostEur.
 * - 'unknown'    → paidCostEur = null (a real call's cost is not proven; never 0).
 */
export const billingSnapshot: (result: BillingInput) => BillingSnapshot = _billingSnapshot as (
  result: BillingInput,
) => BillingSnapshot

/** Console billing lines rendered from a SmokeResult's billing fields. */
export const billingSummaryLines: (result: BillingInput) => string[] = _billingSummaryLines as (
  result: BillingInput,
) => string[]
