/**
 * ARQWELIA Lot 2 — benchmark candidate registry (runtime, plain ESM).
 *
 * This file is the SINGLE source of truth for the executable candidate registry
 * and the candidates the CLI can run. The tiny runtime helpers shared with the
 * adapters live in `provider-runtime.mjs` (see below) so there is NO
 * `registry → adapter → registry` circular import: the adapters import
 * `provider-runtime.mjs`, never this file.
 *
 * Why a `.mjs` registry? The CLI (`scripts/benchmark-arqwelia-smoke.mjs`) must
 * run under a plain `node` runtime (Node 20 in this repo does NOT support
 * native TypeScript type-stripping), while the typed modules
 * `provider.ts` / `candidates.ts` are consumed by Vitest and the tools
 * typechecker. Keeping the registry + helpers here lets both consumers read
 * exactly the same runtime objects without duplicating logic.
 *
 * Z.AI is BLOCKED for Phase 0A: official Z.AI docs only document
 * `POST /api/paas/v4/images/generations` with `{model, prompt, quality, size,
 * user_id}` and a response `data[0].url` (NOT base64); no photo-input
 * image-edit contract is verified. `zai-glm` is therefore NOT in the executable
 * list — it is a DOCUMENTARY entry only (no `runSmoke`).
 *
 * DRY-RUN SAFETY: nothing in this file performs a real provider network call.
 * `runSmoke` for real providers calls `ensureNoRealCall()` / the gate guards
 * first and then throws "NOT IMPLEMENTED — awaiting Gate" so no paid call can
 * ever occur.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { ArqweliaProviderError, ensureNoRealCall } from './provider-runtime.mjs'
import { zaiImageAdapter } from './adapters/zai-image-adapter.mjs'
import { openaiImageAdapter } from './adapters/openai-image-adapter.mjs'

// Re-export the shared runtime helpers so the CLI keeps a single import path
// (`candidates-registry.mjs`) while the ADAPTERS import `provider-runtime.mjs`.
export {
  ARQWELIA_BENCHMARK_AUTHORIZED,
  ARQWELIA_BENCHMARK_MAX_BUDGET_EUR,
  ARQWELIA_BENCHMARK_PHASE0A_EXECUTE,
  ArqweliaProviderError,
  billingFromCaughtError,
  billingSnapshot,
  billingSummaryLines,
  computeExecuteGate,
  computeGate,
  ensureNoRealCall,
  ensurePhase0AGate,
  redactSecrets,
  redactedEnvSummary,
} from './provider-runtime.mjs'

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
  state: 'blocked_missing_capability',
  dryRunDescription:
    'NVIDIA NIM candidate — state blocked_missing_capability: no image-edit endpoint is verified in this repo (src/lib/ai/nvidia.ts only does vision-to-text and chat). Requires NVIDIA credential.',
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

const mockCandidate = {
  id: 'mock',
  model: 'mock-image-v1',
  supportsImageEditing: true,
  dryRunSafe: true,
  state: 'ready_for_authorized_smoke',
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

/**
 * EXECUTABLE candidates — the only candidates the CLI can run.
 * `zai-glm` is deliberately ABSENT: Z.AI is blocked for Phase 0A (documentary
 * only, no runnable transport — see `arqweliaBenchmarkDocumentaryCandidates`).
 */
export const arqweliaBenchmarkCandidates = [
  nvidiaNimCandidate,
  openaiImageAdapter,
  mockCandidate,
]

/**
 * DOCUMENTARY candidates — blocked/deprecated entries kept for the record but
 * NEVER runnable. `zai-glm` lives here: "SDK method detected but no current
 * official API/model contract proving photo-to-photo editing."
 */
export const arqweliaBenchmarkDocumentaryCandidates = [
  zaiImageAdapter,
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
