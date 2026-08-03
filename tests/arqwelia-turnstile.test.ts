/**
 * ARQWELIA — Turnstile verifier unit tests.
 *
 * Exercises the REAL `verifyTurnstileToken` and the ARQWELIA wrapper
 * `verifyArqweliaTurnstile` without ever calling Cloudflare (global fetch is
 * stubbed). Covers:
 *   - deterministic local/test behaviour (NODE_ENV=test always passes)
 *   - unconfigured dev behaviour (passes — no silent prod bypass)
 *   - production fail-closed when the secret is missing (ARQWELIA wrapper)
 *   - missing token / invalid token / service unavailable / action mismatch
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { verifyTurnstileToken } from '@/lib/security/turnstile'
import { verifyArqweliaTurnstile } from '@/lib/arqwelia/bot-protection'

describe('ARQWELIA Turnstile verification', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('passes deterministically under NODE_ENV=test (local tests never call Cloudflare)', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    const result = await verifyTurnstileToken({ token: '', expectedAction: 'arqwelia_contact' })
    expect(result.success).toBe(true)
  })

  it('passes when unconfigured outside production (dev/CI have no keys)', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    const result = await verifyTurnstileToken({ token: '', expectedAction: 'arqwelia_contact' })
    expect(result.success).toBe(true)
  })

  it('fails closed in production when the secret is missing (no silent bypass)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    const result = await verifyArqweliaTurnstile({ token: 'x', expectedAction: 'arqwelia_contact' })
    expect(result.success).toBe(false)
    expect(result.reason).toBe('turnstile_not_configured')
  })

  it('rejects a missing token when the secret is configured', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    const result = await verifyTurnstileToken({ token: '', expectedAction: 'arqwelia_contact' })
    expect(result.success).toBe(false)
    expect(result.reason).toBe('turnstile_token_missing')
  })

  it('accepts a valid token returned by the siteverify API', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit): Promise<Response> => {
      return new Response(JSON.stringify({ success: true, action: 'arqwelia_contact', hostname: 'localhost' }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await verifyTurnstileToken({
      token: 'valid-token',
      expectedAction: 'arqwelia_contact',
      expectedHostname: 'localhost',
    })
    expect(result.success).toBe(true)
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body ?? '{}'))
    expect(body.secret).toBe('secret')
    expect(body.response).toBe('valid-token')
    // The token must never be logged — nothing here should echo it.
  })

  it('accepts when action is present and matches (success true + action correct)', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, action: 'arqwelia_contact' }), { status: 200 })))
    const result = await verifyTurnstileToken({ token: 't', expectedAction: 'arqwelia_contact' })
    expect(result.success).toBe(true)
  })

  it('rejects when the action is ABSENT on the verified token', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })))
    const result = await verifyTurnstileToken({ token: 't', expectedAction: 'arqwelia_contact' })
    expect(result.success).toBe(false)
    expect(result.reason).toBe('turnstile_action_mismatch')
  })

  it('rejects when the action is present but different', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, action: 'signup' }), { status: 200 })))
    const result = await verifyTurnstileToken({ token: 't', expectedAction: 'arqwelia_contact' })
    expect(result.success).toBe(false)
    expect(result.reason).toBe('turnstile_action_mismatch')
  })

  it('accepts when hostname is present and matches', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, action: 'arqwelia_contact', hostname: 'arqwelia.example.com' }), { status: 200 })))
    const result = await verifyTurnstileToken({
      token: 't',
      expectedAction: 'arqwelia_contact',
      expectedHostname: 'arqwelia.example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects when hostname is absent but expected', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, action: 'arqwelia_contact' }), { status: 200 })))
    const result = await verifyTurnstileToken({
      token: 't',
      expectedAction: 'arqwelia_contact',
      expectedHostname: 'arqwelia.example.com',
    })
    expect(result.success).toBe(false)
    expect(result.reason).toBe('turnstile_hostname_mismatch')
  })

  it('rejects when hostname differs from the expected one', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, action: 'arqwelia_contact', hostname: 'evil.example.com' }), { status: 200 })))
    const result = await verifyTurnstileToken({
      token: 't',
      expectedAction: 'arqwelia_contact',
      expectedHostname: 'arqwelia.example.com',
    })
    expect(result.success).toBe(false)
    expect(result.reason).toBe('turnstile_hostname_mismatch')
  })

  it('reports unavailable when the siteverify service errors', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 503 })))
    const result = await verifyTurnstileToken({ token: 'valid-token', expectedAction: 'arqwelia_contact' })
    expect(result.success).toBe(false)
    expect(result.reason).toBe('turnstile_unavailable')
  })

  it('rejects an invalid token returned by Cloudflare', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 })))
    const result = await verifyTurnstileToken({ token: 'bad-token', expectedAction: 'arqwelia_contact' })
    expect(result.success).toBe(false)
    expect(result.reason).toBe('invalid-input-response')
  })
})
