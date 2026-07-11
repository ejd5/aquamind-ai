'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { LandingPage } from '@/components/landing/landing-page'
import { AppShell } from '@/components/aquamind/app-shell'
import { MobileAppShell } from '@/components/mobile/mobile-app-shell'
import { isMobile, isNative } from '@/lib/platform'

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

    // Clear old IndexedDB cache entries (pre-i18n-fix data without translation keys)
    // This runs once per session to ensure fresh API data with titleKey/messageKey fields.
    if (typeof window !== 'undefined' && !sessionStorage.getItem('aqwelia_cache_v3')) {
      sessionStorage.setItem('aqwelia_cache_v3', '1')
      import('@/lib/offline/cache').then(({ clearAllCache }) => {
        clearAllCache().then(() => {
          console.log('[AQWELIA] Cache cleared (v3 i18n fix)')
        })
      }).catch(() => {})
    }

    fetch('/api/pool/profile')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const profileExists = !!d?.profile
        setMobile(mobileVal)
        setNative(nativeVal)
        setHasProfile(profileExists)
        // In native app, skip landing and go directly to app
        // On web, default to landing unless user previously chose app
        setView(nativeVal ? 'app' : (saved === 'app' ? 'app' : 'landing'))
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setMobile(mobileVal)
        setNative(nativeVal)
        setHasProfile(false)
        setView(nativeVal ? 'app' : (saved === 'app' ? 'app' : 'landing'))
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
    return <MobileAppShell onBackToLanding={backToLanding} />
  }

  // Mobile browser + app view → MobileAppShell
  if (mobile && view === 'app') {
    return <MobileAppShell onBackToLanding={backToLanding} />
  }

  // Desktop + app view → desktop AppShell
  if (view === 'app') {
    return <AppShell onBackToLanding={backToLanding} />
  }

  // Default: landing page (desktop or mobile browser)
  return <LandingPage hasProfile={hasProfile} onEnterApp={enterApp} />
}
