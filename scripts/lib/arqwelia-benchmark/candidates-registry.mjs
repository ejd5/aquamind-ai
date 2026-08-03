/**
 * ARQWELIA Lot 2 — benchmark candidate registry (runtime, plain ESM).
 *
 * This file is the SINGLE source of truth for the candidate registry and the
 * tiny runtime helpers that the CLI and the typed modules share.
 *
 * Why a `.mjs` registry? The CLI (`scripts/benchmark-arqwelia-smoke.mjs`) must
 * run under a plain `node` runtime (Node 20 in this repo does NOT support
 * native TypeScript type-stripping), while the typed modules
 * `provider.ts` / `candidates.ts` are consumed by Vitest and the tools
 * typechecker. Keeping the registry + helpers here lets both consumers read
 * exactly the same runtime objects without duplicating logic.
 *
 * DRY-RUN SAFETY: nothing in this file performs a real provider network call.
 * `runSmoke` for real providers calls `ensureNoRealCall()` first and then
 * throws "NOT IMPLEMENTED — awaiting Gate" so no paid call can ever occur.
 */

import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import sharp from 'sharp'

// ---------------------------------------------------------------------------
// Env-gated authorization (module-level, evaluated once at import time).
// ---------------------------------------------------------------------------

export const ARQWELIA_BENCHMARK_AUTHORIZED = process.env.ARQWELIA_BENCHMARK_AUTHORIZED === 'true'
export const ARQWELIA_BENCHMARK_MAX_BUDGET_EUR = Number(process.env.ARQWELIA_BENCHMARK_MAX_BUDGET_EUR || 0)

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

const SECRET_ENV_NAME_RE = /(KEY|TOKEN|SECRET)/i
const SECRET_VALUE_RE = /(nvapi-[A-Za-z0-9_\-]+|sk(-live)?-[A-Za-z0-9_\-]+|whsec_[A-Za-z0-9_\-]+|rc_wh_[A-Za-z0-9_\-]+)/g

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

// ---------------------------------------------------------------------------
// Mock smoke — writes a tiny placeholder PNG. No external call, no cost.
// ---------------------------------------------------------------------------

function sanitizeSegment(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'x'
}

/**
 * @param {{ providerId: string, model: string, outDir: string }} opts
 */
