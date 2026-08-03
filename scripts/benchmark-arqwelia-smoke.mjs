#!/usr/bin/env bun
/**
 * ARQWELIA Lot 2 — benchmark smoke CLI (dry-run safe).
 *
 * Requires Bun (the repo already runs on Bun): the CLI imports the canonical
 * `normalizeImageForAi` from `src/lib/images/secure-image.ts` (TypeScript),
 * which a plain Node 20 runtime cannot load. Run it as:
 *
 *   bun scripts/benchmark-arqwelia-smoke.mjs --provider mock --out ./benchmark-out
 *
 * Usage:
 *   bun scripts/benchmark-arqwelia-smoke.mjs --provider mock --model test \
 *     --image <path> --promptA "..." --out <dir> [--budget 5]
 *
 * Authorization is ENV-ONLY. The CLI can never authorize a real call and can
 * never raise the budget:
 *   - A real provider call requires BOTH
 *       ARQWELIA_BENCHMARK_AUTHORIZED=true  AND
 *       ARQWELIA_BENCHMARK_MAX_BUDGET_EUR>0
 *   - `--budget` may only REDUCE the budget below ARQWELIA_BENCHMARK_MAX_BUDGET_EUR
 *     (a value above the env ceiling is rejected). With no env ceiling it only
 *     clamps the reported budget — it never unlocks a call.
 *   - Default (no env vars) is a DRY RUN: no external provider call, no cost.
 *   - Even when authorized, real-provider adapters are stubbed with
 *     "NOT IMPLEMENTED — awaiting Gate", so no paid call can ever occur.
 *   - Billing is reported from proven fields only: `externalCalls`,
 *     `actualCostEur`, `billingStatus`. PAID_COST is never claimed to be 0 after
 *     a real call whose cost is not proven (billingStatus 'unknown').
 *   - API credentials are never printed; any env value whose name matches
 *     /KEY|TOKEN|SECRET/i is redacted before it can reach stdout or a report.
 *   - Reports are PII-free: no absolute paths, no local username, no raw prompt.
 *     The prompt is recorded only as promptSha256 (a hash of the text).
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'
import sharp from 'sharp'
import {
  ARQWELIA_BENCHMARK_AUTHORIZED,
  ARQWELIA_BENCHMARK_MAX_BUDGET_EUR,
  billingSnapshot,
  billingSummaryLines,
  getArqweliaBenchmarkCandidate,
  redactSecrets,
} from './lib/arqwelia-benchmark/candidates-registry.mjs'
import { normalizeImageForAi, SecureImageError } from '../src/lib/images/secure-image.ts'

const TASK = 'arqwelia-lot2-a1-benchmark-smoke'
const VERSION = '2.0.0'
const PROMPT_VERSION = 'arqwelia-lot2-v1'

function printUsage() {
  console.log(
    `Usage: bun scripts/benchmark-arqwelia-smoke.mjs [options]

Options:
  --provider <id>   Candidate id (default: mock). One of:
                    nvidia-nim | zai-glm | openai-gpt-image | mock
  --model <name>    Model override (default: candidate model)
  --image <path>    Source photo to normalize (EXIF/GPS photos are accepted and
                    normalized; only the EXIF-free normalized output is eligible)
  --promptA <text>  Concept A prompt (stored in reports only as promptSha256)
  --out <dir>       Output directory (default: ./benchmark-out)
  --budget <eur>    Budget cap — may only REDUCE the budget below
                    ARQWELIA_BENCHMARK_MAX_BUDGET_EUR; exceeding the env ceiling
                    is rejected; a value <= 0 is rejected.

Authorization is ENV-ONLY and cannot be granted from the CLI. A real provider
call requires BOTH ARQWELIA_BENCHMARK_AUTHORIZED=true and
ARQWELIA_BENCHMARK_MAX_BUDGET_EUR>0. Otherwise this runs as a DRY RUN.`,
  )
}

function parseArgs(argv) {
  const args = {
    provider: 'mock',
    model: null,
    imagePath: null,
    promptA: null,
    outDir: null,
    budget: null,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = () => {
      const value = argv[i + 1]
      if (value == null || value.startsWith('--')) {
        throw new Error(`Missing value for ${flag}`)
      }
      i += 1
      return value
    }
    switch (flag) {
      case '--provider':
        args.provider = next()
        break
      case '--model':
        args.model = next()
        break
      case '--image':
        args.imagePath = next()
        break
      case '--promptA':
        args.promptA = next()
        break
      case '--out':
        args.outDir = next()
        break
      case '--budget': {
        const raw = next()
        const parsed = Number(raw)
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new Error(`Invalid --budget value (must be a positive number): ${raw}`)
        }
        args.budget = parsed
        break
      }
      case '--help':
      case '-h':
        printUsage()
        return null
      default:
        if (flag.startsWith('-')) {
          throw new Error(`Unknown flag: ${flag}`)
        }
        throw new Error(`Unexpected argument: ${flag}`)
    }
  }
  return args
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/**
 * Reads a local source photo, normalizes it through the canonical
 * `normalizeImageForAi`, and verifies the NORMALIZED OUTPUT is free of
 * EXIF/IPTC/XMP. Only the normalized output is ever eligible to reach a
 * provider; the raw source is never copied anywhere.
 *
 * @param {string} imagePath
 * @returns {Promise<{ sourceFileName: string, dataUrl: string, buffer: Buffer, mimeType: string, width: number, height: number, sha256: string, inputBytes: number, outputBytes: number }>}
 */
