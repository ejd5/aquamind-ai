'use client'

/**
 * AQWELIA Wave A3 — mobile root providers.
 *
 * Provides the NextAuth SessionProvider (needed by the RevenueCat identity
 * bridge and every authenticated screen) and mounts the shared RevenueCat
 * identity bridge so the SDK identity follows the session (native only).
 *
 * The bridge guarantees:
 *   - session loading  → billing not ready, no purchase/restore possible;
 *   - connected        → setIdentity(user.id) after SDK + server binding +
 *                        server-provided billing environment;
 *   - disconnected     → clearIdentity() happens BEFORE the app session ends
 *                        (the sign-out wrapper calls it first);
 *   - account switch   → the epoch invalidates any in-flight operation.
 */

import { SessionProvider } from 'next-auth/react'
import { useRevenueCatIdentity } from '@/hooks/use-revenuecat-identity'

function RevenueCatIdentitySync() {
  useRevenueCatIdentity()
  return null
}

export function MobileRootProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RevenueCatIdentitySync />
      {children}
    </SessionProvider>
  )
}
