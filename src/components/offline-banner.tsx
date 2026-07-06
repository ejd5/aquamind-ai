'use client'

/**
 * AQWELIA — Offline banner.
 *
 * A small fixed-top banner shown when `useOfflineStore.isOnline === false`.
 * It surfaces two pieces of information to the user:
 *
 *   1. The app is currently offline and showing cached data.
 *   2. There are N pending write actions queued — clicking "Synchroniser"
 *      replays them via `useOfflineStore.flushPending()`.
 *
 * The banner auto-hides when connectivity is restored. It is SSR-safe:
 * `useIsClient()` returns `false` on the server and during the first
 * client render, then `true` after hydration — this prevents mismatches
 * caused by the persisted `isOnline` value being applied synchronously
 * on the client (Zustand's persist middleware hydrates from localStorage
 * before the first paint).
 *
 * Mount this component once near the root of the app (e.g. in the desktop
 * `AppShell` and the mobile `MobileAppShell`). The actual network
 * subscription lives in `useNetworkStatus()` — mount that hook once as
 * well so the store's `isOnline` flag stays in sync.
 */

import { useSyncExternalStore } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { useOfflineStore } from '@/lib/offline/offline-store'

/**
 * SSR-safe "is client" flag.
 *
 * Returns `false` during SSR and the initial client render, then `true`
 * after hydration. This is the React-recommended alternative to the
 * `useEffect + setState(true)` pattern (which trips the
 * `react-hooks/set-state-in-effect` lint rule and can cause cascading
 * renders).
 */
function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true, // client snapshot
    () => false, // server snapshot
  )
}

export function OfflineBanner() {
  const isClient = useIsClient()
  const isOnline = useOfflineStore((s) => s.isOnline)
  const pendingActions = useOfflineStore((s) => s.pendingActions)
  const flushPending = useOfflineStore((s) => s.flushPending)

  // Avoid hydration mismatch: render nothing on the server and during
  // the first client pass, then reveal once hydrated.
  if (!isClient || isOnline) return null

  const pendingCount = pendingActions.length

  const handleSync = () => {
    // Fire and forget — failures are absorbed by `flushPending()` itself
    // (failed actions stay in the queue for the next retry).
    flushPending().catch(() => {
      // Silent — the banner remains visible as long as we're offline.
    })
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="safe-area-top fixed left-0 right-0 top-0 z-[60] flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-amber-500/20"
    >
      <div className="flex items-center gap-2">
        <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
        <span>Hors connexion — données en cache</span>
      </div>
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={handleSync}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/30 active:bg-white/40"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Synchroniser ({pendingCount})
        </button>
      )}
    </div>
  )
}
