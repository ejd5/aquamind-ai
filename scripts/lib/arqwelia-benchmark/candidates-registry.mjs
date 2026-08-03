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
    throw new Error('NOT IMPLEMENTED — awaiting Gate: NVIDIA image-generation adapter')
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
    throw new Error('NOT IMPLEMENTED — awaiting Gate: z-ai-web-dev-sdk image-edit adapter')
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
    throw new Error('NOT IMPLEMENTED — awaiting Gate: OpenAI gpt-image adapter')
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
