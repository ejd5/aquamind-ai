import { createHmac, randomBytes } from 'node:crypto'

type Bucket = { count: number; resetAt: number }

const globalStore = globalThis as typeof globalThis & {
  aqweliaRateLimits?: Map<string, Bucket>
  aqweliaRateLimitSalt?: Buffer
}

const buckets = globalStore.aqweliaRateLimits ?? new Map<string, Bucket>()
globalStore.aqweliaRateLimits = buckets

/**
 * Runtime-only random HMAC salt. Held in memory (never persisted, never sent to
 * clients). Because it is regenerated on every process start / deploy, the same
 * IP yields the same fingerprint during the lifetime of one instance, and a
 * different (unlinkable) fingerprint after a restart.
 */
function currentSalt(): Buffer {
  return (globalStore.aqweliaRateLimitSalt ??= randomBytes(32))
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Stable server-side fingerprint for a client.
 *
 * HMAC-SHA256(runtimeSalt, rawIp). The raw IP is NEVER stored or logged — the
 * in-memory buckets only ever hold opaque HMAC digests keyed by a random,
 * per-runtime salt. Note this is NOT "non-reversible" in the cryptographic
 * sense: it merely decorrelates the stored value from the IP using a salt an
 * attacker does not know. The salt resets on restart, so fingerprints cannot
 * be correlated across deployments.
 */
function clientFingerprint(request: Request): string {
  const raw =
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  return createHmac('sha256', currentSalt()).update(raw).digest('hex')
}

/**
 * In-process fixed-window limiter.
 *
 * Best effort only:
 * - in-process / per-instance (each instance has its own buckets + salt);
 * - on a serverless architecture (e.g. Vercel) it is per-isolate and should be
 *   treated as best-effort, complementary to Cloudflare Turnstile;
 * - a distributed limiter (edge / Redis) is required before significant
 *   traffic scaling.
 */
export function checkRateLimit(
  request: Request,
  namespace: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  const key = `${namespace}:${clientFingerprint(request)}`
  const existing = buckets.get(key)
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : existing

  bucket.count += 1
  buckets.set(key, bucket)

  // Prevent an unbounded map when many one-off client IPs hit the service.
  if (buckets.size > 10_000) {
    for (const [candidate, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(candidate)
    }
  }

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

export function rateLimitedResponse(result: RateLimitResult): Response {
  return Response.json(
    { error: 'rate_limited' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'Cache-Control': 'private, no-store',
      },
    }
  )
}

export function resetRateLimitsForTests(): void {
  buckets.clear()
}

/** Simulates an instance restart: regenerate the salt (fingerprints change). */
export function resetRateLimitSaltForTests(): void {
  globalStore.aqweliaRateLimitSalt = randomBytes(32)
  buckets.clear()
}

/** Read-only introspection for tests: never expose this in production paths. */
export function rateLimitBucketKeysForTests(): string[] {
  return [...buckets.keys()]
}
