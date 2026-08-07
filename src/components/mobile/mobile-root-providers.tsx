'use client'

/**
 * AQWELIA Wave A4 — mobile root providers.
 *
 * Installs the mobile API bridge before NextAuth renders, provides the shared
 * session context, follows the canonical AQWELIA identity in RevenueCat, and
 * handles secure native deep-link returns from the hosted registration flow.
 */

import { SessionProvider } from 'next-auth/react'
import { MobileDeepLinkBridge } from '@/components/mobile/mobile-deep-link-bridge'
import { useRevenueCatIdentity } from '@/hooks/use-revenuecat-identity'
import { installMobileApiFetchBridge } from '@/lib/mobile-api-fetch'

function RevenueCatIdentitySync() {
  // The hook owns the canonical RevenueCat transition that was previously
  // inline here: setIdentity(user.id). Keeping identity logic in one hook also
  // ensures login, logout and account-switch behaviour stay centralized.
  useRevenueCatIdentity()
  return null
}

export function MobileRootProviders({ children }: { children: React.ReactNode }) {
  // Must run synchronously before SessionProvider mounts, otherwise its first
  // `/api/auth/session` request would target the local Capacitor WebView.
  installMobileApiFetchBridge()

  return (
    <SessionProvider>
      <MobileDeepLinkBridge />
      <RevenueCatIdentitySync />
      {children}
    </SessionProvider>
  )
}
