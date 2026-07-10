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
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api-client'
import { canAccess, PLANS, DEFAULT_PLAN, type PlanId } from '@/lib/pool/freemium'
import { toast } from '@/hooks/use-toast'

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
  const t = useTranslations('nav')
  const tc = useTranslations('common')
  const tp = useTranslations('pool')
  const [profile, setProfile] = useState<PoolProfileLite | null | undefined>(undefined)
  const [pools, setPools] = useState<PoolProfileLite[]>([])
  const [activePoolId, setActivePoolId] = useState<string | null>(null)
  const [planId, setPlanId] = useState<PlanId>(DEFAULT_PLAN)
  const [activeTab, setActiveTab] = useState<TabId>('today')
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  // Mount network status listener (auto-updates offline store + banner)
  useNetworkStatus()
  const [presetQuestion, setPresetQuestion] = useState<string | undefined>(undefined)
  const [moreOpen, setMoreOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [addingPool, setAddingPool] = useState(false)

  const NAV: NavItem[] = [
    { id: 'today', label: t('today'), short: t('home'), icon: Home, primary: true },
    { id: 'diagnostic', label: t('diagnostic'), short: t('shortPhoto'), icon: Camera, primary: true },
    { id: 'water', label: t('water'), short: t('shortWater'), icon: Droplets, primary: true },
    { id: 'assistant', label: t('assistantIA'), short: t('shortIA'), icon: MessageSquare, primary: true },
    { id: 'plan', label: t('plan'), short: t('shortPlan'), icon: ListChecks, primary: true },
    { id: 'log', label: t('log'), short: t('shortLog'), icon: BookOpen, primary: true },
    { id: 'maintenance', label: t('maintenanceLabel'), short: t('equipment'), icon: Wrench },
    { id: 'weather', label: t('weather'), short: t('shortWeather'), icon: CloudSun },
    { id: 'guides', label: t('guides'), short: t('shortGuides'), icon: BookOpen },
    { id: 'reminders', label: t('reminders'), short: t('shortReminders'), icon: Bell },
    { id: 'paywall', label: t('premium'), short: t('shortPremium'), icon: Crown },
  ]
  const PRIMARY_NAV = NAV.filter((n) => n.primary)
  const SECONDARY_NAV = NAV.filter((n) => !n.primary)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/pool/profile')
      // 401 = not authenticated → redirect to signin (never show onboarding
      // to an unauthenticated user — they can't save a profile without auth).
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin?callbackUrl=/'
        }
        return
      }
      const data = await res.json()
      const list: PoolProfileLite[] = data.profiles || []
      setPools(list)
      // Resolve the active profile:
      //   1. ?id=xxx (activePoolId) if still present
      //   2. else `data.profile` (most recently created)
      const resolved =
        (activePoolId ? list.find((p) => p.id === activePoolId) : null) ||
        data.profile ||
        list[list.length - 1] ||
        null
      setProfile(resolved)
      if (resolved) setActivePoolId(resolved.id)
    } catch {
      setProfile(null)
      setPools([])
    }
  }, [activePoolId])

  // Initial load + subscription fetch (plan for multi_pool gate)
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/pool/profile').then(async (r) => {
        if (r.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/signin?callbackUrl=/'
          }
          return null
        }
        return r.json()
      }),
      fetch('/api/subscription').then((r) => r.json()).catch(() => null),
    ])
      .then(([d, sub]) => {
        if (cancelled || !d) return
        const list: PoolProfileLite[] = d.profiles || []
        setPools(list)
        const resolved =
          (activePoolId ? list.find((p) => p.id === activePoolId) : null) ||
          d.profile ||
          list[list.length - 1] ||
          null
        setProfile(resolved)
        if (resolved) setActivePoolId(resolved.id)
        if (sub?.plan?.id) setPlanId(sub.plan.id)
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null)
          setPools([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const plan = PLANS.find((p) => p.id === planId) || PLANS[0]
  const multiPoolGate = canAccess(planId, 'multi_pool')
  const canAddPool =
    multiPoolGate.allowed && pools.length < plan.limits.maxPools

  async function handleSwitchPool(id: string) {
    setActivePoolId(id)
    const next = pools.find((p) => p.id === id) || null
    setProfile(next)
    // Update the server's view of the "active" pool (best-effort, non-fatal)
    try {
      await fetch(`/api/pool/profile?id=${id}`).then((r) => r.json())
    } catch { /* ignore */ }
    // Force the dashboard to refetch with the new poolId
    setRefreshKey((k) => k + 1)
  }

  async function handleAddPool() {
    // Reuse the onboarding flow but mark it as "add" mode so it POSTs a NEW pool.
    // For now: simplest UX is to send the user to the onboarding screen again,
    // which POSTs a new profile. The new profile becomes the active one.
    // We pass `addMode=true` to Onboarding so it adapts its copy.
    setActiveTab('today')
    setAddingPool(true)
  }

  async function handleDeletePool(id: string) {
    if (pools.length <= 1) {
      toast({ title: tp('cannotDeleteLast'), variant: 'destructive' })
      return
    }
    try {
      const res = await api.delete<{ profile: PoolProfileLite | null; profiles: PoolProfileLite[] }>(
        `/api/pool/profile?id=${id}`
      )
      setPools(res.profiles)
      if (res.profile) {
        setProfile(res.profile)
        setActivePoolId(res.profile.id)
      } else {
        setProfile(null)
        setActivePoolId(null)
      }
      toast({ title: tp('poolDeleted') })
    } catch (e) {
      toast({
        title: tp('deleteError'),
        description: e instanceof Error ? e.message : '',
        variant: 'destructive',
      })
    }
  }

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
        <p className="text-sm text-muted-foreground">{tc('loading')}</p>
      </div>
    )
  }

  // No profile → onboarding
  if (profile === null && !addingPool) {
    return <Onboarding onDone={fetchProfile} />
  }

  // "Add pool" mode — overlay the onboarding flow without clearing the existing profile.
  if (addingPool) {
    return (
      <Onboarding
        addMode
        onDone={() => {
          setAddingPool(false)
          fetchProfile()
        }}
        onCancel={() => setAddingPool(false)}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <OfflineBanner />
      <Header
        profile={profile}
        pools={pools}
        canAddPool={canAddPool}
        onSwitchPool={handleSwitchPool}
        onAddPool={handleAddPool}
        onDeletePool={handleDeletePool}
        activeTab={activeTab}
        onNavigate={navigate}
        onBackToLanding={onBackToLanding}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-0 px-0 sm:px-6">
        {/* Desktop sidebar */}
        <aside className="custom-scroll sticky top-32 hidden h-[calc(100vh-8rem)] w-56 shrink-0 overflow-y-auto border-r border-border/40 py-6 pr-4 md:block">
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
              {t('emergency')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('emergencyHint')}
            </p>
            <button
              onClick={openEmergency}
              className="mt-2 w-full rounded-lg bg-destructive/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-destructive"
            >
              {t('assistanceMode')}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 pb-28 sm:px-6 md:pb-10">
          {activeTab === 'today' && (
            <ModuleDashboard
              key={refreshKey}
              activePoolId={activePoolId}
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
          {activeTab === 'plan' && <ModuleActionPlan onNavigate={navigate} activePoolId={activePoolId} />}
          {activeTab === 'log' && <ModuleHealthLog activePoolId={activePoolId} />}
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
            aria-label={t('moreAria')}
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
            {t('more')}
          </button>
        </div>
      </nav>

      {/* Mobile "Plus" sheet — secondary navigation */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">{t('moreAria')}</SheetTitle>
            <SheetDescription>
              {t('moreDesc')}
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
                      {t('shortPremiumBadge')}
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
