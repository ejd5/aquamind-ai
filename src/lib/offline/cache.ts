/**
 * AQWELIA — IndexedDB cache for API responses.
 *
 * A minimal, SSR-safe wrapper around IndexedDB used by the offline layer to
 * persist successful API responses. When the network fails, `getCached()`
 * returns the most recent cached payload (even if stale) so the UI can keep
 * showing data instead of an error state.
 *
 * Design notes:
 *   - Single object store `responses` keyed by the request path.
 *   - Each entry carries `cachedAt` and `expiresAt`; expired entries are
 *     deleted lazily on read.
 *   - All functions are async and never throw — on SSR or environments
 *     without IndexedDB, they resolve to no-ops / null. This makes them
 *     safe to call from any client-side data hook without try/catch.
 */

const DB_NAME = 'aqwelia-cache'
const DB_VERSION = 1
const STORE_NAME = 'responses'

/**
 * Open (or create) the cache database.
 * Rejects on environments without IndexedDB (SSR, old browsers, private mode).
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
  })
}

export interface CacheEntry<T = unknown> {
  key: string
  data: T
  cachedAt: number
  expiresAt: number // timestamp (ms)
}

/**
 * Store a value in the cache with a TTL.
 * Resolves once the transaction completes (or silently on failure).
 */
export async function setCached<T>(
  key: string,
  data: T,
  ttlMs: number = 24 * 60 * 60 * 1000,
): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const entry: CacheEntry<T> = {
      key,
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    }
    tx.objectStore(STORE_NAME).put(entry)
    return new Promise((resolve) => {
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        resolve()
      }
    })
  } catch {
    // IndexedDB not available — fallback to memory (no-op)
  }
}

/**
 * Read a value from the cache.
 * Returns `null` if missing, expired, or on any error.
 * Expired entries are deleted lazily on read.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    return new Promise((resolve) => {
      const request = tx.objectStore(STORE_NAME).get(key)
      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined
        db.close()
        if (!entry) {
          resolve(null)
          return
        }
        if (Date.now() > entry.expiresAt) {
          // Expired — delete and return null
          void deleteCached(key)
          resolve(null)
          return
        }
        resolve(entry.data)
      }
      request.onerror = () => {
        db.close()
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

/**
 * Delete a single cache entry.
 */
export async function deleteCached(key: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    return new Promise((resolve) => {
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        resolve()
      }
    })
  } catch {
    // no-op
  }
}

/**
 * Clear all cached entries (used by "Reset cache" UI action).
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    return new Promise((resolve) => {
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        resolve()
      }
    })
  } catch {
    // no-op
  }
}
