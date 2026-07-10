/**
 * AQWELIA — Unified AI client
 *
 * Strategy:
 *   1. If NVIDIA_API_KEY is set → use NVIDIA NIM (GLM-5.2 for chat,
 *      Nemotron Nano 12B VL for vision). Free 1000 credits at
 *      https://build.nvidia.com
 *   2. If NVIDIA_API_KEY is NOT set → fall back to z-ai-web-dev-sdk
 *      (the built-in sandbox AI, always available, no key needed).
 *
 * This dual-mode approach means the AI features (photo diagnostic, chat
 * assistant, StripScan) always work — either with the user's NVIDIA key
 * or with the built-in z-ai SDK.
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
const NVIDIA_VISION_MODEL = process.env.NVIDIA_VISION_MODEL || 'nvidia/nemotron-nano-12b-v2-vl'
const NVIDIA_CHAT_MODEL = process.env.NVIDIA_CHAT_MODEL || 'z-ai/glm-5.2'

/** True when the user has provided a NVIDIA NIM API key. */
export function hasNvidiaKey(): boolean {
  return Boolean(NVIDIA_API_KEY)
}

// ─────────────────────────────────────────────────────────────────────────
// NVIDIA NIM (OpenAI-compatible)
// ─────────────────────────────────────────────────────────────────────────

async function nvidiaVisionImpl(
  prompt: string,
  imageDataUrl: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<VisionResult> {
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
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`NVIDIA API error ${res.status}: ${text.slice(0, 300)}`)
  }

  const data = await res.json()
  return {
    content: data?.choices?.[0]?.message?.content || '',
    usage: data?.usage,
  }
}

async function nvidiaChatImpl(
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<VisionResult> {
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
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
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
  return {
    content: data?.choices?.[0]?.message?.content || '',
    usage: data?.usage,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// z-ai-web-dev-sdk fallback (always available in the sandbox)
// ─────────────────────────────────────────────────────────────────────────

async function zaiVision(
  prompt: string,
  imageDataUrl: string
): Promise<VisionResult> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  let imageUrl = imageDataUrl
  if (!imageDataUrl.startsWith('data:') && !imageDataUrl.startsWith('http')) {
    imageUrl = `data:image/jpeg;base64,${imageDataUrl}`
  }

  const response = await zai.chat.completions.createVision({
    model: 'glm-4.6v',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })

  return {
    content: response.choices?.[0]?.message?.content || '',
    usage: response.usage as any,
  }
}

async function zaiChat(messages: ChatMessage[]): Promise<VisionResult> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  const response = await zai.chat.completions.create({
    messages,
  })

  return {
    content: response.choices?.[0]?.message?.content || '',
    usage: response.usage as any,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Public API — auto-selects NVIDIA or z-ai
// ─────────────────────────────────────────────────────────────────────────

/**
 * Vision chat completion — for photo diagnostic (bandelettes, photos, etc.).
 * Uses NVIDIA NIM if configured, otherwise falls back to z-ai-web-dev-sdk.
 */
export async function aiVision(
  prompt: string,
  imageDataUrl: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<VisionResult> {
  if (hasNvidiaKey()) {
    return nvidiaVisionImpl(prompt, imageDataUrl, options)
  }
  return zaiVision(prompt, imageDataUrl)
}

/**
 * Text chat completion — for the AI assistant.
 * Uses NVIDIA NIM if configured, otherwise falls back to z-ai-web-dev-sdk.
 */
export async function aiChat(
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<VisionResult> {
  if (hasNvidiaKey()) {
    return nvidiaChatImpl(messages, options)
  }
  return zaiChat(messages)
}

/**
 * Test AI connectivity — returns true if the selected provider works.
 */
export async function testAiConnection(): Promise<boolean> {
  try {
    const result = await aiChat(
      [{ role: 'user', content: 'Ping. Reply with "OK" only.' }],
      { maxTokens: 10 }
    )
    return !!result.content
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Backward-compatible exports (old code imports nvidiaVision / nvidiaChat)
// ─────────────────────────────────────────────────────────────────────────

export const nvidiaVision = aiVision
export const nvidiaChat = aiChat
