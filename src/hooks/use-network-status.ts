'use client'

/**
 * AQWELIA — Network status hook.
 *
 * Tracks online/offline connectivity and mirrors the state into the
 * offline Zustand store (`useOfflineStore`), so any component can read
 * the current connectivity without subscribing to browser events.
 *
 * Implementation:
 *   - Uses `useSyncExternalStore` (the React-recommended primitive for
 *     subscribing to external state). This avoids both hydration
 *     mismatches and the `react-hooks/set-state-in-effect` lint error.
 *   - Server snapshot is `true` (matches the store default), so the
 *     offline banner never appears during SSR.
 *   - Client snapshot reads `navigator.onLine`.
 *   - A small `useEffect` mirrors the value into the offline store and
 *     kicks off `flushPending()` when connectivity returns. Calling
 *     Zustand's setter from an effect is fine — it is an external store,
 *     not React state, so it does not trigger cascading React renders.
 *
 * The spec calls for an additional native bridge
 * (`src/lib/native/network.ts`, wrapping `@capacitor/network`). That
 * module is delivered by a separate task — on web, the standard browser
 * events above are sufficient. On Capacitor native, the WebView also
 * forwards `online`/`offline` events, so this hook stays functional in
 * both environments.
 *
 * Mount this hook once near the root of the app (e.g. in the desktop
 * `AppShell` and the mobile `MobileAppShell`). Multiple mounts are safe
 * — they all just write to the same store.
 */

import { useEffect, useSyncExternalStore } from 'react'
import { useOfflineStore } from '@/lib/offline/offline-store'

export interface NetworkStatus {
  isOnline: boolean
  isOffline: boolean
}

/**
 * Subscribe to browser online/offline events.
 * On the server, returns a no-op unsubscribe (the snapshot is fixed to
 * `true` via `getServerSnapshot`).
 */
function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

/**
 * Client snapshot — current connectivity from the browser.
 */
function getSnapshot(): boolean {
  if (typeof window === 'undefined') return true
  return window.navigator.onLine
}

/**
 * Server snapshot — assume online (matches the store default).
 */
function getServerSnapshot(): boolean {
  return true
}

export function useNetworkStatus(): NetworkStatus {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setStoreOnline = useOfflineStore((s) => s.setOnline)

  // Mirror the value into the offline store, and replay queued write
  // actions as soon as connectivity is restored.
  useEffect(() => {
    setStoreOnline(isOnline)
    if (isOnline) {
      // Fire and forget — `flushPending()` absorbs its own errors and
      // keeps failed actions in the queue for the next retry.
      useOfflineStore
        .getState()
        .flushPending()
        .catch(() => {
          // Silent — the store retains the failed actions.
        })
    }
  }, [isOnline, setStoreOnline])

  return { isOnline, isOffline: !isOnline }
}
