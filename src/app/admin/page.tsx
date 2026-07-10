'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

// Simple admin gate — password stored in localStorage after first entry
// TODO: Move admin auth to server-side (move password to process.env.ADMIN_PASSWORD_HASH,
// validate via /api/admin/auth, issue httpOnly session cookie — see audit §17 risk #1/#2)
const ADMIN_PASSWORD = 'aqwelia-admin-2026'

type AdminTab = 'banner' | 'popup' | 'content' | 'analytics' | 'users'

interface BannerConfig {
  enabled: boolean
  text: string
  bgColor: string
  textColor: string
  link: string
  startDate: string
  endDate: string
}

interface PopupConfig {
  id: string
  enabled: boolean
  title: string
  body: string
  imageUrl: string
  ctaText: string
  ctaLink: string
  trigger: 'on_load' | 'on_exit' | 'after_diagnostic' | 'manual'
  frequency: 'once' | 'session' | 'always'
}

export default function AdminPage() {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState<AdminTab>('banner')

  // Check if already authed
  useEffect(() => {
    const saved = localStorage.getItem('aqwelia-admin')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === 'ok') setAuthed(true)
  }, [])

  function tryAuth() {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('aqwelia-admin', 'ok')
      setAuthed(true)
    } else {
      toast({
        title: t('wrongPassword'),
        description: t('accessDenied'),
        variant: 'destructive',
      })
    }
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="glass-card w-full max-w-sm rounded-2xl p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl">
              <img
                src="/logo-aqwelia-web.png"
                alt="AQWELIA"
                className="h-12 w-12 object-cover"
              />
            </div>
            <h1 className="font-display text-xl font-bold">
              <span className="aqua-text-gradient">AQWELIA Admin</span>
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('protected')}
            </p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') tryAuth()
            }}
            placeholder={t('password')}
            className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
          />
          <button
            onClick={tryAuth}
            className="mt-3 w-full rounded-full bg-gradient-to-r from-primary to-gold px-6 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            {t('access')}
          </button>
          <a
            href="/"
            className="mt-3 block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {t('backToSiteArrow')}
          </a>
        </div>
      </div>
    )
  }

  const tabs: Array<{ id: AdminTab; label: string; icon: string }> = [
    { id: 'banner', label: t('tabBanner'), icon: '📢' },
    { id: 'popup', label: t('tabPopup'), icon: '🎁' },
    { id: 'content', label: t('tabContent'), icon: '📝' },
    { id: 'analytics', label: t('tabAnalytics'), icon: '📊' },
    { id: 'users', label: t('tabUsers'), icon: '👥' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Admin header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img
              src="/logo-aqwelia-web.png"
              alt=""
              className="h-8 w-8 rounded-lg"
            />
            <span className="font-display font-bold">
              <span className="aqua-text-gradient">AQWELIA</span>
              <span className="ml-2 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-destructive">
                Admin
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t('viewSite')}
            </a>
            <button
              onClick={() => {
                localStorage.removeItem('aqwelia-admin')
                setAuthed(false)
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t('signOut')}
            </button>
          </div>
        </div>
      </header>

      {/* Tab bar + content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'banner' && <BannerAdmin />}
        {activeTab === 'popup' && <PopupAdmin />}
        {activeTab === 'content' && <ContentAdmin />}
        {activeTab === 'analytics' && <AnalyticsAdmin />}
        {activeTab === 'users' && <UsersAdmin />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Banner Admin — seasonal promotional banner                          */
/* ------------------------------------------------------------------ */

function BannerAdmin() {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [banner, setBanner] = useState<BannerConfig>({
    enabled: false,
    text: t('bannerDefaultText'),
    bgColor: '#004D5A',
    textColor: '#FFFFFF',
    link: '/settings',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    const saved = localStorage.getItem('aqwelia-banner')
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBanner(JSON.parse(saved))
      } catch {
        // ignore malformed
      }
    }
  }, [])

  function save() {
    localStorage.setItem('aqwelia-banner', JSON.stringify(banner))
    // Also save to API for server-side rendering (à venir)
    toast({ title: t('bannerSavedToast') })
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold">📢 {t('bannerTitle')}</h2>
      <p className="text-sm text-muted-foreground">
        {t('bannerDescFull')}
      </p>

      {/* Preview */}
      <div
        className="overflow-hidden rounded-xl"
        style={{ backgroundColor: banner.bgColor }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ color: banner.textColor }}
        >
          <span className="text-sm font-medium">{banner.text}</span>
          {banner.link && (
            <span className="text-xs underline">{t('learnMore')}</span>
          )}
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          checked={banner.enabled}
          onCheckedChange={(v) => setBanner({ ...banner, enabled: v })}
        />
        <span className="text-sm">{t('bannerEnable')}</span>
      </div>

      {/* Form */}
      <div className="grid gap-3">
        <label className="text-xs font-semibold">{t('bannerText')}</label>
        <input
          value={banner.text}
          onChange={(e) => setBanner({ ...banner, text: e.target.value })}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />

        <label className="text-xs font-semibold">{t('bannerBgColor')}</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={banner.bgColor}
            onChange={(e) => setBanner({ ...banner, bgColor: e.target.value })}
            className="h-10 w-16 rounded-lg"
          />
          <input
            value={banner.bgColor}
            onChange={(e) => setBanner({ ...banner, bgColor: e.target.value })}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>

        <label className="text-xs font-semibold">{t('bannerTextColor')}</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={banner.textColor}
            onChange={(e) => setBanner({ ...banner, textColor: e.target.value })}
            className="h-10 w-16 rounded-lg"
          />
          <input
            value={banner.textColor}
            onChange={(e) => setBanner({ ...banner, textColor: e.target.value })}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>

        <label className="text-xs font-semibold">{t('bannerLink')}</label>
        <input
          value={banner.link}
          onChange={(e) => setBanner({ ...banner, link: e.target.value })}
          placeholder="/settings, /auth/signin..."
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold">{t('bannerStart')}</label>
            <input
              type="date"
              value={banner.startDate}
              onChange={(e) => setBanner({ ...banner, startDate: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">{t('bannerEnd')}</label>
            <input
              type="date"
              value={banner.endDate}
              onChange={(e) => setBanner({ ...banner, endDate: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <Button onClick={save} className="mt-2 w-fit">
          {t('bannerSave')}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Popup Admin — promotional popups                                    */
/* ------------------------------------------------------------------ */

function PopupAdmin() {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [popups, setPopups] = useState<PopupConfig[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('aqwelia-popups')
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPopups(JSON.parse(saved))
      } catch {
        // ignore
      }
    }
  }, [])

  function persist(next: PopupConfig[]) {
    setPopups(next)
    localStorage.setItem('aqwelia-popups', JSON.stringify(next))
    toast({ title: t('popupsSavedToast') })
  }

  function saveAll() {
    localStorage.setItem('aqwelia-popups', JSON.stringify(popups))
    toast({ title: t('popupsSavedToast') })
  }

  function addPopup() {
    persist([
      ...popups,
      {
        id: Date.now().toString(),
        enabled: false,
        title: t('popupDefaultTitle'),
        body: t('popupDefaultBody'),
        imageUrl: '',
        ctaText: t('popupDefaultCta'),
        ctaLink: '/settings',
        trigger: 'on_load',
        frequency: 'once',
      },
    ])
  }

  function updatePopup(index: number, patch: Partial<PopupConfig>) {
    const next = [...popups]
    next[index] = { ...next[index], ...patch }
    setPopups(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">🎁 {t('popupTitle')}</h2>
        <Button onClick={addPopup} size="sm">
          {t('popupAdd')}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {t('popupDescFull')}
      </p>

      {popups.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
          {t('popupNoPopups')}
        </div>
      )}

      {popups.map((popup, i) => (
        <div
          key={popup.id}
          className="space-y-3 rounded-xl border border-border/50 bg-background/60 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={popup.enabled}
                onCheckedChange={(v) => {
                  const next = [...popups]
                  next[i] = { ...popup, enabled: v }
                  persist(next)
                }}
              />
              <span className="text-sm font-semibold">{popup.title}</span>
            </div>
            <button
              onClick={() => persist(popups.filter((p) => p.id !== popup.id))}
              className="text-xs text-destructive hover:underline"
            >
              {t('delete')}
            </button>
          </div>

          <input
            value={popup.title}
            onChange={(e) => updatePopup(i, { title: e.target.value })}
            placeholder={t('popupTitleLabel')}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <textarea
            value={popup.body}
            onChange={(e) => updatePopup(i, { body: e.target.value })}
            placeholder={t('popupBody')}
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={popup.trigger}
              onChange={(e) =>
                updatePopup(i, { trigger: e.target.value as PopupConfig['trigger'] })
              }
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="on_load">{t('popupTriggerOnLoad')}</option>
              <option value="on_exit">{t('popupTriggerOnExit')}</option>
              <option value="after_diagnostic">{t('popupTriggerAfterDiagnostic')}</option>
              <option value="manual">{t('popupTriggerManual')}</option>
            </select>
            <select
              value={popup.frequency}
              onChange={(e) =>
                updatePopup(i, {
                  frequency: e.target.value as PopupConfig['frequency'],
                })
              }
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="once">{t('popupFrequencyOnce')}</option>
              <option value="session">{t('popupFrequencySession')}</option>
              <option value="always">{t('popupFrequencyAlways')}</option>
            </select>
          </div>

          <input
            value={popup.imageUrl}
            onChange={(e) => updatePopup(i, { imageUrl: e.target.value })}
            placeholder={t('popupImagePlaceholder')}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              value={popup.ctaText}
              onChange={(e) => updatePopup(i, { ctaText: e.target.value })}
              placeholder={t('popupCtaText')}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            />
            <input
              value={popup.ctaLink}
              onChange={(e) => updatePopup(i, { ctaLink: e.target.value })}
              placeholder={t('popupCtaLink')}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <Button onClick={saveAll} size="sm" variant="outline">
            {t('popupSave')}
          </Button>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Content Admin — placeholder                                         */
/* ------------------------------------------------------------------ */

function ContentAdmin() {
  const t = useTranslations('admin')
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold">📝 {t('contentTitle')}</h2>
      <p className="text-sm text-muted-foreground">
        {t('contentDesc')}
      </p>
      <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
        {t('contentComingSoonFull')}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Analytics Admin — placeholder with KPI cards                        */
/* ------------------------------------------------------------------ */

function AnalyticsAdmin() {
  const t = useTranslations('admin')
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold">📊 {t('analyticsTitle')}</h2>
      <p className="text-sm text-muted-foreground">
        {t('analyticsDesc')}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass-card rounded-xl p-4">
          <p className="text-2xl font-bold text-primary">—</p>
          <p className="text-xs text-muted-foreground">{t('analyticsUsers')}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-2xl font-bold text-primary">—</p>
          <p className="text-xs text-muted-foreground">{t('analyticsDiagnostics')}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-2xl font-bold text-primary">—</p>
          <p className="text-xs text-muted-foreground">{t('analyticsTests')}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-2xl font-bold text-primary">—</p>
          <p className="text-xs text-muted-foreground">{t('analyticsSubs')}</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
        {t('analyticsComingSoonFull')}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Users Admin — placeholder                                           */
/* ------------------------------------------------------------------ */

function UsersAdmin() {
  const t = useTranslations('admin')
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold">👥 {t('usersTitle')}</h2>
      <p className="text-sm text-muted-foreground">
        {t('usersDescFull')}
      </p>
      <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
        {t('usersComingSoonFull')}
      </div>
    </div>
  )
}
