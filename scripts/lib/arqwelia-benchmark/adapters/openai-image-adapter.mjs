/**
 * ARQWELIA Lot 2 Phase 0A — OpenAI GPT Image image-edit adapter (benchmark only).
 *
 * id: `openai-gpt-image`. Primary model: `gpt-image-2` (documented official).
 *
 * METHOD: the official Images API `POST {base}/images/edits` with
 * `multipart/form-data`: a file part `image`, plus `prompt`, `model`, `size`,
 * `quality` and `output_format`. The official response shape is
 * `{ data: [ { b64_json, … } ] }` — parsed by `parseOpenAiImageEditResponse`
 * (the ROOT-level `b64_json` shape is REJECTED).
 *
 * PHASE 0A CONTROLLED CONFIG (no execution in this build):
 *   provider=openai-gpt-image, model=gpt-image-2, size=1536x1024,
 *   quality=medium, output_format=png, photos=2, concepts=A and B,
 *   maximumCalls=4, maximumBudgetEur=2 (see `phase0a-manifest.mjs`).
 *
 * COMPLIANCE (EU): the base URL is configurable (`OPENAI_BASE_URL`, default
 * `https://api.openai.com/v1`, allowlist also accepts
 * `https://eu.api.openai.com/v1`). The EU endpoint requires an organization
 * with compatible data controls — no real home photo until EU eligibility is
 * confirmed. Non-HTTPS / localhost / private-IP / query / fragment /
 * userinfo / disallowed-host URLs are rejected by `validateOpenAiBaseUrl`.
 *
 * SAFETY: no network here unless a real transport is constructed. The real
 * transport (`createOpenAiImageEditTransport`) is ONLY constructible when the
 * three env locks are active (authorization + budget + Phase 0A execution
 * intent). In this build no real call is made — all responses are mocked and
 * global `fetch` stays ZERO in the normal test suite. API keys are never
 * printed or stored.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isIP } from 'node:net'
import sharp from 'sharp'
import {
  ArqweliaProviderError,
  ensurePhase0AGate,
} from '../provider-runtime.mjs'
import { assertPromptPiiFree, PiiGuardError } from '../prompts/pii-guard.ts'

// ---------------------------------------------------------------------------
// Controlled constants (Phase 0A correction #2 / #8).
// ---------------------------------------------------------------------------

/** Candidate id resolved by the CLI (`--provider openai-gpt-image`). */
export const OPENAI_ADAPTER_ID = 'openai-gpt-image'

/** Allowed image-edit models — anything outside this list is rejected. */
export const OPENAI_IMAGE_EDIT_MODELS = ['gpt-image-2', 'gpt-image-1']

/** Allowed output sizes for the images/edits endpoint. */
export const OPENAI_SUPPORTED_SIZES = ['1536x1024', '1024x1024', '1024x1536']

/** Allowed quality values (gpt-image-2 / gpt-image-1). */
export const OPENAI_SUPPORTED_QUALITIES = ['low', 'medium', 'high']

/** Allowed output formats (images API). */
export const OPENAI_SUPPORTED_OUTPUT_FORMATS = ['png', 'jpeg', 'webp']

/** Phase 0A PRIMARY default model. */
export const OPENAI_PHASE0A_DEFAULT_MODEL = 'gpt-image-2'

/** Phase 0A default output size. */
export const OPENAI_PHASE0A_DEFAULT_SIZE = '1536x1024'

/** Phase 0A default quality. */
export const OPENAI_PHASE0A_DEFAULT_QUALITY = 'medium'

/** Phase 0A default output format. */
export const OPENAI_PHASE0A_DEFAULT_OUTPUT_FORMAT = 'png'

/** Official base URL allowlist (HTTPS only). */
export const OPENAI_BASE_URL_ALLOWLIST = [
  'https://api.openai.com/v1',
  'https://eu.api.openai.com/v1',
]

/** Default base URL when OPENAI_BASE_URL is not set. */
export const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1'

/** Suffix appended to the (validated) base URL. */
export const OPENAI_IMAGES_EDIT_SUFFIX = '/images/edits'

/**
 * Official gpt-image-2 output pricing (USD, per 1536x1024 OUTPUT image,
 * EXCLUDES input tokens for the photo + prompt). Phase 0A default = medium.
 */
export const OPENAI_GPT_IMAGE_2_PRICING_USD = Object.freeze({
  low: 0.005,
  medium: 0.041,
  high: 0.165,
})

