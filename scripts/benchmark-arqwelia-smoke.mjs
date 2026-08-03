#!/usr/bin/env node
/**
 * ARQWELIA Lot 2 — benchmark smoke CLI (dry-run safe).
 *
 * Usage:
 *   node scripts/benchmark-arqwelia-smoke.mjs --provider mock --model test \
 *     --image <path> --promptA "..." --out <dir> [--budget 5 --authorized]
 *
 * Safety contract:
 *   - Default is a DRY RUN: no external provider call, no cost.
 *   - A real provider call requires BOTH
 *       ARQWELIA_BENCHMARK_AUTHORIZED=true  AND
 *       ARQWELIA_BENCHMARK_MAX_BUDGET_EUR>0
 *     (the --authorized / --budget flags are a local override of the same gate).
 *   - Even when authorized, real-provider adapters are stubbed with
 *     "NOT IMPLEMENTED — awaiting Gate", so no paid call can ever occur.
 *   - API credentials are never printed; any env value whose name matches
 *     /KEY|TOKEN|SECRET/i is redacted before it can reach stdout or a report.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { redactSecrets } from './lib/arqwelia-benchmark/candidates-registry.mjs'
import {
  getArqweliaBenchmarkCandidate,
  ARQWELIA_BENCHMARK_AUTHORIZED,
  ARQWELIA_BENCHMARK_MAX_BUDGET_EUR,
} from './lib/arqwelia-benchmark/candidates-registry.mjs'
import { normalizeBenchmarkImage } from './lib/arqwelia-benchmark/normalize-image.mjs'

const TASK = 'arqwelia-lot2-a1-benchmark-smoke'
const VERSION = '1.0.0'

function printUsage() {
  console.log(
    `Usage: node scripts/benchmark-arqwelia-smoke.mjs [options]

Options:
  --provider <id>   Candidate id (default: mock). One of:
                    nvidia-nim | zai-glm | openai-gpt-image | mock
  --model <name>    Model override (default: candidate model)
  --image <path>    Source photo to normalize (must be metadata-clean)
  --promptA <text>  Concept A prompt
  --out <dir>       Output directory (default: ./benchmark-out)
  --budget <eur>    Budget override (default: ARQWELIA_BENCHMARK_MAX_BUDGET_EUR)
  --authorized      Authorization override (default: ARQWELIA_BENCHMARK_AUTHORIZED)

A real provider call requires BOTH ARQWELIA_BENCHMARK_AUTHORIZED=true and
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
    authorized: false,
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
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error(`Invalid --budget value: ${raw}`)
        }
        args.budget = parsed
        break
      }
      case '--authorized':
        args.authorized = true
        break
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

async function run() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`error: ${error.message}`)
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
  const authorized = args.authorized || ARQWELIA_BENCHMARK_AUTHORIZED
  const budgetMaxEur = args.budget ?? ARQWELIA_BENCHMARK_MAX_BUDGET_EUR
  const dryRun = !(authorized === true && budgetMaxEur > 0)

  console.log(`${TASK} v${VERSION}`)
  console.log(`provider=${provider.id}`)
  console.log(`model=${model}`)
  console.log(`supportsImageEditing=${provider.supportsImageEditing ? 'true' : 'false'}`)

  // -- image preflight -------------------------------------------------------
  let normalized = null
  if (args.imagePath) {
    try {
      normalized = await normalizeBenchmarkImage(args.imagePath)
      if (!normalized.clean) {
        console.error(
          `error: image "${args.imagePath}" contains un-normalized metadata (EXIF/GPS/IPTC/XMP). ` +
            'Refusing to proceed. Normalize the photo before benchmarking.',
        )
        process.exit(1)
      }
      console.log(
        `image=normalized (${normalized.width}x${normalized.height}, sha256=${normalized.sha256.slice(0, 12)}…)`,
      )
    } catch (error) {
      console.error(`error: image normalization failed for "${args.imagePath}": ${error.message}`)
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
      durationMs: 0,
      error: 'skipped in dry run — real call requires authorization and budget',
    }
  }

  // -- output & report ------------------------------------------------------
  const config = provider.validateConfiguration()
  const officialCost = provider.estimateOfficialCost()

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
  console.log('real_calls=0')
  console.log('paid_eur=0')
  console.log('REAL_PROVIDER_CALLS=0, PAID_COST=0')

  const report = {
    task: TASK,
    version: VERSION,
    timestamp: new Date().toISOString(),
    dryRun,
    authorized: authorized === true,
    budgetMaxEur,
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
          path: args.imagePath,
          width: normalized.width,
          height: normalized.height,
          sha256: normalized.sha256,
          inputBytes: normalized.inputBytes,
          outputBytes: normalized.outputBytes,
          mimeType: normalized.mimeType,
        }
      : null,
    promptA: args.promptA ?? null,
    result,
    realProviderCalls: 0,
    paidCostEur: 0,
  }

  await mkdir(outDir, { recursive: true })
  const stampValue = stamp()
  const reportJsonPath = join(outDir, `${provider.id}-${stampValue}.json`)
  const reportMdPath = join(outDir, `${provider.id}-${stampValue}.md`)

  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`)

  const lines = [
    `# ARQWELIA Lot 2 — Benchmark smoke report`,
    ``,
    `- task: ${TASK}`,
    `- provider: ${provider.id} (model: ${model})`,
    `- supports image editing: ${provider.supportsImageEditing}`,
    `- mode: ${dryRun ? 'dry-run' : 'smoke'}`,
    `- authorized: ${authorized}`,
    `- budget max (EUR): ${budgetMaxEur}`,
    `- real provider calls: 0`,
    `- paid cost (EUR): 0`,
    ``,
    `## Provider`,
    ``,
    `- id: ${provider.id}`,
    `- model: ${model}`,
    `- description: ${provider.dryRunDescription}`,
    `- config ok: ${config.ok}${config.reason ? ` (${config.reason})` : ''}`,
    `- official cost known: ${officialCost.known}${officialCost.note ? ` — ${officialCost.note}` : ''}`,
    ``,
    `## Image`,
    ``,
    normalized
      ? `- normalized ${basename(args.imagePath)} → ${normalized.width}x${normalized.height} JPEG (q82)`
      : `- no image provided`,
    ``,
    `## Smoke result`,
    ``,
    `- ok: ${result.ok}`,
    `- duration ms: ${result.durationMs}`,
    result.outputPath ? `- output: ${result.outputPath}` : `- output: none`,
    result.error ? `- error: ${redactSecrets(result.error)}` : ``,
  ]
  await writeFile(reportMdPath, `${lines.join('\n').trimEnd()}\n`)

  console.log(`report=${reportJsonPath}`)
  console.log(`report=${reportMdPath}`)
  process.exit(0)
}

run().catch((error) => {
  console.error(`error: ${redactSecrets(String((error && error.message) || error))}`)
  process.exit(1)
})
