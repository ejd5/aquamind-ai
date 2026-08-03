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
 * Authorization is ENV-ONLY and the budget is ENV-ONLY. The CLI can never
 * authorize a real call and can never create a budget:
 *   - A real provider call requires BOTH
 *       ARQWELIA_BENCHMARK_AUTHORIZED=true  AND
 *       ARQWELIA_BENCHMARK_MAX_BUDGET_EUR>0
 *   - The only source of a usable budget is the environment (a finite number
 *     strictly > 0). `--budget` may only REDUCE that env budget
 *     (`min(cliBudget, envBudget)`); a value above the env ceiling is rejected,
 *     and with no env budget the effective budget is 0.
 *   - When the env gate is closed (`envGateOpen` false) the CLI prints
 *     "DRY RUN" and `realCallAuthorized` stays false regardless of `--budget`.
 *   - Default (no env vars) is a DRY RUN: no external provider call, no cost.
 *   - Even when authorized, real-provider adapters are stubbed with
 *     "NOT IMPLEMENTED — awaiting Gate", so no paid call can ever occur.
 *   - The provider adapter receives ONLY the normalized image fields
 *     (normalizedImageBuffer/DataUrl/MimeType/Sha256/Width/Height, promptVersion,
 *     sanitizedPrompt) — never the raw source buffer and never the source path.
 *   - Billing is reported from proven fields only: `externalCalls`,
 *     `actualCostEur`, `billingStatus`. PAID_COST is never claimed to be 0 after
 *     a real call whose cost is not proven (billingStatus 'unknown'), and a
 *     caught adapter error never auto-converts to not_called/0/0.
 *   - API credentials are never printed; any env value whose name matches
 *     /KEY|TOKEN|SECRET/i is redacted before it can reach stdout or a report.
 *   - Reports are PII-free: no absolute paths, no local username, no raw prompt,
 *     no local file basename. Images are recorded as `datasetItemId` (from the
 *     controlled `--dataset-id`, or a truncated hash), the prompt only as
 *     promptSha256, and `normalizedSha256`/dimensions for the image.
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import {
  billingFromCaughtError,
  billingSnapshot,
  billingSummaryLines,
  computeGate,
  getArqweliaBenchmarkCandidate,
  redactSecrets,
  registerArqweliaBenchmarkCandidate,
} from './lib/arqwelia-benchmark/candidates-registry.mjs'
import { normalizeImageForAi, SecureImageError } from '../src/lib/images/secure-image.ts'
import {
  ARQWELIA_PROMPT_VERSION,
  assertNoPersonalData,
  buildDefaultArqweliaPrompt,
} from './lib/arqwelia-benchmark/prompts/index.ts'

const TASK = 'arqwelia-lot2-a1-benchmark-smoke'
const VERSION = '3.1.0'

function printUsage() {
  console.log(
    `Usage: bun scripts/benchmark-arqwelia-smoke.mjs [options]

Options:
  --provider <id>   Candidate id (default: mock). One of:
                    nvidia-nim | zai-glm | openai-gpt-image | mock
  --model <name>    Model override (default: candidate model)
  --image <path>    Source photo to normalize (EXIF/GPS photos are accepted and
                    normalized; only the EXIF-free normalized output is eligible)
  --promptA <text>  Diagnostic prompt for the mock path ONLY — it is stored in
                    reports only as promptSha256 and NEVER reaches a real adapter
  --concept <A|B>   Concept used to build the versioned PII-free prompt for the
                    real adapters (default: A)
  --dataset-id <id> Alphanumeric dataset item id recorded in reports (default: a
                    truncated hash of the normalized image)
  --out <dir>       Output directory (default: ./benchmark-out)
  --budget <eur>    Budget cap — may only REDUCE the budget below
                    ARQWELIA_BENCHMARK_MAX_BUDGET_EUR; exceeding the env ceiling
                    is rejected; a value <= 0 is rejected. With no env budget the
                    CLI stays a DRY RUN and the effective budget is 0.

Authorization is ENV-ONLY and cannot be granted from the CLI. A real provider
call requires ALL THREE of ARQWELIA_BENCHMARK_AUTHORIZED=true,
ARQWELIA_BENCHMARK_MAX_BUDGET_EUR>0 AND ARQWELIA_BENCHMARK_PHASE0A_EXECUTE=true.
Otherwise this runs as a DRY RUN.`,
  )
}

