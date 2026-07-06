/**
 * AQWELIA — Typed wrapper around `next-auth/react`'s `useSession`.
 *
 * Re-exports the underlying hook under a stable name and provides a typed
 * `SessionUser` so client components can access `user.id` without `as any`.
 */
'use client'

import { useSession as useNextAuthSession } from 'next-auth/react'

export type SessionUser = {
  id: string
  email: string
  name?: string | null
}

export function useSession() {
  const result = useNextAuthSession()
  // The augmented Session type (see src/types/next-auth.d.ts) guarantees `user.id`.
  const user = (result.data?.user ?? null) as SessionUser | null
  return {
    ...result,
    user,
    isAuthenticated: result.status === 'authenticated' && !!user,
  }
}

export default useSession