export async function mockRunSmoke(opts) {
  const started = Date.now()
  await mkdir(opts.outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputPath = join(
    opts.outDir,
    `${sanitizeSegment(opts.providerId)}-${sanitizeSegment(opts.model)}-${stamp}.png`,
  )
  const png = await sharp({
    create: { width: 128, height: 128, channels: 3, background: { r: 96, g: 165, b: 250 } },
  })
    .png()
    .toBuffer()
  await writeFile(outputPath, png)
  return {
    providerId: opts.providerId,
    model: opts.model,
    ok: true,
    externalCalls: 0,
    actualCostEur: 0,
    billingStatus: 'not_called',
    officialPricingSource: null,
    durationMs: Date.now() - started,
    outputWidth: 128,
    outputHeight: 128,
    outputPath,
  }
}

// ---------------------------------------------------------------------------
// Candidates (declarative only — see candidates.ts for the typed view).
// ---------------------------------------------------------------------------

const nvidiaNimCandidate = {
  id: 'nvidia-nim',
  model: 'tbd',
  supportsImageEditing: false,
  dryRunSafe: false,
  dryRunDescription:
    'NVIDIA NIM candidate — image generation NOT verified; src/lib/ai/nvidia.ts only does vision-to-text and chat. Requires NVIDIA credential.',
  validateConfiguration() {
    if (process.env.NVIDIA_API_KEY) return { ok: true }
    return { ok: false, reason: 'NVIDIA credential not configured' }
  },
  estimateOfficialCost() {
    return { known: false, note: 'UNKNOWN — TO BE MEASURED IN LOT 0' }
  },
  async runSmoke(opts) {
    ensureNoRealCall(opts)
    throw new ArqweliaProviderError('NOT IMPLEMENTED — awaiting Gate: NVIDIA image-generation adapter', {
      externalCalls: 0,
      actualCostEur: 0,
      billingStatus: 'not_called',
    })
  },
}

const zaiGlimCandidate = {
  id: 'zai-glm',
  model: 'tbd',
  supportsImageEditing: true,
  dryRunSafe: false,
  dryRunDescription:
    'Z.ai GLM candidate — image-to-image edit via z-ai-web-dev-sdk images.generations.edit (returns base64); requires a .z-ai-config file.',
  validateConfiguration() {
    if (
      existsSync(join(process.cwd(), '.z-ai-config')) ||
      existsSync(join(homedir(), '.z-ai-config')) ||
      process.env.Z_AI_API_KEY
    ) {
      return { ok: true }
    }
    return { ok: false, reason: 'Z.ai credential not configured (no .z-ai-config file)' }
  },
  estimateOfficialCost() {
    return { known: false, note: 'UNKNOWN — TO BE MEASURED IN LOT 0' }
  },
  async runSmoke(opts) {
    ensureNoRealCall(opts)
    throw new ArqweliaProviderError('NOT IMPLEMENTED — awaiting Gate: z-ai-web-dev-sdk image-edit adapter', {
      externalCalls: 0,
      actualCostEur: 0,
      billingStatus: 'not_called',
    })
  },
}

const openaiGptImageCandidate = {
  id: 'openai-gpt-image',
  model: 'gpt-image-1',
  supportsImageEditing: true,
  dryRunSafe: false,
  dryRunDescription:
    'OpenAI GPT Image candidate — image edit placeholder; requires OpenAI credential.',
  validateConfiguration() {
    if (process.env.OPENAI_API_KEY) return { ok: true }
    return { ok: false, reason: 'OpenAI credential not configured' }
  },
  estimateOfficialCost() {
    return { known: false, note: 'UNKNOWN — TO BE MEASURED IN LOT 0' }
  },
  async runSmoke(opts) {
    ensureNoRealCall(opts)
    throw new ArqweliaProviderError('NOT IMPLEMENTED — awaiting Gate: OpenAI gpt-image adapter', {
      externalCalls: 0,
      actualCostEur: 0,
      billingStatus: 'not_called',
    })
  },
}

const mockCandidate = {
  id: 'mock',
  model: 'mock-image-v1',
  supportsImageEditing: true,
  dryRunSafe: true,
  dryRunDescription:
    'Local mock candidate — writes a placeholder PNG. No external call, no cost.',
  validateConfiguration() {
    return { ok: true }
  },
  estimateOfficialCost() {
    return { known: false, note: 'UNKNOWN — TO BE MEASURED IN LOT 0' }
  },
  runSmoke(opts) {
    return mockRunSmoke(opts)
  },
}

export const arqweliaBenchmarkCandidates = [
  nvidiaNimCandidate,
  zaiGlimCandidate,
  openaiGptImageCandidate,
  mockCandidate,
]

/**
 * @param {string} id
 */
export function getArqweliaBenchmarkCandidate(id) {
  return arqweliaBenchmarkCandidates.find((candidate) => candidate.id === id)
}

/**
 * Registers an additional candidate at runtime. Used by the CLI to load a
 * test-only candidate from `ARQWELIA_BENCHMARK_EXTRA_CANDIDATE_MODULE` (see
 * the CLI). Registered candidates share the same registry as built-ins.
 *
 * @param {object} candidate
 */
export function registerArqweliaBenchmarkCandidate(candidate) {
  if (!candidate || typeof candidate.id !== 'string' || !candidate.id) {
    throw new Error('Cannot register a benchmark candidate without an id')
  }
  if (getArqweliaBenchmarkCandidate(candidate.id)) {
    throw new Error(`Duplicate benchmark candidate id: ${candidate.id}`)
  }
  arqweliaBenchmarkCandidates.push(candidate)
  return candidate
}
