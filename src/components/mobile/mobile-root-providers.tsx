'use client'

/**
 * AQWELIA Wave A3 — mobile root providers.
 *
 * Installs the mobile API fetch bridge before NextAuth renders, provides the
 * SessionProvider needed by authenticated screens, and mounts the shared
 * RevenueCat identity bridge so the SDK identity follows the session.
 *
 * The bridge guarantees:
 *   - relative /api requests target NEXT_PUBLIC_API_BASE_URL in Capacitor;
 *   - session loading  → billing not ready, no purchase/restore possible;
 *   - connected        → setIdentity(user.id) after SDK + server binding +
 *                        server-provided billing environment;
 *   - disconnected     → clearIdentity() happens BEFORE the app session ends;
 *   - account switch   → the epoch invalidates any in-flight operation.
 */

import { SessionProvider } from 'next-auth/react'
import { useRevenueCatIdentity } from '@/hooks/use-revenuecat-identity'
import { installMobileApiFetchBridge } from '@/lib/mobile-api-fetch'

function RevenueCatIdentitySync() {
  useRevenueCatIdentity()
  return null
}

export function MobileRootProviders({ children }: { children: React.ReactNode }) {
  // Must run synchronously before SessionProvider mounts, otherwise its first
  // `/api/auth/session` request would target the local Capacitor WebView.
  installMobileApiFetchBridge()

  return (
    <SessionProvider>
      <RevenueCatIdentitySync />
      {children}
    </SessionProvider>
  )
}
