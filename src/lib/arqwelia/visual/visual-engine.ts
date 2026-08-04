/**
 * AQWELIA Lot 2 — visual engine contract (POC).
 *
 * Common interface for producing a Concept image from a normalized source
 * image + normalized mask + a VisualBrief. The POC engine is
 * `comfyui-local` + `sdxl-inpainting`. Later engines can swap in without
 * changing the VisualBrief contract.
 *
 * IMPORTANT: a local GPU generation still consumes compute resources. We do
 * NOT claim it is free of cost — we only report that there is NO per-image
 * provider API charge.
 */

import { ArqweliaVisualBrief } from './deepseek-visual-planner'

export const ARQWELIA_VISUAL_ENGINE_ID = 'comfyui-local'
export const ARQWELIA_VISUAL_ENGINE_MODEL = 'sdxl-inpainting'

export interface ArqweliaNormalizedImage {
  buffer: Buffer
  mimeType: string
  width: number
  height: number
  sha256: string
}

export interface ArqweliaNormalizedMask {
  buffer: Buffer
  width: number
  height: number
  sha256: string
}

export interface ArqweliaVisualGenerateInput {
  normalizedImage: ArqweliaNormalizedImage
  normalizedMask: ArqweliaNormalizedMask
  visualBrief: ArqweliaVisualBrief
  concept: 'A' | 'B'
  datasetItemId: string
  outputDirectory: string
  seed?: number
  steps?: number
  cfg?: number
  strength?: number
}

export type ArqweliaVisualGenerateStatus =
  | 'not_run'
  | 'preflight_failed'
  | 'queued'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'timed_out'
  | 'interrupted'

export interface ArqweliaVisualGenerateResult {
  provider: 'comfyui-local'
  engine: 'sdxl-inpainting'
  workflowVersion: string
  promptId: string | null
  status: ArqweliaVisualGenerateStatus
  externalPaidCalls: 0
  providerCostEur: 0
  outputPath: string | null
  width: number | null
  height: number | null
  sourceSha256: string
  maskSha256: string
  durationMs: number
  error?: string
  timedOut?: boolean
  interrupted?: boolean
  interruptAttempted?: boolean
  interruptSucceeded?: boolean
  /** Working canvas output (1024x1024) sha256 — set on success. */
  workingOutputSha256?: string
  /** Final output (original aspect ratio) sha256 — set on success. */
  finalOutputSha256?: string
  /** Final output measured dimensions (original aspect ratio). */
  finalWidth?: number
  finalHeight?: number
  /** True when the final output was produced at the ORIGINAL aspect ratio. */
  restoredToOriginalAspect?: boolean
}

export interface ArqweliaVisualEngine {
  generateConcept(input: ArqweliaVisualGenerateInput): Promise<ArqweliaVisualGenerateResult>
}
