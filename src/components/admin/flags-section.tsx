'use client'

/**
 * AQWELIA — Admin Product Control (PR112) · FEATURE FLAGS PRODUIT SÛRS.
 * Vue : ENV (source par défaut) + override DB + état effectif.
 * Mutation : allowlist stricte uniquement, raison obligatoire, audit.
 * Jamais de flag sécurité/paiement/auth/infra/scientifique.
 */

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Flag, ToggleLeft, ToggleRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ProductFlagView {
  key: string
  envValue: boolean
  override: boolean | null
  effective: boolean
  reason: string | null
  version: number
  updatedAt: string | null
}

async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data as T
}

export function FlagsSection() {
  const t = useTranslations('admin')
  const { toast } = useToast()
  const [flags, setFlags] = useState<ProductFlagView[] | null>(null)
  const [pending, setPending] = useState<Record<string, { enabled: boolean; reason: string }>>({})

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ flags: ProductFlagView[] }>('/api/admin/v1/flags')
      setFlags(data.flags)
    } catch (e) {
      toast({ title: t('cpError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }, [t, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const toggle = async (flag: ProductFlagView, enabled: boolean) => {
    const reason = pending[flag.key]?.reason?.trim()
    if (!reason || reason.length < 3) {
      toast({ title: t('cpPublishReason'), variant: 'destructive' })
      return
    }
    try {
      await apiFetch('/api/admin/v1/flags', {
        method: 'PATCH',
        body: JSON.stringify({ key: flag.key, enabled, reason }),
      })
      toast({ title: t('cpSaved') })
      setPending((p) => ({ ...p, [flag.key]: { enabled, reason: '' } }))
      void load()
    } catch (e) {
      toast({ title: t('cpError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">{t('cpFlagsTitle')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('cpFlagsReadOnly')}</p>
      </div>

      {flags === null && <p className="text-sm text-muted-foreground">…</p>}

      <div className="space-y-3">
        {flags?.map((f) => {
          const p = pending[f.key]
          return (
            <div key={f.key} className="glass-card-lagon rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Flag className="h-4 w-4 text-lagoon" />
                <span className="font-mono text-xs font-semibold">{f.key}</span>
                <Badge variant={f.effective ? 'success' : 'secondary'}>{f.effective ? 'ON' : 'OFF'}</Badge>
                {f.override !== null && (
                  <Badge variant="champagne">
                    {t('cpFlagOverride')} {f.override ? 'ON' : 'OFF'}
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {t('cpFlagEnv')}: {f.envValue ? 'ON' : 'OFF'} · {t('cpFlagEffective')}: {f.effective ? 'ON' : 'OFF'}
                </span>
              </div>
              {f.reason && <p className="mt-1 text-[11px] text-muted-foreground">{t('cpFlagReason')}: {f.reason}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  value={p?.reason ?? ''}
                  onChange={(e) => setPending((prev) => ({ ...prev, [f.key]: { enabled: !f.effective, reason: e.target.value } }))}
                  placeholder={t('cpPublishReason')}
                  className="min-w-52 flex-1 rounded-lg border border-border px-3 py-1.5 text-sm"
                />
                <Button size="sm" variant="outline" onClick={() => void toggle(f, !f.effective)}>
                  {f.effective ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                  {f.effective ? t('cpFlagDisable') : t('cpFlagEnable')}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
