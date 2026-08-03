/**
 * ARQWELIA Lot 2 Phase 0A — Z.ai GLM image-edit adapter (benchmark only).
 *
 * id: `zai-glm`. Model: `tbd` — NOT verified.
 *
 * MODEL STATUS (verified during Phase 0A provisioning):
 *   - `z-ai-web-dev-sdk` v0.0.18 `CreateImageEditBody.model` is OPTIONAL and
 *     `createImageEdit(body)` forwards `{ ...body }` unchanged — the SDK never
 *     injects a default edit model.
 *   - No `glm` string / default edit model constant exists anywhere in the SDK
 *     `dist/` (verified by grep; the README documents only
 *     `images.generations.create`, not `edit`).
 *   => the concrete edit model string cannot be proven from the SDK, so the
 *   candidate keeps `model: 'tbd'` with `blocked_missing_capability` for the
 *   exact model string. The real model string must be confirmed from the
 *   Z.ai console before any authorized execution.
 *
 * CONFIG: the SDK loads a `.z-ai-config` file (project cwd → home → /etc) and
 * does NOT read `Z_AI_API_KEY` from env directly. For the smoke harness this
 * adapter therefore validates a config source as present when a project/home
 * `.z-ai-config` file exists OR when `ZAI_BASE_URL` + `Z_AI_API_KEY` are both
 * provided (the harness can materialize a config file from those env vars
 * before an authorized run — never on a dry run).
 *
 * SAFETY: the real SDK is NEVER imported or called here. Transport is
 * injectable; the default transport throws NOT IMPLEMENTED. Real transport is
 * blocked unless ALL THREE gates are open (see `ensurePhase0AGate`). Tests
 * always inject a mock transport and never touch the network.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import sharp from 'sharp'
import {
  ArqweliaProviderError,
  ensureNoRealCall,
  ensurePhase0AGate,
} from '../candidates-registry.mjs'
import { assertPromptPiiFree, PiiGuardError } from '../prompts/pii-guard.ts'

/** Candidate id resolved by the CLI (`--provider zai-glm`). */
export const ZAI_ADAPTER_ID = 'zai-glm'

/** Model is `tbd` because the SDK exposes no provable default edit model. */
export const ZAI_MODEL = 'tbd'

/** Z.ai output is a base64-encoded PNG (per SDK response shape). */
export const ZAI_OUTPUT_FORMAT = 'png'

function sanitizeSegment(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'x'
}

function configFileExists() {
  return (
    existsSync(join(process.cwd(), '.z-ai-config')) ||
    existsSync(join(homedir(), '.z-ai-config')) ||
    existsSync('/etc/.z-ai-config')
  )
}

/**
 * @param {{ normalizedImageBuffer?: Buffer, normalizedImageDataUrl?: string, builtPrompt?: string, model?: string, size?: string }} input
 * @returns {object} the exact JSON body the SDK `images.generations.edit` call
 * would receive — built WITHOUT calling the SDK (unit-test seam).
 */
export function prepareRequest({ normalizedImageBuffer, normalizedImageDataUrl, builtPrompt, model, size } = {}) {
  if (!builtPrompt) {
    throw new ArqweliaProviderError('z-ai: no built prompt provided', {
      externalCalls: 0,
      actualCostEur: 0,
      billingStatus: 'not_called',
    })
  }
  const image = normalizedImageDataUrl ?? (normalizedImageBuffer ? `data:image/jpeg;base64,${normalizedImageBuffer.toString('base64')}` : undefined)
  if (!image) {
    throw new ArqweliaProviderError('z-ai: no normalized image provided', {
      externalCalls: 0,
      actualCostEur: 0,
      billingStatus: 'not_called',
    })
  }
  const body = { model, prompt: builtPrompt, image }
  if (size) body.size = size
  return body
}

function defaultTransport() {
  throw new ArqweliaProviderError('NOT IMPLEMENTED — awaiting Phase 0A execution: z-ai image-edit transport not injected', {
    externalCalls: 0,
    actualCostEur: 0,
    billingStatus: 'not_called',
  })
}

