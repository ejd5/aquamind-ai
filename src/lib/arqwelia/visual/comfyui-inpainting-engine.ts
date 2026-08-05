/**
 * AQWELIA Lot 2 — local SDXL inpainting engine (POC).
 *
 * Implements `ArqweliaVisualEngine` using the local ComfyUI client + the
 * versioned SDXL inpainting workflow. One workflow = one generation: exactly
 * one POST /prompt, no automatic retry, bounded polling, stop after the first
 * result (success or failure).
 *
 * PIPELINE (Round 3):
 *   1. prepareArqweliaInpaintingCanvas (1024x1024 working canvas, shared
 *      proportional transform for source + mask, nearest mask);
 *   2. BLOCKING preflight: client.preflight(expectedCheckpointName) BEFORE any
 *      upload / workflow build / queuePrompt. Any failure => preflight_failed,
 *      promptId=null, zero upload, zero /prompt, zero generation;
 *   3. upload source via /upload/image and mask via /upload/image;
 *   4. build + graph-validate the versioned workflow;
 *   5. queue ONE /prompt (from here promptId is authoritative);
 *   6. bounded polling; on timeout call POST /interrupt ONCE (no resubmit) and
 *      report interruptAttempted / interruptSucceeded honestly;
 *   7. GET /view + real output validation (sharp decode, measured dims, meta
 *      strip, ALWAYS normalized to PNG, SHA-256 after conversion);
 *   8. restoreArqweliaInpaintingOutput -> original aspect ratio (no black
 *      bands), composite onto the original source outside the mask; final PNG.
 *
 * STATUS MODEL: not_run | preflight_failed | queued | processing | succeeded |
 * failed | timed_out | interrupted.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { ArqweliaComfyUiLocalClient } from './comfyui-local-client'
import {
  ARQWELIA_SDXL_WORKFLOW_VERSION,
  buildArqweliaSdxlWorkflow,
} from './comfyui-workflow-builder'
import { prepareArqweliaInpaintingCanvas } from './canvas-prep'
import { validateArqweliaGeneratedImage } from './output-validator'
import { restoreArqweliaInpaintingOutput } from './restore-output'
import {
  ArqweliaVisualEngine,
  ArqweliaVisualGenerateInput,
  ArqweliaVisualGenerateResult,
  ARQWELIA_VISUAL_ENGINE_ID,
  ARQWELIA_VISUAL_ENGINE_MODEL,
} from './visual-engine'

/**
 * The ComfyUI checkpoint is NOT resolved/installed for the first free
 * benchmark (the official repo is a multi-file Diffusers pipeline). The
 * preflight therefore BLOCKS until a VERIFIED checkpoint exists (source, real
 * name, size, SHA-256, license, CheckpointLoaderSimple compatibility).
 */
export const ARQWELIA_EXPECTED_COMFYUI_CHECKPOINT =
  'sdxl-inpainting-v1/sdxl-inpainting-0.1-fp16.safetensors'

export interface ArqweliaComfyUiEngineOptions {
  client?: ArqweliaComfyUiLocalClient
  baseUrl?: string
  fetchImpl?: typeof fetch
  expectedCheckpointName?: string
}

export class ArqweliaComfyUiInpaintingEngine implements ArqweliaVisualEngine {
  private readonly client: ArqweliaComfyUiLocalClient
  private readonly expectedCheckpointName: string

  constructor(opts: ArqweliaComfyUiEngineOptions = {}) {
    this.client =
      opts.client ??
      new ArqweliaComfyUiLocalClient({
        baseUrl: opts.baseUrl,
        fetchImpl: opts.fetchImpl ?? globalThis.fetch,
      })
    this.expectedCheckpointName = opts.expectedCheckpointName ?? ARQWELIA_EXPECTED_COMFYUI_CHECKPOINT
  }

