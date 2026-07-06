'use client'

import { useEffect, useState } from 'react'
import { LandingPage } from '@/components/landing/landing-page'
import { AppShell } from '@/components/aquamind/app-shell'

type View = 'landing' | 'app'

export default function Home() {
  const [view, setView] = useState<View>('landing')
  const [hasProfile, setHasProfile] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aquamind_view') : null

    fetch('/api/pool/profile')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const profileExists = !!d?.profile
        setHasProfile(profileExists)
        // Default = 'landing'. Only switch to 'app' if the user explicitly
        // chose it before (persisted). The "Accéder à l'app" button is shown
        // on the landing page when a profile exists.
        setView(saved === 'app' ? 'app' : 'landing')
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        setHasProfile(false)
        setView(saved === 'app' ? 'app' : 'landing')
        setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function enterApp() {
    if (typeof window !== 'undefined') localStorage.setItem('aquamind_view', 'app')
    setView('app')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  function backToLanding() {
    if (typeof window !== 'undefined') localStorage.setItem('aquamind_view', 'landing')
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
        <p className="text-sm text-muted-foreground">Chargement d&apos;AquaMind…</p>
      </div>
    )
  }

  if (view === 'app') {
    return <AppShell onBackToLanding={backToLanding} />
  }

  return <LandingPage hasProfile={hasProfile} onEnterApp={enterApp} />
}
