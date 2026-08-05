/**
 * AQWELIA Lot 2 — ComfyUI SDXL Inpainting workflow builder + graph validator.
 *
 * Loads the VERSIONED workflow JSON (workflows/arqwelia-sdxl-inpainting-v1.api.json)
 * and injects ONLY the controlled fields:
 *   - uploaded source image name, uploaded mask image name;
 *   - VisualBrief inpaintingPrompt + negativePrompt;
 *   - seed / steps / cfg / strength within closed bounds;
 *   - grow_mask_by within [4,16].
 *
 * The builder NEVER accepts a workflow supplied by the browser/caller and
 * rejects unexpected custom nodes (ComfyUI Core only for V1).
 *
 * GRAPH CONTRACT (true SDXL inpainting):
 *   - source LoadImage (node 12)  -> VAEEncodeForInpaint.pixels (node 15);
 *   - LoadImageMask (node 13, channel=red) -> VAEEncodeForInpaint.mask;
 *   - checkpoint VAE (4,2) -> VAEEncodeForInpaint.vae AND VAEDecode.vae;
 *   - VAEEncodeForInpaint (15) -> KSampler.latent_image (3);
 *   - KSampler (3) -> VAEDecode.samples (8);
 *   - VAEDecode (8) -> ImageCompositeMasked.source (16);
 *   - source LoadImage (12) -> ImageCompositeMasked.destination;
 *   - LoadImageMask (13) -> ImageCompositeMasked.mask;
 *   - ImageCompositeMasked (16) -> SaveImage.images (9);
 *   - NO EmptySD3LatentImage; NO IMAGE used as MASK; no disconnected nodes.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ArqweliaVisualBrief } from './deepseek-visual-planner'
import { assertComfyWorkflowUsesCoreOnly } from './comfyui-local-client'

export const ARQWELIA_SDXL_WORKFLOW_VERSION = 'arqwelia-sdxl-inpainting-v1'

export const ARQWELIA_WORKFLOW_STEPS_BOUNDS = { min: 15, max: 35 } as const
export const ARQWELIA_WORKFLOW_CFG_BOUNDS = { min: 4, max: 10 } as const
export const ARQWELIA_WORKFLOW_STRENGTH_BOUNDS = { min: 0.55, max: 0.95 } as const
export const ARQWELIA_WORKFLOW_GROW_MASK_BOUNDS = { min: 4, max: 16 } as const
export const ARQWELIA_WORKFLOW_SEED_MAX = 4294967295

export const ARQWELIA_WORKFLOW_NODE_IDS = Object.freeze({
  checkpoint: '4',
  positiveEncode: '6',
  negativeEncode: '7',
  sourceImage: '12',
  sourceMask: '13',
  vaeEncodeForInpaint: '15',
  sampler: '3',
  vaeDecode: '8',
  composite: '16',
  saveImage: '9',
})

export interface ArqweliaWorkflowBuildInput {
  imageName: string
  maskName: string
  visualBrief: ArqweliaVisualBrief
  seed?: number
  steps?: number
  cfg?: number
  strength?: number
  growMaskBy?: number
}

type WorkflowNode = { class_type?: string; inputs?: Record<string, unknown> }
type WorkflowNodes = Record<string, WorkflowNode>

// ---------------------------------------------------------------------------
// Controlled value clamping.
// ---------------------------------------------------------------------------

function clampWithin(value: number, bounds: { min: number; max: number }, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`ComfyUI workflow: ${label} must be a finite number`)
  }
  if (value < bounds.min || value > bounds.max) {
    throw new Error(`ComfyUI workflow: ${label} (${value}) is outside bounds ${bounds.min}..${bounds.max}`)
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

// ---------------------------------------------------------------------------
// Graph connectivity validation (pure).
// ---------------------------------------------------------------------------

/**
 * Per-node output types (ComfyUI Core, output index -> ComfyUI type).
 */
const NODE_OUTPUT_TYPES: Record<string, string[]> = {
  CheckpointLoaderSimple: ['MODEL', 'CLIP', 'VAE'],
  CLIPTextEncode: ['CONDITIONING'],
  LoadImage: ['IMAGE', 'MASK'],
  LoadImageMask: ['MASK'],
  VAEEncodeForInpaint: ['LATENT'],
  KSampler: ['LATENT'],
  VAEDecode: ['IMAGE'],
  ImageCompositeMasked: ['IMAGE'],
  SaveImage: [],
}

/**
 * Per-node input slots and their required ComfyUI type. `image`-style string
 * inputs are excluded (they carry file names, not links).
 */
