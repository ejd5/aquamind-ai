type Bucket = { count: number; resetAt: number }

const globalStore = globalThis as typeof globalThis & {
  aqweliaRateLimits?: Map<string, Bucket>
}

const buckets = globalStore.aqweliaRateLimits ?? new Map<string, Bucket>()
globalStore.aqweliaRateLimits = buckets

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

function clientIdentifier(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || 'unknown'
}

/**
 * In-process fixed-window limiter for the standalone MVP deployment.
 * Production edge rate limiting remains recommended for multi-instance use.
 */
export function checkRateLimit(
  request: Request,
  namespace: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  const key = `${namespace}:${clientIdentifier(request)}`
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
