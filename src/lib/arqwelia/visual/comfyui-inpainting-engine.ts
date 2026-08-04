/**
 * AQWELIA Lot 2 — local SDXL inpainting engine (POC).
 *
 * Implements `ArqweliaVisualEngine` using the local ComfyUI client + the
 * versioned SDXL inpainting workflow. One workflow = one generation: exactly
 * one POST /prompt, no automatic retry, bounded polling, stop after the first
 * result (success or failure).
 *
 * PIPELINE:
 *   1. prepareArqweliaInpaintingCanvas (1024x1024 working canvas, shared
 *      proportional transform for source + mask, nearest mask);
 *   2. upload source via /upload/image and mask via /upload/image;
 *   3. build + graph-validate the versioned workflow;
 *   4. preflight (read-only) then queue ONE /prompt;
 *   5. bounded polling; on timeout call POST /interrupt ONCE (no resubmit);
 *   6. GET /view + real output validation (sharp decode, real dims, meta strip,
 *      SHA-256); invalid output => failed, never saved.
 *
 * STATUS MODEL: not_run | preflight_failed | queued | processing | succeeded |
 * failed | timed_out | interrupted. promptId is preserved as soon as /prompt
 * accepts it — it is never lost on a later error.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { ArqweliaComfyUiLocalClient } from './comfyui-local-client'
import {
  ARQWELIA_SDXL_WORKFLOW_VERSION,
  ARQWELIA_WORKFLOW_NODE_IDS,
  buildArqweliaSdxlWorkflow,
} from './comfyui-workflow-builder'
import { prepareArqweliaInpaintingCanvas } from './canvas-prep'
import { validateArqweliaGeneratedImage } from './output-validator'
import {
  ArqweliaVisualEngine,
  ArqweliaVisualGenerateInput,
  ArqweliaVisualGenerateResult,
  ARQWELIA_VISUAL_ENGINE_ID,
  ARQWELIA_VISUAL_ENGINE_MODEL,
} from './visual-engine'

export interface ArqweliaComfyUiEngineOptions {
  client?: ArqweliaComfyUiLocalClient
  baseUrl?: string
  fetchImpl?: typeof fetch
}

export class ArqweliaComfyUiInpaintingEngine implements ArqweliaVisualEngine {
  private readonly client: ArqweliaComfyUiLocalClient

  constructor(opts: ArqweliaComfyUiEngineOptions = {}) {
    this.client =
      opts.client ??
      new ArqweliaComfyUiLocalClient({
        baseUrl: opts.baseUrl,
        fetchImpl: opts.fetchImpl ?? globalThis.fetch,
      })
  }

  async generateConcept(input: ArqweliaVisualGenerateInput): Promise<ArqweliaVisualGenerateResult> {
    const started = Date.now()
    let promptId: string | null = null
    let timedOut = false
    let interrupted = false

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

      // 2) upload source + mask (both via /upload/image).
      const imageName = `src-${safeDataset}-${canvas.imageSha256.slice(0, 12)}.png`
      const maskName = `mask-${safeDataset}-${canvas.maskSha256.slice(0, 12)}.png`
      const imageUpload = await this.client.uploadInputImage(canvas.imageBuffer, imageName, imageName)
      const maskUpload = await this.client.uploadInputMaskImage(canvas.maskBuffer, maskName, maskName)

      // 3) build + graph-validate workflow.
      const workflow = buildArqweliaSdxlWorkflow({
        imageName: imageUpload.name,
        maskName: maskUpload.name,
        visualBrief: input.visualBrief,
        seed: input.seed,
        steps: input.steps,
        cfg: input.cfg,
        strength: input.strength,
      })

      // 4) queue ONE /prompt (from here promptId is authoritative).
      const queued = await this.client.queuePrompt(workflow)
      promptId = queued.prompt_id

      // 5) bounded polling. On timeout: single interrupt, no resubmit.
      let historyItem
      try {
        historyItem = await this.client.waitForCompletion(queued.prompt_id)
      } catch (error) {
        const message = String(error instanceof Error ? error.message : error)
        if (/did not complete within/.test(message)) {
          timedOut = true
          interrupted = true
          try {
            await this.client.interrupt()
          } catch {
            // interrupt is best-effort; the timeout is still reported.
          }
          return { ...base('timed_out'), error: message }
        }
        return { ...base('failed'), error: message }
      }

      // 6) locate the output image in history (SaveImage outputs).
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

      // 7) GET /view + REAL output validation (measured dims, never source dims).
      const view = await this.client.getView(outputName, subfolder, type)
      const validated = await validateArqweliaGeneratedImage(view.buffer, view.mimeType)
      if (!validated.ok) {
        return { ...base('failed'), error: validated.error }
      }

      // 8) save the validated output only.
      await mkdir(input.outputDirectory, { recursive: true })
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const outputPath = join(input.outputDirectory, `arqwelia-${safeDataset}-${stamp}.png`)
      await writeFile(outputPath, validated.buffer)

      return {
        ...base('succeeded'),
        outputPath,
        width: validated.width,
        height: validated.height,
      }
    } catch (error) {
      return { ...base('failed'), error: String(error instanceof Error ? error.message : error) }
    }
  }
}

export function arqweliaOutputFileBaseName(path: string): string {
  return basename(path)
}

export { ARQWELIA_WORKFLOW_NODE_IDS }