/** Official pricing reference (openai.com/api/pricing). */
export const OPENAI_OFFICIAL_PRICING_SOURCE = 'https://openai.com/api/pricing/'

/** Default transport timeout (ms). */
export const OPENAI_TRANSPORT_DEFAULT_TIMEOUT_MS = 120_000

/** Max HTTP response body size the transport will parse (bytes). */
export const OPENAI_MAX_RESPONSE_BODY_BYTES = 5 * 1024 * 1024

/** Max decoded image size accepted by the response parser (bytes). */
export const OPENAI_MAX_DECODED_IMAGE_BYTES = 32 * 1024 * 1024

// ---------------------------------------------------------------------------
// Configurable endpoint + EU (Phase 0A correction #4).
// ---------------------------------------------------------------------------

function stripTrailingSlashes(value) {
  return String(value).replace(/\/+$/, '')
}

function isPrivateOrLoopbackHostname(hostname) {
  const host = String(hostname).toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host === '::1' || host === '0.0.0.0') return true
  const family = isIP(host)
  if (family === 4) {
    const octets = host.split('.').map(Number)
    const [a, b] = octets
    if (a === 10) return true // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true // 192.168.0.0/16
    if (a === 127) return true // loopback
    if (a === 169 && b === 254) return true // link-local
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    if (a === 0) return true
    return false
  }
  if (family === 6) {
    const lower = host.toLowerCase()
    if (lower.startsWith('fe80:')) return true // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true // ULA
    return false
  }
  return false
}

/**
 * PURE validator for an OpenAI base URL.
 *
 * Accepts ONLY the allowlisted HTTPS bases:
 *   - `https://api.openai.com/v1`
 *   - `https://eu.api.openai.com/v1`
 *
 * Rejects (throws `ArqweliaProviderError`): non-HTTPS, URL with
 * username/password, localhost, private IP, any query string, any fragment,
 * any other host.
 *
 * @param {string} url
 * @returns {true}
 */
export function validateOpenAiBaseUrl(url) {
  if (typeof url !== 'string' || stripTrailingSlashes(url) === '') {
    throw new ArqweliaProviderError('openai: OPENAI_BASE_URL is required', {
      externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called',
    })
  }
  let parsed
  try {
    parsed = new URL(stripTrailingSlashes(url))
  } catch {
    throw new ArqweliaProviderError('openai: OPENAI_BASE_URL is not a valid URL', {
      externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called',
    })
  }
  if (parsed.protocol !== 'https:') {
    throw new ArqweliaProviderError('openai: OPENAI_BASE_URL must use HTTPS', {
      externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called',
    })
  }
  if (parsed.username !== '' || parsed.password !== '') {
    throw new ArqweliaProviderError('openai: OPENAI_BASE_URL must not contain username/password', {
      externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called',
    })
  }
  if (parsed.search !== '') {
    throw new ArqweliaProviderError('openai: OPENAI_BASE_URL must not contain a query string', {
      externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called',
    })
  }
  if (parsed.hash !== '') {
    throw new ArqweliaProviderError('openai: OPENAI_BASE_URL must not contain a fragment', {
      externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called',
    })
  }
  if (isPrivateOrLoopbackHostname(parsed.hostname)) {
    throw new ArqweliaProviderError('openai: OPENAI_BASE_URL must not point at localhost or a private IP', {
      externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called',
    })
  }
  const normalized = stripTrailingSlashes(url)
  if (!OPENAI_BASE_URL_ALLOWLIST.includes(normalized)) {
    throw new ArqweliaProviderError('openai: OPENAI_BASE_URL is not in the allowlist', {
      externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called',
    })
  }
  return true
}

/**
 * PURE resolver for the images/edits endpoint: validates the base URL then
 * appends `/images/edits`.
 *
 * @param {string} baseUrl
 * @returns {string}
 */
export function resolveOpenAiImagesEditEndpoint(baseUrl) {
  validateOpenAiBaseUrl(baseUrl)
  return `${stripTrailingSlashes(baseUrl)}${OPENAI_IMAGES_EDIT_SUFFIX}`
}

// ---------------------------------------------------------------------------
// Response parser (Phase 0A correction #3) — PURE, never logs the raw body.
// ---------------------------------------------------------------------------