function parseArgs(argv) {
  const args = {
    provider: 'mock',
    model: null,
    imagePath: null,
    promptA: null,
    concept: 'A',
    datasetId: null,
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
      case '--concept': {
        const raw = next()
        if (raw !== 'A' && raw !== 'B') {
          throw new Error('Invalid --concept value (must be A or B)')
        }
        args.concept = raw
        break
      }
      case '--dataset-id': {
        const raw = next()
        if (!/^[A-Za-z0-9]+$/.test(raw)) {
          throw new Error('Invalid --dataset-id value (alphanumeric only)')
        }
        args.datasetId = raw
        break
      }
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
 * provider; the raw source and its path are never passed to an adapter.
 *
 * @param {string} imagePath
 * @returns {Promise<{ dataUrl: string, buffer: Buffer, mimeType: string, width: number, height: number, sha256: string, inputBytes: number, outputBytes: number }>}
 */
async function loadAndNormalizeImage(imagePath) {
  let inputBuffer
  try {
    inputBuffer = await readFile(imagePath)
  } catch {
    throw new Error('Image file could not be read')
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

  // Test-only seam: load an extra candidate module (e.g. a capture/error fake).
  if (process.env.ARQWELIA_BENCHMARK_EXTRA_CANDIDATE_MODULE) {
    const modulePath = resolve(process.cwd(), process.env.ARQWELIA_BENCHMARK_EXTRA_CANDIDATE_MODULE)
    const mod = await import(pathToFileURL(modulePath).href)
    const extras = mod.default ? (Array.isArray(mod.default) ? mod.default : [mod.default]) : []
    for (const candidate of extras) {
      registerArqweliaBenchmarkCandidate(candidate)
    }
  }

  const provider = getArqweliaBenchmarkCandidate(args.provider)
  if (!provider) {
    console.error(`error: unknown provider "${args.provider}"`)
    console.error('providers: nvidia-nim, zai-glm, openai-gpt-image, mock')
    process.exit(1)
  }

  const model = args.model || provider.model
  const outDir = resolve(process.cwd(), args.outDir || './benchmark-out')

  // Budget gate is ENV-ONLY — the CLI can never create a budget. `--budget` may
  // only REDUCE an env-supplied budget; with no env budget the gate stays
  // closed and the effective budget is 0 (DRY RUN).
  const gate = computeGate({ cliBudget: args.budget })
  const envAuthorized = gate.envAuthorized
  const envBudget = gate.envBudget
  const budgetMaxEur = gate.effectiveBudget
  const realCallAuthorized = gate.realCallAuthorized
  // THIRD GATE — Phase 0A execution intent is ENV-ONLY too.
  const phase0aExecute = process.env.ARQWELIA_BENCHMARK_PHASE0A_EXECUTE === 'true'
  const dryRun = !realCallAuthorized

  if (args.budget != null && envBudget > 0 && args.budget > envBudget) {
    console.error(
      `error: --budget (${args.budget}) exceeds ARQWELIA_BENCHMARK_MAX_BUDGET_EUR (${envBudget}). ` +
        'The CLI can only REDUCE the budget below the env ceiling.',
    )
    process.exit(2)
  }

  // Real provider adapters (zai-glm / openai-gpt-image) receive a VERSIONED,
  // PII-free prompt built from the closed-vocabulary builder — never CLI free
  // text. `--promptA` is reserved for the mock/diagnostic path only.
  const isRealProviderAdapter = provider.id === 'zai-glm' || provider.id === 'openai-gpt-image'
  const builtPrompt = isRealProviderAdapter ? buildDefaultArqweliaPrompt(args.concept) : null

  console.log(`${TASK} v${VERSION}`)
  console.log(`provider=${provider.id}`)
  console.log(`model=${model}`)
  console.log(`supportsImageEditing=${provider.supportsImageEditing ? 'true' : 'false'}`)
  console.log(`realCallAuthorized=${realCallAuthorized}`)
  console.log(`phase0aExecute=${phase0aExecute}`)
  if (builtPrompt) {
    console.log(`concept=${builtPrompt.concept}`)
    console.log(`promptSha256=${builtPrompt.promptSha256}`)
  }

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

  // Dataset item id is a CONTROLLED alphanumeric id (or a truncated hash of the
  // normalized image) — never the original local filename.
  const datasetItemId = args.datasetId || (normalized ? normalized.sha256.slice(0, 16) : null)

  // -- smoke ----------------------------------------------------------------
  // The adapter receives ONLY normalized fields plus the versioned built prompt.
  // `sanitizedPrompt` for real adapters is the BUILT prompt; CLI `--promptA`
  // free text never reaches a real adapter.
  const smokeOpts = {
    providerId: provider.id,
    model,
    normalizedImageBuffer: normalized ? normalized.buffer : undefined,
    normalizedImageDataUrl: normalized ? normalized.dataUrl : undefined,
    normalizedMimeType: normalized ? normalized.mimeType : undefined,
    normalizedSha256: normalized ? normalized.sha256 : undefined,
    normalizedWidth: normalized ? normalized.width : undefined,
    normalizedHeight: normalized ? normalized.height : undefined,
    promptVersion: ARQWELIA_PROMPT_VERSION,
    sanitizedPrompt: isRealProviderAdapter
      ? (builtPrompt ? builtPrompt.prompt : undefined)
      : (args.promptA ?? undefined),
    concept: builtPrompt ? builtPrompt.concept : undefined,
    builtPrompt: builtPrompt ? builtPrompt.prompt : undefined,
    promptSha256: builtPrompt ? builtPrompt.promptSha256 : undefined,
    phase0aExecute,
    outDir,
    budgetMaxEur,
  }

  let result = null
  if (!dryRun && typeof provider.runSmoke === 'function') {
    const started = Date.now()
    try {
      result = await provider.runSmoke({ ...smokeOpts, realCallAuthorized: true })
    } catch (error) {
      // Conservative billing on error: never auto-convert a real-adapter error
      // into externalCalls=0 / actualCostEur=0 / not_called.
      const billing = billingFromCaughtError(error)
      result = {
        providerId: provider.id,
        model,
        ok: false,
        externalCalls: billing.externalCalls,
        actualCostEur: billing.actualCostEur,
        billingStatus: billing.billingStatus,
        officialPricingSource: billing.officialPricingSource,
        durationMs: Date.now() - started,
        error: String((error && error.message) || error),
      }
    }
  } else if (dryRun && provider.dryRunSafe === true && typeof provider.runSmoke === 'function') {
    result = await provider.runSmoke({ ...smokeOpts, realCallAuthorized: false })
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
  const promptSha256 = builtPrompt
    ? builtPrompt.promptSha256
    : args.promptA
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
    authorized: envAuthorized === true,
    realCallAuthorized,
    phase0aExecute,
    budgetMaxEur,
    promptVersion: ARQWELIA_PROMPT_VERSION,
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
          datasetItemId,
          normalizedSha256: normalized.sha256,
          width: normalized.width,
          height: normalized.height,
          inputBytes: normalized.inputBytes,
          outputBytes: normalized.outputBytes,
          mimeType: normalized.mimeType,
        }
      : null,
    prompt: {
      version: ARQWELIA_PROMPT_VERSION,
      concept: builtPrompt ? builtPrompt.concept : null,
      sha256: promptSha256,
    },
    result: sanitizedResult,
    realProviderCalls: snap.externalCalls,
    paidCostEur: snap.paidCostEur,
    billingStatus: snap.billingStatus,
    officialPricingSource: snap.officialPricingSource,
  }

  // Final PII gate before the report is written: no personal data, no local
  // path, no secret may survive in any report field.
  try {
    assertNoPersonalData(report)
  } catch (error) {
    throw new Error(`refusing to write a report that failed the PII guard: ${error.message}`)
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
    `- authorized: ${envAuthorized}`,
    `- real call authorized: ${realCallAuthorized}`,
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
      ? `- dataset item id: ${datasetItemId}`
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
