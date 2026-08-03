/**
 * ARQWELIA Lot 2 Phase 0A — OpenAI GPT Image image-edit adapter (benchmark only).
 *
 * id: `openai-gpt-image`. Model: `gpt-image-1` (documented official model).
 *
 * METHOD: the official Images API `POST https://api.openai.com/v1/images/edits`
 * with `multipart/form-data`: a file part `image`, plus `prompt` and `model`
 * (and optional `size`). `gpt-image-1` returns a base64-encoded PNG
 * (`b64_json`) by default at 1024x1024 / 1536x1024 / 1024x1536. The adapter
 * documents this official contract without hard-coding assumptions beyond it.
 *
 * COMPLIANCE (EU): data retention and processing region for OpenAI image edits
 * MUST be verified before any authorized run — no assumption is hard-coded.
 *
 * SAFETY: no network here. Transport is injectable; the default transport
 * throws NOT IMPLEMENTED. Real transport is blocked unless ALL THREE gates are
 * open (see `ensurePhase0AGate`). Tests always inject a mock transport and
 * never touch the network. API keys are never printed or stored.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import {
  ArqweliaProviderError,
  ensureNoRealCall,
  ensurePhase0AGate,
} from '../candidates-registry.mjs'
import { assertPromptPiiFree, PiiGuardError } from '../prompts/pii-guard.ts'

/** Candidate id resolved by the CLI (`--provider openai-gpt-image`). */
export const OPENAI_ADAPTER_ID = 'openai-gpt-image'

/** Documented official model for image editing. */
export const OPENAI_IMAGE_EDIT_MODEL = 'gpt-image-1'

/** Official images/edits endpoint. */
export const OPENAI_IMAGES_EDIT_ENDPOINT = 'https://api.openai.com/v1/images/edits'

function sanitizeSegment(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'x'
}

/**
 * Builds the `multipart/form-data` payload descriptor for the official
 * images/edits contract: `image` (file), `model`, `prompt` and optional
 * `size`. No network. Returns a plain, unit-testable descriptor plus a
 * `toFormData()` helper that produces a real `FormData` object.
 *
 * @param {{ normalizedImageBuffer?: Buffer, builtPrompt?: string, model?: string, size?: string }} input
 */
export function prepareMultipartBody({ normalizedImageBuffer, builtPrompt, model, size } = {}) {
  if (!builtPrompt) {
    throw new ArqweliaProviderError('openai: no built prompt provided', {
      externalCalls: 0,
      actualCostEur: 0,
      billingStatus: 'not_called',
    })
  }
  if (!normalizedImageBuffer) {
    throw new ArqweliaProviderError('openai: no normalized image buffer provided', {
      externalCalls: 0,
      actualCostEur: 0,
      billingStatus: 'not_called',
    })
  }
  const parts = [
    { name: 'image', filename: 'image.jpg', contentType: 'image/jpeg', value: normalizedImageBuffer },
    { name: 'model', value: model ?? OPENAI_IMAGE_EDIT_MODEL },
    { name: 'prompt', value: builtPrompt },
  ]
  if (size) parts.push({ name: 'size', value: size })
  return {
    method: 'POST',
    endpoint: OPENAI_IMAGES_EDIT_ENDPOINT,
    contentType: 'multipart/form-data',
    parts,
    toFormData() {
      return buildFormData(parts)
    },
  }
}

function buildFormData(parts) {
  const form = new FormData()
  for (const part of parts) {
    if (part.filename != null) {
      form.append(part.name, new Blob([part.value], { type: part.contentType }), part.filename)
    } else {
      form.append(part.name, String(part.value))
    }
  }
  return form
}

function defaultTransport() {
  throw new ArqweliaProviderError('NOT IMPLEMENTED — awaiting Phase 0A execution: openai images/edits transport not injected', {
    externalCalls: 0,
    actualCostEur: 0,
    billingStatus: 'not_called',
  })
}

export const openaiImageAdapter = {
  id: OPENAI_ADAPTER_ID,
  model: OPENAI_IMAGE_EDIT_MODEL,
  supportsImageEditing: true,
  dryRunSafe: false,
  state: 'ready_for_authorized_smoke',
  prepareMultipartBody,
  dryRunDescription:
    'OpenAI GPT Image candidate (model gpt-image-1, documented official) — image-to-image edit via multipart POST to the images/edits endpoint (base64 PNG out); requires OPENAI_API_KEY. Data retention and processing region for OpenAI MUST be verified (EU consideration) before an authorized run.',
  validateConfiguration() {
    if (process.env.OPENAI_API_KEY) return { ok: true }
    return { ok: false, reason: 'OpenAI credential not configured (OPENAI_API_KEY missing)' }
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
      throw new ArqweliaProviderError('openai: adapter must receive ONLY normalized fields (no imagePath)', {
        externalCalls: 0,
        actualCostEur: 0,
        billingStatus: 'not_called',
      })
    }
    if (!opts.builtPrompt) {
      throw new ArqweliaProviderError('openai: no built prompt provided', {
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

    const multipart = prepareMultipartBody({
      normalizedImageBuffer: opts.normalizedImageBuffer,
      builtPrompt: opts.builtPrompt,
      model: opts.model,
      size: opts.size,
    })

    const started = Date.now()
    const transport = opts.transport ?? defaultTransport
    let response
    try {
      response = await transport(multipart)
    } catch (error) {
      // Preserve an ArqweliaProviderError (e.g. the default NOT IMPLEMENTED
      // transport) so its carried billing survives; generic transport errors
      // are sanitized (never echo secrets/paths) and billed conservatively.
      if (error instanceof ArqweliaProviderError) throw error
      throw new ArqweliaProviderError('openai images/edits transport failed', {
        externalCalls: 1,
        actualCostEur: null,
        billingStatus: 'unknown',
      })
    }
    const base64 = response && response.b64_json ? response.b64_json : null
    if (!base64) {
      throw new ArqweliaProviderError('openai images/edits response missing b64_json image', {
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