const NOT_CALLED = { externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called' }
const CALL_ANSWERED = { externalCalls: 1, actualCostEur: null, billingStatus: 'unknown' }

const IMAGE_MIME_BY_FORMAT = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

function isBase64Strict(value) {
  const compact = String(value).replace(/\s+/g, '')
  if (compact === '' || compact.length % 4 === 1) return false
  return /^[A-Za-z0-9+/]*={0,2}$/.test(compact)
}

/**
 * PURE-ish parser for an OpenAI images/edits response. NEVER logs the raw
 * response body or any raw error body; error messages never echo the content.
 *
 * Accepted shape (official): a plain object with `data` a NON-EMPTY array and
 * `data[0].b64_json` a NON-EMPTY base64 string.
 *
 * REJECTED (throws `ArqweliaProviderError`):
 *   - `b64_json` at the ROOT (top-level `response.b64_json`),
 *   - empty `data` array,
 *   - invalid base64,
 *   - valid base64 that is not an image (HTML/JSON/text, …),
 *   - arbitrary JSON.
 *
 * @param {unknown} response
 * @returns {Promise<{ buffer: Buffer, width: number|null, height: number|null, mimeType: string }>}
 */
export async function parseOpenAiImageEditResponse(response) {
  if (response == null || typeof response !== 'object' || Array.isArray(response)) {
    throw new ArqweliaProviderError('openai images/edits response rejected: not a JSON object', CALL_ANSWERED)
  }
  // REJECT the old/broken root-level shape.
  if (Object.prototype.hasOwnProperty.call(response, 'b64_json')) {
    throw new ArqweliaProviderError('openai images/edits response rejected: b64_json at the ROOT is not the official shape', CALL_ANSWERED)
  }
  if (!Array.isArray(response.data) || response.data.length === 0) {
    throw new ArqweliaProviderError('openai images/edits response rejected: data must be a non-empty array', CALL_ANSWERED)
  }
  const first = response.data[0]
  if (first == null || typeof first !== 'object' || typeof first.b64_json !== 'string' || first.b64_json === '') {
    throw new ArqweliaProviderError('openai images/edits response rejected: data[0].b64_json must be a non-empty string', CALL_ANSWERED)
  }
  if (!isBase64Strict(first.b64_json)) {
    throw new ArqweliaProviderError('openai images/edits response rejected: invalid base64', CALL_ANSWERED)
  }
  const buffer = Buffer.from(first.b64_json, 'base64')
  if (buffer.length === 0) {
    throw new ArqweliaProviderError('openai images/edits response rejected: empty decoded payload', CALL_ANSWERED)
  }
  if (buffer.length > OPENAI_MAX_DECODED_IMAGE_BYTES) {
    throw new ArqweliaProviderError('openai images/edits response rejected: decoded payload too large', CALL_ANSWERED)
  }
  let meta
  try {
    meta = await sharp(buffer, { failOn: 'error', limitInputPixels: 100_000_000 }).metadata()
  } catch {
    throw new ArqweliaProviderError('openai images/edits response rejected: valid base64 but not an image', CALL_ANSWERED)
  }
  if (!meta.format) {
    throw new ArqweliaProviderError('openai images/edits response rejected: valid base64 but not an image', CALL_ANSWERED)
  }
  const mimeType = IMAGE_MIME_BY_FORMAT[meta.format] ?? `image/${meta.format}`
  return {
    buffer,
    width: meta.width ?? null,
    height: meta.height ?? null,
    mimeType,
  }
}

// ---------------------------------------------------------------------------
// Multipart body (Phase 0A correction #2).
// ---------------------------------------------------------------------------

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

function sanitizeSegment(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'x'
}

/**
 * Builds the `multipart/form-data` payload descriptor for the official
 * images/edits contract: `image` (file), `model`, `prompt`, `size`,
 * `quality`, `output_format`. No network.
 *
 * Rejects (throws `ArqweliaProviderError`) any model / size / quality /
 * output_format OUTSIDE the controlled lists. `gpt-image-2` uses high
 * fidelity automatically for input images, so `input_fidelity` is NEVER sent.
 *
 * @param {{ normalizedImageBuffer?: Buffer, builtPrompt?: string, model?: string, size?: string, quality?: string, outputFormat?: string }} input
 */
export function prepareMultipartBody({
  normalizedImageBuffer,
  builtPrompt,
  model,
  size,
  quality,
  outputFormat,
} = {}) {
  if (!builtPrompt) {
    throw new ArqweliaProviderError('openai: no built prompt provided', NOT_CALLED)
  }
  if (!normalizedImageBuffer) {
    throw new ArqweliaProviderError('openai: no normalized image buffer provided', NOT_CALLED)
  }
  const resolvedModel = model ?? OPENAI_PHASE0A_DEFAULT_MODEL
  if (!OPENAI_IMAGE_EDIT_MODELS.includes(resolvedModel)) {
    throw new ArqweliaProviderError(
      `openai: unsupported model (allowed: ${OPENAI_IMAGE_EDIT_MODELS.join(', ')})`,
      NOT_CALLED,
    )
  }
  const resolvedSize = size ?? OPENAI_PHASE0A_DEFAULT_SIZE
  if (!OPENAI_SUPPORTED_SIZES.includes(resolvedSize)) {
    throw new ArqweliaProviderError(
      `openai: unsupported size (allowed: ${OPENAI_SUPPORTED_SIZES.join(', ')})`,
      NOT_CALLED,
    )
  }
  const resolvedQuality = quality ?? OPENAI_PHASE0A_DEFAULT_QUALITY
  if (!OPENAI_SUPPORTED_QUALITIES.includes(resolvedQuality)) {
    throw new ArqweliaProviderError(
      `openai: unsupported quality (allowed: ${OPENAI_SUPPORTED_QUALITIES.join(', ')})`,
      NOT_CALLED,
    )
  }
  const resolvedOutputFormat = outputFormat ?? OPENAI_PHASE0A_DEFAULT_OUTPUT_FORMAT
  if (!OPENAI_SUPPORTED_OUTPUT_FORMATS.includes(resolvedOutputFormat)) {
    throw new ArqweliaProviderError(
      `openai: unsupported output_format (allowed: ${OPENAI_SUPPORTED_OUTPUT_FORMATS.join(', ')})`,
      NOT_CALLED,
    )
  }
  const endpoint = resolveOpenAiImagesEditEndpoint(
    process.env.OPENAI_BASE_URL || OPENAI_DEFAULT_BASE_URL,
  )
  const parts = [
    { name: 'image', filename: 'image.jpg', contentType: 'image/jpeg', value: normalizedImageBuffer },
    { name: 'model', value: resolvedModel },
    { name: 'prompt', value: builtPrompt },
    { name: 'size', value: resolvedSize },
    { name: 'quality', value: resolvedQuality },
    { name: 'output_format', value: resolvedOutputFormat },
  ]
  return {
    method: 'POST',
    endpoint,
    contentType: 'multipart/form-data',
    parts,
    model: resolvedModel,
    size: resolvedSize,
    quality: resolvedQuality,
    outputFormat: resolvedOutputFormat,
    // gpt-image-2 uses high fidelity automatically for input images → never sent.
    inputFidelity: null,
    toFormData() {
      return buildFormData(parts)
    },
  }
}

function defaultTransport() {
  throw new ArqweliaProviderError('NOT IMPLEMENTED — awaiting Phase 0A execution: openai images/edits transport not injected', NOT_CALLED)
}

// ---------------------------------------------------------------------------
// REAL-BUT-NOT-EXECUTED transport (Phase 0A correction #7).
// ---------------------------------------------------------------------------

/**
 * Reads the response body with a hard byte limit. Never logs the body.
 *
 * @param {Response} response
 * @param {number} maxBytes
 * @returns {Promise<string>}
 */
async function readResponseTextWithLimit(response, maxBytes) {
  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader()
    const chunks = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value ? value.byteLength : 0
      if (total > maxBytes) {
        await reader.cancel()
        throw new ArqweliaProviderError('openai images/edits response body exceeded max size', CALL_ANSWERED)
      }
      if (value) chunks.push(value)
    }
    return Buffer.concat(chunks).toString('utf8')
  }
  const ab = await response.arrayBuffer()
  if (ab.byteLength > maxBytes) {
    throw new ArqweliaProviderError('openai images/edits response body exceeded max size', CALL_ANSWERED)
  }
  return Buffer.from(ab).toString('utf8')
}