  async generateConcept(input: ArqweliaVisualGenerateInput): Promise<ArqweliaVisualGenerateResult> {
    const started = Date.now()
    let promptId: string | null = null
    let timedOut = false
    let interrupted = false
    let interruptAttempted = false
    let interruptSucceeded = false

    const base = (status: ArqweliaVisualGenerateResult['status']): ArqweliaVisualGenerateResult => ({
      provider: ARQWELIA_VISUAL_ENGINE_ID,
      engine: ARQWELIA_VISUAL_ENGINE_MODEL,
      workflowVersion: ARQWELIA_SDXL_WORKFLOW_VERSION,
      promptId,
      status,
      externalPaidCalls: 0,
      providerCostEur: 0,
      outputPath: null,
      width: null,
      height: null,
      sourceSha256: input.normalizedImage.sha256,
      maskSha256: input.normalizedMask.sha256,
      durationMs: Date.now() - started,
      timedOut,
      interrupted,
      interruptAttempted,
      interruptSucceeded,
    })

    if (!input.normalizedImage || !input.normalizedImage.buffer) {
      return { ...base('failed'), error: 'missing normalized image' }
    }
    if (!input.normalizedMask || !input.normalizedMask.buffer) {
      return { ...base('failed'), error: 'missing normalized mask' }
    }
    if (!input.visualBrief) {
      return { ...base('failed'), error: 'missing visual brief' }
    }

    try {
      const safeDataset = String(input.datasetItemId || 'item').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 40)

      // 1) 1024x1024 working canvas (shared transform, revalidated mask).
      const canvas = await prepareArqweliaInpaintingCanvas(
        input.normalizedImage.buffer,
        input.normalizedMask.buffer,
      )

      // 2) BLOCKING PREFLIGHT — BEFORE any upload / workflow / queuePrompt.
      //    The unverified community checkpoint is not installed, so this blocks
      //    until a verified checkpoint exists (see ARQWELIA_EXPECTED_COMFYUI_CHECKPOINT).
      const preflight = await this.client.preflight(this.expectedCheckpointName)
      if (!preflight.reachable) {
        return { ...base('preflight_failed'), error: 'ComfyUI not reachable' }
      }
      if (!preflight.objectInfoAvailable) {
        return {
          ...base('preflight_failed'),
          error: `ComfyUI required nodes missing: ${preflight.objectInfoMissing.join(', ')}`,
        }
      }
      if (!preflight.checkpointAvailable) {
        return {
          ...base('preflight_failed'),
          error: `ComfyUI checkpoint not available: ${this.expectedCheckpointName} (unverified / not installed — first free execution path is the official Diffusers notebook)`,
        }
      }

      // 3) upload source + mask (both via /upload/image).
      const imageName = `src-${safeDataset}-${canvas.imageSha256.slice(0, 12)}.png`
      const maskName = `mask-${safeDataset}-${canvas.maskSha256.slice(0, 12)}.png`
      const imageUpload = await this.client.uploadInputImage(canvas.imageBuffer, imageName, imageName)
      const maskUpload = await this.client.uploadInputMaskImage(canvas.maskBuffer, maskName, maskName)

      // 4) build + graph-validate workflow.
      const workflow = buildArqweliaSdxlWorkflow({
        imageName: imageUpload.name,
        maskName: maskUpload.name,
        visualBrief: input.visualBrief,
        seed: input.seed,
        steps: input.steps,
        cfg: input.cfg,
        strength: input.strength,
      })

      // 5) queue ONE /prompt (from here promptId is authoritative).
      const queued = await this.client.queuePrompt(workflow)
      promptId = queued.prompt_id

      // 6) bounded polling. On timeout: single interrupt, no resubmit.
      let historyItem
      try {
        historyItem = await this.client.waitForCompletion(queued.prompt_id)
      } catch (error) {
        const message = String(error instanceof Error ? error.message : error)
        if (/did not complete within/.test(message)) {
          timedOut = true
          interruptAttempted = true
          try {
            await this.client.interrupt()
            interruptSucceeded = true
            interrupted = true
          } catch {
            interruptSucceeded = false
            interrupted = false
          }
          return { ...base('timed_out'), error: message }
        }
        return { ...base('failed'), error: message }
      }

      // 7) locate the output image in history (SaveImage outputs).
      let outputName: string | null = null
      let subfolder = ''
      let type = 'output'
      const outputs = historyItem.outputs ?? {}
      for (const [, nodeOutput] of Object.entries(outputs)) {
        const images = (nodeOutput as { images?: Array<{ filename?: string; subfolder?: string; type?: string }> })?.images
        if (images && images.length > 0) {
          outputName = images[0].filename ?? null
          subfolder = images[0].subfolder ?? ''
          type = images[0].type ?? 'output'
          break
        }
      }
      if (!outputName) {
        return { ...base('failed'), error: 'ComfyUI completed but history contains no output image' }
      }

      // 8) GET /view + REAL output validation (measured dims, PNG normalization).
      const view = await this.client.getView(outputName, subfolder, type)
      const validated = await validateArqweliaGeneratedImage(view.buffer, view.mimeType)
      if (!validated.ok) {
        return { ...base('failed'), error: validated.error }
      }

      // 9) restore to the ORIGINAL aspect ratio (no black padding bands).
      const restored = await restoreArqweliaInpaintingOutput({
        generatedCanvasBuffer: validated.buffer,
        mapping: canvas.mapping,
        originalSourceBuffer: input.normalizedImage.buffer,
        originalMaskBuffer: input.normalizedMask.buffer,
      })

      // 10) save the final PNG only (working canvas output sha recorded too).
      await mkdir(input.outputDirectory, { recursive: true })
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const outputPath = join(input.outputDirectory, `arqwelia-${safeDataset}-${stamp}.png`)
      await writeFile(outputPath, restored.buffer)

      return {
        ...base('succeeded'),
        outputPath,
        // width/height = the FINAL RESTORED FILE dimensions (outputPath is the
        // restored PNG, not the working canvas).
        width: restored.width,
        height: restored.height,
        workingOutputSha256: validated.sha256,
        workingWidth: validated.width,
        workingHeight: validated.height,
        finalOutputSha256: restored.sha256,
        finalWidth: restored.width,
        finalHeight: restored.height,
        restoredToOriginalAspect: true,
      }
    } catch (error) {
      return { ...base('failed'), error: String(error instanceof Error ? error.message : error) }
    }
  }
}

export function arqweliaOutputFileBaseName(path: string): string {
  return basename(path)
}
