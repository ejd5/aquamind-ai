/**
 * ARQWELIA — rate limiter HMAC fingerprint tests.
 *
 * Verifies the hardened client fingerprint:
 *   - same client → same bucket during the runtime lifetime
 *   - different clients → separate buckets
 *   - raw IP never stored (bucket keys hold opaque HMAC digests)
 *   - quota + Retry-After behaviour unchanged
 *   - after a simulated restart (salt reset) the fingerprint changes
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  checkRateLimit,
  resetRateLimitsForTests,
  resetRateLimitSaltForTests,
  rateLimitBucketKeysForTests,
} from '@/lib/rate-limit'

const WINDOW = 60 * 60 * 1000

function reqFor(ip: string, url = 'http://localhost/x'): Request {
  return new Request(url, { headers: { 'x-forwarded-for': ip } })
}

describe('ARQWELIA rate limiter fingerprint', () => {
  beforeEach(() => resetRateLimitsForTests())
  afterEach(() => resetRateLimitsForTests())

  it('same client produces the same fingerprint during the runtime lifetime', () => {
    const first = checkRateLimit(reqFor('203.0.113.7'), 'ns', 10, WINDOW)
    const second = checkRateLimit(reqFor('203.0.113.7'), 'ns', 10, WINDOW)
    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(first.remaining - 1)
  })

  it('different clients are tracked in separate buckets', () => {
    const a = checkRateLimit(reqFor('203.0.113.7'), 'ns', 1, WINDOW)
    const b = checkRateLimit(reqFor('198.51.100.9'), 'ns', 1, WINDOW)
    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
    // Bucket count reflects both clients independently.
    expect(rateLimitBucketKeysForTests().length).toBe(2)
  })

  it('raw IP is never stored in the bucket keys', () => {
    checkRateLimit(reqFor('203.0.113.7'), 'ns', 1, WINDOW)
    checkRateLimit(reqFor('198.51.100.9'), 'ns', 1, WINDOW)
    const keys = rateLimitBucketKeysForTests()
    for (const key of keys) {
      expect(key).not.toContain('203.0.113.7')
      expect(key).not.toContain('198.51.100.9')
      // HMAC-SHA256 digests are 64 hex chars — opaque, salted.
      expect(key).toMatch(/^ns:[0-9a-f]{64}$/)
    }
  })

  it('quota and Retry-After behaviour are unchanged', () => {
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit(reqFor('203.0.113.7'), 'ns', 3, WINDOW)
      expect(r.allowed).toBe(true)
    }
    const blocked = checkRateLimit(reqFor('203.0.113.7'), 'ns', 3, WINDOW)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('the fingerprint changes after a simulated restart (new salt)', () => {
    const before = rateLimitBucketKeysForTests()
    checkRateLimit(reqFor('203.0.113.7'), 'ns', 10, WINDOW)
    const keyBefore = rateLimitBucketKeysForTests()
    expect(keyBefore.length).toBe(1)

    resetRateLimitSaltForTests()
    const after = rateLimitBucketKeysForTests()
    expect(after.length).toBe(0)

    checkRateLimit(reqFor('203.0.113.7'), 'ns', 10, WINDOW)
    const keyAfter = rateLimitBucketKeysForTests()
    expect(keyAfter.length).toBe(1)
    // A different salt ⇒ a different (unlinkable) fingerprint for the same IP.
    expect(keyAfter[0]).not.toBe(keyBefore[0])
    expect(before).not.toBe(keyAfter)
  })
})