const NODE_INPUT_TYPES: Record<string, Record<string, string>> = {
  CheckpointLoaderSimple: {},
  CLIPTextEncode: { clip: 'CLIP' },
  LoadImage: {},
  LoadImageMask: {},
  VAEEncodeForInpaint: { pixels: 'IMAGE', vae: 'VAE', mask: 'MASK' },
  KSampler: { model: 'MODEL', positive: 'CONDITIONING', negative: 'CONDITIONING', latent_image: 'LATENT' },
  VAEDecode: { samples: 'LATENT', vae: 'VAE' },
  ImageCompositeMasked: { destination: 'IMAGE', source: 'IMAGE', mask: 'MASK' },
  SaveImage: { images: 'IMAGE' },
}

function assertSafeNodeId(nodeId: string): string {
  if (!/^\d+$/.test(String(nodeId))) {
    throw new Error(`ComfyUI workflow: invalid node id "${String(nodeId)}"`)
  }
  return String(nodeId)
}

export interface ArqweliaWorkflowGraphReport {
  ok: boolean
  issues: string[]
  links: Array<{ from: string; fromIndex: number; to: string; input: string; fromType: string; toType: string }>
}

/**
 * PURE structural validator that proves the workflow is a true SDXL inpainting
 * graph. Throws on the first contract violation; also returns a full report.
 */
export function validateArqweliaSdxlWorkflowGraph(workflow: WorkflowNodes): ArqweliaWorkflowGraphReport {
  const issues: string[] = []
  const links: ArqweliaWorkflowGraphReport['links'] = []

  if (!workflow || typeof workflow !== 'object') {
    return { ok: false, issues: ['workflow must be an object of nodes'], links }
  }

  // Required node ids must be present.
  for (const [label, nodeId] of Object.entries(ARQWELIA_WORKFLOW_NODE_IDS)) {
    if (!workflow[nodeId]) {
      issues.push(`missing required node "${label}" (id ${nodeId})`)
    }
  }

  // No EmptySD3LatentImage (SD3 latent is incompatible with SDXL).
  for (const [id, node] of Object.entries(workflow)) {
    if (node?.class_type === 'EmptySD3LatentImage') {
      issues.push(`node ${id} uses forbidden EmptySD3LatentImage`)
    }
  }

  const { checkpoint, sourceImage, sourceMask, vaeEncodeForInpaint, sampler, vaeDecode, composite, saveImage } = ARQWELIA_WORKFLOW_NODE_IDS

  const expectLink = (from: string, fromIndex: number, to: string, input: string, label: string): void => {
    const node = workflow[to]
    if (!node) {
      issues.push(`link target ${to}.${input} missing (${label})`)
      return
    }
    const value = (node.inputs ?? {})[input]
    if (!Array.isArray(value)) {
      issues.push(`node ${to}.${input} is not a link (${label})`)
      return
    }
    const [srcIdRaw, srcIdx] = value as [unknown, unknown]
    const srcId = assertSafeNodeId(String(srcIdRaw))
    const fromIndexNum = Number(srcIdx)
    const fromNode = workflow[srcId]
    const fromTypes = fromNode ? NODE_OUTPUT_TYPES[fromNode.class_type ?? ''] ?? [] : []
    const fromType = fromTypes[fromIndexNum]
    const toNode = workflow[to]
    const toTypes = toNode ? NODE_INPUT_TYPES[toNode.class_type ?? ''] ?? {} : {}
    const toType = toTypes[input]
    links.push({
      from: srcId,
      fromIndex: fromIndexNum,
      to,
      input,
      fromType: fromType ?? 'UNKNOWN',
      toType: toType ?? 'UNKNOWN',
    })
    if (srcId !== from) {
      issues.push(`link ${label}: expected source ${from}, got ${srcId}`)
    }
    if (fromType !== toType) {
      issues.push(`link ${label}: type mismatch ${fromType} -> ${toType}`)
    }
  }

  // A. source image -> VAEEncodeForInpaint.pixels
  expectLink(sourceImage, 0, vaeEncodeForInpaint, 'pixels', 'source->vaeEncode.pixels')
  // B. mask (LoadImageMask, real MASK) -> VAEEncodeForInpaint.mask
  expectLink(sourceMask, 0, vaeEncodeForInpaint, 'mask', 'mask->vaeEncode.mask')
  // C. checkpoint VAE (output 2) -> VAEEncodeForInpaint.vae AND VAEDecode.vae
  expectLink(checkpoint, 2, vaeEncodeForInpaint, 'vae', 'checkpointVae->vaeEncode.vae')
  expectLink(checkpoint, 2, vaeDecode, 'vae', 'checkpointVae->vaeDecode.vae')
  // D. VAEEncodeForInpaint -> KSampler.latent_image
  expectLink(vaeEncodeForInpaint, 0, sampler, 'latent_image', 'vaeEncode->sampler.latent_image')
  // E. KSampler -> VAEDecode.samples
  expectLink(sampler, 0, vaeDecode, 'samples', 'sampler->vaeDecode.samples')
  // F. VAEDecode -> ImageCompositeMasked.source
  expectLink(vaeDecode, 0, composite, 'source', 'vaeDecode->composite.source')
  // G. source image -> ImageCompositeMasked.destination
  expectLink(sourceImage, 0, composite, 'destination', 'source->composite.destination')
  // H. mask -> ImageCompositeMasked.mask
  expectLink(sourceMask, 0, composite, 'mask', 'mask->composite.mask')
  // I. SaveImage receives ONLY the composite output
  expectLink(composite, 0, saveImage, 'images', 'composite->saveImage.images')

  // No disconnected nodes: every node must be reachable or a required leaf.
  const reachable = new Set<string>()
  for (const node of Object.values(workflow)) {
    for (const value of Object.values(node?.inputs ?? {})) {
      if (Array.isArray(value)) reachable.add(assertSafeNodeId(String(value[0])))
    }
  }
  for (const [id] of Object.entries(workflow)) {
    const requiredIds: string[] = Object.values(ARQWELIA_WORKFLOW_NODE_IDS)
    if (!reachable.has(id) && !requiredIds.includes(id) && id !== saveImage) {
      issues.push(`node ${id} is disconnected (no incoming link)`)
    }
  }

  return { ok: issues.length === 0, issues, links }
}

