'use client'

/**
 * AQWELIA Wave A2 — observe the NextAuth session and keep the RevenueCat
 * identity bridge in sync (native only). On authentication the SDK is
 * initialized and Purchases.logIn({ appUserID: session.user.id }) runs; on
 * sign-out the bridge clears the identity BEFORE NextAuth completes the
 * sign-out (the wrapper calls clearIdentity first).
 *
 * On web this is a no-op.
 */

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { isNative } from '@/lib/platform'
import { syncRevenueCatIdentity } from '@/lib/billing/revenuecat-identity'

export function useRevenueCatIdentity(): void {
  const { data: session } = useSession()
  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (!isNative()) return
    void syncRevenueCatIdentity(userId)
  }, [userId])
}
