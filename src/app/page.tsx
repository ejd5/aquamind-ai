'use client'

import { useEffect, useState, lazy, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { LandingPage } from '@/components/landing/landing-page'
import { isMobile, isNative } from '@/lib/platform'

// Dynamic imports: AppShell and MobileAppShell are heavy components
// (full dashboard with many features). Loading them lazily avoids
// compiling them on the initial page load, which reduces memory
// pressure in memory-constrained environments (sandbox/preview).
const AppShell = lazy(() =>
  import('@/components/aquamind/app-shell').then((m) => ({ default: m.AppShell }))
)
const MobileAppShell = lazy(() =>
  import('@/components/mobile/mobile-app-shell').then((m) => ({ default: m.MobileAppShell }))
)

type View = 'landing' | 'app'

export default function Home() {
  const t = useTranslations('common')
  const [view, setView] = useState<View>('landing')
  const [hasProfile, setHasProfile] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [native, setNative] = useState(false)

  useEffect(() => {
    let cancelled = false
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aqwelia_view') : null
    // Compute platform values once (client-side only)
    const mobileVal = isMobile()
    const nativeVal = isNative()

    // Clear ALL caches (IndexedDB + HTTP cache) on version bump.
    // v4: forces clear after StripScan v2 redesign — old JS chunks were stuck
    // in the browser HTTP cache, showing the old design even after server restart.
    if (typeof window !== 'undefined' && !sessionStorage.getItem('aqwelia_cache_v4')) {
      sessionStorage.setItem('aqwelia_cache_v4', '1')
      // Clear IndexedDB API cache
      import('@/lib/offline/cache').then(({ clearAllCache }) => {
        clearAllCache().then(() => {
          console.log('[AQWELIA] IndexedDB cache cleared (v4)')
        })
      }).catch(() => {})
      // Clear ALL HTTP caches (Service Worker Cache API)
      if (typeof caches !== 'undefined') {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name))
          console.log('[AQWELIA] HTTP cache cleared (v4)')
        }).catch(() => {})
      }
    }

    // CRITICAL: Check auth session FIRST. Only show the app if the user is
    // authenticated AND has a pool profile. Without this check, an
    // unauthenticated user (or an authenticated user without a profile)
    // with localStorage.aqwelia_view='app' would land in the AppShell →
    // Onboarding, which is confusing. Always show the landing page first
    // unless the user is authenticated AND has a profile.
    Promise.all([
      fetch('/api/auth/session').then((r) => r.json()).catch(() => ({})),
      fetch('/api/pool/profile').then((r) => r.json()).catch(() => ({})),
    ]).then(([session, profileData]) => {
      if (cancelled) return
      const isAuthenticated = !!session?.user
      const profileExists = !!profileData?.profile
      setMobile(mobileVal)
      setNative(nativeVal)
      // Show "Open app" / "My space" on the landing page when the user is
      // authenticated (even without a profile yet — clicking "Open app"
      // will show the onboarding, which now works because save() won't 401).
      setHasProfile(isAuthenticated || profileExists)
      // Show app ONLY if ALL conditions are met:
      //   1. Native Capacitor app (always), OR
      //   2. Authenticated + has a pool profile + saved='app'
      // Without a profile, ALWAYS show the landing page so the user can
      // click "Open app" manually → onboarding (not auto-redirect).
      if (nativeVal) {
        setView('app')
      } else if (isAuthenticated && profileExists && saved === 'app') {
        setView('app')
      } else {
        // Clear stale localStorage so user isn't auto-redirected next time
        if (typeof window !== 'undefined' && saved === 'app' && !profileExists) {
          localStorage.removeItem('aqwelia_view')
        }
        setView('landing')
      }
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function enterApp() {
    if (typeof window !== 'undefined') localStorage.setItem('aqwelia_view', 'app')
    setView('app')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  function backToLanding() {
    if (typeof window !== 'undefined') localStorage.setItem('aqwelia_view', 'landing')
    setView('landing')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  // Splash while loading
  if (!loaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-gold shadow-lg shadow-primary/30">
            <svg
              className="h-6 w-6 animate-pulse text-primary-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
              <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
              <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
            </svg>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }

  // Native app (Capacitor) → always MobileAppShell, no landing
  if (native) {
    return (
      <Suspense fallback={<LoadingSplash t={t} />}>
        <MobileAppShell onBackToLanding={backToLanding} />
      </Suspense>
    )
  }

  // Mobile browser + app view → MobileAppShell
  if (mobile && view === 'app') {
    return (
      <Suspense fallback={<LoadingSplash t={t} />}>
        <MobileAppShell onBackToLanding={backToLanding} />
      </Suspense>
    )
  }

  // Desktop + app view → desktop AppShell
  if (view === 'app') {
    return (
      <Suspense fallback={<LoadingSplash t={t} />}>
        <AppShell onBackToLanding={backToLanding} />
      </Suspense>
    )
  }

  // Default: landing page (desktop or mobile browser)
  return <LandingPage hasProfile={hasProfile} onEnterApp={enterApp} />
}

function LoadingSplash({ t }: { t: (k: string) => string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <div className="relative">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-gold shadow-lg shadow-primary/30">
          <svg
            className="h-6 w-6 animate-pulse text-primary-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
            <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
            <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
          </svg>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{t('loading')}</p>
    </div>
  )
}
