'use client'

import { useCallback, useEffect, useState } from 'react'
import { Waves } from 'lucide-react'
import { MobileHeader } from './mobile-header'
import { BottomTabs } from './bottom-tabs'
import { HomeScreen } from './screens/home-screen'
import { AnalysesScreen } from './screens/analyses-screen'
import { AssistantScreen } from './screens/assistant-screen'
import { MaintenanceScreen } from './screens/maintenance-screen'
import { ProfileScreen } from './screens/profile-screen'
import { EmergencyMode } from '../aquamind/emergency-mode'
import { Onboarding } from '../aquamind/onboarding'
import type { TabId, PoolProfileLite } from '../aquamind/app-shell'
import {
  type MobileScreen,
  type AnalysesSubTab,
  type MaintenanceSubTab,
  mapDesktopTabToMobile,
} from './types'

interface MobileAppShellProps {
  /** Optional: initial preset question for the assistant (e.g. deep link). */
  initialPresetQuestion?: string
  /** Back to landing page. */
  onBackToLanding?: () => void
}

/**
 * AQWELIA — Mobile app shell.
 *
 * Mobile-first layout with:
 *   - Compact header (h-14 + safe-area-top): logo + "AQWELIA" + "Pro" badge
 *     + pool profile pill (right).
 *   - Scrollable content area (flex-1): renders the active mobile screen.
 *   - Fixed bottom tabs (5 entries, safe-area-bottom): Accueil, Analyses,
 *     Assistant, Entretien, Profil.
 *
 * The shell reuses existing desktop modules (`../aquamind/module-*`) by
 * wrapping them in mobile-friendly containers (see `./screens/*`).
 *
 * When a desktop module emits a navigation intent (`onNavigate(tab: TabId)`),
 * the shell maps it to a mobile screen + optional sub-tab via
 * `mapDesktopTabToMobile()`. This keeps desktop and mobile navigation
 * models decoupled while sharing the same underlying modules.
 */
export function MobileAppShell({ initialPresetQuestion, onBackToLanding }: MobileAppShellProps) {
  // ---- Profile state (mirrors desktop AppShell) --------------------------
  const [profile, setProfile] = useState<PoolProfileLite | null | undefined>(undefined)

  // ---- Navigation state --------------------------------------------------
  const [activeScreen, setActiveScreen] = useState<MobileScreen>('home')
  const [analysesSubTab, setAnalysesSubTab] = useState<AnalysesSubTab>('mesures')
  const [maintenanceSubTab, setMaintenanceSubTab] = useState<MaintenanceSubTab>('actions')

  // ---- Emergency mode sheet ---------------------------------------------
  const [emergencyOpen, setEmergencyOpen] = useState(false)

  // ---- Assistant preset question side-channel ---------------------------
  const [presetQuestion, setPresetQuestion] = useState<string | undefined>(initialPresetQuestion)

  // ---- Load pool profile on mount ---------------------------------------
  useEffect(() => {
    let cancelled = false
    fetch('/api/pool/profile')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setProfile(d.profile || null)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/pool/profile')
      const data = await res.json()
      setProfile(data.profile || null)
    } catch {
      setProfile(null)
    }
  }, [])

  // ---- Navigation handlers ----------------------------------------------
  /**
   * Switch to a mobile screen (called by the bottom tabs).
   */
  const handleScreenChange = useCallback((screen: MobileScreen) => {
    setActiveScreen(screen)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  /**
   * Map a desktop TabId (emitted by existing modules) to a mobile navigation
   * intent and apply it. This is the bridge between the desktop module
   * interface and the mobile 5-tab model.
   */
  const handleModuleNavigate = useCallback((tab: TabId) => {
    const intent = mapDesktopTabToMobile(tab)
    setActiveScreen(intent.screen)
    if (intent.analysesSubTab) setAnalysesSubTab(intent.analysesSubTab)
    if (intent.maintenanceSubTab) setMaintenanceSubTab(intent.maintenanceSubTab)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  /**
   * "Ask assistant" — store the preset question and switch to the assistant
   * screen. The `<ModuleAssistant />` component picks up the preset question
   * and auto-sends it.
   */
  const handleAskAssistant = useCallback((question: string) => {
    setPresetQuestion(question)
    setActiveScreen('assistant')
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const handleConsumePreset = useCallback(() => {
    setPresetQuestion(undefined)
  }, [])

  // ---- Loading state -----------------------------------------------------
  if (profile === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-gold shadow-lg shadow-primary/30">
            <Waves className="h-6 w-6 animate-pulse text-primary-foreground" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Chargement d'AQWELIA…</p>
      </div>
    )
  }

  // ---- Onboarding (no profile yet) --------------------------------------
  if (profile === null) {
    return <Onboarding onDone={fetchProfile} />
  }

  // ---- Main shell --------------------------------------------------------
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MobileHeader profile={profile} onBackToLanding={onBackToLanding} />

      <main className="mobile-scroll flex-1">
        {activeScreen === 'home' && (
          <HomeScreen
            onNavigate={handleModuleNavigate}
            onOpenEmergency={() => setEmergencyOpen(true)}
            onAskAssistant={handleAskAssistant}
          />
        )}

        {activeScreen === 'analyses' && (
          <AnalysesScreen
            subTab={analysesSubTab}
            onSubTabChange={setAnalysesSubTab}
            onNavigate={handleModuleNavigate}
          />
        )}

        {activeScreen === 'assistant' && (
          <AssistantScreen
            presetQuestion={presetQuestion}
            onConsumePreset={handleConsumePreset}
          />
        )}

        {activeScreen === 'maintenance' && (
          <MaintenanceScreen
            subTab={maintenanceSubTab}
            onSubTabChange={setMaintenanceSubTab}
            onNavigate={handleModuleNavigate}
          />
        )}

        {activeScreen === 'profile' && (
          <ProfileScreen profile={profile} onBackToLanding={onBackToLanding} />
        )}
      </main>

      <BottomTabs activeTab={activeScreen} onNavigate={handleScreenChange} />

      <EmergencyMode
        open={emergencyOpen}
        onOpenChange={setEmergencyOpen}
        onAskAssistant={handleAskAssistant}
        onNavigate={(tab) => {
          setEmergencyOpen(false)
          handleModuleNavigate(tab)
        }}
      />
    </div>
  )
}
