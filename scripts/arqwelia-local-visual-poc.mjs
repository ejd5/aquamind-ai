#!/usr/bin/env bun
/**
 * ARQWELIA Lot 2 — local visual POC orchestrator (DeepSeek mock + ComfyUI local
 * SDXL inpainting). DRY-RUN SAFE.
 *
 * Runs under Bun because it imports TypeScript modules.
 *
 * Usage:
 *   bun scripts/arqwelia-local-visual-poc.mjs \
 *     --image dataset/photos/synthetic01.png \
 *     --mask dataset/masks/synthetic01-pool-mask.png \
 *     --dataset-id synthetic01 \
 *     --concept A \
 *     --planner mock \
 *     --engine comfyui-local \
 *     --out ./benchmark-out/deepseek-comfyui-poc
 *
 * DEFAULT IS A DRY RUN. To authorize a REAL local generation the operator must
 * set ARQWELIA_LOCAL_VISUAL_EXECUTE=true. Even then:
 *   - NO paid image API call ever (ComfyUI local only);
 *   - exactly ONE /prompt submission per run;
 *   - NO automatic retry;
 *   - stop after success or failure.
 *
 * DeepSeek planner: `mock` by default (deterministic fixture, zero calls).
 * `api` requires DEEPSEEK_API_KEY + ARQWELIA_VISUAL_PLANNER_AUTHORIZED=true.
 * During this POC task we only ever use `mock` — no real DeepSeek call.
 *
 * SAFETY:
 *   - the source photo and mask stay local; the photo is NEVER sent to any
 *     remote provider (DeepSeek receives only the structured closed-vocabulary
 *     choices);
 *   - the report contains no absolute user path, no key, no free user prompt,
 *     no base64 photo/mask.
 */

import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import {
  generateArqweliaVisualBrief,
  arqweliaPlannerInputSchema,
  buildMockVisualBrief,
} from '../src/lib/arqwelia/visual/deepseek-visual-planner.ts'
import { validateArqweliaInpaintingMask } from '../src/lib/arqwelia/visual/mask-validator.ts'
import { prepareArqweliaInpaintingCanvas } from '../src/lib/arqwelia/visual/canvas-prep.ts'
import { ArqweliaComfyUiLocalClient } from '../src/lib/arqwelia/visual/comfyui-local-client.ts'
import { ArqweliaComfyUiInpaintingEngine } from '../src/lib/arqwelia/visual/comfyui-inpainting-engine.ts'

const TASK = 'arqwelia-lot2-local-visual-poc'
const VERSION = '1.0.0'

const CONCEPTS = ['A', 'B']
const PLANNERS = ['mock', 'api']
const ENGINES = ['comfyui-local', 'mock']

function printUsage() {
  console.log(`usage: bun scripts/${basename(import.meta.url).split('/').pop()} \\`)
  console.log('  --image <path>  --mask <path>  --dataset-id <id> \\')
  console.log('  [--concept A|B] [--planner mock|api] [--engine comfyui-local|mock] [--out <dir>]')
  console.log('')
  console.log('Default: dry-run. Set ARQWELIA_LOCAL_VISUAL_EXECUTE=true to run a real')
  console.log('local ComfyUI generation (single /prompt, no retry).')
}

function parseArgs(argv) {
  const args = {
    imagePath: null,
    maskPath: null,
    datasetId: null,
    concept: 'A',
    planner: 'mock',
    engine: 'comfyui-local',
    outDir: null,
    seed: null,
    steps: null,
    cfg: null,
    strength: null,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const next = () => {
      const value = argv[i + 1]
      if (value == null || value.startsWith('--')) throw new Error(`Missing value for ${flag}`)
      i += 1
      return value
    }
    switch (flag) {
      case '--image': args.imagePath = next(); break
      case '--mask': args.maskPath = next(); break
      case '--dataset-id': args.datasetId = next(); break
      case '--concept': args.concept = next(); break
      case '--planner': args.planner = next(); break
      case '--engine': args.engine = next(); break
      case '--out': args.outDir = next(); break
      case '--seed': args.seed = Number(next()); break
      case '--steps': args.steps = Number(next()); break
      case '--cfg': args.cfg = Number(next()); break
      case '--strength': args.strength = Number(next()); break
      case '-h': case '--help': printUsage(); process.exit(0); break
      default: throw new Error(`Unknown flag: ${flag}`)
    }
  }
  return args
}