/**
 * Creates a REAL OpenAI images/edits transport — ONLY constructible when all
 * THREE locks are active (authorization + budget + Phase 0A execution intent).
 *
 * The returned async function POSTs `multipart/form-data` to the validated
 * `/images/edits` endpoint. It sends `image`, `prompt`, `model=gpt-image-2`,
 * `size=1536x1024`, `quality=medium`, `output_format=png` (defaults). The
 * multipart boundary is left to `fetch`/`FormData` — NEVER set manually. Uses
 * an `AbortController` with a configurable timeout (default 120 s), checks
 * `response.ok`, reads `x-request-id` (a non-secret), parses JSON behind a max
 * size guard and validates it with `parseOpenAiImageEditResponse`. It NEVER
 * logs the `Authorization` header, never logs the full prompt, and never logs
 * or retains the source photo.
 *
 * In this build NO real call is made — all responses are mocked and a single
 * transport test may inject a local `fetchImpl` mock (global `fetch` stays
 * zero across the normal suite).
 *
 * @param {{ apiKey?: string, baseUrl?: string, fetchImpl?: typeof fetch, timeoutMs?: number, locks?: { authorized?: boolean, budgetMaxEur?: number, phase0aExecute?: boolean } }} opts
 * @returns {(request: { normalizedImageBuffer?: Buffer, builtPrompt?: string, model?: string, size?: string, quality?: string, outputFormat?: string }) => Promise<{ buffer: Buffer, width: number|null, height: number|null, mimeType: string }>}
 */
