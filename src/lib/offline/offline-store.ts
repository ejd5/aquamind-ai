/**
 * AQWELIA — Offline state store (Zustand + persist).
 *
 * Tracks three pieces of state used by the offline layer:
 *
 *   - `isOnline`         — current connectivity (mirrored from the network
 *                          hook so any component can read it without
 *                          subscribing to browser events).
 *   - `lastOnlineAt`     — timestamp of the last moment we were online.
 *   - `pendingActions`   — write operations (POST/PATCH/DELETE) that were
 *                          queued while offline. They get replayed by
 *                          `flushPending()` as soon as connectivity
 *                          returns.
 *
 * The store is persisted to `localStorage` under the `aqwelia-offline` key,
 * so queued actions survive a page reload. On native (Capacitor), the
 * storage adapter falls back to no-op SSR-safe stubs — a future task can
 * swap in `@capacitor/preferences` here.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '@/lib/api-client'

export interface PendingAction {
  id: string
  method: 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  createdAt: number
}

export interface OfflineState {
  isOnline: boolean
  lastOnlineAt: number | null
  pendingActions: PendingAction[]
  setOnline: (online: boolean) => void
  queueAction: (action: Omit<PendingAction, 'id' | 'createdAt'>) => void
  flushPending: () => Promise<void>
  clearPending: () => void
}

/**
 * SSR-safe storage adapter. On the server, returns no-op stubs so the
 * persist middleware does not crash during hydration. On the client (web),
 * uses `localStorage`. On Capacitor native, a future task can replace this
 * with `@capacitor/preferences`.
 */
function createSafeStorage(): Storage {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage
  }
  // SSR / non-browser fallback (no-op)
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  }
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: true,
      lastOnlineAt: Date.now(),
      pendingActions: [],

      setOnline: (online) =>
        set((state) => ({
          isOnline: online,
          lastOnlineAt: online ? Date.now() : state.lastOnlineAt,
        })),

      queueAction: (action) =>
        set((state) => ({
          pendingActions: [
            ...state.pendingActions,
            {
              ...action,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              createdAt: Date.now(),
            },
          ],
        })),

      flushPending: async () => {
        const { pendingActions } = get()
        if (pendingActions.length === 0) return

        const failed: PendingAction[] = []
        for (const action of pendingActions) {
          try {
            if (action.method === 'POST') {
              await api.post(action.path, action.body)
            } else if (action.method === 'PATCH') {
              await api.patch(action.path, action.body)
            } else if (action.method === 'DELETE') {
              await api.delete(action.path)
            }
          } catch {
            // Keep the failed action in the queue for the next retry.
            failed.push(action)
          }
        }
        set({ pendingActions: failed })
      },

      clearPending: () => set({ pendingActions: [] }),
    }),
    {
      name: 'aqwelia-offline',
      storage: createJSONStorage(() => createSafeStorage()),
    },
  ),
)
