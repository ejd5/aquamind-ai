/**
 * AQWELIA — Page « Paramètres et confidentialité ».
 *
 * URL: /settings
 *
 * Client component (uses useSession, useRouter, billing, signOut).
 * Lists 11 sections in glass cards with the AQWELIA design system:
 *   1. Mon abonnement          → billing.manageSubscription()
 *   2. Restaurer mes achats    → billing.restorePurchases()
 *   3. Notifications           → 3 toggle switches (rappels, météo, reco)
 * Lists 15 sections in glass cards with the AQWELIA design system:
 *   1. Mon abonnement          → billing.manageSubscription()
 *   2. Restaurer mes achats    → billing.restorePurchases()
 *   3. Notifications           → 3 toggle switches (rappels, météo, reco)
 *   3.5 Préférences            → Langue + Pays + Unités + Normes (4 cartes)
 *   4. Données personnelles    → links to sections 5 & 6
 *   5. Exporter mes données    → GET /api/account/export (JSON download)
 *   6. Supprimer mon compte    → POST /api/account/delete (DANGER + AlertDialog)
 *   7. Politique de confident. → /legal/privacy
 *   8. Conditions d'utilisation → /legal/cgu
 *   9. Contacter le support    → mailto or /legal/support
 *  10. Version de l'application
 *  11. Déconnexion             → signOut({ callbackUrl: '/' })
 *
 * Authenticated only — redirects unauthenticated users to /auth/signin.
 */
'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { billing } from '@/lib/billing'
import type { PlanId } from '@/lib/billing'
import {
  usePreferences,
  LANGUAGES,
  COUNTRY_LIST,
  getCountryConfig,
  detectCountryConfig,
  formatTemperature,
  convertTemperature,
  type Locale,
  type TemperatureUnit,
  type VolumeUnit,
  type WeightUnit,
  type LengthUnit,
} from '@/lib/preferences/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import {
  Crown,
  RefreshCw,
  Bell,
  Database,
  Download,
  Trash2,
  FileText,
  Shield,
  Mail,
  Info,
  LogOut,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Loader2,
  ChevronDown,
  Sparkles,
  Loader2,
  Globe,
  MapPin,
  Ruler,
  RotateCcw,
} from 'lucide-react'

