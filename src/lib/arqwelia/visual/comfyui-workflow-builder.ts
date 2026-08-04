/**
 * AQWELIA Lot 2 — ComfyUI workflow builder (SDXL Inpainting v1).
 *
 * Loads the VERSIONED workflow JSON (workflows/arqwelia-sdxl-inpainting-v1.api.json)
 * and injects ONLY the controlled fields:
 *   - uploaded image name, uploaded mask name;
 *   - VisualBrief inpaintingPrompt + negativePrompt;
 *   - seed / steps / cfg / strength within closed bounds.
 *
 * The builder NEVER accepts a workflow supplied by the browser/caller and
 * rejects unexpected custom nodes (ComfyUI Core only for V1).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ArqweliaVisualBrief } from './deepseek-visual-planner'
import { assertComfyWorkflowUsesCoreOnly } from './comfyui-local-client'

export const ARQWELIA_SDXL_WORKFLOW_VERSION = 'arqwelia-sdxl-inpainting-v1'

export const ARQWELIA_WORKFLOW_STEPS_BOUNDS = { min: 15, max: 35 } as const
export const ARQWELIA_WORKFLOW_CFG_BOUNDS = { min: 4, max: 10 } as const
export const ARQWELIA_WORKFLOW_STRENGTH_BOUNDS = { min: 0.55, max: 0.95 } as const
export const ARQWELIA_WORKFLOW_SEED_MAX = 4294967295

export interface ArqweliaWorkflowBuildInput {
  imageName: string
  maskName: string
  visualBrief: ArqweliaVisualBrief
  seed?: number
  steps?: number
  cfg?: number
  strength?: number
}

function clampWithin(value: number, bounds: { min: number; max: number }, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`ComfyUI workflow: ${label} must be a finite number`)
  }
  if (value < bounds.min || value > bounds.max) {
    throw new Error(
      `ComfyUI workflow: ${label} (${value}) is outside bounds ${bounds.min}..${bounds.max}`,
    )
  }
  return value
}

function assertSafeFilenamePart(value: string, label: string): string {
  const name = String(value ?? '')
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new Error(`ComfyUI workflow: invalid ${label} name`)
  }
  return name
}

/**
 * Loads the versioned workflow JSON, deep-clones it, and injects the controlled
 * fields. Refuses arbitrary caller-supplied workflows by construction (the
 * workflow always comes from the versioned file).
 */
export function buildArqweliaSdxlWorkflow(input: ArqweliaWorkflowBuildInput): Record<string, unknown> {
  const workflowPath = join(process.cwd(), 'workflows', `${ARQWELIA_SDXL_WORKFLOW_VERSION}.api.json`)
  let raw: string
  try {
    raw = readFileSync(workflowPath, 'utf8')
  } catch {
    throw new Error(`ComfyUI workflow: cannot read ${workflowPath}`)
  }
  const parsed = JSON.parse(raw) as Record<string, unknown>
  const nodes = (parsed.nodes ?? {}) as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>
  assertComfyWorkflowUsesCoreOnly(nodes)

  const imageName = assertSafeFilenamePart(input.imageName, 'image')
  const maskName = assertSafeFilenamePart(input.maskName, 'mask')
  const brief = input.visualBrief

  const steps = clampWithin(input.steps ?? brief.recommended.steps, ARQWELIA_WORKFLOW_STEPS_BOUNDS, 'steps')
  const cfg = clampWithin(input.cfg ?? brief.recommended.cfg, ARQWELIA_WORKFLOW_CFG_BOUNDS, 'cfg')
  const strength = clampWithin(input.strength ?? brief.recommended.strength, ARQWELIA_WORKFLOW_STRENGTH_BOUNDS, 'strength')
  const seedRaw = input.seed ?? brief.recommended.seed
  if (!Number.isInteger(seedRaw) || seedRaw < 0 || seedRaw > ARQWELIA_WORKFLOW_SEED_MAX) {
    throw new Error(`ComfyUI workflow: seed must be a non-negative integer <= ${ARQWELIA_WORKFLOW_SEED_MAX}`)
  }

  // Deep clone so the versioned source is never mutated.
  const out = JSON.parse(JSON.stringify(nodes)) as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>

  out['12'].inputs!.image = imageName
  out['13'].inputs!.image = maskName
  out['6'].inputs!.text = brief.inpaintingPrompt
  out['7'].inputs!.text = brief.negativePrompt
  out['3'].inputs!.seed = seedRaw
  out['3'].inputs!.steps = steps
  out['3'].inputs!.cfg = cfg
  out['3'].inputs!.denoise = strength

  return out
}
