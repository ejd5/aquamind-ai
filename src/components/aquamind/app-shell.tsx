'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Home,
  Camera,
  Droplets,
  MessageSquare,
  ListChecks,
  BookOpen,
  Wrench,
  Waves,
  CloudSun,
  Bell,
  Crown,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react'
import { Header } from './header'
import { Footer } from './footer'
import { Onboarding } from './onboarding'
import { ModuleDashboard } from './module-dashboard'
import { ModuleDiagnostic } from './module-diagnostic'
import { ModuleWaterTest } from './module-water-test'
import { ModuleAssistant } from './module-assistant'
import { ModuleActionPlan } from './module-action-plan'
import { ModuleHealthLog } from './module-health-log'
import { ModuleMaintenance } from './module-maintenance'
import { ModuleWeather } from './module-weather'
import { ModuleGuides } from './module-guides'
import { ModuleReminders } from './module-reminders'
import { ModulePaywall } from './module-paywall'
import { EmergencyMode } from './emergency-mode'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { OfflineBanner } from '@/components/offline-banner'

export type TabId =
  | 'today'
  | 'diagnostic'
  | 'water'
  | 'assistant'
  | 'plan'
  | 'log'
  | 'maintenance'
  | 'weather'
  | 'guides'
  | 'reminders'
  | 'paywall'

interface NavItem {
  id: TabId
  label: string
  short: string
  icon: typeof Home
  primary?: boolean
}

const NAV: NavItem[] = [
  { id: 'today', label: "Aujourd'hui", short: 'Accueil', icon: Home, primary: true },
  { id: 'diagnostic', label: 'Diagnostic photo', short: 'Photo', icon: Camera, primary: true },
  { id: 'water', label: 'Analyse eau', short: 'Eau', icon: Droplets, primary: true },
  { id: 'assistant', label: 'Assistant IA', short: 'IA', icon: MessageSquare, primary: true },
  { id: 'plan', label: "Plan d'action", short: 'Plan', icon: ListChecks, primary: true },
  { id: 'log', label: 'Carnet de santé', short: 'Carnet', icon: BookOpen, primary: true },
  { id: 'maintenance', label: 'Maintenance', short: 'Matériel', icon: Wrench },
  { id: 'weather', label: 'Météo intelligente', short: 'Météo', icon: CloudSun },
  { id: 'guides', label: 'Ressources & guides', short: 'Guides', icon: BookOpen },
  { id: 'reminders', label: 'Rappels', short: 'Rappels', icon: Bell },
  { id: 'paywall', label: 'AQWELIA Premium', short: 'Premium', icon: Crown },
]

const PRIMARY_NAV = NAV.filter((n) => n.primary)
const SECONDARY_NAV = NAV.filter((n) => !n.primary)

export interface PoolProfileLite {
  id: string
  name: string
  volume: number
  unit: string
  treatmentType: string
  saltSystem: boolean
}

export interface AppShellProps {
  initialPresetQuestion?: string
  onBackToLanding?: () => void
}

