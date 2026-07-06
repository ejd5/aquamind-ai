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
const NVIDIA_VISION_MODEL = process.env.NVIDIA_VISION_MODEL || 'meta/llama-3.2-90b-vision-instruct'
const NVIDIA_CHAT_MODEL = process.env.NVIDIA_CHAT_MODEL || 'meta/llama-3.1-70b-instruct'

function ensureApiKey(): string {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY not configured. Get a free key at https://build.nvidia.com')
  }
  return NVIDIA_API_KEY
}

/**
 * Vision chat completion — for photo diagnostic.
 * Accepts a prompt + base64 image, returns text response.
 */
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

  const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000), // 60s timeout for vision
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
