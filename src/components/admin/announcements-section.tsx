'use client'

/**
 * AQWELIA — Admin Control Plane · ANNOUNCEMENTS + SYSTEM STATUS (PR111).
 * Ces composants remplacent les placeholders V2 du shell principal.
 */

/* ────────────────────────────────────────────────────────────────────────────
   ANNOUNCEMENTS — module fonctionnel (brouillon → publish humain)
   ──────────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { BellRing, Eye, Plus, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface AnnouncementView {
  id: string
  internalName: string
  status: string
  translations: Record<string, { title: string; body: string }>
  ctaTranslations: Record<string, string> | null
  ctaUrl: string | null
  startAt: string | null
  endAt: string | null
  priority: number
  version: number
}

async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data as T
}

const LOCALES7 = ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl'] as const

const ANNOUNCEMENT_STATUS_BADGE: Record<string, string> = {
  DRAFT: 'secondary',
  SCHEDULED: 'info',
  PUBLISHED: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'outline',
}

const announcementStatusKey = (s: string) =>
  ({ DRAFT: 'cpStatusDraft', SCHEDULED: 'cpStatusScheduled', PUBLISHED: 'cpStatusPublished', PAUSED: 'cpStatusPaused', ARCHIVED: 'cpStatusArchived' } as const)[s] ?? 'cpStatusDraft'

export function AnnouncementsSection() {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [items, setItems] = useState<AnnouncementView[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<AnnouncementView | 'new' | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ announcements: AnnouncementView[] }>('/api/admin/v1/announcements')
      setItems(data.announcements)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{t('cpAnnouncementsTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('cpAnnouncementsDesc')}</p>
        </div>
        <Button variant="aqua-gradient" size="sm" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          {t('cpAnnouncementsCreate')}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-semibold text-destructive">{t('cpError')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      )}
      {!error && items === null && <p className="text-sm text-muted-foreground">…</p>}
      {!error && items !== null && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          {t('cpAnnouncementsEmpty')}
        </div>
      )}

      <div className="space-y-3">
        {items?.map((a) => (
          <div key={a.id} className="glass-card-lagon rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <BellRing className="h-4 w-4 text-lagoon" />
              <span className="text-sm font-semibold">{a.internalName}</span>
              <Badge variant={(ANNOUNCEMENT_STATUS_BADGE[a.status] ?? 'outline') as never}>
                {t(announcementStatusKey(a.status) as never)}
              </Badge>
              <span className="text-[11px] text-muted-foreground">v{a.version}</span>
              <div className="ml-auto">
                <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                  <Eye className="h-3.5 w-3.5" />
                  {t('cpBannersEdit')}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing === 'new' && <AnnouncementEditor item={null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load() }} />}
      {editing !== null && editing !== 'new' && <AnnouncementEditor item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load() }} />}
    </div>
  )
}

function AnnouncementEditor({
  item,
  onClose,
  onSaved,
}: {
  item: AnnouncementView | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [internalName, setInternalName] = useState(item?.internalName ?? '')
  const [translations, setTranslations] = useState<Record<string, { title: string; body: string }>>(
    item?.translations ?? Object.fromEntries(LOCALES7.map((l) => [l, { title: '', body: '' }]))
  )
  const [ctaTranslations, setCtaTranslations] = useState<Record<string, string>>(
    item?.ctaTranslations ?? Object.fromEntries(LOCALES7.map((l) => [l, '']))
  )
  const [ctaUrl, setCtaUrl] = useState(item?.ctaUrl ?? '')
  const [startAt, setStartAt] = useState(item?.startAt?.slice(0, 10) ?? '')
  const [endAt, setEndAt] = useState(item?.endAt?.slice(0, 10) ?? '')
  const [priority, setPriority] = useState(item?.priority ?? 0)
  const [reason, setReason] = useState('')

  const saveDraft = async () => {
    const payload = {
      internalName,
      translations,
      ctaTranslations,
      ctaUrl: ctaUrl || undefined,
      startAt: startAt ? new Date(startAt).toISOString() : undefined,
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      priority,
    }
    try {
      if (item) {
        await apiFetch(`/api/admin/v1/announcements/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...payload, expectedVersion: item.version }),
        })
        toast({ title: t('cpSaved') })
      } else {
        await apiFetch('/api/admin/v1/announcements', { method: 'POST', body: JSON.stringify(payload) })
        toast({ title: t('cpCreated') })
      }
      onSaved()
    } catch (e) {
      toast({ title: t('cpError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const act = async (status: 'PUBLISHED' | 'SCHEDULED' | 'PAUSED' | 'ARCHIVED') => {
    if (!item) return
    if (!reason.trim()) {
      toast({ title: t('cpPublishReason'), variant: 'destructive' })
      return
    }
    if (status === 'SCHEDULED' && !startAt) {
      toast({ title: t('cpScheduleNeedsStart'), variant: 'destructive' })
      return
    }
    try {
      await apiFetch(`/api/admin/v1/announcements/${item.id}`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          reason: reason.trim(),
          expectedVersion: item.version,
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
          <h3 className="font-display text-lg font-bold">{item ? t('cpPopupsEdit') : t('cpAnnouncementsCreate')}</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3">
          <div>
            <label className="text-xs font-semibold">{t('cpInternalName')}</label>
            <input value={internalName} onChange={(e) => setInternalName(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold">{t('cpTranslationsTitle')}</p>
            <div className="space-y-2">
              {LOCALES7.map((l) => (
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
            <label className="text-xs font-semibold">{t('cpCtaUrl')}</label>
            <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-1.5">
            {LOCALES7.map((l) => (
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

          {item && (
            <div>
              <label className="text-xs font-semibold">{t('cpPublishReason')}</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('cpReasonPlaceholder')} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="aqua-gradient" size="sm" onClick={() => void saveDraft()}>
              {t('cpSaveDraft')}
            </Button>
            {item && (
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