export function assertArqweliaSdxlWorkflowGraph(workflow: WorkflowNodes): true {
  const report = validateArqweliaSdxlWorkflowGraph(workflow)
  if (!report.ok) {
    throw new Error(`ComfyUI workflow graph invalid: ${report.issues.join('; ')}`)
  }
  return true
}

// ---------------------------------------------------------------------------
// Builder.
// ---------------------------------------------------------------------------

/**
 * Loads the versioned workflow JSON, validates the graph contract, and injects
 * the controlled fields. Refuses arbitrary caller-supplied workflows by
 * construction (the workflow always comes from the versioned file).
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
  const sourceNodes = (parsed.nodes ?? {}) as WorkflowNodes
  assertComfyWorkflowUsesCoreOnly(sourceNodes)

  const imageName = assertSafeFilenamePart(input.imageName, 'image')
  const maskName = assertSafeFilenamePart(input.maskName, 'mask')
  const brief = input.visualBrief

  const steps = clampWithin(input.steps ?? brief.recommended.steps, ARQWELIA_WORKFLOW_STEPS_BOUNDS, 'steps')
  const cfg = clampWithin(input.cfg ?? brief.recommended.cfg, ARQWELIA_WORKFLOW_CFG_BOUNDS, 'cfg')
  const strength = clampWithin(input.strength ?? brief.recommended.strength, ARQWELIA_WORKFLOW_STRENGTH_BOUNDS, 'strength')
  const growMaskBy = clampWithin(input.growMaskBy ?? 8, ARQWELIA_WORKFLOW_GROW_MASK_BOUNDS, 'grow_mask_by')
  const seedRaw = input.seed ?? brief.recommended.seed
  if (!Number.isInteger(seedRaw) || seedRaw < 0 || seedRaw > ARQWELIA_WORKFLOW_SEED_MAX) {
    throw new Error(`ComfyUI workflow: seed must be a non-negative integer <= ${ARQWELIA_WORKFLOW_SEED_MAX}`)
  }

  // Deep clone so the versioned source is never mutated.
  const out = JSON.parse(JSON.stringify(sourceNodes)) as WorkflowNodes

  // Graph contract validation on the injected clone.
  assertArqweliaSdxlWorkflowGraph(out)

  out[ARQWELIA_WORKFLOW_NODE_IDS.sourceImage].inputs!.image = imageName
  out[ARQWELIA_WORKFLOW_NODE_IDS.sourceMask].inputs!.image = maskName
  out[ARQWELIA_WORKFLOW_NODE_IDS.positiveEncode].inputs!.text = brief.inpaintingPrompt
  out[ARQWELIA_WORKFLOW_NODE_IDS.negativeEncode].inputs!.text = brief.negativePrompt
  out[ARQWELIA_WORKFLOW_NODE_IDS.vaeEncodeForInpaint].inputs!.grow_mask_by = growMaskBy
  out[ARQWELIA_WORKFLOW_NODE_IDS.sampler].inputs!.seed = seedRaw
  out[ARQWELIA_WORKFLOW_NODE_IDS.sampler].inputs!.steps = steps
  out[ARQWELIA_WORKFLOW_NODE_IDS.sampler].inputs!.cfg = cfg
  out[ARQWELIA_WORKFLOW_NODE_IDS.sampler].inputs!.denoise = strength

  return out
}