async function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function normalizeLocalImage(path, { maxSide = 1600, jpegQuality = 90 } = {}) {
  const buffer = await readFile(path)
  if (buffer.length === 0) throw new Error('Image file is empty')
  const meta = await sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata()
  const width = meta.width || 0
  const height = meta.height || 0
  if (!width || !height) throw new Error('Image has no dimensions')
  const jpeg = await sharp(buffer, { failOn: 'error' })
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: jpegQuality, mozjpeg: true })
    .toBuffer()
  const outMeta = await sharp(jpeg).metadata()
  return {
    buffer: jpeg,
    mimeType: 'image/jpeg',
    width: outMeta.width || width,
    height: outMeta.height || height,
    sha256: await sha256Buffer(jpeg),
  }
}

/**
 * Loads a mask, converts it EXPLICITLY to a PNG grayscale (single channel),
 * and returns the normalized mask + its decoded pixel buffer for validation.
 */
async function normalizeLocalMask(path, { targetWidth, targetHeight }) {
  const buffer = await readFile(path)
  if (buffer.length === 0) throw new Error('Mask file is empty')
  // Explicit grayscale PNG conversion (black=preserve, white=modify).
  const png = await sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 })
    .resize({ width: targetWidth, height: targetHeight, fit: 'fill', kernel: 'nearest' })
    .grayscale()
    .png()
    .toBuffer()
  const meta = await sharp(png).metadata()
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
  const channels = info.channels || 1
  const pixels = new Uint8Array(info.width * info.height)
  for (let i = 0; i < info.width * info.height; i += 1) {
    pixels[i] = data[i * channels]
  }
  return {
    buffer: png,
    width: meta.width || targetWidth,
    height: meta.height || targetHeight,
    sha256: await sha256Buffer(png),
    pixels,
  }
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

  if (!args.imagePath) {
    console.error('error: --image <path> is required')
    process.exit(2)
  }
  if (!args.maskPath) {
    console.error('error: --mask <path> is required')
    process.exit(2)
  }
  if (!args.datasetId) {
    console.error('error: --dataset-id <id> is required')
    process.exit(2)
  }
  if (!CONCEPTS.includes(args.concept)) {
    console.error(`error: --concept must be one of ${CONCEPTS.join(', ')}`)
    process.exit(2)
  }
  if (!PLANNERS.includes(args.planner)) {
    console.error(`error: --planner must be one of ${PLANNERS.join(', ')}`)
    process.exit(2)
  }
  if (!ENGINES.includes(args.engine)) {
    console.error(`error: --engine must be one of ${ENGINES.join(', ')}`)
    process.exit(2)
  }

  const execute = process.env.ARQWELIA_LOCAL_VISUAL_EXECUTE === 'true'
  const outDir = resolve(process.cwd(), args.outDir || './benchmark-out/deepseek-comfyui-poc')

  console.log(`${TASK} v${VERSION}`)
  console.log(`execute=${execute}`)
  console.log(`planner=${args.planner}`)
  console.log(`engine=${args.engine}`)
  console.log(`concept=${args.concept}`)
  console.log(`dataset-id=${args.datasetId}`)

  // -- normalize source image + mask (always local) -------------------------
  const normalizedImage = await normalizeLocalImage(args.imagePath)
  const normalizedMask = await normalizeLocalMask(args.maskPath, {
    targetWidth: normalizedImage.width,
    targetHeight: normalizedImage.height,
  })
  console.log(`image=normalized (${normalizedImage.width}x${normalizedImage.height}, sha256=${normalizedImage.sha256.slice(0, 12)}…)`)
  console.log(`mask=normalized (${normalizedMask.width}x${normalizedMask.height}, sha256=${normalizedMask.sha256.slice(0, 12)}…)`)

  // 1024x1024 working canvas: shared proportional transform for source + mask,
  // mask re-validated AFTER the transform (throws on an invalid mask).
  const canvas = await prepareArqweliaInpaintingCanvas(normalizedImage.buffer, normalizedMask.buffer)
  const canvasMapping = canvas.mapping
  const maskValidation = validateArqweliaInpaintingMask(
    normalizedMask.pixels,
    normalizedMask.width,
    normalizedMask.height,
    normalizedImage.width,
    normalizedImage.height,
  )
  if (!maskValidation.ok) {
    console.error(`error: mask rejected — ${maskValidation.error}`)
    process.exit(1)
  }
  console.log(`mask=valid (maskedRatio=${maskValidation.maskedRatio.toFixed(3)})`)
  console.log(
    `canvas=prepared (${canvas.width}x${canvas.height}, scale=${canvasMapping.scale.toFixed(4)}, ` +
      `offset=(${canvasMapping.offsetX},${canvasMapping.offsetY}), ` +
      `original=${canvasMapping.originalWidth}x${canvasMapping.originalHeight})`,
  )

  // -- planner --------------------------------------------------------------
  let visualBrief
  if (args.planner === 'mock') {
    const input = arqweliaPlannerInputSchema.parse({
      concept: args.concept,
      poolShape: 'rectangular',
      poolDimensions: '8x4m',
      gardenStyle: 'mediterranean',
      copingMaterial: 'natural_stone',
      terraceTreatment: 'natural_stone_patio',
      budgetRange: 'medium',
      preserveHouse: true,
      preservePerspective: true,
      preserveTrees: true,
      declaredConstraints: ['no_people', 'no_text_logos', 'preserve_house', 'preserve_perspective', 'preserve_fences', 'preserve_trees'],
    })
    visualBrief = buildMockVisualBrief(input)
  } else {
    if (process.env.DEEPSEEK_API_KEY && process.env.ARQWELIA_VISUAL_PLANNER_AUTHORIZED === 'true') {
      const result = await generateArqweliaVisualBrief(
        arqweliaPlannerInputSchema.parse({
          concept: args.concept,
          poolShape: 'rectangular',
          poolDimensions: '8x4m',
          gardenStyle: 'mediterranean',
          copingMaterial: 'natural_stone',
          terraceTreatment: 'natural_stone_patio',
          budgetRange: 'medium',
          preserveHouse: true,
          preservePerspective: true,
          preserveTrees: true,
          declaredConstraints: ['no_people', 'no_text_logos', 'preserve_house', 'preserve_perspective', 'preserve_fences', 'preserve_trees'],
        }),
      )
      visualBrief = result.brief
    } else {
      console.error('error: planner=api requires DEEPSEEK_API_KEY + ARQWELIA_VISUAL_PLANNER_AUTHORIZED=true')
      process.exit(1)
    }
  }
  console.log(`brief=generated (version=${visualBrief.version}, concept=${visualBrief.concept})`)

  // -- engine (default dry-run) ---------------------------------------------
  let result
  if (args.engine === 'mock') {
    await mkdir(outDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputPath = join(outDir, `arqwelia-${args.datasetId}-${stamp}.png`)
    const png = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 30, g: 140, b: 210 } },
    }).png().toBuffer()
    await writeFile(outputPath, png)
    result = {
      provider: 'comfyui-local',
      engine: 'sdxl-inpainting',
      workflowVersion: 'arqwelia-sdxl-inpainting-v1',
      promptId: null,
      status: 'succeeded',
      externalPaidCalls: 0,
      providerCostEur: 0,
      outputPath,
      width: 64,
      height: 64,
      sourceSha256: canvas.imageSha256,
      maskSha256: canvas.maskSha256,
      durationMs: 0,
    }
  } else if (!execute) {
    result = {
      provider: 'comfyui-local',
      engine: 'sdxl-inpainting',
      workflowVersion: 'arqwelia-sdxl-inpainting-v1',
      promptId: null,
      status: 'not_run',
      externalPaidCalls: 0,
      providerCostEur: 0,
      outputPath: null,
      width: null,
      height: null,
      sourceSha256: canvas.imageSha256,
      maskSha256: canvas.maskSha256,
      durationMs: 0,
      error: 'dry run — set ARQWELIA_LOCAL_VISUAL_EXECUTE=true to run a real local generation',
    }
    console.log('DRY RUN — NO LOCAL GENERATION')
  } else {
    // Real local ComfyUI generation: exactly ONE /prompt, no retry.
    const engine = new ArqweliaComfyUiInpaintingEngine({})
    result = await engine.generateConcept({
      normalizedImage: {
        buffer: canvas.imageBuffer,
        mimeType: 'image/png',
        width: canvas.width,
        height: canvas.height,
        sha256: canvas.imageSha256,
      },
      normalizedMask: {
        buffer: canvas.maskBuffer,
        width: canvas.width,
        height: canvas.height,
        sha256: canvas.maskSha256,
      },
      visualBrief,
      concept: args.concept,
      datasetItemId: args.datasetId,
      outputDirectory: outDir,
      seed: args.seed ?? undefined,
      steps: args.steps ?? undefined,
      cfg: args.cfg ?? undefined,
      strength: args.strength ?? undefined,
    })
  }

  console.log(`status=${result.status}`)
  console.log(`promptId=${result.promptId ?? 'null'}`)
  console.log(`external_paid_calls=${result.externalPaidCalls}`)
  console.log(`provider_cost_eur=${result.providerCostEur}`)
  console.log(`output=${result.outputPath ? basename(result.outputPath) : 'none'}`)
  if (result.error) console.log(`error=${result.error}`)

  // -- report (PII-free) ----------------------------------------------------
  const report = {
    task: TASK,
    version: VERSION,
    timestamp: new Date().toISOString(),
    dryRun: !execute,
    concept: args.concept,
    datasetId: args.datasetId,
    planner: args.planner,
    engine: args.engine,
    sourceSha256: canvas.imageSha256,
    maskSha256: canvas.maskSha256,
    maskMaskedRatio: maskValidation.maskedRatio,
    image: { width: canvas.width, height: canvas.height },
    canvasMapping: {
      scale: canvasMapping.scale,
      offsetX: canvasMapping.offsetX,
      offsetY: canvasMapping.offsetY,
      resizedWidth: canvasMapping.resizedWidth,
      resizedHeight: canvasMapping.resizedHeight,
      originalWidth: canvasMapping.originalWidth,
      originalHeight: canvasMapping.originalHeight,
      workingWidth: canvasMapping.workingWidth,
      workingHeight: canvasMapping.workingHeight,
    },
    visualBrief: {
      version: visualBrief.version,
      concept: visualBrief.concept,
      pool: visualBrief.pool,
      preserve: visualBrief.preserve,
      add: visualBrief.add,
      negative: visualBrief.negative,
      recommended: visualBrief.recommended,
    },
    result: {
      status: result.status,
      promptId: result.promptId,
      outputFileName: result.outputPath ? basename(result.outputPath) : null,
      width: result.width,
      height: result.height,
      finalWidth: result.finalWidth ?? null,
      finalHeight: result.finalHeight ?? null,
      workingOutputSha256: result.workingOutputSha256 ?? null,
      finalOutputSha256: result.finalOutputSha256 ?? null,
      externalPaidCalls: result.externalPaidCalls,
      providerCostEur: result.providerCostEur,
      durationMs: result.durationMs,
      error: result.error ?? null,
    },
    realDeepSeekCalls: args.planner === 'api' ? 1 : 0,
    localGenerations: execute ? 1 : 0,
  }

  await mkdir(outDir, { recursive: true })
  const stampValue = new Date().toISOString().replace(/[:.]/g, '-')
  const reportJsonPath = join(outDir, `report-${stampValue}.json`)
  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`)
  const reportMdPath = join(outDir, `report-${stampValue}.md`)
  const lines = [
    '# ARQWELIA Lot 2 — Local visual POC report',
    '',
    `- task: ${TASK}`,
    `- execute: ${execute}`,
    `- concept: ${args.concept}`,
    `- dataset-id: ${args.datasetId}`,
    `- planner: ${args.planner}`,
    `- engine: ${args.engine}`,
    `- source sha256 (canvas): ${canvas.imageSha256}`,
    `- mask sha256 (canvas): ${canvas.maskSha256}`,
    `- mask masked ratio: ${maskValidation.maskedRatio.toFixed(3)}`,
    `- canvas: ${canvas.width}x${canvas.height} (scale=${canvasMapping.scale.toFixed(4)}, offset=${canvasMapping.offsetX},${canvasMapping.offsetY}, original=${canvasMapping.originalWidth}x${canvasMapping.originalHeight})`,
    `- status: ${result.status}`,
    `- prompt id: ${result.promptId ?? 'null'}`,
    `- external paid calls: ${result.externalPaidCalls}`,
    `- provider cost EUR: ${result.providerCostEur}`,
    `- output: ${result.outputPath ? basename(result.outputPath) : 'none'}`,
    result.finalWidth ? `- final output: ${result.finalWidth}x${result.finalHeight}` : '',
    result.workingOutputSha256 ? `- working output sha256: ${result.workingOutputSha256}` : '',
    result.finalOutputSha256 ? `- final output sha256: ${result.finalOutputSha256}` : '',
    `- real deepseek calls: ${report.realDeepSeekCalls}`,
    `- local generations: ${report.localGenerations}`,
    result.error ? `- error: ${result.error}` : '',
    '',
    'Note: local GPU generation consumes compute resources; there is NO',
    'per-image provider API charge.',
  ]
  await writeFile(reportMdPath, `${lines.join('\n').trimEnd()}\n`)

  console.log(`report=${toRelative(outDir, reportJsonPath)}`)
  console.log(`report=${toRelative(outDir, reportMdPath)}`)
  process.exit(result.status === 'failed' ? 1 : 0)
}

function toRelative(outDir, filePath) {
  const rel = relative(process.cwd(), filePath)
  return rel.startsWith('.') ? rel : `./${rel}`
}

run().catch((error) => {
  console.error(`error: ${error.message}`)
  process.exit(1)
})
