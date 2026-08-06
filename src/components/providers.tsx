'use client'

import { SessionProvider } from 'next-auth/react'
import { useRevenueCatIdentity } from '@/hooks/use-revenuecat-identity'

function RevenueCatIdentitySync() {
  useRevenueCatIdentity()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RevenueCatIdentitySync />
      {children}
    </SessionProvider>
  )
}