export function AppShell({ onBackToLanding }: AppShellProps) {
  const [profile, setProfile] = useState<PoolProfileLite | null | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<TabId>('today')
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  // Mount network status listener (auto-updates offline store + banner)
  useNetworkStatus()
  const [presetQuestion, setPresetQuestion] = useState<string | undefined>(undefined)
  const [moreOpen, setMoreOpen] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/pool/profile')
      const data = await res.json()
      setProfile(data.profile || null)
    } catch {
      setProfile(null)
    }
  }, [])

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

  function navigate(tab: TabId) {
    setActiveTab(tab)
    setMoreOpen(false)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEmergency() {
    setEmergencyOpen(true)
  }

  function askAssistant(question: string) {
    setPresetQuestion(question)
    navigate('assistant')
  }

  // Still loading profile
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

  // No profile → onboarding
  if (profile === null) {
    return <Onboarding onDone={fetchProfile} />
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <OfflineBanner />
      <Header
        profile={profile}
        activeTab={activeTab}
        onNavigate={navigate}
        onBackToLanding={onBackToLanding}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-0 px-0 sm:px-6">
        {/* Desktop sidebar */}
        <aside className="custom-scroll sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto border-r border-border/40 py-6 pr-4 md:block">
          <nav className="space-y-1">
            {NAV.map((item) => {
              const active = activeTab === item.id
              const Icon = item.icon
              const isPremium = item.id === 'paywall'
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-gradient-to-r from-primary/15 to-gold/10 text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  } ${isPremium ? 'border border-gold/30 hover:border-gold/50' : ''}`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      active
                        ? 'bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-md shadow-primary/30'
                        : isPremium
                          ? 'bg-gold/10 text-gold'
                          : 'bg-secondary text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="truncate">{item.label}</span>
                  {isPremium && (
                    <Sparkles className="ml-auto h-3 w-3 text-gold" />
                  )}
                  {active && !isPremium && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
              Urgence ?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Eau verte, orage, odeur forte…
            </p>
            <button
              onClick={openEmergency}
              className="mt-2 w-full rounded-lg bg-destructive/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-destructive"
            >
              Mode assistance
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 pb-28 sm:px-6 md:pb-10">
          {activeTab === 'today' && (
            <ModuleDashboard
              onNavigate={navigate}
              onOpenEmergency={openEmergency}
              onAskAssistant={askAssistant}
            />
          )}
          {activeTab === 'diagnostic' && <ModuleDiagnostic />}
          {activeTab === 'water' && <ModuleWaterTest onNavigate={navigate} />}
          {activeTab === 'assistant' && (
            <ModuleAssistant presetQuestion={presetQuestion} onConsumePreset={() => setPresetQuestion(undefined)} />
          )}
          {activeTab === 'plan' && <ModuleActionPlan onNavigate={navigate} />}
          {activeTab === 'log' && <ModuleHealthLog />}
          {activeTab === 'maintenance' && <ModuleMaintenance />}
          {activeTab === 'weather' && <ModuleWeather onNavigate={navigate} />}
          {activeTab === 'guides' && <ModuleGuides onNavigate={navigate} />}
          {activeTab === 'reminders' && <ModuleReminders onNavigate={navigate} />}
          {activeTab === 'paywall' && <ModulePaywall />}
        </main>
      </div>

      {/* Mobile bottom nav — primary items + Plus button */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/20 bg-background/90 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="custom-scroll flex items-center gap-1 overflow-x-auto px-2 py-1.5">
          {PRIMARY_NAV.map((item) => {
            const active = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`flex min-w-[60px] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-gold' : 'text-muted-foreground'
                }`}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                    active
                      ? 'bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-md shadow-primary/30'
                      : 'bg-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {item.short}
              </button>
            )
          })}

          {/* Plus button — opens sheet with secondary nav */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex min-w-[60px] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors ${
              SECONDARY_NAV.some((n) => n.id === activeTab) ? 'text-gold' : 'text-muted-foreground'
            }`}
            aria-label="Plus de modules"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                SECONDARY_NAV.some((n) => n.id === activeTab)
                  ? 'bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-md shadow-primary/30'
                  : 'bg-transparent'
              }`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
            Plus
          </button>
        </div>
      </nav>

      {/* Mobile "Plus" sheet — secondary navigation */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Plus de modules</SheetTitle>
            <SheetDescription>
              Météo, guides, rappels et offres premium.
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 p-4 pt-2">
            {SECONDARY_NAV.map((item) => {
              const Icon = item.icon
              const active = activeTab === item.id
              const isPremium = item.id === 'paywall'
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all ${
                    active
                      ? 'border-gold/60 bg-gold/10 shadow-sm'
                      : isPremium
                        ? 'border-gold/30 bg-gold/5 hover:border-gold/50'
                        : 'border-border/50 bg-card/40 hover:border-gold/40'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      isPremium
                        ? 'bg-gradient-to-br from-gold to-primary text-white'
                        : 'bg-gradient-to-br from-primary to-gold text-primary-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.short}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                  {isPremium && (
                    <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold text-gold">
                      PREMIUM
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>

      <Footer />

      <EmergencyMode
        open={emergencyOpen}
        onOpenChange={setEmergencyOpen}
        onAskAssistant={askAssistant}
        onNavigate={(tab) => {
          setEmergencyOpen(false)
          navigate(tab)
        }}
      />
    </div>
  )
}
