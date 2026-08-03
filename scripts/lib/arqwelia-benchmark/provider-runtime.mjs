/**
 * ARQWELIA Lot 2 — shared runtime helpers for the benchmark harness (plain ESM).
 *
 * This module is the SINGLE source of truth for every runtime helper shared by
 * the candidate registry and the provider adapters:
 *   - the common authorization constants (the three env locks),
 *   - `computeGate` / `computeExecuteGate`,
 *   - the two real-call guards (`ensureNoRealCall`, `ensurePhase0AGate`),
 *   - `ArqweliaProviderError` + the reliable billing derivation,
 *   - secret redaction helpers.
 *
 * Why a dedicated `.mjs`? The CLI (`scripts/benchmark-arqwelia-smoke.mjs`) runs
 * under a plain-`node`-compatible runtime and cannot import TypeScript, while
 * `provider.ts` / `candidates.ts` are consumed by Vitest and the tools
 * typechecker. Keeping the runtime helpers here (with NO imports from the
 * registry or the adapters) breaks the previous
 * `registry → adapter → registry` circular import: the registry imports this
 * module, the adapters import this module, and adapters NEVER import the
 * registry.
 *
 * DRY-RUN SAFETY: nothing in this module performs a real provider network call.
 */

// ---------------------------------------------------------------------------
// Env-gated authorization (module-level, evaluated once at import time).
// ---------------------------------------------------------------------------

export const ARQWELIA_BENCHMARK_AUTHORIZED = process.env.ARQWELIA_BENCHMARK_AUTHORIZED === 'true'
export const ARQWELIA_BENCHMARK_MAX_BUDGET_EUR = Number(process.env.ARQWELIA_BENCHMARK_MAX_BUDGET_EUR || 0)
export const ARQWELIA_BENCHMARK_PHASE0A_EXECUTE = process.env.ARQWELIA_BENCHMARK_PHASE0A_EXECUTE === 'true'

/**
 * Budget gate — the SINGLE source of truth for deciding whether a real call may
 * happen. The ONLY source of a usable budget is the environment; the CLI can
 * never create one.
 *
 * Rules (exact):
 *   envAuthorized   = ARQWELIA_BENCHMARK_AUTHORIZED === true
 *   envBudget       = a finite strictly-positive number supplied ONLY by the
 *                     environment (absent/invalid/NaN/<=0 => envBudget = 0)
 *   envGateOpen     = envAuthorized && envBudget > 0
 *   effectiveBudget = --budget absent => envBudget;
 *                     --budget present => min(cliBudget, envBudget)
 *   realCallAuthorized = envGateOpen && effectiveBudget > 0
 *
 * @param {{ cliBudget?: number|null, envAuthorized?: boolean, envBudgetRaw?: string|undefined }} [input]
 * @returns {{ envAuthorized: boolean, envBudget: number, envGateOpen: boolean, effectiveBudget: number, realCallAuthorized: boolean }}
 */
export function computeGate({
  cliBudget = null,
  envAuthorized = ARQWELIA_BENCHMARK_AUTHORIZED,
  envBudgetRaw = process.env.ARQWELIA_BENCHMARK_MAX_BUDGET_EUR,
} = {}) {
  const parsed = envBudgetRaw == null || envBudgetRaw === '' ? 0 : Number(envBudgetRaw)
  const envBudget = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  const envGateOpen = envAuthorized === true && envBudget > 0
  const effectiveBudget = cliBudget != null ? Math.min(cliBudget, envBudget) : envBudget
  const realCallAuthorized = envGateOpen && effectiveBudget > 0
  return {
    envAuthorized: envAuthorized === true,
    envBudget,
    envGateOpen,
    effectiveBudget,
    realCallAuthorized,
  }
}

/**
 * Phase 0A execution gate — the third lock. A real provider transport may only
 * be initialized (and `runSmoke` may only be invoked) when BOTH the real-call
 * authorization AND the explicit Phase 0A execution intent are present:
 *
 *   executeAuthorized = realCallAuthorized === true && phase0aExecute === true
 *   dryRun            = !executeAuthorized
 *
 * 8-combination gate matrix (authorized × budget>0 × phase0aExecute) — ONLY
 * (true, true, true) may technically allow a transport; all other 7
 * combinations are refused / dry-run:
 *
 *   authorized | budget>0 | phase0aExecute | executeAuthorized | dryRun
 *   -----------|---------|----------------|------------------|-------
 *   false      | false   | false          | false            | true
 *   false      | false   | true           | false            | true
 *   false      | true    | false          | false            | true
 *   false      | true    | true           | false            | true
 *   true       | false   | false          | false            | true
 *   true       | false   | true           | false            | true
 *   true       | true    | false          | false            | true
 *   true       | true    | true           | true             | false
 *
 * @param {{ realCallAuthorized?: boolean, phase0aExecute?: boolean }} [input]
 * @returns {{ executeAuthorized: boolean, dryRun: boolean }}
 */
