'use client'

/**
 * AQWELIA — Admin Control Plane V1 · console /admin.
 *
 * Shell extensible : OVERVIEW / MARKETING (bannières, popups, promotions,
 * annonces) / PRODUCT (flags sûrs, contenu) / AGENTIC / SYSTEM (audit, état).
 *
 * RÈGLE ABSOLUE : AGENT PROPOSE → HUMAIN VALIDE → SYSTÈME EXÉCUTE.
 * Toutes les mutations partent vers des routes serveur qui revérifient le
 * rôle admin en base ; le localStorage n'est JAMAIS une source canonique.
 */
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  BarChart3,
  LayoutDashboard,
  Megaphone,
  PanelTop,
  Gift,
  BellRing,
  Boxes,
  Flag,
  FileText,
  Bot,
  ListChecks,
  History,
  ScrollText,
  Activity,
  Sparkles,
  Users,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { signOutWithBillingCleanup } from '@/lib/billing/sign-out'
import { AnnouncementsSection } from '@/components/admin/announcements-section'
import { SystemStatusSection } from '@/components/admin/system-status-section'
import { ContentSection } from '@/components/admin/content-section'
import { FlagsSection } from '@/components/admin/flags-section'
import { UsersSection, AnalyticsSection } from '@/components/admin/business-sections'

type SectionId =
  | 'overview'
  | 'banners'
  | 'popups'
  | 'announcements'
  | 'flags'
  | 'content'
  | 'agentic'
  | 'approvals'
  | 'history'
  | 'audit'
  | 'users'
  | 'analytics'
  | 'system'

const LOCALES = ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl'] as const

interface NavGroup {
  labelKey: string
  items: Array<{ id: string; labelKey: string; icon: typeof LayoutDashboard; href?: string }>
}

const NAV_GROUPS: NavGroup[] = [
  { labelKey: '', items: [{ id: 'overview', labelKey: 'navOverview', icon: LayoutDashboard }] },
  {
    labelKey: 'navMarketing',
    items: [
      { id: 'banners', labelKey: 'navBanners', icon: PanelTop },
      { id: 'popups', labelKey: 'navPopups', icon: Gift },
      { id: 'promotions', labelKey: 'navPromotions', icon: Megaphone, href: '/admin/promotions' },
      { id: 'announcements', labelKey: 'navAnnouncements', icon: BellRing },
    ],
  },
  {
    labelKey: 'navProduct',
    items: [
      { id: 'flags', labelKey: 'navFlags', icon: Flag },
      { id: 'content', labelKey: 'navContent', icon: FileText },
    ],
  },
  {
    labelKey: 'navAgentic',
    items: [
      { id: 'agentic', labelKey: 'navSuggestions', icon: Bot },
      { id: 'approvals', labelKey: 'navApprovalQueue', icon: ListChecks },
      { id: 'history', labelKey: 'navAgentHistory', icon: History },
    ],
  },
  {
    labelKey: 'navSystem',
    items: [
      { id: 'users', labelKey: 'navUsers', icon: Users },
      { id: 'analytics', labelKey: 'navAnalytics', icon: BarChart3 },
      { id: 'audit', labelKey: 'navAudit', icon: ScrollText },
      { id: 'system', labelKey: 'navSystemStatus', icon: Activity },
    ],
  },
]

