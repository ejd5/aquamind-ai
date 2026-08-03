/**
 * ARQWELIA Lot 2 — benchmark-only provider interface.
 *
 * This module defines the contract that every AI provider candidate must
 * satisfy inside the benchmark HARNESS. It is deliberately isolated from the
 * future production tunnel and from the app routes.
 *
 * DRY-RUN SAFETY: the runtime helpers (`ensureNoRealCall`, the env constants,
 * `redactSecrets`) are the shared runtime from `provider-runtime.mjs` — a
 * plain ESM module so the plain-`node` CLI can consume the exact same objects
 * (Node 20 in this repo cannot import TypeScript directly). provider.ts
 * re-exports from `provider-runtime.mjs` (NEVER from the candidate registry),
 * which breaks the `registry → adapter → registry` circular import.
 *
 * No candidate adapter in this harness performs a real provider network call.
 */

import {
  ARQWELIA_BENCHMARK_AUTHORIZED as _AUTHORIZED,
  ARQWELIA_BENCHMARK_MAX_BUDGET_EUR as _BUDGET,
  ARQWELIA_BENCHMARK_PHASE0A_EXECUTE as _PHASE0A_EXECUTE,
  ArqweliaProviderError as _ArqweliaProviderError,
  billingFromCaughtError as _billingFromCaughtError,
  computeExecuteGate as _computeExecuteGate,
  computeGate as _computeGate,
  ensureNoRealCall as _ensureNoRealCall,
  ensurePhase0AGate as _ensurePhase0AGate,
  redactSecrets as _redactSecrets,
  redactedEnvSummary as _redactedEnvSummary,
  billingSnapshot as _billingSnapshot,
  billingSummaryLines as _billingSummaryLines,
} from './provider-runtime.mjs'

/**
 * The provider adapter receives ONLY the normalized image (or a normalized
 * data URL), never the raw source buffer and never the user-supplied path.
 * The raw source is normalized first (via `normalizeImageForAi`) and only the
 * EXIF-free normalized fields are handed to `runSmoke`.
 */
