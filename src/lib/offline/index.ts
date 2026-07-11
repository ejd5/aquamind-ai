/**
 * AQWELIA — Offline layer barrel.
 *
 * Re-exports the cache primitives, the cached API client, and the offline
 * Zustand store so consumers can do:
 *
 *   import { offlineApi, useOfflineStore, clearAllCache } from '@/lib/offline'
 */

export * from './cache'
export * from './api-cache'
export * from './offline-store'
