import { beforeEach, describe, expect, it } from 'vitest'
import { checkRateLimit, rateLimitedResponse, resetRateLimitsForTests } from '@/lib/rate-limit'

describe('P0-C in-process rate limiter', () => {
  beforeEach(() => resetRateLimitsForTests())

  it('allows requests up to the configured limit', () => {
    const request = new Request('https://aqwelia.app/api/contact', {
      headers: { 'x-real-ip': '192.0.2.1' },
    })
    expect(checkRateLimit(request, 'contact', 2, 60_000, 1_000).allowed).toBe(true)
    const second = checkRateLimit(request, 'contact', 2, 60_000, 1_001)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(0)
  })

  it('blocks excess requests and provides Retry-After', async () => {
    const request = new Request('https://aqwelia.app/api/contact', {
      headers: { 'x-forwarded-for': '192.0.2.2, 10.0.0.1' },
    })
    checkRateLimit(request, 'contact', 1, 60_000, 1_000)
    const blocked = checkRateLimit(request, 'contact', 1, 60_000, 2_000)
    expect(blocked.allowed).toBe(false)
    const response = rateLimitedResponse(blocked)
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('59')
    expect(await response.json()).toEqual({ error: 'rate_limited' })
  })

  it('separates endpoints and client addresses', () => {
    const first = new Request('https://aqwelia.app', { headers: { 'x-real-ip': '192.0.2.3' } })
    const second = new Request('https://aqwelia.app', { headers: { 'x-real-ip': '192.0.2.4' } })
    checkRateLimit(first, 'register', 1, 60_000, 1_000)
    expect(checkRateLimit(first, 'contact', 1, 60_000, 1_001).allowed).toBe(true)
    expect(checkRateLimit(second, 'register', 1, 60_000, 1_001).allowed).toBe(true)
  })

  it('opens a fresh window after expiry', () => {
    const request = new Request('https://aqwelia.app', { headers: { 'x-real-ip': '192.0.2.5' } })
    checkRateLimit(request, 'register', 1, 1_000, 1_000)
    expect(checkRateLimit(request, 'register', 1, 1_000, 1_500).allowed).toBe(false)
    expect(checkRateLimit(request, 'register', 1, 1_000, 2_001).allowed).toBe(true)
  })
})
