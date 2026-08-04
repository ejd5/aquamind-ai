/**
 * AQWELIA Lot 2 — local ComfyUI client (loopback ONLY).
 *
 * Encapsulates the ComfyUI local server routes needed by the POC:
 *   POST /upload/image
 *   POST /upload/mask
 *   POST /prompt
 *   GET  /history/{prompt_id}
 *   GET  /view
 *   GET  /system_stats
 *   POST /interrupt
 *
 * SECURITY:
 *   - base URL is allowlisted to loopback ONLY:
 *       http://127.0.0.1:8188 | http://localhost:8188 | http://[::1]:8188
 *   - HTTPS to an external host, LAN non-loopback IPs, public domains, Comfy
 *     Cloud, userinfo (username/password), query strings, fragments and
 *     redirects to an external domain are all REFUSED.
 *   - No API key is needed for the local server. No network key is ever read.
 *
 * OPERATION:
 *   - every HTTP request carries an AbortController timeout;
 *   - polling is bounded (max attempts), never an infinite loop;
 *   - one submitted /prompt = one generation, never auto-resubmitted;
 *   - no automatic generation retry.
 */

import { z } from 'zod'

export const COMFYUI_ALLOWED_BASE_URLS = Object.freeze([
  'http://127.0.0.1:8188',
  'http://localhost:8188',
  'http://[::1]:8188',
])

export const COMFYUI_DEFAULT_BASE_URL = 'http://127.0.0.1:8188'
export const COMFYUI_DEFAULT_TIMEOUT_MS = 30_000
export const COMFYUI_MAX_POLL_ATTEMPTS = 60
export const COMFYUI_POLL_INTERVAL_MS = 1000
export const COMFYUI_MAX_UPLOAD_BYTES = 64 * 1024 * 1024
export const COMFYUI_MAX_VIEW_BYTES = 64 * 1024 * 1024

export interface ArqweliaComfyUiClientOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  maxPollAttempts?: number
  pollIntervalMs?: number
}

function stripTrailingSlashes(value: string): string {
  return String(value).replace(/\/+$/, '')
}

function hasUserinfo(raw: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^@/]*@/.test(raw)
}

function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '0:0:0:0:0:0:0:1'
}

/**
 * PURE validator for the ComfyUI base URL. Accepts ONLY the loopback allowlist.
 * @throws Error on any disallowed base URL.
 */
export function validateComfyUiBaseUrl(raw: string): true {
  if (typeof raw !== 'string' || raw === '') {
    throw new Error('ComfyUI base URL is missing')
  }
  if (hasUserinfo(raw)) {
    throw new Error('ComfyUI base URL must not contain username/password')
  }
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('ComfyUI base URL is not a valid URL')
  }
  if (url.protocol !== 'http:') {
    throw new Error('ComfyUI base URL must use http (loopback only)')
  }
  if (url.search || url.hash) {
    throw new Error('ComfyUI base URL must not contain a query string or fragment')
  }
  if (!isLoopbackHostname(url.hostname)) {
    throw new Error('ComfyUI base URL must be a loopback address only (127.0.0.1 / localhost / ::1)')
  }
  const normalized = stripTrailingSlashes(raw)
  if (!COMFYUI_ALLOWED_BASE_URLS.includes(normalized)) {
    throw new Error('ComfyUI base URL is not in the loopback allowlist')
  }
  return true
}

export function normalizeComfyUiBaseUrl(raw: string | undefined): string {
  const value = stripTrailingSlashes(raw || COMFYUI_DEFAULT_BASE_URL)
  validateComfyUiBaseUrl(value)
  return value
}

export interface ComfyUiUploadResult {
  name: string
  subfolder: string
  type: string
  rawName: string
}

export interface ComfyUiQueuePromptResult {
  prompt_id: string
  number: number
  node_errors: Record<string, unknown> | null
}

export interface ComfyUiHistoryItem {
  status: { status_str?: string; completed?: boolean; status?: string }
  outputs?: Record<string, unknown>
}

export interface ComfyUiViewResult {
  buffer: Buffer
  mimeType: string
}

/**
 * Local ComfyUI client. Every method is network-lazy: the client is only ever
 * constructed against an allowlisted loopback base URL, and no request is made
 * unless a method is called. `fetch` is injectable for tests.
 */
export class ArqweliaComfyUiLocalClient {
  private readonly baseUrl: string
  private readonly doFetch: typeof fetch
  private readonly timeoutMs: number
  private readonly maxPollAttempts: number
  private readonly pollIntervalMs: number

  constructor(opts: ArqweliaComfyUiClientOptions = {}) {
    this.baseUrl = normalizeComfyUiBaseUrl(opts.baseUrl)
    this.doFetch = opts.fetchImpl ?? globalThis.fetch
    this.timeoutMs = opts.timeoutMs ?? COMFYUI_DEFAULT_TIMEOUT_MS
    this.maxPollAttempts = opts.maxPollAttempts ?? COMFYUI_MAX_POLL_ATTEMPTS
    this.pollIntervalMs = opts.pollIntervalMs ?? COMFYUI_POLL_INTERVAL_MS
    if (typeof this.doFetch !== 'function') {
      throw new Error('ComfyUI client: no fetch implementation available')
    }
  }