export interface SmokeOptions {
  providerId: string
  model: string
  /** EXIF-free normalized image buffer (canonical `normalizeImageForAi` output). */
  normalizedImageBuffer?: Buffer
  /** EXIF-free normalized image as a `data:image/jpeg;base64,…` URL. */
  normalizedImageDataUrl?: string
  /** MIME type of the normalized image (`image/jpeg`). */
  normalizedMimeType?: string
  /** SHA-256 of the normalized image buffer. */
  normalizedSha256?: string
  /** Width of the normalized image. */
  normalizedWidth?: number
  /** Height of the normalized image. */
  normalizedHeight?: number
  /** Prompt version identifier (e.g. `arqwelia-lot2-v1`). */
  promptVersion?: string
  /** Sanitized prompt text needed for the call — no free-form user path. */
  sanitizedPrompt?: string
  /** Concept id (`A` | `B`) used to build the versioned prompt. */
  concept?: 'A' | 'B'
  /** PII-free versioned prompt produced by `buildArqweliaPrompt` (real adapters). */
  builtPrompt?: string
  /** SHA-256 of the built prompt (report only, never the raw prompt). */
  promptSha256?: string
  /** Optional output size token (e.g. `1024x1024`) — closed provider list. */
  size?: string
  /** Optional quality token (e.g. `medium`) — closed provider list. */
  quality?: string
  /** Optional output format token (e.g. `png`) — closed provider list. */
  outputFormat?: string
  /** Third gate flag: `ARQWELIA_BENCHMARK_PHASE0A_EXECUTE === 'true'`. */
  phase0aExecute?: boolean
  /** Injectable transport used ONLY by tests — the CLI never injects one. */
  transport?: (request: unknown) => Promise<unknown>
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

export type CandidateState =
  | 'ready_for_authorized_smoke'
  | 'blocked_missing_capability'
  | 'blocked_missing_configuration'

export interface ArqweliaBenchmarkProvider {
  id: string
  model: string
  supportsImageEditing: boolean
  /** Documented candidate status (see docs/release/ARQWELIA_LOT2_BENCHMARK.md). */
  state?: CandidateState
  /** True when `runSmoke` can be executed safely during a dry run (no real call). */
  dryRunSafe?: boolean
  dryRunDescription: string
  validateConfiguration(): { ok: boolean; reason?: string }
  estimateOfficialCost(): {
    known: boolean
    costPerImageEur?: number | null
    officialPricingSource?: string
    note?: string
  }
  runSmoke?(opts: SmokeOptions): Promise<SmokeResult>
}

export type RealCallGuard = Pick<SmokeOptions, 'realCallAuthorized' | 'budgetMaxEur'>

// ---------------------------------------------------------------------------
// Runtime helpers (single source of truth lives in provider-runtime.mjs).
// ---------------------------------------------------------------------------

/** `true` only when ARQWELIA_BENCHMARK_AUTHORIZED === 'true'. */
export const ARQWELIA_BENCHMARK_AUTHORIZED: boolean = _AUTHORIZED

/** `Number(ARQWELIA_BENCHMARK_MAX_BUDGET_EUR || 0)`. */
export const ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: number = _BUDGET

/** `true` only when ARQWELIA_BENCHMARK_PHASE0A_EXECUTE === 'true'. */
export const ARQWELIA_BENCHMARK_PHASE0A_EXECUTE: boolean = _PHASE0A_EXECUTE

export interface GateComputation {
  envAuthorized: boolean
  envBudget: number
  envGateOpen: boolean
  effectiveBudget: number
  realCallAuthorized: boolean
}

export interface ComputeGateInput {
  cliBudget?: number | null
  envAuthorized?: boolean
  envBudgetRaw?: string | undefined
}

/**
 * Budget gate — see `computeGate` in `provider-runtime.mjs` for the exact
 * rules. The ONLY source of a usable budget is the environment; `--budget` may
 * only reduce it (an above-ceiling `--budget` is rejected separately by the
 * CLI). Returns `realCallAuthorized=false` whenever the env gate is closed,
 * regardless of any `--budget` value.
 */
export const computeGate: (input?: ComputeGateInput) => GateComputation = _computeGate

export interface ExecuteGateComputation {
  executeAuthorized: boolean
  dryRun: boolean
}

export interface ExecuteGateInput {
  realCallAuthorized?: boolean
  phase0aExecute?: boolean
}

/**
 * Phase 0A execution gate (third lock): `executeAuthorized` is true ONLY when
 * `realCallAuthorized === true && phase0aExecute === true`; all 7 other
 * combinations of (authorized × budget>0 × phase0aExecute) are dry-run.
 */
export const computeExecuteGate: (input?: ExecuteGateInput) => ExecuteGateComputation = _computeExecuteGate

export interface ProviderBillingInfo {
  externalCalls: number
  actualCostEur: number | null
  billingStatus: 'not_called' | 'measured' | 'unknown'
  officialPricingSource: string | null
}

export interface ArqweliaProviderErrorCtor {
  new (message: string, billing?: Partial<ProviderBillingInfo>): Error & {
    name: string
    billing: ProviderBillingInfo
  }
}

/**
 * Provider error that transports billing info so a caught error is never
 * auto-converted into externalCalls=0 / actualCostEur=0 / not_called.
 */
export const ArqweliaProviderError: ArqweliaProviderErrorCtor = _ArqweliaProviderError as unknown as ArqweliaProviderErrorCtor

/**
 * Resolves the billing carried by a caught error. `ArqweliaProviderError` uses
 * its carried billing; any other error gets the CONSERVATIVE default
 * (externalCalls=1, actualCostEur=null, billingStatus='unknown') because the
 * system cannot prove no call was made.
 */
export const billingFromCaughtError: (error: unknown) => ProviderBillingInfo = _billingFromCaughtError as unknown as (
  error: unknown,
) => ProviderBillingInfo

/**
 * Throws if a real provider call is not allowed:
 * - `realCallAuthorized` is false, or
 * - `budgetMaxEur` is missing / <= 0.
 *
 * Use this as the first statement of every real-provider `runSmoke` adapter.
 */
export const ensureNoRealCall: (opts: RealCallGuard) => void = _ensureNoRealCall

export interface Phase0AGateGuard extends RealCallGuard {
  phase0aExecute?: boolean
}

/**
 * THREE-GATE BLOCK: throws unless ALL of authorization (`realCallAuthorized`),
 * budget (`budgetMaxEur > 0`) and Phase 0A execution intent
 * (`phase0aExecute === true`) are present. Use this as the first statement of
 * every real-provider `runSmoke` adapter, before `ensureNoRealCall`.
 */
export const ensurePhase0AGate: (opts: Phase0AGateGuard) => void = _ensurePhase0AGate

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