export const zaiImageAdapter = {
  id: ZAI_ADAPTER_ID,
  model: ZAI_MODEL,
  supportsImageEditing: true,
  dryRunSafe: false,
  state: 'ready_for_authorized_smoke',
  prepareRequest,
  dryRunDescription:
    'Z.ai GLM candidate (model tbd — not verified from SDK) — image-to-image edit via z-ai-web-dev-sdk images.generations.edit (JSON body, base64 PNG out); requires a .z-ai-config file or ZAI_BASE_URL + Z_AI_API_KEY env for the smoke harness.',
  validateConfiguration() {
    if (configFileExists() || (process.env.ZAI_BASE_URL && process.env.Z_AI_API_KEY)) {
      return { ok: true }
    }
    return { ok: false, reason: 'Z.ai config missing (no .z-ai-config file and no ZAI_BASE_URL+Z_AI_API_KEY env)' }
  },
  estimateOfficialCost() {
    return { known: false, note: 'UNKNOWN — TO BE MEASURED IN LOT 0' }
  },
  async runSmoke(opts) {
    const phase0aExecute = opts.phase0aExecute ?? (process.env.ARQWELIA_BENCHMARK_PHASE0A_EXECUTE === 'true')
    // THREE-GATE BLOCK: real transport is impossible without all three.
    ensurePhase0AGate({
      realCallAuthorized: opts.realCallAuthorized,
      budgetMaxEur: opts.budgetMaxEur,
      phase0aExecute,
    })
    ensureNoRealCall({ realCallAuthorized: opts.realCallAuthorized, budgetMaxEur: opts.budgetMaxEur })

    if (opts.imagePath !== undefined) {
      throw new ArqweliaProviderError('z-ai: adapter must receive ONLY normalized fields (no imagePath)', {
        externalCalls: 0,
        actualCostEur: 0,
        billingStatus: 'not_called',
      })
    }
    if (!opts.builtPrompt) {
      throw new ArqweliaProviderError('z-ai: no built prompt provided', {
        externalCalls: 0,
        actualCostEur: 0,
        billingStatus: 'not_called',
      })
    }
    try {
      assertPromptPiiFree(opts.builtPrompt)
    } catch (error) {
      if (error instanceof PiiGuardError) {
        throw new ArqweliaProviderError('Prompt rejected by the PII guard', {
          externalCalls: 0,
          actualCostEur: 0,
          billingStatus: 'not_called',
        })
      }
      throw error
    }

    const body = prepareRequest({
      normalizedImageBuffer: opts.normalizedImageBuffer,
      normalizedImageDataUrl: opts.normalizedImageDataUrl,
      builtPrompt: opts.builtPrompt,
      model: opts.model,
      size: opts.size,
    })

    const started = Date.now()
    const transport = opts.transport ?? defaultTransport
    let response
    try {
      response = await transport(body)
    } catch (error) {
      // Preserve an ArqweliaProviderError (e.g. the default NOT IMPLEMENTED
      // transport) so its carried billing survives; generic transport errors
      // are sanitized (never echo secrets/paths) and billed conservatively.
      if (error instanceof ArqweliaProviderError) throw error
      throw new ArqweliaProviderError('z-ai edit transport failed', {
        externalCalls: 1,
        actualCostEur: null,
        billingStatus: 'unknown',
      })
    }
    const base64 = response && response.data && response.data[0] ? response.data[0].base64 : null
    if (!base64) {
      throw new ArqweliaProviderError('z-ai edit response missing base64 image', {
        externalCalls: 1,
        actualCostEur: null,
        billingStatus: 'unknown',
      })
    }

    const png = Buffer.from(base64, 'base64')
    await mkdir(opts.outDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputPath = join(opts.outDir, `${sanitizeSegment(opts.providerId)}-${sanitizeSegment(opts.model)}-${stamp}.png`)
    await writeFile(outputPath, png)

    let outputWidth
    let outputHeight
    try {
      const meta = await sharp(png).metadata()
      outputWidth = meta.width
      outputHeight = meta.height
    } catch {
      // Geometry is informational; never fail a valid base64 decode on it.
    }

    return {
      providerId: opts.providerId,
      model: opts.model,
      ok: true,
      externalCalls: 1,
      actualCostEur: null,
      billingStatus: 'unknown',
      officialPricingSource: null,
      durationMs: Date.now() - started,
      outputWidth,
      outputHeight,
      outputPath,
    }
  },
}