export function computeExecuteGate({ realCallAuthorized = false, phase0aExecute = false } = {}) {
  const executeAuthorized = realCallAuthorized === true && phase0aExecute === true
  return { executeAuthorized, dryRun: !executeAuthorized }
}

const SECRET_ENV_NAME_RE = /(KEY|TOKEN|SECRET)/i
const SECRET_VALUE_RE = /(nvapi-[A-Za-z0-9_\-]+|sk(-live)?-[A-Za-z0-9_\-]+|whsec_[A-Za-z0-9_\-]+|rc_wh_[A-Za-z0-9_\-]+)/g

/**
 * Phase 0A three-gate guard — the REAL transport is blocked unless ALL THREE
 * independent gates are open:
 *   1. ARQWELIA_BENCHMARK_AUTHORIZED === 'true'
 *   2. ARQWELIA_BENCHMARK_MAX_BUDGET_EUR > 0
 *   3. ARQWELIA_BENCHMARK_PHASE0A_EXECUTE === 'true'
 *
 * Even with all three set, TESTS always mock the transport — this helper only
 * proves the operator intent, it does not itself make a network call.
 *
 * @param {{ realCallAuthorized?: boolean, budgetMaxEur?: number, phase0aExecute?: boolean }} opts
 */
export function ensurePhase0AGate(opts = {}) {
  if (opts.realCallAuthorized !== true) {
    throw new ArqweliaProviderError(
      'Refusing real provider call: authorization not granted (ARQWELIA_BENCHMARK_AUTHORIZED must be "true")',
      { externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called' },
    )
  }
  if (!(Number(opts.budgetMaxEur) > 0)) {
    throw new ArqweliaProviderError(
      'Refusing real provider call: no budget allocated (ARQWELIA_BENCHMARK_MAX_BUDGET_EUR must be > 0)',
      { externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called' },
    )
  }
  if (opts.phase0aExecute !== true) {
    throw new ArqweliaProviderError(
      'NOT IMPLEMENTED — awaiting Phase 0A execution (ARQWELIA_BENCHMARK_PHASE0A_EXECUTE must be "true")',
      { externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called' },
    )
  }
}

/**
 * Guard used by real-provider smoke adapters. Throws when a real call is not
 * allowed (no authorization flag and/or no budget). Mock never calls this.
 *
 * @param {{ realCallAuthorized?: boolean, budgetMaxEur?: number }} opts
 */
export function ensureNoRealCall(opts = {}) {
  if (opts.realCallAuthorized !== true) {
    throw new Error(
      'Refusing real provider call: authorization not granted (ARQWELIA_BENCHMARK_AUTHORIZED must be "true")',
    )
  }
  if (!(Number(opts.budgetMaxEur) > 0)) {
    throw new Error(
      'Refusing real provider call: no budget allocated (ARQWELIA_BENCHMARK_MAX_BUDGET_EUR must be > 0)',
    )
  }
}

/**
 * Redacts anything that looks like a credential (env values whose name matches
 * /KEY|TOKEN|SECRET/i plus well-known credential value shapes) so it can never
 * be printed or written to a report.
 *
 * @param {string} text
 * @returns {string}
 */
export function redactSecrets(text) {
  if (text == null) return text
  let out = String(text)
  for (const [name, value] of Object.entries(process.env)) {
    if (value == null || value === '' || value.length < 4) continue
    if (SECRET_ENV_NAME_RE.test(name)) {
      out = out.split(value).join('[REDACTED]')
    }
  }
  return out.replace(SECRET_VALUE_RE, '[REDACTED]')
}

/**
 * Human-readable, redacted view of a set of env vars. Secret-named entries are
 * omitted (only counted) so no KEY/TOKEN/SECRET substring ever appears.
 *
 * @param {Record<string, string|undefined>} [env]
 * @returns {string[]}
 */
export function redactedEnvSummary(env = process.env) {
  let redacted = 0
  const lines = []
  for (const [name, value] of Object.entries(env)) {
    if (value == null || value === '') continue
    if (SECRET_ENV_NAME_RE.test(name)) {
      redacted += 1
      continue
    }
    lines.push(`${name}=${redactSecrets(value)}`)
  }
  lines.push(`[redacted ${redacted} vars]`)
  return lines
}

// ---------------------------------------------------------------------------
// Reliable billing derivation (single source of truth for the CLI output,
// JSON report and Markdown report — all three are rendered from these).
// ---------------------------------------------------------------------------

/**
 * Provider error that transports billing information. Adapters use it to say
 * what actually happened before/after they failed, so a caught error is never
 * auto-converted into externalCalls=0 / actualCostEur=0 / not_called.
 *
 * Billing rules carried on `billing`:
 *   - error before any proven external call: externalCalls=0, actualCostEur=0,
 *     billingStatus='not_called'
 *   - error after an external call started: externalCalls>=1, actualCostEur=null
 *     if unknown, billingStatus='unknown'
 *   - officially measured cost: billingStatus='measured' + the real value
 */
export class ArqweliaProviderError extends Error {
  constructor(message, billing = {}) {
    super(message)
    this.name = 'ArqweliaProviderError'
    this.billing = {
      externalCalls: 0,
      actualCostEur: 0,
      billingStatus: 'not_called',
      officialPricingSource: null,
      ...billing,
    }
  }
}

/**
 * Resolves the billing carried by a caught error. An `ArqweliaProviderError`
 * uses its carried billing; ANY other error inside a real-adapter block gets
 * the CONSERVATIVE default (externalCalls=1, actualCostEur=null,
 * billingStatus='unknown') because the system cannot prove no call was made.
 *
 * @param {unknown} error
 * @returns {{ externalCalls: number, actualCostEur: number|null, billingStatus: string, officialPricingSource: string|null }}
 */
export function billingFromCaughtError(error) {
  if (error instanceof ArqweliaProviderError) {
    return {
      externalCalls: error.billing.externalCalls,
      actualCostEur: error.billing.actualCostEur,
      billingStatus: error.billing.billingStatus,
      officialPricingSource: error.billing.officialPricingSource,
    }
  }
  return {
    externalCalls: 1,
    actualCostEur: null,
    billingStatus: 'unknown',
    officialPricingSource: null,
  }
}

/**
 * Derives the billing snapshot from a SmokeResult.
 *
 * Billing rules:
 *   - billingStatus 'not_called' → paidCostEur = 0 (dry run / not implemented:
 *     nothing was ever billed).
 *   - billingStatus 'measured'   → paidCostEur = actualCostEur (proven cost).
 *   - billingStatus 'unknown'    → paidCostEur = null. A real call happened but
 *     the cost was NOT proven — never claim PAID_COST=0 after a real call.
 *
 * @param {{ billingStatus?: string, actualCostEur?: number|null, externalCalls?: number, officialPricingSource?: string|null }} [result]
 * @returns {{ billingStatus: string, externalCalls: number, paidCostEur: number|null, officialPricingSource: string|null }}
 */
export function billingSnapshot(result = {}) {
  const billingStatus = result.billingStatus ?? 'not_called'
  const externalCalls = Number(result.externalCalls ?? 0)
  let paidCostEur = null
  if (billingStatus === 'not_called') {
    paidCostEur = 0
  } else if (billingStatus === 'measured') {
    paidCostEur = Number(result.actualCostEur ?? 0)
  }
  return {
    billingStatus,
    externalCalls,
    paidCostEur,
    officialPricingSource: result.officialPricingSource ?? null,
  }
}

/**
 * Console lines rendered from a SmokeResult's billing fields. PAID_COST is
 * `UNKNOWN` (never `0`) when a real call's cost is not proven.
 *
 * @param {{ billingStatus?: string, actualCostEur?: number|null, externalCalls?: number, officialPricingSource?: string|null }} [result]
 * @returns {string[]}
 */
export function billingSummaryLines(result = {}) {
  const snap = billingSnapshot(result)
  const paid = snap.paidCostEur === null ? 'UNKNOWN' : String(snap.paidCostEur)
  return [
    `external_calls=${snap.externalCalls}`,
    `billing_status=${snap.billingStatus}`,
    `paid_eur=${paid}`,
    `REAL_PROVIDER_CALLS=${snap.externalCalls}, PAID_COST=${paid}`,
  ]
}