async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`)
  }
  return data as T
}

const statusKey = (s: string) =>
  ({ DRAFT: 'cpStatusDraft', SCHEDULED: 'cpStatusScheduled', PUBLISHED: 'cpStatusPublished', PAUSED: 'cpStatusPaused', ARCHIVED: 'cpStatusArchived', NEEDS_REVIEW: 'cpStatusNeedsReview', APPROVED: 'cpStatusApproved', REJECTED: 'cpStatusRejected' } as const)[s] ?? 'cpStatusDraft'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'secondary',
  SCHEDULED: 'info',
  PUBLISHED: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'outline',
  NEEDS_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
}

function LocaleChips({ translations }: { translations: Record<string, unknown> }) {
  return (
    <div className="flex flex-wrap gap-1">
      {LOCALES.map((l) => {
        const v = translations?.[l]
        const filled =
          typeof v === 'string'
            ? v.trim().length > 0
            : typeof v === 'object' && v !== null
              ? Object.values(v).some((x) => typeof x === 'string' && x.trim().length > 0)
              : false
        return (
          <span
            key={l}
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              filled ? 'bg-success/15 text-success-ink' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {l}
          </span>
        )
      })}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   OVERVIEW
   ──────────────────────────────────────────────────────────────────────────── */
function OverviewSection({ onNavigate }: { onNavigate: (s: string) => void }) {
  const t = useTranslations('admin')
  return (
    <div className="space-y-5">
      <div className="hero-lagon rounded-2xl p-6 sm:p-8">
        <p className="section-label">{t('navOverview')}</p>
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{t('overviewTitle')}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t('overviewDesc')}</p>
      </div>

      <div className="card-premium-champagne rounded-2xl p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-champagne-ink">
          <ShieldCheck className="h-4 w-4" />
          {t('overviewPrincipleTitle')}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">{t('overviewPrincipleDesc')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(
          [
            { id: 'banners', label: t('navBanners'), icon: PanelTop, chip: 'icon-chip icon-chip-lagoon' },
            { id: 'popups', label: t('navPopups'), icon: Gift, chip: 'icon-chip icon-chip-aqua' },
            { id: 'promotions', label: t('navPromotions'), icon: Megaphone, chip: 'icon-chip icon-chip-info', href: '/admin/promotions' },
            { id: 'agentic', label: t('navAgentic'), icon: Bot, chip: 'icon-chip icon-chip-lagoon' },
            { id: 'flags', label: t('navFlags'), icon: Flag, chip: 'icon-chip icon-chip-aqua' },
            { id: 'audit', label: t('navAudit'), icon: ScrollText, chip: 'icon-chip icon-chip-info' },
          ] as const
        ).map((c) => (
          <button
            key={c.id}
            onClick={() => onNavigate(c.id)}
            className="glass-card-lagon flex items-center gap-3 rounded-xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className={`${c.chip} h-10 w-10`}>
              <c.icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   BANNERS
   ──────────────────────────────────────────────────────────────────────────── */
interface BannerView {
  id: string
  internalName: string
  status: string
  translations: Record<string, string>
  variant: string
  ctaTranslations: Record<string, string> | null
  ctaUrl: string | null
  targeting: Record<string, unknown> | null
  startAt: string | null
  endAt: string | null
  priority: number
  version: number
}

function BannersSection() {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [banners, setBanners] = useState<BannerView[] | null>(null)
  const [editing, setEditing] = useState<BannerView | 'new' | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ banners: BannerView[] }>('/api/admin/v1/banners')
      setBanners(data.banners)
    } catch {
      toast({ title: t('cpError'), variant: 'destructive' })
    }
  }, [t, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{t('cpBannersTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('bannerDescFull')}</p>
        </div>
        <Button variant="aqua-gradient" size="sm" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          {t('cpBannersCreate')}
        </Button>
      </div>

      {banners === null && <p className="text-sm text-muted-foreground">…</p>}
      {banners !== null && banners.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          {t('cpBannersEmpty')}
        </div>
      )}

      <div className="space-y-3">
        {banners?.map((b) => (
          <div key={b.id} className="glass-card-lagon rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{b.internalName}</span>
              <Badge variant={(STATUS_BADGE[b.status] ?? 'outline') as never}>{t(statusKey(b.status) as never)}</Badge>
              <span className="text-[11px] text-muted-foreground">
                v{b.version} · {t('cpPriority')}: {b.priority}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                  <Eye className="h-3.5 w-3.5" />
                  {t('cpBannersEdit')}
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LocaleChips translations={b.translations} />
              <span className="text-[11px] text-muted-foreground">
                {b.translations ? Object.values(b.translations).filter((v) => v?.trim()).length : 0}/7 {t('cpLocalesComplete')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {editing === 'new' && (
        <BannerEditor
          banner={null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
      {editing !== null && editing !== 'new' && (
        <BannerEditor
          banner={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function BannerEditor({
  banner,
  onClose,
  onSaved,
}: {
  banner: BannerView | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [internalName, setInternalName] = useState(banner?.internalName ?? '')
  const [translations, setTranslations] = useState<Record<string, string>>(
    banner?.translations ?? Object.fromEntries(LOCALES.map((l) => [l, '']))
  )
  const [variant, setVariant] = useState(banner?.variant ?? 'LAGOON')
  const [ctaTranslations, setCtaTranslations] = useState<Record<string, string>>(
    banner?.ctaTranslations ?? Object.fromEntries(LOCALES.map((l) => [l, '']))
  )
  const [ctaUrl, setCtaUrl] = useState(banner?.ctaUrl ?? '')
  const [localesTarget, setLocalesTarget] = useState<string[]>(() => ((banner?.targeting as { locales?: string[] } | null)?.locales ?? []))
  const [platformsTarget, setPlatformsTarget] = useState<string[]>(() => ((banner?.targeting as { platforms?: string[] } | null)?.platforms ?? []))
  const [startAt, setStartAt] = useState(banner?.startAt?.slice(0, 10) ?? '')
  const [endAt, setEndAt] = useState(banner?.endAt?.slice(0, 10) ?? '')
  const [priority, setPriority] = useState(banner?.priority ?? 0)
  const [reason, setReason] = useState('')

  const buildTargeting = () => {
    const targeting: Record<string, unknown> = {}
    if (localesTarget.length) targeting.locales = localesTarget
    if (platformsTarget.length) targeting.platforms = platformsTarget
    return Object.keys(targeting).length ? targeting : undefined
  }

  const saveDraft = async () => {
    try {
      if (banner) {
        await apiFetch(`/api/admin/v1/banners/${banner.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            internalName,
            translations,
            variant,
            ctaTranslations,
            ctaUrl: ctaUrl || undefined,
            targeting: buildTargeting(),
            startAt: startAt ? new Date(startAt).toISOString() : undefined,
            endAt: endAt ? new Date(endAt).toISOString() : undefined,
            priority,
            expectedVersion: banner.version,
          }),
        })
        toast({ title: t('cpSaved') })
      } else {
        await apiFetch('/api/admin/v1/banners', {
          method: 'POST',
          body: JSON.stringify({
            internalName,
            translations,
            variant,
            ctaTranslations,
            ctaUrl: ctaUrl || undefined,
            targeting: buildTargeting(),
            startAt: startAt ? new Date(startAt).toISOString() : undefined,
            endAt: endAt ? new Date(endAt).toISOString() : undefined,
            priority,
          }),
        })
        toast({ title: t('cpCreated') })
      }
      onSaved()
    } catch (e) {
      toast({ title: t('cpError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const act = async (status: 'PUBLISHED' | 'SCHEDULED' | 'PAUSED' | 'ARCHIVED') => {
    if (!banner) return
    if (!reason.trim()) {
      toast({ title: t('cpPublishReason'), variant: 'destructive' })
      return
    }
    if (status === 'SCHEDULED' && !startAt) {
      toast({ title: t('cpScheduleNeedsStart'), variant: 'destructive' })
      return
    }
    try {
      await apiFetch(`/api/admin/v1/banners/${banner.id}`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          reason: reason.trim(),
          expectedVersion: banner.version,
          startAt: startAt ? new Date(startAt).toISOString() : undefined,
          endAt: endAt ? new Date(endAt).toISOString() : undefined,
        }),
      })
      toast({ title: status === 'ARCHIVED' ? t('cpArchived') : t('cpPublished') })
      onSaved()
    } catch (e) {
      toast({ title: t('cpError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const previewText = translations.fr || translations.en || ''
  const previewBg =
    variant === 'CHAMPAGNE'
      ? 'bg-gradient-to-r from-champagne to-[#E2C79A] text-night'
      : variant === 'NIGHT'
        ? 'bg-night text-ivory'
        : 'bg-gradient-to-r from-lagoon to-aqua-vivid text-night'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/40 backdrop-blur-sm md:items-center md:p-6">
      <div className="custom-scroll max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-lagoon/20 bg-background p-5 md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{banner ? t('cpBannersEdit') : t('cpBannersCreate')}</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>

        {/* Preview */}
        <div className="mb-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('cpPreview')}</p>
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium ${previewBg}`}>
            <span>{previewText || '—'}</span>
            {ctaUrl && <span className="text-xs underline">{ctaTranslations.fr || '→'}</span>}
          </div>
        </div>

        <div className="grid gap-3">
          <div>
            <label className="text-xs font-semibold">{t('cpInternalName')}</label>
            <input
              value={internalName}
              onChange={(e) => setInternalName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">{t('cpVariant')}</label>
              <select value={variant} onChange={(e) => setVariant(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                <option value="LAGOON">LAGOON</option>
                <option value="CHAMPAGNE">CHAMPAGNE</option>
                <option value="NIGHT">NIGHT</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold">{t('cpPriority')}</label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold">
              {t('cpTranslationsTitle')} ·{' '}
              <span className="font-normal text-muted-foreground">
                {Object.values(translations).filter((v) => v?.trim()).length}/7 {t('cpLocalesComplete')}
              </span>
            </p>
            <div className="grid gap-1.5">
              {LOCALES.map((l) => (
                <div key={l} className="flex items-start gap-2">
                  <span className="mt-2 w-7 text-[10px] font-bold uppercase text-muted-foreground">{l}</span>
                  <textarea
                    value={translations[l] ?? ''}
                    onChange={(e) => setTranslations((p) => ({ ...p, [l]: e.target.value }))}
                    rows={1}
                    className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold">{t('cpCtaUrl')}</label>
            <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-1.5">
            {LOCALES.map((l) => (
              <div key={l} className="flex items-center gap-2">
                <span className="w-7 text-[10px] font-bold uppercase text-muted-foreground">{l}</span>
                <input
                  value={ctaTranslations[l] ?? ''}
                  onChange={(e) => setCtaTranslations((p) => ({ ...p, [l]: e.target.value }))}
                  placeholder={`CTA ${l}`}
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold">{t('cpTargetingTitle')}</p>
            <div className="flex flex-wrap items-center gap-3">
              {LOCALES.map((l) => (
                <label key={l} className="flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={localesTarget.includes(l)}
                    onCheckedChange={(v) =>
                      setLocalesTarget((p) => (v ? [...p, l] : p.filter((x) => x !== l)))
                    }
                  />
                  {l.toUpperCase()}
                </label>
              ))}
              {(['WEB', 'IOS', 'ANDROID'] as const).map((p) => (
                <label key={p} className="flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={platformsTarget.includes(p)}
                    onCheckedChange={(v) =>
                      setPlatformsTarget((prev) => (v ? [...prev, p] : prev.filter((x) => x !== p)))
                    }
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold">{t('cpStartAt')}</label>
              <input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold">{t('cpEndAt')}</label>
              <input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
          </div>

          {banner && (
            <div>
              <label className="text-xs font-semibold">{t('cpPublishReason')}</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('cpReasonPlaceholder')} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="aqua-gradient" size="sm" onClick={() => void saveDraft()}>
              {t('cpSaveDraft')}
            </Button>
            {banner && (
              <>
                <Button size="sm" onClick={() => void act('PUBLISHED')}>
                  {t('cpPublish')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void act('SCHEDULED')}>
                  {t('cpSchedule')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void act('PAUSED')}>
                  {t('cpPause')}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void act('ARCHIVED')}>
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('cpArchive')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   POPUPS
   ──────────────────────────────────────────────────────────────────────────── */
interface PopupView {
  id: string
  internalName: string
  status: string
  translations: Record<string, { title: string; body: string }>
  imageUrl: string | null
  ctaTranslations: Record<string, string> | null
  ctaUrl: string | null
  trigger: string
  frequency: string
  reminderDays: number
  targeting: Record<string, unknown> | null
  startAt: string | null
  endAt: string | null
  priority: number
  version: number
}

function PopupsSection() {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [popups, setPopups] = useState<PopupView[] | null>(null)
  const [editing, setEditing] = useState<PopupView | 'new' | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ popups: PopupView[] }>('/api/admin/v1/popups')
      setPopups(data.popups)
    } catch {
      toast({ title: t('cpError'), variant: 'destructive' })
    }
  }, [t, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{t('cpPopupsTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('popupDescFull')}</p>
        </div>
        <Button variant="aqua-gradient" size="sm" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          {t('cpPopupsCreate')}
        </Button>
      </div>

      {popups === null && <p className="text-sm text-muted-foreground">…</p>}
      {popups !== null && popups.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          {t('cpPopupsEmpty')}
        </div>
      )}

      <div className="space-y-3">
        {popups?.map((p) => (
          <div key={p.id} className="glass-card-lagon rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{p.internalName}</span>
              <Badge variant={(STATUS_BADGE[p.status] ?? 'outline') as never}>{t(statusKey(p.status) as never)}</Badge>
              <span className="text-[11px] text-muted-foreground">
                {p.trigger} · {p.frequency} · v{p.version}
              </span>
              <div className="ml-auto">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                  <Eye className="h-3.5 w-3.5" />
                  {t('cpPopupsEdit')}
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LocaleChips translations={p.translations} />
            </div>
          </div>
        ))}
      </div>

      {editing === 'new' && <PopupEditor popup={null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {editing !== null && editing !== 'new' && <PopupEditor popup={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </div>
  )
}

function PopupEditor({
  popup,
  onClose,
  onSaved,
}: {
  popup: PopupView | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [internalName, setInternalName] = useState(popup?.internalName ?? '')
  const [translations, setTranslations] = useState<Record<string, { title: string; body: string }>>(
    popup?.translations ?? Object.fromEntries(LOCALES.map((l) => [l, { title: '', body: '' }]))
  )
  const [trigger, setTrigger] = useState(popup?.trigger ?? 'ON_LOAD')
  const [frequency, setFrequency] = useState(popup?.frequency ?? 'ONCE')
  const [reminderDays, setReminderDays] = useState(popup?.reminderDays ?? 0)
  const [imageUrl, setImageUrl] = useState(popup?.imageUrl ?? '')
  const [ctaTranslations, setCtaTranslations] = useState<Record<string, string>>(
    popup?.ctaTranslations ?? Object.fromEntries(LOCALES.map((l) => [l, '']))
  )
  const [ctaUrl, setCtaUrl] = useState(popup?.ctaUrl ?? '')
  const [startAt, setStartAt] = useState(popup?.startAt?.slice(0, 10) ?? '')
  const [endAt, setEndAt] = useState(popup?.endAt?.slice(0, 10) ?? '')
  const [priority, setPriority] = useState(popup?.priority ?? 0)
  const [reason, setReason] = useState('')

  const saveDraft = async () => {
    const payload = {
      internalName,
      translations,
      trigger,
      frequency,
      reminderDays,
      imageUrl: imageUrl || undefined,
      ctaTranslations,
      ctaUrl: ctaUrl || undefined,
      startAt: startAt ? new Date(startAt).toISOString() : undefined,
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      priority,
    }
    try {
      if (popup) {
        await apiFetch(`/api/admin/v1/popups/${popup.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...payload, expectedVersion: popup.version }),
        })
        toast({ title: t('cpSaved') })
      } else {
        await apiFetch('/api/admin/v1/popups', { method: 'POST', body: JSON.stringify(payload) })
        toast({ title: t('cpCreated') })
      }
      onSaved()
    } catch (e) {
      toast({ title: t('cpError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const act = async (status: 'PUBLISHED' | 'SCHEDULED' | 'PAUSED' | 'ARCHIVED') => {
    if (!popup) return
    if (!reason.trim()) {
      toast({ title: t('cpPublishReason'), variant: 'destructive' })
      return
    }
    if (status === 'SCHEDULED' && !startAt) {
      toast({ title: t('cpScheduleNeedsStart'), variant: 'destructive' })
      return
    }
    try {
      await apiFetch(`/api/admin/v1/popups/${popup.id}`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          reason: reason.trim(),
          expectedVersion: popup.version,
          startAt: startAt ? new Date(startAt).toISOString() : undefined,
          endAt: endAt ? new Date(endAt).toISOString() : undefined,
        }),
      })
      toast({ title: status === 'ARCHIVED' ? t('cpArchived') : t('cpPublished') })
      onSaved()
    } catch (e) {
      toast({ title: t('cpError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/40 backdrop-blur-sm md:items-center md:p-6">
      <div className="custom-scroll max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-lagoon/20 bg-background p-5 md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{popup ? t('cpPopupsEdit') : t('cpPopupsCreate')}</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3">
          <div>
            <label className="text-xs font-semibold">{t('cpInternalName')}</label>
            <input value={internalName} onChange={(e) => setInternalName(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold">{t('cpTrigger')}</label>
              <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                <option value="ON_LOAD">ON_LOAD</option>
                <option value="ON_EXIT">ON_EXIT</option>
                <option value="AFTER_DIAGNOSTIC">AFTER_DIAGNOSTIC</option>
                <option value="AFTER_FIRST_TEST">AFTER_FIRST_TEST</option>
                <option value="MANUAL">MANUAL</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold">{t('cpFrequency')}</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
                <option value="ONCE">ONCE</option>
                <option value="PER_SESSION">PER_SESSION</option>
                <option value="REMIND_DAYS">REMIND_DAYS</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold">{t('cpReminderDays')}</label>
              <input type="number" min={0} max={90} value={reminderDays} onChange={(e) => setReminderDays(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold">{t('cpTranslationsTitle')}</p>
            <div className="space-y-2">
              {LOCALES.map((l) => (
                <div key={l} className="flex items-start gap-2">
                  <span className="mt-2 w-7 text-[10px] font-bold uppercase text-muted-foreground">{l}</span>
                  <div className="flex-1 space-y-1">
                    <input
                      value={translations[l]?.title ?? ''}
                      onChange={(e) => setTranslations((p) => ({ ...p, [l]: { ...p[l], title: e.target.value } }))}
                      placeholder={t('cpTitleLabel')}
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                    />
                    <textarea
                      value={translations[l]?.body ?? ''}
                      onChange={(e) => setTranslations((p) => ({ ...p, [l]: { ...p[l], body: e.target.value } }))}
                      placeholder={t('cpBodyLabel')}
                      rows={1}
                      className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold">{t('cpImageUrl')}</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold">{t('cpCtaUrl')}</label>
            <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-1.5">
            {LOCALES.map((l) => (
              <div key={l} className="flex items-center gap-2">
                <span className="w-7 text-[10px] font-bold uppercase text-muted-foreground">{l}</span>
                <input
                  value={ctaTranslations[l] ?? ''}
                  onChange={(e) => setCtaTranslations((p) => ({ ...p, [l]: e.target.value }))}
                  placeholder={`CTA ${l}`}
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold">{t('cpStartAt')}</label>
              <input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold">{t('cpEndAt')}</label>
              <input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold">{t('cpPriority')}</label>
              <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
          </div>

          {popup && (
            <div>
              <label className="text-xs font-semibold">{t('cpPublishReason')}</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('cpReasonPlaceholder')} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="aqua-gradient" size="sm" onClick={() => void saveDraft()}>
              {t('cpSaveDraft')}
            </Button>
            {popup && (
              <>
                <Button size="sm" onClick={() => void act('PUBLISHED')}>
                  {t('cpPublish')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void act('SCHEDULED')}>
                  {t('cpSchedule')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void act('PAUSED')}>
                  {t('cpPause')}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void act('ARCHIVED')}>
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('cpArchive')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   AGENTIC
   ──────────────────────────────────────────────────────────────────────────── */
interface ProposalView {
  id: string
  agent: string
  type: string
  status: string
  title: string
  rationale: string
  payload: Record<string, unknown> | null
  confidence: number
  riskLevel: string
  blockedReasons: string[] | null
  createdAt: string
}

const SEASON_BY_MONTH = ['WINTER', 'WINTER', 'SPRING', 'SPRING', 'SPRING', 'SUMMER', 'SUMMER', 'SUMMER', 'AUTUMN', 'AUTUMN', 'AUTUMN', 'WINTER']

function AgenticSection({ filterStatus }: { filterStatus?: string }) {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [proposals, setProposals] = useState<ProposalView[] | null>(null)
  const [intent, setIntent] = useState('')

  const load = useCallback(async () => {
    try {
      const url = filterStatus ? `/api/admin/v1/agentic?status=${encodeURIComponent(filterStatus)}` : '/api/admin/v1/agentic'
      const data = await apiFetch<{ proposals: ProposalView[] }>(url)
      setProposals(data.proposals)
    } catch {
      toast({ title: t('cpAgenticError'), variant: 'destructive' })
    }
  }, [filterStatus, t, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const run = async (agent: string, input?: Record<string, unknown>) => {
    try {
      await apiFetch('/api/admin/v1/agentic', { method: 'POST', body: JSON.stringify({ agent, input }) })
      toast({ title: t('cpRunOk') })
      load()
    } catch (e) {
      toast({ title: t('cpAgenticError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const review = async (id: string, decision: 'APPROVE' | 'REJECT') => {
    try {
      await apiFetch(`/api/admin/v1/agentic/${id}`, { method: 'POST', body: JSON.stringify({ decision }) })
      toast({ title: t('cpReviewOk') })
      load()
    } catch (e) {
      toast({ title: t('cpAgenticError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const season = SEASON_BY_MONTH[new Date().getMonth()]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">{t('cpAgenticTitle')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('cpAgenticDesc')}</p>
      </div>

      <div className="card-premium-champagne rounded-xl p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-champagne-ink">
          <Sparkles className="h-3.5 w-3.5" />
          {t('cpAgenticRule')}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-52 flex-1">
          <input
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder={t('overviewDesc')}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        <Button variant="aqua-gradient" size="sm" onClick={() => void run('opportunityDetector', { season, zone: 'APP' })}>
          <Bot className="h-4 w-4" />
          {t('cpAgentOpportunity')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void run('copyAssistant', { intent: intent || undefined, locale: 'fr' })}>
          {t('cpAgentCopy')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void run('targetingAdvisor', { season, zone: 'APP' })}>
          {t('cpAgentTargeting')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void run('scheduler', { season })}>
          {t('cpAgentSchedule')}
        </Button>
      </div>

      {proposals === null && <p className="text-sm text-muted-foreground">…</p>}
      {proposals !== null && proposals.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          {t('cpAgenticEmpty')}
        </div>
      )}

      <div className="space-y-3">
        {proposals?.map((p) => (
          <div key={p.id} className="glass-card-lagon rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{p.title}</span>
              <Badge variant={(STATUS_BADGE[p.status] ?? 'outline') as never}>{t(statusKey(p.status) as never)}</Badge>
              {p.riskLevel === 'BLOCKED' && <Badge variant="destructive">{t('cpBlocked')}</Badge>}
              {p.riskLevel !== 'BLOCKED' && p.blockedReasons?.includes('human_review_required') && (
                <Badge variant="champagne">{t('cpHumanReviewRequired')}</Badge>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span>{t('cpAgentCol')}: {p.agent}</span>
              <span>{t('cpTypeCol')}: {p.type}</span>
              <span>{t('cpConfidenceCol')}: {Math.round(p.confidence * 100)}%</span>
              <span>{t('cpRiskCol')}: {p.riskLevel}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{t('cpRationale')}: </span>
              {p.rationale}
            </p>
            {p.blockedReasons && p.blockedReasons.length > 0 && (
              <p className={`mt-1.5 text-xs ${p.riskLevel === 'BLOCKED' ? 'text-destructive' : 'text-champagne-ink'}`}>
                {p.riskLevel === 'BLOCKED'
                  ? `${t('cpBlocked')}: ${p.blockedReasons.filter((r) => r !== 'human_review_required').join(', ')}`
                  : t('cpHumanReviewRequired')}
              </p>
            )}
            {p.payload && (
              <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-night/5 p-2 text-[11px]">{JSON.stringify(p.payload, null, 2)}</pre>
            )}
            {p.status === 'NEEDS_REVIEW' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="aqua-gradient" disabled={p.riskLevel === 'BLOCKED'} onClick={() => void review(p.id, 'APPROVE')}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('cpApprove')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void review(p.id, 'REJECT')}>
                  <XCircle className="h-3.5 w-3.5" />
                  {t('cpReject')}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   AUDIT
   ──────────────────────────────────────────────────────────────────────────── */
function AuditSection() {
  const t = useTranslations('admin')
  const [logs, setLogs] = useState<Array<{ id: string; actor: string; action: string; entityType: string; entityId: string | null; createdAt: string }> | null>(null)

  useEffect(() => {
    fetch('/api/admin/v1/audit')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('ko'))))
      .then((d) => setLogs(d.logs))
      .catch(() => setLogs([]))
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">{t('cpAuditTitle')}</h2>
      {logs === null && <p className="text-sm text-muted-foreground">…</p>}
      {logs !== null && logs.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          {t('cpAuditEmpty')}
        </div>
      )}
      <div className="space-y-2">
        {logs?.map((l) => (
          <div key={l.id} className="glass-card-lagon rounded-lg px-4 py-2.5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-lagoon-ink">{l.action}</span>
              <span className="text-xs text-muted-foreground">{l.entityType}{l.entityId ? ` · ${l.entityId}` : ''}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {l.actor} · {new Date(l.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   SHELL
   ──────────────────────────────────────────────────────────────────────────── */
export default function AdminPage() {
  const t = useTranslations('admin')
  const router = useRouter()
  const [section, setSection] = useState<SectionId>('overview')

  const navigate = (target: string) => {
    if (target === 'promotions') {
      router.push('/admin/promotions')
      return
    }
    setSection(target as SectionId)
  }

  return (
    <div className="app-bg-lagon flex min-h-screen flex-col bg-background">
      {/* Header console */}
      <header className="sticky top-0 z-40 border-b border-lagoon/20 bg-background/70 shadow-[0_12px_32px_-24px_oklch(0.30_0.07_200/0.5)] backdrop-blur-2xl">
        <div className="flex h-16 items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/branding/aqwelia-icon-a.png" alt="" className="h-9 w-9 rounded-lg" />
            <span className="font-display text-lg font-bold">{t('overviewTitle')}</span>
            <Badge variant="champagne" className="hidden sm:inline-flex">V1</Badge>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="glass-pill rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-gold/40 hover:text-gold">
              {t('viewSite')}
            </a>
            <button
              onClick={() => void signOutWithBillingCleanup({ callbackUrl: '/' })}
              className="glass-pill rounded-full px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-gold/40"
            >
              {t('signOut')}
            </button>
          </div>
        </div>
      </header>

      <div className="flex w-full flex-1">
        {/* Sidebar desktop */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-lagoon/15 px-3 py-6 md:flex">
          {NAV_GROUPS.map((group, gi) => (
            <nav key={gi} className="space-y-0.5">
              {group.labelKey && (
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {t(group.labelKey as never)}
                </p>
              )}
              {group.items.map((item) => {
                const active = section === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => (item.href ? router.push(item.href) : setSection(item.id as SectionId))}
                    className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-lagoon/20 to-aqua-vivid/10 text-foreground shadow-sm ring-1 ring-lagoon/25'
                        : 'text-muted-foreground hover:bg-lagoon/10 hover:text-foreground'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        active
                          ? 'icon-chip icon-chip-lagoon shadow-sm'
                          : 'bg-secondary text-muted-foreground group-hover:text-foreground'
                      }`}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                    </span>
                    {t(item.labelKey as never)}
                  </button>
                )
              })}
            </nav>
          ))}
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-10">
          {section === 'overview' && <OverviewSection onNavigate={navigate} />}
          {section === 'banners' && <BannersSection />}
          {section === 'popups' && <PopupsSection />}
          {section === 'announcements' && <AnnouncementsSection />}
          {section === 'flags' && <FlagsSection />}
          {section === 'content' && <ContentSection />}
          {section === 'agentic' && <AgenticSection />}
          {section === 'approvals' && <AgenticSection filterStatus="NEEDS_REVIEW" />}
          {section === 'history' && <AgenticSection />}
          {section === 'users' && <UsersSection />}
          {section === 'analytics' && <AnalyticsSection />}
          {section === 'audit' && <AuditSection />}
          {section === 'system' && <SystemStatusSection />}
        </main>
      </div>

      {/* Nav mobile (tablette/mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-lagoon/20 bg-background/90 backdrop-blur-xl md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="custom-scroll flex gap-1 overflow-x-auto px-2 py-1.5">
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
            <button
              key={item.id}
              onClick={() => (item.href ? router.push(item.href) : setSection(item.id as SectionId))}
              className={`flex min-w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                section === item.id ? 'bg-lagoon/15 text-lagoon-ink' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {t(item.labelKey as never)}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
