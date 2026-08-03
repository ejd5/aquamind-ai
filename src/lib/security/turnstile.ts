import { randomUUID } from 'node:crypto'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TOKEN_MAX_LENGTH = 2048

type TurnstileResponse = {
  success?: boolean
  hostname?: string
  action?: string
  ['error-codes']?: string[]
}

export function turnstileRequired(): boolean {
  return process.env.TURNSTILE_REQUIRED === 'true'
}

export async function verifyTurnstileToken(params: {
  token: string
  remoteIp?: string | null
  expectedAction?: string
  expectedHostname?: string
}): Promise<{ success: boolean; reason?: string }> {
  if (process.env.NODE_ENV === 'test') return { success: true }

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    return turnstileRequired()
      ? { success: false, reason: 'turnstile_not_configured' }
      : { success: true }
  }

  const token = params.token.trim()
  if (!token || token.length > TOKEN_MAX_LENGTH) return { success: false, reason: 'turnstile_token_missing' }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: params.remoteIp || undefined,
        idempotency_key: randomUUID(),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return { success: false, reason: 'turnstile_unavailable' }
    const result = await response.json().catch(() => null) as TurnstileResponse | null
    if (!result?.success) return { success: false, reason: result?.['error-codes']?.join(',') || 'turnstile_rejected' }

    // Strict action validation: when an action is expected it MUST be present
    // on the verified token AND match exactly. An absent action is rejected.
    if (params.expectedAction && (!result.action || result.action !== params.expectedAction)) {
      return { success: false, reason: 'turnstile_action_mismatch' }
    }

    // Optional hostname validation: when expected, it MUST be present AND match
    // exactly (prevents tokens minted for another domain being replayed here).
    if (params.expectedHostname && (!result.hostname || result.hostname !== params.expectedHostname)) {
      return { success: false, reason: 'turnstile_hostname_mismatch' }
    }

    return { success: true }
  } catch {
    return { success: false, reason: 'turnstile_unavailable' }
  }
}