const APP_VERSION = 'v1.0.0'
const APP_BUILD = 'build 1'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Active plan (loaded async from billing client).
  const [activePlan, setActivePlan] = useState<PlanId>('free')
  const [loadingPlan, setLoadingPlan] = useState(true)

  // Notification preferences (local state — POST to /api/account/notifications).
  const [prefs, setPrefs] = useState({
    measureReminders: true,
    weatherAlerts: true,
    recommendations: true,
  })
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  // Action loading states.
  const [managing, setManaging] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Préférences (langue + pays + unités + normes) — store Zustand persistant.
  const {
    language,
    setLanguage,
    country,
    setCountry,
    unitSystem,
    setUnitSystem,
    temperature,
    setTemperature,
    volume,
    setVolume,
    weight,
    setWeight,
    length,
    setLength,
    resetToCountryDefaults,
  } = usePreferences()
  const [showCustomUnits, setShowCustomUnits] = useState(false)

  // Redirect to signin if unauthenticated.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
    }
  }, [status, router])

  // Auto-détection pays + langue au premier load (si pas encore de préférences sauvegardées).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('aqwelia-preferences')) return
    const { config } = detectCountryConfig()
    setCountry(config.code)
    const browserLang = navigator.language?.split('-')[0] ?? 'fr'
    if (['fr', 'en', 'es', 'de', 'it', 'pt', 'nl'].includes(browserLang)) {
      setLanguage(browserLang as Locale)
    }
    // Dépendances volontairement omises : on ne détecte qu'au mount.
    // setCountry/setLanguage sont stables (Zustand).
  }, [setCountry, setLanguage])

  // Load active plan + notification preferences once authenticated.
  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false

    billing
      .getActivePlan()
      .then((p) => { if (!cancelled) setActivePlan(p) })
      .catch(() => { /* fall back to free */ })
      .finally(() => { if (!cancelled) setLoadingPlan(false) })

    fetch('/api/account/notifications', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setPrefs({
          measureReminders: data.measureReminders ?? true,
          weatherAlerts: data.weatherAlerts ?? true,
          recommendations: data.recommendations ?? true,
        })
      })
      .catch(() => { /* keep defaults */ })
      .finally(() => { if (!cancelled) setPrefsLoaded(true) })

    return () => { cancelled = true }
  }, [status])

  async function handleManage() {
    setManaging(true)
    try {
      // Check if user has an active subscription first
      const entitlements = await billing.getEntitlements()
      const active = entitlements.find((e) => e.isActive)
      if (!active) {
        toast({
          title: 'Aucun abonnement actif',
          description: 'Vous êtes sur le plan Free. Souscrivez à Premium ou Expert pour gérer votre abonnement.',
        })
        return
      }
      await billing.manageSubscription()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      if (msg.includes('not configured') || msg.includes('STRIPE')) {
        toast({
          title: 'Gestion indisponible en dev',
          description: 'Stripe n\'est pas configuré en local. En production, ce bouton ouvrira le portail Stripe.',
        })
      } else {
        toast({
          title: 'Impossible d\'ouvrir le portail',
          description: msg,
          variant: 'destructive',
        })
      }
    } finally {
      setManaging(false)
    }
  }

  async function handleRestore() {
    setRestoring(true)
    try {
      const entitlements = await billing.restorePurchases()
      if (entitlements.length > 0) {
        const active = entitlements.find((e) => e.isActive)
        if (active) {
          setActivePlan(active.plan)
          toast({ title: 'Achats restaurés', description: `Plan actif : ${active.plan}` })
        } else {
          toast({ title: 'Aucun abonnement actif trouvé' })
        }
      } else {
        toast({ title: 'Aucun achat à restaurer' })
      }
    } catch (err) {
      toast({
        title: 'Restauration échouée',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setRestoring(false)
    }
  }

  async function handlePrefChange(key: keyof typeof prefs, value: boolean) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    try {
      await fetch('/api/account/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
    } catch {
      // Silent fail — local state stays; not critical.
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/account/export', { credentials: 'include' })
      if (!res.ok) throw new Error('Export échec')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aqwelia-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: 'Export téléchargé', description: 'Fichier JSON récupéré.' })
    } catch (err) {
      toast({
        title: 'Export impossible',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Suppression échec')
      toast({ title: 'Compte supprimé', description: 'Redirection…' })
      await signOut({ callbackUrl: '/' })
    } catch (err) {
      toast({
        title: 'Suppression impossible',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
      setDeleting(false)
    }
  }

  // Loading state while session is being resolved.
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return null // redirecting
  }

  const planLabel: Record<PlanId, string> = {
    free: 'Free',
    premium: 'Premium',
    expert: 'Expert',
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* ===== Header ===== */}
      <header className="safe-area-top sticky top-0 z-40 border-b border-gold/20 bg-background/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour
          </button>
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-bold tracking-tight">
              Paramètres
            </span>
            <Sparkles className="h-3 w-3 text-gold" />
          </div>
          <div className="w-12" />
        </div>
      </header>

      {/* ===== Main content ===== */}
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Page title */}
          <div className="mb-8 space-y-1.5">
            <p className="section-label">Compte & confidentialité</p>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Paramètres et confidentialité
            </h1>
            <p className="text-sm text-muted-foreground">
              Gérez votre abonnement, vos données et vos préférences.
            </p>
            <div className="gold-divider mt-4" />
          </div>

          <div className="space-y-3">
            {/* ───────── 1. Mon abonnement ───────── */}
            <SettingsCard
              icon={<Crown className="h-4 w-4" />}
              title="Mon abonnement"
              description={`Plan actuel : ${loadingPlan ? '…' : planLabel[activePlan]}. Gérez votre abonnement depuis le portail.`}
            >
              <Button
                onClick={handleManage}
                disabled={managing}
                size="sm"
                className="rounded-full bg-gradient-to-r from-gold via-[oklch(0.65_0.11_195)] to-[oklch(0.55_0.10_195)] text-[oklch(0.99_0.01_195)] hover:opacity-90"
              >
                {managing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Ouverture…
                  </>
                ) : (
                  'Gérer'
                )}
              </Button>
            </SettingsCard>

            {/* ───────── 2. Restaurer mes achats ───────── */}
            <SettingsCard
              icon={<RefreshCw className="h-4 w-4" />}
              title="Restaurer mes achats"
              description="Réactivez vos abonnements Premium ou Expert achetés sur un autre appareil."
            >
              <Button
                onClick={handleRestore}
                disabled={restoring}
                size="sm"
                variant="outline"
                className="rounded-full"
              >
                {restoring ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Restauration…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restaurer
                  </>
                )}
              </Button>
            </SettingsCard>

            {/* ───────── 3. Notifications ───────── */}
            <SettingsCard
              icon={<Bell className="h-4 w-4" />}
              title="Notifications"
              description="Choisissez les rappels et alertes que vous souhaitez recevoir."
            >
              <div className="flex w-full flex-col gap-3 sm:w-64">
                <ToggleRow
                  label="Rappels mesures"
                  checked={prefsLoaded ? prefs.measureReminders : true}
                  onChange={(v) => handlePrefChange('measureReminders', v)}
                />
                <ToggleRow
                  label="Alertes météo"
                  checked={prefsLoaded ? prefs.weatherAlerts : true}
                  onChange={(v) => handlePrefChange('weatherAlerts', v)}
                />
                <ToggleRow
                  label="Recommandations"
                  checked={prefsLoaded ? prefs.recommendations : true}
                  onChange={(v) => handlePrefChange('recommendations', v)}
                />
              </div>
            </SettingsCard>

            {/* ───────── 3.5 Préférences (Langue + Pays + Unités + Normes) ───────── */}
            <PreferencesSection
              language={language}
              setLanguage={setLanguage}
              country={country}
              setCountry={setCountry}
              unitSystem={unitSystem}
              setUnitSystem={setUnitSystem}
              temperature={temperature}
              setTemperature={setTemperature}
              volume={volume}
              setVolume={setVolume}
              weight={weight}
              setWeight={setWeight}
              length={length}
              setLength={setLength}
              resetToCountryDefaults={resetToCountryDefaults}
              showCustomUnits={showCustomUnits}
              setShowCustomUnits={setShowCustomUnits}
            />

            {/* ───────── 4. Données personnelles (overview) ───────── */}
            <SettingsCard
              icon={<Database className="h-4 w-4" />}
              title="Données personnelles"
              description="Conformément au RGPD, vous pouvez exporter ou supprimer vos données à tout moment."
            >
              <div className="flex flex-wrap gap-2">
                <a
                  href="#export"
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
                >
                  <Download className="h-3 w-3" />
                  Exporter
                </a>
                <a
                  href="#delete"
                  className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                >
                  <Trash2 className="h-3 w-3" />
                  Supprimer
                </a>
              </div>
            </SettingsCard>

            {/* ───────── 5. Exporter mes données ───────── */}
            <div id="export" className="scroll-mt-20">
              <SettingsCard
                icon={<Download className="h-4 w-4" />}
                title="Exporter mes données"
                description="Téléchargez toutes vos données (piscine, mesures, photos, historique) au format JSON."
              >
                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Export…
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      Exporter en JSON
                    </>
                  )}
                </Button>
              </SettingsCard>
            </div>

            {/* ───────── 6. Supprimer mon compte (DANGER) ───────── */}
            <div id="delete" className="scroll-mt-20">
              <SettingsCard
                icon={<Trash2 className="h-4 w-4" />}
                title="Supprimer mon compte"
                description="Action irréversible. Toutes vos données seront définitivement effacées."
                danger
              >
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer définitivement votre compte ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est <strong className="text-destructive">irréversible</strong>.
                        Toutes vos données (piscines, mesures, photos, historique, abonnement)
                        seront effacées immédiatement et ne pourront pas être récupérées.
                        Si vous avez un abonnement actif, pensez à l&apos;annuler d&apos;abord
                        depuis l&apos;App Store ou Google Play.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault() // prevent auto-close, we'll close after signOut
                          void handleDelete()
                        }}
                        disabled={deleting}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        {deleting ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Suppression…
                          </>
                        ) : (
                          'Oui, supprimer mon compte'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </SettingsCard>
            </div>

            {/* ───────── 7. Politique de confidentialité ───────── */}
            <SettingsLinkCard
              icon={<Shield className="h-4 w-4" />}
              title="Politique de confidentialité"
              description="Comment nous collectons, utilisons et protégeons vos données (RGPD)."
              href="/legal/privacy"
            />

            {/* ───────── 8. Conditions d'utilisation ───────── */}
            <SettingsLinkCard
              icon={<FileText className="h-4 w-4" />}
              title="Conditions d'utilisation"
              description="Les CGU régissant l'utilisation du service AQWELIA."
              href="/legal/cgu"
            />

            {/* ───────── 9. Contacter le support ───────── */}
            <SettingsLinkCard
              icon={<Mail className="h-4 w-4" />}
              title="Contacter le support"
              description="Une question, un bug, une idée ? Notre équipe vous répond."
              href="/legal/support"
            />

            {/* ───────── 10. Version de l'application ───────── */}
            <SettingsCard
              icon={<Info className="h-4 w-4" />}
              title="Version de l'application"
              description="Informations sur la version installée."
            >
              <div className="flex flex-col items-end gap-1 text-right text-xs">
                <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-semibold text-gold">
                  AQWELIA {APP_VERSION}
                </span>
                <span className="text-muted-foreground">{APP_BUILD}</span>
              </div>
            </SettingsCard>

            {/* ───────── 11. Déconnexion ───────── */}
            <SettingsCard
              icon={<LogOut className="h-4 w-4" />}
              title="Déconnexion"
              description={`Connecté en tant que ${session.user?.email ?? 'utilisateur'}.`}
            >
              <Button
                onClick={() => signOut({ callbackUrl: '/' })}
                size="sm"
                variant="outline"
                className="rounded-full"
              >
                <LogOut className="h-3.5 w-3.5" />
                Se déconnecter
              </Button>
            </SettingsCard>
          </div>

          {/* Footer note */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            AQWELIA — Eau toujours cristalline. © {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                          */
/* ──────────────────────────────────────────────────────────────────────── */

function SettingsCard({
  icon,
  title,
  description,
  children,
  danger = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
  danger?: boolean
}) {
  return (
    <Card
      className={`glass-card overflow-hidden rounded-2xl border ${
        danger ? 'border-destructive/30' : 'border-gold/15'
      } py-4`}
    >
      <CardHeader className="px-5 pb-0">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              danger ? 'bg-destructive/10 text-destructive' : 'bg-gold/10 text-gold'
            }`}
          >
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle className={`text-sm font-semibold ${danger ? 'text-destructive' : 'text-foreground'}`}>
              {title}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      {children ? (
        <CardContent className="px-5 pt-3">
          <div className="flex justify-end">{children}</div>
        </CardContent>
      ) : null}
    </Card>
  )
}

function SettingsLinkCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}) {
  const isExternal = href.startsWith('mailto:') || href.startsWith('http')
  const body = (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
          {icon}
        </div>
        <div className="flex-1">
          <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
    </>
  )

  return (
    <Card className="glass-card overflow-hidden rounded-2xl border border-gold/15 py-4">
      <CardHeader className="px-5">
        {isExternal ? (
          <a href={href} className="block transition-opacity hover:opacity-80">
            {body}
          </a>
        ) : (
          <Link href={href} className="block transition-opacity hover:opacity-80">
            {body}
          </Link>
        )}
      </CardHeader>
    </Card>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  )
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Section 3.5 — Préférences (Langue + Pays + Unités + Normes)             */
/* ──────────────────────────────────────────────────────────────────────── */

interface PreferencesSectionProps {
  language: Locale
  setLanguage: (lang: Locale) => void
  country: string
  setCountry: (country: string) => void
  unitSystem: 'metric' | 'imperial'
  setUnitSystem: (system: 'metric' | 'imperial') => void
  temperature: TemperatureUnit
  setTemperature: (unit: TemperatureUnit) => void
  volume: VolumeUnit
  setVolume: (unit: VolumeUnit) => void
  weight: WeightUnit
  setWeight: (unit: WeightUnit) => void
  length: LengthUnit
  setLength: (unit: LengthUnit) => void
  resetToCountryDefaults: () => void
  showCustomUnits: boolean
  setShowCustomUnits: (v: boolean) => void
}

function PreferencesSection({
  language,
  setLanguage,
  country,
  setCountry,
  unitSystem,
  setUnitSystem,
  temperature,
  setTemperature,
  volume,
  setVolume,
  weight,
  setWeight,
  length,
  setLength,
  resetToCountryDefaults,
  showCustomUnits,
  setShowCustomUnits,
}: PreferencesSectionProps) {
  const countryConfig = getCountryConfig(country)
  const norms = countryConfig.norms

  // Les températures affichées dans la card Normes s'adaptent à l'unité choisie par l'utilisateur.
  const tempMaxPool = formatTemperature(
    convertTemperature(norms.tempMaxPoolC, 'C', temperature),
    temperature,
  )
  const tempMaxSpa = formatTemperature(
    convertTemperature(norms.tempMaxSpaC, 'C', temperature),
    temperature,
  )

  function handleReset() {
    resetToCountryDefaults()
    setShowCustomUnits(false)
    toast({
      title: 'Unités réinitialisées',
      description: `Valeurs par défaut du pays (${countryConfig.name}) restaurées.`,
    })
  }

  return (
    <>
      {/* Card A — Langue */}
      <PreferencesCard
        icon={<Globe className="h-4 w-4" />}
        title="Langue"
        description="Choisissez la langue de l'interface."
      >
        <Select value={language} onValueChange={(v) => setLanguage(v as Locale)}>
          <SelectTrigger className="w-full" aria-label="Langue de l'interface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <span className="mr-1.5">{lang.flag}</span>
                {lang.nativeName}
                <span className="ml-1.5 text-xs text-muted-foreground">({lang.name})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Indépendant du pays — un Mexicain aux USA peut choisir l&apos;espagnol.
        </p>
      </PreferencesCard>

      {/* Card B — Pays */}
      <PreferencesCard
        icon={<MapPin className="h-4 w-4" />}
        title="Pays"
        description="Détermine les normes d'eau, les partenaires et la devise."
      >
        <Select value={country} onValueChange={(v) => setCountry(v)}>
          <SelectTrigger className="w-full" aria-label="Pays">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_LIST.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="mr-1.5">{c.flag}</span>
                {c.name}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({c.currency} · {c.units === 'imperial' ? 'impérial' : 'métrique'})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-full border border-gold/30 bg-gold/5 px-2 py-0.5 text-gold">
            Devise : {countryConfig.currency}
          </span>
          <span className="rounded-full border border-gold/30 bg-gold/5 px-2 py-0.5 text-gold">
            Marché : {countryConfig.marketplace}
          </span>
          <span className="rounded-full border border-gold/30 bg-gold/5 px-2 py-0.5 text-gold">
            Unités : {countryConfig.units === 'imperial' ? 'impériales' : 'métriques'}
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Changer de pays réinitialise les unités et les normes appliquées.
        </p>
      </PreferencesCard>

      {/* Card C — Unités */}
      <PreferencesCard
        icon={<Ruler className="h-4 w-4" />}
        title="Unités de mesure"
        description="Système global + personnalisation unité par unité."
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Système</span>
          <ToggleGroup
            type="single"
            value={unitSystem}
            onValueChange={(v) => {
              if (v === 'metric' || v === 'imperial') setUnitSystem(v)
            }}
            className="rounded-full border border-gold/20 p-0.5"
          >
            <ToggleGroupItem
              value="metric"
              className="h-7 rounded-full px-3 text-xs data-[state=on]:bg-gold/15 data-[state=on]:text-gold"
            >
              Métrique
            </ToggleGroupItem>
            <ToggleGroupItem
              value="imperial"
              className="h-7 rounded-full px-3 text-xs data-[state=on]:bg-gold/15 data-[state=on]:text-gold"
            >
              Impérial
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Collapsible open={showCustomUnits} onOpenChange={setShowCustomUnits}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-gold transition-opacity hover:opacity-80"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showCustomUnits ? 'rotate-180' : ''}`}
              />
              {showCustomUnits
                ? 'Masquer les réglages avancés'
                : 'Personnaliser unité par unité'}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2.5">
            <UnitToggle
              label="Température"
              value={temperature}
              options={[
                { v: 'C', l: '°C' },
                { v: 'F', l: '°F' },
              ]}
              onChange={setTemperature}
            />
            <UnitToggle
              label="Volume"
              value={volume}
              options={[
                { v: 'm3', l: 'm³' },
                { v: 'gal', l: 'gal' },
              ]}
              onChange={setVolume}
            />
            <UnitToggle
              label="Poids"
              value={weight}
              options={[
                { v: 'kg', l: 'kg' },
                { v: 'lbs', l: 'lbs' },
              ]}
              onChange={setWeight}
            />
            <UnitToggle
              label="Longueur"
              value={length}
              options={[
                { v: 'cm', l: 'cm' },
                { v: 'in', l: 'in' },
              ]}
              onChange={setLength}
            />
          </CollapsibleContent>
        </Collapsible>

        <Button
          onClick={handleReset}
          size="sm"
          variant="outline"
          className="mt-3 w-full rounded-full"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Réinitialiser aux valeurs du pays
        </Button>
      </PreferencesCard>

      {/* Card D — Normes (READ ONLY) */}
      <PreferencesCard
        icon={<Shield className="h-4 w-4" />}
        title={`Normes applicables (${country})`}
        description="Plages cibles appliquées automatiquement à vos analyses."
      >
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <NormRow label="pH" value={`${norms.phMin.toFixed(1)} – ${norms.phMax.toFixed(1)}`} />
          <NormRow
            label="Chlore"
            value={`${norms.chlorineMin} – ${norms.chlorineMax} mg/L`}
          />
          <NormRow
            label="Brome"
            value={`${norms.bromineMin} – ${norms.bromineMax} mg/L`}
          />
          <NormRow
            label="TAC (alcalinité)"
            value={`${norms.tacMin} – ${norms.tacMax} mg/L`}
          />
          <NormRow
            label="CYA (stabilisant)"
            value={`${norms.cyaMin} – ${norms.cyaMax} mg/L`}
          />
          <NormRow label="Temp. max piscine" value={tempMaxPool} />
          <NormRow label="Temp. max spa" value={tempMaxSpa} />
          <NormRow
            label="Vidange spa"
            value={`Tous les ${norms.spaDrainageMonths} mois`}
          />
        </div>
        <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
          Ces normes sont automatiquement appliquées à vos analyses et recommandations.
        </p>
      </PreferencesCard>
    </>
  )
}

function PreferencesCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <Card className="glass-card overflow-hidden rounded-2xl border border-gold/15 py-4">
      <CardHeader className="px-5 pb-0">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      {children ? (
        <CardContent className="px-5 pt-3">{children}</CardContent>
      ) : null}
    </Card>
  )
}

function NormRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-gold/10 bg-background/40 px-2.5 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[11px] font-semibold text-foreground">{value}</span>
    </div>
  )
}

function UnitToggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ v: T; l: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => {
          if (v) onChange(v as T)
        }}
        className="rounded-full border border-gold/20 p-0.5"
      >
        {options.map((opt) => (
          <ToggleGroupItem
            key={opt.v}
            value={opt.v}
            className="h-7 rounded-full px-3 text-xs data-[state=on]:bg-gold/15 data-[state=on]:text-gold"
          >
            {opt.l}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
