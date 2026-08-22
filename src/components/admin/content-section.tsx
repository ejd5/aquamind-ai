'use client'

/**
 * AQWELIA — Admin Product Control (PR112) · CONTENT MANAGER SÛR.
 * Blocs de copy marketing allowlistés (jamais scientifique/légal/prix),
 * champs structurés, workflow DRAFT → APPROVED → PUBLISHED humain.
 */

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, FileText, Send, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { SAFE_CONTENT_ALLOWLIST } from '@/lib/admin-control/content-allowlist'

interface ContentBlockView {
  id: string
  contentKey: string
  status: string
  translations: Record<string, { title?: string; body?: string }>
  version: number
}

async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data as T
}

const LOCALES7 = ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl'] as const
const STATUS_BADGE: Record<string, string> = { DRAFT: 'secondary', APPROVED: 'info', PUBLISHED: 'success', ARCHIVED: 'outline' }
const statusKey = (s: string) => ({ DRAFT: 'cpStatusDraft', APPROVED: 'cpStatusApproved', PUBLISHED: 'cpStatusPublished', ARCHIVED: 'cpStatusArchived' } as const)[s] ?? 'cpStatusDraft'

export function ContentSection() {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [blocks, setBlocks] = useState<ContentBlockView[] | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ blocks: ContentBlockView[] }>('/api/admin/v1/content')
      setBlocks(data.blocks)
    } catch (e) {
      toast({ title: t('cpError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }, [t, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const blockOf = (key: string) => blocks?.find((b) => b.contentKey === key) ?? null

  const transition = async (key: string, status: 'APPROVED' | 'PUBLISHED' | 'ARCHIVED') => {
    if (!reason.trim()) {
      toast({ title: t('cpPublishReason'), variant: 'destructive' })
      return
    }
    try {
      await apiFetch(`/api/admin/v1/content?contentKey=${encodeURIComponent(key)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason: reason.trim() }),
      })
      toast({ title: t('cpSaved') })
      setReason('')
      void load()
    } catch (e) {
      toast({ title: t('cpError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">{t('cpContentTitle')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('cpContentDesc')}</p>
      </div>

      {blocks === null && <p className="text-sm text-muted-foreground">…</p>}

      <div className="space-y-3">
        {SAFE_CONTENT_ALLOWLIST.map((def) => {
          const block = blockOf(def.key)
          return (
            <div key={def.key} className="glass-card-lagon rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 text-lagoon" />
                <span className="font-mono text-xs font-semibold">{def.key}</span>
                <Badge variant={(STATUS_BADGE[block?.status ?? 'DRAFT'] ?? 'secondary') as never}>
                  {t(statusKey(block?.status ?? 'DRAFT') as never)}
                </Badge>
                <span className="text-[11px] text-muted-foreground">{t(def.descriptionKey as never)}</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setEditingKey(def.key)}>
                    {block ? t('cpBannersEdit') : t('cpContentCreate')}
                  </Button>
                  {block && block.status === 'DRAFT' && (
                    <Button size="sm" variant="aqua-gradient" onClick={() => void transition(def.key, 'APPROVED')}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('cpContentApprove')}
                    </Button>
                  )}
                  {block && block.status === 'APPROVED' && (
                    <Button size="sm" onClick={() => void transition(def.key, 'PUBLISHED')}>
                      <Send className="h-3.5 w-3.5" />
                      {t('cpPublish')}
                    </Button>
                  )}
                </div>
              </div>
              {block && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {block.translations.fr?.title || block.translations.fr?.body || '—'}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div>
        <label className="text-xs font-semibold">{t('cpPublishReason')}</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('cpReasonPlaceholder')} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
      </div>

      {editingKey && (
        <ContentEditor
          key={editingKey}
          contentKey={editingKey}
          initial={blockOf(editingKey)}
          onClose={() => setEditingKey(null)}
          onSaved={() => {
            setEditingKey(null)
            void load()
          }}
        />
      )}
    </div>
  )
}

function ContentEditor({
  contentKey,
  initial,
  onClose,
  onSaved,
}: {
  contentKey: string
  initial: ContentBlockView | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [translations, setTranslations] = useState<Record<string, { title?: string; body?: string }>>(
    initial?.translations ?? Object.fromEntries(LOCALES7.map((l) => [l, {}]))
  )

  const save = async () => {
    try {
      await apiFetch('/api/admin/v1/content', {
        method: 'POST',
        body: JSON.stringify({ contentKey, translations }),
      })
      toast({ title: t('cpSaved') })
      onSaved()
    } catch (e) {
      toast({ title: t('cpError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/40 backdrop-blur-sm md:items-center md:p-6">
      <div className="custom-scroll max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-lagoon/20 bg-background p-5 md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-mono text-sm font-bold">{contentKey}</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>

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
                  rows={2}
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="aqua-gradient" size="sm" onClick={() => void save()}>
            {t('cpSaveDraft')}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <XCircle className="h-3.5 w-3.5" />
            {t('cpBannersEdit')}
          </Button>
        </div>
      </div>
    </div>
  )
}
