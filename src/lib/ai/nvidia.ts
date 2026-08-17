/**
 * AQWELIA — NVIDIA NIM AI client
 *
 * Uses NVIDIA NIM API (OpenAI-compatible) for vision (photo diagnostic)
 * and chat (assistant). Requires NVIDIA_API_KEY env var.
 *
 * Get a free API key at https://build.nvidia.com (1000 free credits).
 * Models: https://build.nvidia.com/explore/vision
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface VisionResult {
  content: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || ''
// GLM-5.2 = flagship LLM (text only) — perfect for the chat assistant
// Nemotron Nano 12B VL = NVIDIA's optimized vision model, fast + reliable
const NVIDIA_VISION_MODEL = process.env.NVIDIA_VISION_MODEL || 'nvidia/nemotron-nano-12b-v2-vl'
const NVIDIA_CHAT_MODEL = process.env.NVIDIA_CHAT_MODEL || 'z-ai/glm-5.2'

function ensureApiKey(): string {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY not configured. Get a free key at https://build.nvidia.com')
  }
  return NVIDIA_API_KEY
}

/**
 * Vision chat completion — for photo diagnostic.
 * Accepts a prompt + base64 image, returns text response.
 *
 * Round 2 (4/4) — budget TOTAL borné :
 *   - budget global NVIDIA ≤ 50 s (strictement < maxDuration Vercel = 60 s) ;
 *   - 2 fenêtres de ~25 s chacune maximum (premier essai + UN retry) ;
 *   - le retry n'a lieu que pour un timeout/abort réellement retryable ;
 *   - jamais 2 × 60 s ; jamais plus de 2 fetch ; pas de boucle.
 * L'appel est purement de lecture côté IA ; toute persistance a lieu après, sûr.
 */

const VISION_TOTAL_BUDGET_MS = 50_000
const VISION_PER_CALL_MS = 25_000
const VISION_MAX_FETCH = 2

function isRetryableTimeout(e: unknown): boolean {
  if (e instanceof Error && e.name === 'TimeoutError') return true
  if (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError') {
    return true
  }
  return false
}

/** Délai restant du budget global, plafonné à perCallMs. */
function remainingBudget(deadline: number): number {
  const left = deadline - Date.now()
  return Math.max(0, Math.min(VISION_PER_CALL_MS, left))
}

export async function nvidiaVision(
  prompt: string,
  imageDataUrl: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<VisionResult> {
  const apiKey = ensureApiKey()

  // NVIDIA NIM uses OpenAI-compatible format
  // Convert data URL to base64 if needed (some images come as data:image/jpeg;base64,...)
  let imageUrl = imageDataUrl
  if (!imageDataUrl.startsWith('data:') && !imageDataUrl.startsWith('http')) {
    imageUrl = `data:image/jpeg;base64,${imageDataUrl}`
  }

  const body = {
    model: NVIDIA_VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: options.maxTokens || 2000,
    temperature: options.temperature || 0.4,
    stream: false,
  }

  const deadline = Date.now() + VISION_TOTAL_BUDGET_MS
  let attempts = 0

  for (;;) {
    attempts++
    const timeoutMs = remainingBudget(deadline)
    if (timeoutMs <= 0) {
      const err = new Error('NVIDIA vision: global time budget exhausted')
      err.name = 'TimeoutError'
      throw err
    }

    const call = async (): Promise<VisionResult> => {
      const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!res.ok) {
        // 4xx = erreur non retryable (pas de retry).
        const text = await res.text().catch(() => '')
        const err = new Error(`NVIDIA API error ${res.status}: ${text.slice(0, 300)}`)
        ;(err as Error & { status?: number }).status = res.status
        throw err
      }

      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content || ''
      const usage = data?.usage

      return { content, usage }
    }

    try {
      return await call()
    } catch (e) {
      // Retry UNIQUEMENT pour un timeout/abort retryable, si budget restant.
      const errStatus = (e as { status?: number })?.status
      const retryable = isRetryableTimeout(e)
      const mayRetry = retryable && attempts < VISION_MAX_FETCH && remainingBudget(deadline) > 0
      if (!retryable || errStatus != null) {
        // Erreur HTTP (4xx/5xx) : ne pas retry, préserver l'erreur serveur.
        throw e
      }
      if (!mayRetry) throw e
      // continue → retry borné
    }
  }
}

/**
 * Text chat completion — for the assistant.
 */
export async function nvidiaChat(
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<VisionResult> {
  const apiKey = ensureApiKey()

  const body = {
    model: NVIDIA_CHAT_MODEL,
    messages,
    max_tokens: options.maxTokens || 1000,
    temperature: options.temperature || 0.7,
    stream: false,
  }

  const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`NVIDIA API error ${res.status}: ${text.slice(0, 300)}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content || ''
  const usage = data?.usage

  return { content, usage }
}

/**
 * Test NVIDIA NIM connectivity — returns true if API key works.
 */
export async function testNvidiaConnection(): Promise<boolean> {
  if (!NVIDIA_API_KEY) return false
  try {
    const result = await nvidiaChat(
      [{ role: 'user', content: 'Ping. Reply with "OK" only.' }],
      { maxTokens: 10 }
    )
    return !!result.content
  } catch {
    return false
  }
}
