/**
 * AQWELIA — Offline state store (Zustand + persist).
 *
 * Queued writes survive page reloads and are replayed when connectivity
 * returns. Every action receives a stable idempotency key that is reused for
 * every retry, so the server can return the original result instead of
 * creating a duplicate record when a response is lost.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '@/lib/api-client'

export interface PendingAction {
  id: string
  idempotencyKey: string
  method: 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  createdAt: number
  attempts: number
  lastAttemptAt?: number
}

export interface OfflineState {
  isOnline: boolean
  lastOnlineAt: number | null
  pendingActions: PendingAction[]
  isFlushing: boolean
  setOnline: (online: boolean) => void
  queueAction: (
    action: Omit<PendingAction, 'id' | 'idempotencyKey' | 'createdAt' | 'attempts' | 'lastAttemptAt'>,
  ) => string
  flushPending: () => Promise<void>
  clearPending: () => void
}

function createSafeStorage(): Storage {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage
  }
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  }
}

function createMutationId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: true,
      lastOnlineAt: Date.now(),
      pendingActions: [],
      isFlushing: false,

      setOnline: (online) =>
        set((state) => ({
          isOnline: online,
          lastOnlineAt: online ? Date.now() : state.lastOnlineAt,
        })),

      queueAction: (action) => {
        const id = createMutationId()
        const queued: PendingAction = {
          ...action,
          id,
          idempotencyKey: id,
          createdAt: Date.now(),
          attempts: 0,
        }
        set((state) => ({ pendingActions: [...state.pendingActions, queued] }))
        return id
      },

      flushPending: async () => {
        if (get().isFlushing) return
        set({ isFlushing: true })

        try {
          // Work from a snapshot. Successful actions are removed individually,
          // preserving actions that may be queued while a flush is running.
          const snapshot = [...get().pendingActions]
          for (const action of snapshot) {
            const idempotencyKey = action.idempotencyKey || action.id
            set((state) => ({
              pendingActions: state.pendingActions.map((pending) =>
                pending.id === action.id
                  ? {
                      ...pending,
                      idempotencyKey,
                      attempts: (pending.attempts || 0) + 1,
                      lastAttemptAt: Date.now(),
                    }
                  : pending,
              ),
            }))

            const options = { headers: { 'Idempotency-Key': idempotencyKey } }
            try {
              await api.post(
                '/api/offline/replay',
                { method: action.method, path: action.path, body: action.body },
                options,
              )

              set((state) => ({
                pendingActions: state.pendingActions.filter((pending) => pending.id !== action.id),
              }))
            } catch {
              // Keep the exact same key for the next retry. This covers both a
              // genuine server failure and the case where the mutation succeeded
              // but its response was lost during reconnection.
            }
          }
        } finally {
          set({ isFlushing: false })
        }
      },

      clearPending: () => set({ pendingActions: [] }),
    }),
    {
      name: 'aqwelia-offline',
      storage: createJSONStorage(() => createSafeStorage()),
      partialize: (state) => ({
        isOnline: state.isOnline,
        lastOnlineAt: state.lastOnlineAt,
        pendingActions: state.pendingActions,
      }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<OfflineState> | undefined
        return {
          ...current,
          ...stored,
          isFlushing: false,
          pendingActions: (stored?.pendingActions || []).map((action) => ({
            ...action,
            idempotencyKey: action.idempotencyKey || action.id,
            attempts: action.attempts || 0,
          })),
        }
      },
    },
  ),
)