export function createOpenAiImageEditTransport({
  apiKey,
  baseUrl,
  fetchImpl,
  timeoutMs = OPENAI_TRANSPORT_DEFAULT_TIMEOUT_MS,
  locks = {},
} = {}) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new ArqweliaProviderError('openai: transport requires OPENAI_API_KEY', NOT_CALLED)
  }
  const authorized = locks.authorized ?? (process.env.ARQWELIA_BENCHMARK_AUTHORIZED === 'true')
  const budgetMaxEur = locks.budgetMaxEur ?? Number(process.env.ARQWELIA_BENCHMARK_MAX_BUDGET_EUR || 0)
  const phase0aExecute = locks.phase0aExecute ?? (process.env.ARQWELIA_BENCHMARK_PHASE0A_EXECUTE === 'true')
  // THREE-GATE BLOCK: the transport is only constructible when all three locks are active.
  ensurePhase0AGate({ realCallAuthorized: authorized, budgetMaxEur, phase0aExecute })
  const endpoint = resolveOpenAiImagesEditEndpoint(baseUrl)
  const doFetch = fetchImpl ?? globalThis.fetch
  if (typeof doFetch !== 'function') {
    throw new ArqweliaProviderError('openai: no fetch implementation available', NOT_CALLED)
  }

  return async (request) => {
    const multipart = prepareMultipartBody({
      normalizedImageBuffer: request?.normalizedImageBuffer,
      builtPrompt: request?.builtPrompt,
      model: request?.model,
      size: request?.size,
      quality: request?.quality,
      outputFormat: request?.outputFormat,
    })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let response
    try {
      response = await doFetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: multipart.toFormData(),
        signal: controller.signal,
      })
    } catch (error) {
      // NEVER include the underlying fetch error (may carry URL/headers).
      throw new ArqweliaProviderError('openai images/edits request failed', CALL_ANSWERED)
    } finally {
      clearTimeout(timer)
    }

    const requestId =
      response && response.headers && typeof response.headers.get === 'function'
        ? response.headers.get('x-request-id')
        : null

    if (!response.ok) {
      // NEVER log the raw error body and NEVER include it in the message.
      throw new ArqweliaProviderError(`openai images/edits HTTP ${response.status}`, {
        ...CALL_ANSWERED,
        requestId: requestId || null,
      })
    }

    const text = await readResponseTextWithLimit(response, OPENAI_MAX_RESPONSE_BODY_BYTES)
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new ArqweliaProviderError('openai images/edits response is not valid JSON', {
        ...CALL_ANSWERED,
        requestId: requestId || null,
      })
    }
    return parseOpenAiImageEditResponse(parsed)
  }
}

// ---------------------------------------------------------------------------
// Candidate object.
// ---------------------------------------------------------------------------

