'use client'

/**
 * AQWELIA Wave A2/A3 — centralized sign-out.
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
 * Native sign-out disables NextAuth's server redirect: otherwise the backend
 * may return an HTTPS website URL and navigate the Capacitor WebView out of the
 * bundled application. Navigation is performed locally after the session ends.
 *
 * @param options next-auth signOut options (callbackUrl etc.)
 */
export async function signOutWithBillingCleanup(options?: Parameters<typeof signOut>[0]): Promise<void> {
  const native = isNative()

  try {
    if (native) {
      await revenueCatIdentityBridge.clearIdentity()
    }
  } catch {
    // Fail-closed: even if clearing throws, the bridge's clearIdentity already
    // nulled expectedUserId; proceed with the NextAuth sign-out so the user is
    // never stuck signed-in.
  }

  if (!native) {
    await signOut(options)
    return
  }

  const shouldRedirect = options?.redirect !== false
  const callbackUrl = options?.callbackUrl || '/auth/signin'

  await signOut({ ...(options ?? {}), redirect: false })

  if (shouldRedirect && typeof window !== 'undefined') {
    window.location.assign(callbackUrl)
  }
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