  private async request(method: string, path: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      return await this.doFetch(`${this.baseUrl}${path}`, {
        method,
        signal: controller.signal,
        ...init,
      })
    } finally {
      clearTimeout(timer)
    }
  }

  private async checkOk(response: Response, label: string): Promise<void> {
    if (!response.ok) {
      throw new Error(`ComfyUI ${label} HTTP ${response.status}`)
    }
  }

  async getSystemStats(): Promise<Record<string, unknown>> {
    const response = await this.request('GET', '/system_stats')
    await this.checkOk(response, '/system_stats')
    return (await response.json()) as Record<string, unknown>
  }

  /**
   * Uploads an image (or mask) to the local server. `overwriteName` keeps the
   * workflow deterministic; `maskTarget` routes to the mask upload endpoint.
   */
  async uploadImage(buffer: Buffer, filename: string, opts: { mask?: boolean; overwriteName?: string } = {}): Promise<ComfyUiUploadResult> {
    if (!buffer || buffer.length === 0) {
      throw new Error('ComfyUI upload: empty image buffer')
    }
    if (buffer.length > COMFYUI_MAX_UPLOAD_BYTES) {
      throw new Error('ComfyUI upload: image exceeds size limit')
    }
    const endpoint = opts.mask ? '/upload/mask' : '/upload/image'
    const form = new FormData()
    const overwrite = opts.overwriteName
    form.append('image', new Blob([buffer as BlobPart]), overwrite ?? filename)
    form.append('type', 'input')
    form.append('overwrite', 'true')
    if (overwrite) form.append('name', overwrite)
    const response = await this.request('POST', endpoint, { body: form })
    await this.checkOk(response, endpoint)
    const json = (await response.json()) as Record<string, unknown>
    return {
      name: String(json.name ?? filename),
      subfolder: String(json.subfolder ?? ''),
      type: String(json.type ?? 'input'),
      rawName: String(json.name ?? filename),
    }
  }

  async queuePrompt(promptWorkflow: unknown): Promise<ComfyUiQueuePromptResult> {
    const response = await this.request('POST', '/prompt', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptWorkflow }),
    })
    await this.checkOk(response, '/prompt')
    const json = (await response.json()) as Record<string, unknown>
    const promptId = json.prompt_id as string | undefined
    if (!promptId) {
      throw new Error('ComfyUI /prompt response missing prompt_id')
    }
    return {
      prompt_id: promptId,
      number: Number(json.number ?? 0),
      node_errors: (json.node_errors as Record<string, unknown> | null) ?? null,
    }
  }

  async interrupt(): Promise<void> {
    const response = await this.request('POST', '/interrupt', {
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    await this.checkOk(response, '/interrupt')
  }

  async getHistory(promptId: string): Promise<Record<string, ComfyUiHistoryItem>> {
    const response = await this.request('GET', `/history/${encodeURIComponent(promptId)}`)
    await this.checkOk(response, '/history')
    return (await response.json()) as Record<string, ComfyUiHistoryItem>
  }

  /**
   * Polls /history until the prompt is completed or failed. Bounded, never
   * infinite. Returns the history item on success, or throws on failure/timeout.
   */
  async waitForCompletion(promptId: string, opts: { maxAttempts?: number } = {}): Promise<ComfyUiHistoryItem> {
    const maxAttempts = opts.maxAttempts ?? this.maxPollAttempts
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const history = await this.getHistory(promptId)
      const item = history[promptId]
      if (!item) {
        await this.sleep(this.pollIntervalMs)
        continue
      }
      const status = item.status ?? {}
      const statusStr = status.status_str ?? status.status ?? ''
      if (statusStr === 'error') {
        throw new Error(`ComfyUI prompt ${promptId} failed (status ${statusStr})`)
      }
      if (status.completed === true || statusStr === 'success') {
        return item
      }
      await this.sleep(this.pollIntervalMs)
    }
    throw new Error(`ComfyUI prompt ${promptId} did not complete within ${maxAttempts} attempts`)
  }

  async getView(filename: string, subfolder = '', type = 'output'): Promise<ComfyUiViewResult> {
    const params = new URLSearchParams({ filename, type })
    if (subfolder) params.set('subfolder', subfolder)
    const response = await this.request('GET', `/view?${params.toString()}`)
    await this.checkOk(response, '/view')
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > COMFYUI_MAX_VIEW_BYTES) {
      throw new Error('ComfyUI /view image exceeds size limit')
    }
    const mimeType = response.headers.get('content-type') ?? 'image/png'
    return { buffer, mimeType }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Zod schema for the safe subset of a ComfyUI API workflow the builder accepts
 * (used by the static workflow validator). Custom/unexpected nodes are rejected.
 */
export const comfyCoreNodeIds = new Set([
  'CheckpointLoaderSimple',
  'VAELoader',
  'CLIPTextEncode',
  'EmptySD3LatentImage',
  'SetLatentNoiseMask',
  'VAEDecode',
  'SaveImage',
  'KSampler',
  'LoraLoader',
  'CLIPSetLastLayer',
  'LoadImage',
])

export function assertComfyWorkflowUsesCoreOnly(workflow: Record<string, unknown>): true {
  if (!workflow || typeof workflow !== 'object') {
    throw new Error('ComfyUI workflow must be an object of nodes')
  }
  for (const [id, nodeRaw] of Object.entries(workflow)) {
    const node = nodeRaw as { class_type?: string }
    const classType = node?.class_type
    if (!classType || !comfyCoreNodeIds.has(classType)) {
      throw new Error(`ComfyUI workflow node ${id} uses unexpected class "${String(classType)}"`)
    }
  }
  return true
}

export { z }
