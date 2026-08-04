/**
 * AQWELIA Lot 2 — local SDXL inpainting engine (POC).
 *
 * Implements `ArqweliaVisualEngine` using the local ComfyUI client + the
 * versioned SDXL inpainting workflow. One workflow = one generation: exactly
 * one POST /prompt, no automatic retry, bounded polling, stop after the first
 * result (success or failure).
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { ArqweliaComfyUiLocalClient } from './comfyui-local-client'
import { buildArqweliaSdxlWorkflow } from './comfyui-workflow-builder'
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
    const base: ArqweliaVisualGenerateResult = {
      provider: ARQWELIA_VISUAL_ENGINE_ID,
      engine: ARQWELIA_VISUAL_ENGINE_MODEL,
      workflowVersion: 'arqwelia-sdxl-inpainting-v1',
      promptId: null,
      status: 'not_run',
      externalPaidCalls: 0,
      providerCostEur: 0,
      outputPath: null,
      width: null,
      height: null,
      sourceSha256: input.normalizedImage.sha256,
      maskSha256: input.normalizedMask.sha256,
      durationMs: 0,
    }

    if (!input.normalizedImage || !input.normalizedImage.buffer) {
      return { ...base, status: 'failed', durationMs: Date.now() - started, error: 'missing normalized image' }
    }
    if (!input.normalizedMask || !input.normalizedMask.buffer) {
      return { ...base, status: 'failed', durationMs: Date.now() - started, error: 'missing normalized mask' }
    }
    if (!input.visualBrief) {
      return { ...base, status: 'failed', durationMs: Date.now() - started, error: 'missing visual brief' }
    }

    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const safeDataset = String(input.datasetItemId || 'item').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 40)
      const imageName = `src-${safeDataset}-${input.normalizedImage.sha256.slice(0, 12)}.png`
      const maskName = `mask-${safeDataset}-${input.normalizedMask.sha256.slice(0, 12)}.png`

      const imageUpload = await this.client.uploadImage(input.normalizedImage.buffer, imageName, { overwriteName: imageName })
      const maskUpload = await this.client.uploadImage(input.normalizedMask.buffer, maskName, { overwriteName: maskName })

      const workflow = buildArqweliaSdxlWorkflow({
        imageName: imageUpload.name,
        maskName: maskUpload.name,
        visualBrief: input.visualBrief,
        seed: input.seed,
        steps: input.steps,
        cfg: input.cfg,
        strength: input.strength,
      })

      const queued = await this.client.queuePrompt(workflow)
      const historyItem = await this.client.waitForCompletion(queued.prompt_id)

      // Locate the output image in the history (SaveImage outputs).
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
        throw new Error('ComfyUI completed but history contains no output image')
      }

      const view = await this.client.getView(outputName, subfolder, type)

      await mkdir(input.outputDirectory, { recursive: true })
      const outputPath = join(input.outputDirectory, `arqwelia-${safeDataset}-${stamp}.png`)
      await writeFile(outputPath, view.buffer)

      return {
        ...base,
        promptId: queued.prompt_id,
        status: 'succeeded',
        outputPath,
        width: input.normalizedImage.width,
        height: input.normalizedImage.height,
        durationMs: Date.now() - started,
      }
    } catch (error) {
      return {
        ...base,
        status: 'failed',
        durationMs: Date.now() - started,
        error: String(error instanceof Error ? error.message : error),
      }
    }
  }
}

export function arqweliaOutputFileBaseName(path: string): string {
  return basename(path)
}
