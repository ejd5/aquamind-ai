'use client'

/**
 * AQWELIA Wave A2 — centralized sign-out.
 *
 * The ONLY way to sign out. Always clears the RevenueCat identity BEFORE the
 * NextAuth sign-out, and is fail-closed: on error the previous identity is
 * never reused.
 *
 * Used by settings, header, mobile-header and admin.
 */

import { signOut } from 'next-auth/react'
import { isNative } from '@/lib/platform'
import { revenueCatIdentityBridge } from '@/lib/billing/revenuecat-identity'

/**
 * Signs the user out. On native, clears the RevenueCat identity first so a
 * previous user's identity is never reused, then calls NextAuth signOut.
 *
 * @param options next-auth signOut options (callbackUrl etc.)
 */
export async function signOutWithBillingCleanup(options?: Parameters<typeof signOut>[0]): Promise<void> {
  try {
    if (isNative()) {
      await revenueCatIdentityBridge.clearIdentity()
    }
  } catch {
    // Fail-closed: even if clearing throws, the bridge's clearIdentity already
    // nulled expectedUserId; proceed with the NextAuth sign-out so the user is
    // never stuck signed-in.
  }
  await signOut(options)
}

/**
 * Wrap an onClick handler that signs out (used by menus that also close).
 */
export function handleSignOutClick(options?: Parameters<typeof signOut>[0]) {
  return (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.()
    void signOutWithBillingCleanup(options)
  }
}
