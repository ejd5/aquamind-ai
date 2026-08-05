/**
 * AQWELIA Lot 2 — local ComfyUI client (loopback ONLY).
 *
 * Encapsulates the ComfyUI local server routes needed by the POC:
 *   POST /upload/image            (source image)
 *   POST /upload/image            (mask image — the POC does NOT use /upload/mask)
 *   POST /prompt
 *   GET  /history/{prompt_id}
 *   GET  /view
 *   GET  /system_stats
 *   GET  /object_info/{class_type} (read-only preflight)
 *   GET  /models/checkpoints       (read-only preflight)
 *   POST /interrupt
 *
 * SECURITY:
 *   - base URL is allowlisted to loopback ONLY:
 *       http://127.0.0.1:8188 | http://localhost:8188 | http://[::1]:8188
 *   - HTTPS to an external host, LAN non-loopback IPs, public domains, Comfy
 *     Cloud, userinfo (username/password), query strings, fragments and
 *     redirects to an external domain are all REFUSED.
 *   - EVERY request uses `redirect: 'error'` so a 3xx redirect is refused
 *     (no silent follow to an external domain, and the upload body is never
 *     re-sent to a different host).
 *   - No API key is needed for the local server. No network key is ever read.
 *
 * OPERATION:
 *   - every HTTP request carries an AbortController timeout;
 *   - polling is bounded (max attempts), never an infinite loop;
 *   - one submitted /prompt = one generation, never auto-resubmitted;
 *   - no automatic generation retry.
 */

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

export const COMFYUI_REQUIRED_OBJECT_INFO = Object.freeze([
  'CheckpointLoaderSimple',
  'VAEEncodeForInpaint',
  'LoadImage',
  'LoadImageMask',
  'KSampler',
  'VAEDecode',
  'ImageCompositeMasked',
  'SaveImage',
])

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

export interface ArqweliaComfyUiPreflightReport {
  reachable: boolean
  objectInfoAvailable: boolean
  objectInfoMissing: string[]
  checkpointAvailable: boolean
  checkpointName: string | null
  error?: string
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
        redirect: 'error',
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

  async getObjectInfo(classType: string): Promise<Record<string, unknown>> {
    const response = await this.request('GET', `/object_info/${encodeURIComponent(classType)}`)
    await this.checkOk(response, `/object_info/${classType}`)
    return (await response.json()) as Record<string, unknown>
  }

  async getModelsCheckpoints(): Promise<string[]> {
    const response = await this.request('GET', '/models/checkpoints')
    await this.checkOk(response, '/models/checkpoints')
    const body = (await response.json()) as unknown
    if (Array.isArray(body)) return body.map((item) => String(item))
    if (body && typeof body === 'object' && Array.isArray((body as { models?: unknown[] }).models)) {
      return (body as { models: unknown[] }).models.map((item) => String(item))
    }
    return []
  }

  /**
   * Read-only preflight: ComfyUI reachable? required nodes available? expected
   * checkpoint present? No generation, no upload, no /prompt.
   */
  async preflight(checkpointName: string | null): Promise<ArqweliaComfyUiPreflightReport> {
    try {
      await this.getSystemStats()
    } catch (error) {
      return {
        reachable: false,
        objectInfoAvailable: false,
        objectInfoMissing: [...COMFYUI_REQUIRED_OBJECT_INFO],
        checkpointAvailable: false,
        checkpointName,
        error: String(error instanceof Error ? error.message : error),
      }
    }
    const missing: string[] = []
    for (const classType of COMFYUI_REQUIRED_OBJECT_INFO) {
      try {
        await this.getObjectInfo(classType)
      } catch {
        missing.push(classType)
      }
    }
    let checkpoints: string[] = []
    try {
      checkpoints = await this.getModelsCheckpoints()
    } catch {
      // models/checkpoints may be restricted; checkpoint availability unknown.
    }
    const checkpointAvailable = checkpointName
      ? checkpoints.some((name) => String(name) === checkpointName || String(name).endsWith(`/${checkpointName}`))
      : false
    return {
      reachable: true,
      objectInfoAvailable: missing.length === 0,
      objectInfoMissing: missing,
      checkpointAvailable,
      checkpointName,
    }
  }

  /**
   * Uploads a SOURCE image to the local server via POST /upload/image.
   * `overwriteName` keeps the workflow deterministic.
   */
  async uploadInputImage(buffer: Buffer, filename: string, overwriteName?: string): Promise<ComfyUiUploadResult> {
    return this.uploadViaImageEndpoint(buffer, filename, overwriteName)
  }

  /**
   * Uploads a MASK image to the local server via POST /upload/image (NOT
   * /upload/mask). The mask is read back with LoadImageMask channel=red.
   */
  async uploadInputMaskImage(buffer: Buffer, filename: string, overwriteName?: string): Promise<ComfyUiUploadResult> {
    return this.uploadViaImageEndpoint(buffer, filename, overwriteName)
  }

  private async uploadViaImageEndpoint(buffer: Buffer, filename: string, overwriteName?: string): Promise<ComfyUiUploadResult> {
    if (!buffer || buffer.length === 0) {
      throw new Error('ComfyUI upload: empty image buffer')
    }
    if (buffer.length > COMFYUI_MAX_UPLOAD_BYTES) {
      throw new Error('ComfyUI upload: image exceeds size limit')
    }
    const form = new FormData()
    const overwrite = overwriteName ?? filename
    form.append('image', new Blob([buffer as BlobPart]), overwrite)
    form.append('type', 'input')
    form.append('overwrite', 'true')
    form.append('name', overwrite)
    const response = await this.request('POST', '/upload/image', { body: form })
    await this.checkOk(response, '/upload/image')
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
 * The safe set of ComfyUI Core node classes the V1 workflow may use. The
 * versioned workflow must NOT contain any custom/undocumented node.
 */
export const comfyCoreNodeIds = new Set([
  'CheckpointLoaderSimple',
  'CLIPTextEncode',
  'LoadImage',
  'LoadImageMask',
  'VAEEncodeForInpaint',
  'KSampler',
  'VAEDecode',
  'ImageCompositeMasked',
  'SaveImage',
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