export const openaiImageAdapter = {
  id: OPENAI_ADAPTER_ID,
  model: OPENAI_PHASE0A_DEFAULT_MODEL,
  supportsImageEditing: true,
  dryRunSafe: false,
  state: 'ready_for_authorized_smoke',
  prepareMultipartBody,
  parseOpenAiImageEditResponse,
  createOpenAiImageEditTransport,
  dryRunDescription:
    `OpenAI GPT Image candidate (model ${OPENAI_PHASE0A_DEFAULT_MODEL} default, documented official) — ` +
    'image-to-image edit via multipart POST to the images/edits endpoint (base64 out parsed from the official data[0].b64_json shape). ' +
    'Requires OPENAI_API_KEY. Data retention / processing region MUST be verified: the EU endpoint (eu.api.openai.com) requires organization + compatible data controls; no real home photo until EU eligibility is confirmed.',
  validateConfiguration() {
    if (process.env.OPENAI_API_KEY) return { ok: true }
    return { ok: false, reason: 'OpenAI credential not configured (OPENAI_API_KEY missing)' }
  },
  estimateOfficialCost() {
    return {
      known: true,
      costPerImageEur: null,
      officialPricingSource: OPENAI_OFFICIAL_PRICING_SOURCE,
      note:
        `official gpt-image-2 pricing (1536x1024 OUTPUT, excludes input tokens for the photo+prompt): ` +
        `low ${OPENAI_GPT_IMAGE_2_PRICING_USD.low}, medium ${OPENAI_GPT_IMAGE_2_PRICING_USD.medium}, ` +
        `high ${OPENAI_GPT_IMAGE_2_PRICING_USD.high} USD. Phase 0A default quality medium. ` +
        'actualCostEur stays null until real billing measured; NO USD→EUR conversion.',
    }
  },
  async runSmoke(opts) {
    const phase0aExecute = opts.phase0aExecute ?? (process.env.ARQWELIA_BENCHMARK_PHASE0A_EXECUTE === 'true')
    // THREE-GATE BLOCK: real transport is impossible without all three.
    ensurePhase0AGate({
      realCallAuthorized: opts.realCallAuthorized,
      budgetMaxEur: opts.budgetMaxEur,
      phase0aExecute,
    })

    if (opts.imagePath !== undefined) {
      throw new ArqweliaProviderError('openai: adapter must receive ONLY normalized fields (no imagePath)', NOT_CALLED)
    }
    if (!opts.builtPrompt) {
      throw new ArqweliaProviderError('openai: no built prompt provided', NOT_CALLED)
    }
    try {
      assertPromptPiiFree(opts.builtPrompt)
    } catch (error) {
      if (error instanceof PiiGuardError) {
        throw new ArqweliaProviderError('Prompt rejected by the PII guard', NOT_CALLED)
      }
      throw error
    }

    const multipart = prepareMultipartBody({
      normalizedImageBuffer: opts.normalizedImageBuffer,
      builtPrompt: opts.builtPrompt,
      model: opts.model,
      size: opts.size,
      quality: opts.quality,
      outputFormat: opts.outputFormat,
    })

    const started = Date.now()
    const transport = opts.transport ?? defaultTransport
    let transportResult
    try {
      transportResult = await transport(multipart)
    } catch (error) {
      // Preserve an ArqweliaProviderError (e.g. the default NOT IMPLEMENTED
      // transport) so its carried billing survives; generic transport errors
      // are sanitized (never echo secrets/paths) and billed conservatively.
      if (error instanceof ArqweliaProviderError) throw error
      throw new ArqweliaProviderError('openai images/edits transport failed', CALL_ANSWERED)
    }

    // A real transport already returns the sanitized result; a mock transport
    // returns the raw JSON object which is validated here.
    let parsed
    if (transportResult && Buffer.isBuffer(transportResult.buffer)) {
      parsed = transportResult
    } else {
      try {
        parsed = await parseOpenAiImageEditResponse(transportResult)
      } catch (error) {
        if (error instanceof ArqweliaProviderError) throw error
        throw new ArqweliaProviderError('openai images/edits response rejected', CALL_ANSWERED)
      }
    }

    await mkdir(opts.outDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputPath = join(opts.outDir, `${sanitizeSegment(opts.providerId)}-${sanitizeSegment(opts.model)}-${stamp}.png`)
    await writeFile(outputPath, parsed.buffer)

    return {
      providerId: opts.providerId,
      model: opts.model,
      ok: true,
      externalCalls: 1,
      actualCostEur: null,
      billingStatus: 'unknown',
      officialPricingSource: null,
      durationMs: Date.now() - started,
      outputWidth: parsed.width,
      outputHeight: parsed.height,
      outputPath,
    }
  },
}
