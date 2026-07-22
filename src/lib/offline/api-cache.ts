/**
 * AQWELIA — Cached API client.
 *
 * Wraps the existing `api` client (src/lib/api-client.ts) with an IndexedDB
 * cache layer. The strategy is "network-first, cache-fallback":
 *
 *   1. Try the network request.
 *   2. On success → write to cache → return fresh data with `stale: false`.
 *   3. On failure → read from cache → return stale data with `stale: true`
 *      (or `{ data: null, stale: false, error }` if nothing is cached).
 *
 * The cache key is the request path. TTLs are configurable per endpoint
 * category (see `CACHE_TTL`).
 *
 * Usage:
 *   const { data, stale, error } = await offlineApi.dashboard()
 *   if (stale) showOfflineBanner()
 */

import { api } from '@/lib/api-client'
import { getCached, setCached } from './cache'

/**
 * Cache TTL per endpoint category (in ms).
 * Short-lived for frequently-changing data, long-lived for mostly-static
 * reference data.
 */
export const CACHE_TTL = {
  dashboard: 5 * 60 * 1000, // 5 min
  profile: 60 * 60 * 1000, // 1 hour
  waterTests: 5 * 60 * 1000, // 5 min
  guides: 24 * 60 * 60 * 1000, // 24 hours
  weather: 30 * 60 * 1000, // 30 min
  reminders: 5 * 60 * 1000, // 5 min
  equipment: 60 * 60 * 1000, // 1 hour
  inventory: 60 * 60 * 1000, // 1 hour
  subscription: 60 * 60 * 1000, // 1 hour
  winterGuardian: 30 * 60 * 1000, // 30 min — weather-driven, refresh 2x/hour
  annualReview: 60 * 60 * 1000, // 1 hour — recomputed from history, slow-moving
} as const

export type CacheTtlKey = keyof typeof CACHE_TTL

export interface CachedResult<T> {
  data: T | null
  /** `true` when the data comes from cache because the network request failed. */
  stale: boolean
  /** Error message from the failed network request, when applicable. */
  error?: string
}

/**
 * Generic cached GET. Tries network first, then falls back to cache.
 * Always resolves — never throws — so callers can use a single code path.
 */
export async function apiGetCached<T>(
  path: string,
  ttlKey?: CacheTtlKey,
): Promise<CachedResult<T>> {
  const ttl = ttlKey ? CACHE_TTL[ttlKey] : 5 * 60 * 1000

  try {
    const data = await api.get<T>(path)
    // Persist to cache (fire and forget — failures are non-fatal).
    await setCached(path, data, ttl)
    return { data, stale: false }
  } catch (err) {
    // Network failed — try cache
    const cached = await getCached<T>(path)
    const message = err instanceof Error ? err.message : 'Network error'
    if (cached) {
      return { data: cached, stale: true, error: message }
    }
    return { data: null, stale: false, error: message }
  }
}

function withPool(path: string, poolId?: string | null) {
  return poolId ? `${path}&poolId=${encodeURIComponent(poolId)}` : path
}

/**
 * Convenience methods for the most common GET endpoints.
 * Each returns a `CachedResult<T>` — never throws.
 */
export const offlineApi = {
  dashboard: () => apiGetCached('/api/dashboard?v2', 'dashboard'),
  profile: () => apiGetCached('/api/pool/profile?v2', 'profile'),
  waterTests: (poolId?: string | null) =>
    apiGetCached(withPool('/api/pool/water-test?v2', poolId), 'waterTests'),
  photoDiagnostic: (poolId?: string | null) =>
    apiGetCached(
      withPool('/api/pool/photo-diagnostic?v2', poolId),
      'waterTests',
    ),
  weather: () => apiGetCached('/api/pool/weather?v2', 'weather'),
  reminders: () => apiGetCached('/api/pool/reminders?v2', 'reminders'),
  guides: () => apiGetCached('/api/guides?v2', 'guides'),
  equipment: () => apiGetCached('/api/pool/equipment?v2', 'equipment'),
  inventory: () => apiGetCached('/api/pool/inventory?v2', 'inventory'),
  subscription: () => apiGetCached('/api/subscription?v2', 'subscription'),
}