async function loadAndNormalizeImage(imagePath) {
  let inputBuffer
  try {
    inputBuffer = await readFile(imagePath)
  } catch {
    throw new Error(`Image file could not be read: ${imagePath}`)
  }
  if (inputBuffer.length === 0) {
    throw new Error('Image file is empty')
  }

  let format
  try {
    const meta = await sharp(inputBuffer, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata()
    format = meta.format
  } catch {
    throw new Error('Unreadable or corrupted image')
  }

  const mime = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[format ?? '']
  if (!mime) {
    throw new Error(`Unsupported image format${format ? `: ${format}` : ''}`)
  }

  let normalized
  try {
    normalized = await normalizeImageForAi(`data:${mime};base64,${inputBuffer.toString('base64')}`)
  } catch (error) {
    if (error instanceof SecureImageError) {
      throw new Error(`Image normalization failed: ${error.message}`)
    }
    throw new Error(`Image normalization failed: ${error.message}`)
  }

  const outMeta = await sharp(normalized.buffer).metadata()
  if (outMeta.exif || outMeta.iptc || outMeta.xmp || outMeta.orientation) {
    throw new Error('Normalized output still carries metadata (EXIF/IPTC/XMP) — refusing to proceed')
  }

  return {
    sourceFileName: basename(imagePath),
    dataUrl: normalized.dataUrl,
    buffer: normalized.buffer,
    mimeType: normalized.mimeType,
    width: normalized.width,
    height: normalized.height,
    sha256: normalized.sha256,
    inputBytes: normalized.inputBytes,
    outputBytes: normalized.outputBytes,
  }
}

async function run() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`error: ${redactSecrets(error.message)}`)
    printUsage()
    process.exit(2)
  }
  if (args == null) {
    process.exit(0)
  }

  const provider = getArqweliaBenchmarkCandidate(args.provider)
  if (!provider) {
    console.error(`error: unknown provider "${args.provider}"`)
    console.error('providers: nvidia-nim, zai-glm, openai-gpt-image, mock')
    process.exit(1)
  }

  const model = args.model || provider.model
  const outDir = resolve(process.cwd(), args.outDir || './benchmark-out')

  // Authorization is ENV-ONLY. `--budget` can only reduce the env ceiling.
  const envBudgetMaxEur = ARQWELIA_BENCHMARK_MAX_BUDGET_EUR
  let budgetMaxEur = envBudgetMaxEur
  if (args.budget != null) {
    if (envBudgetMaxEur > 0 && args.budget > envBudgetMaxEur) {
      console.error(
        `error: --budget (${args.budget}) exceeds ARQWELIA_BENCHMARK_MAX_BUDGET_EUR (${envBudgetMaxEur}). ` +
          'The CLI can only REDUCE the budget below the env ceiling.',
      )
      process.exit(2)
    }
    budgetMaxEur = args.budget
  }

  const authorized = ARQWELIA_BENCHMARK_AUTHORIZED === true
  const realCallAuthorized = authorized && budgetMaxEur > 0
  const dryRun = !realCallAuthorized

  console.log(`${TASK} v${VERSION}`)
  console.log(`provider=${provider.id}`)
  console.log(`model=${model}`)
  console.log(`supportsImageEditing=${provider.supportsImageEditing ? 'true' : 'false'}`)

  // -- image preflight (normalize, don't refuse; EXIF/GPS is allowed) --------
  let normalized = null
  if (args.imagePath) {
    try {
      normalized = await loadAndNormalizeImage(args.imagePath)
      console.log(
        `image=normalized (${normalized.width}x${normalized.height}, sha256=${normalized.sha256.slice(0, 12)}…)`,
      )
    } catch (error) {
      console.error(`error: ${redactSecrets(String((error && error.message) || error))}`)
      process.exit(1)
    }
  }

  // -- smoke ----------------------------------------------------------------
  let result = null
  if (!dryRun && typeof provider.runSmoke === 'function') {
    const started = Date.now()
    try {
      result = await provider.runSmoke({
        providerId: provider.id,
        model,
        imagePath: args.imagePath ?? undefined,
        promptConceptA: args.promptA ?? undefined,
        outDir,
        budgetMaxEur,
        realCallAuthorized: true,
      })
    } catch (error) {
      result = {
        providerId: provider.id,
        model,
        ok: false,
        externalCalls: 0,
        actualCostEur: 0,
        billingStatus: 'not_called',
        officialPricingSource: null,
        durationMs: Date.now() - started,
        error: String((error && error.message) || error),
      }
    }
  } else if (dryRun && provider.dryRunSafe === true && typeof provider.runSmoke === 'function') {
    result = await provider.runSmoke({
      providerId: provider.id,
      model,
      imagePath: args.imagePath ?? undefined,
      promptConceptA: args.promptA ?? undefined,
      outDir,
      budgetMaxEur,
      realCallAuthorized: false,
    })
  } else {
    result = {
      providerId: provider.id,
      model,
      ok: false,
      externalCalls: 0,
      actualCostEur: 0,
      billingStatus: 'not_called',
      officialPricingSource: null,
      durationMs: 0,
      error: 'skipped in dry run — real call requires env authorization and budget',
    }
  }

  // -- billing + output derivation (single source of truth) -----------------
  const snap = billingSnapshot(result)
  const promptSha256 = args.promptA
    ? createHash('sha256').update(args.promptA).digest('hex')
    : null

  console.log(`mode=${dryRun ? 'dry-run' : 'smoke'}`)
  if (dryRun) {
    console.log('DRY RUN — NO EXTERNAL CALL')
  }
  if (result.ok) {
    console.log('result=ok')
  } else if (result.error && result.error.includes('NOT IMPLEMENTED')) {
    console.log('result=not-implemented (awaiting Gate)')
  } else {
    console.log(`result=skipped (${redactSecrets(result.error || '')})`)
  }
  for (const line of billingSummaryLines(result)) {
    console.log(line)
  }

  // -- report (PII-free) ----------------------------------------------------
  const config = provider.validateConfiguration()
  const officialCost = provider.estimateOfficialCost()

  const sanitizedResult = {
    providerId: result.providerId,
    model: result.model,
    ok: result.ok,
    externalCalls: result.externalCalls,
    actualCostEur: result.actualCostEur,
    billingStatus: result.billingStatus,
    officialPricingSource: result.officialPricingSource,
    durationMs: result.durationMs,
    outputWidth: result.outputWidth,
    outputHeight: result.outputHeight,
    outputFileName: result.outputPath ? basename(result.outputPath) : null,
    error: result.error ? redactSecrets(result.error) : null,
  }

  const report = {
    task: TASK,
    version: VERSION,
    timestamp: new Date().toISOString(),
    dryRun,
    authorized: authorized === true,
    budgetMaxEur,
    promptVersion: PROMPT_VERSION,
    provider: {
      id: provider.id,
      model,
      supportsImageEditing: provider.supportsImageEditing,
      dryRunSafe: provider.dryRunSafe === true,
      description: provider.dryRunDescription,
      config,
      officialCost,
    },
    image: normalized
      ? {
          sourceFileName: normalized.sourceFileName,
          normalizedSha256: normalized.sha256,
          width: normalized.width,
          height: normalized.height,
          inputBytes: normalized.inputBytes,
          outputBytes: normalized.outputBytes,
          mimeType: normalized.mimeType,
        }
      : null,
    prompt: {
      version: PROMPT_VERSION,
      sha256: promptSha256,
    },
    result: sanitizedResult,
    realProviderCalls: snap.externalCalls,
    paidCostEur: snap.paidCostEur,
    billingStatus: snap.billingStatus,
    officialPricingSource: snap.officialPricingSource,
  }

  await mkdir(outDir, { recursive: true })
  const stampValue = stamp()
  const reportJsonPath = join(outDir, `${provider.id}-${stampValue}.json`)
  const reportMdPath = join(outDir, `${provider.id}-${stampValue}.md`)

  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`)

  const paidLabel = snap.paidCostEur === null ? 'UNKNOWN' : String(snap.paidCostEur)
  const lines = [
    `# ARQWELIA Lot 2 — Benchmark smoke report`,
    ``,
    `- task: ${TASK}`,
    `- provider: ${provider.id} (model: ${model})`,
    `- supports image editing: ${provider.supportsImageEditing}`,
    `- mode: ${dryRun ? 'dry-run' : 'smoke'}`,
    `- authorized: ${authorized}`,
    `- budget max (EUR): ${budgetMaxEur}`,
    `- real provider calls: ${snap.externalCalls}`,
    `- billing status: ${snap.billingStatus}`,
    `- paid cost (EUR): ${paidLabel}`,
    ``,
    `## Provider`,
    ``,
    `- id: ${provider.id}`,
    `- model: ${model}`,
    `- description: ${provider.dryRunDescription}`,
    `- config ok: ${config.ok}${config.reason ? ` (${config.reason})` : ''}`,
    `- official cost known: ${officialCost.known}${officialCost.note ? ` — ${officialCost.note}` : ''}`,
    ``,
    `## Image (normalized, EXIF-free)`,
    ``,
    normalized
      ? `- source: ${normalized.sourceFileName}`
      : `- no image provided`,
    normalized
      ? `- normalized: ${normalized.width}x${normalized.height} JPEG (q82), sha256=${normalized.sha256}`
      : ``,
    ``,
    `## Smoke result`,
    ``,
    `- ok: ${result.ok}`,
    `- duration ms: ${result.durationMs}`,
    `- external calls: ${snap.externalCalls}`,
    `- billing status: ${snap.billingStatus}`,
    `- paid cost (EUR): ${paidLabel}`,
    `- official pricing source: ${snap.officialPricingSource ?? 'null'}`,
    result.outputPath ? `- output: ${basename(result.outputPath)}` : `- output: none`,
    result.error ? `- error: ${redactSecrets(result.error)}` : ``,
  ]
  await writeFile(reportMdPath, `${lines.join('\n').trimEnd()}\n`)

  console.log(`report=${toRelative(outDir, reportJsonPath)}`)
  console.log(`report=${toRelative(outDir, reportMdPath)}`)
  process.exit(0)
}

function toRelative(outDir, filePath) {
  const rel = relative(process.cwd(), filePath)
  return rel.startsWith('.') ? rel : `./${rel}`
}

run().catch((error) => {
  console.error(`error: ${redactSecrets(String((error && error.message) || error))}`)
  process.exit(1)
})
