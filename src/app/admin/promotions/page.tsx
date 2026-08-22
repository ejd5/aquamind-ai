'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Megaphone, PauseCircle, Save, Timer, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface AllocationView {
  id: string
  platform: string
  planId: string | null
  quota: number
  confirmedCount: number
  reservedCount: number
  version: number
}

interface VariantView {
  id: string
  code: string
  status: string
  quota: number
  billingPeriod: string
  allocations: AllocationView[]
}

interface AuditView {
  id: string
  action: string
  reason: string | null
  createdAt: string
}

interface CampaignView {
  id: string
  code: string
  name: string
  status: string
  totalQuota: number
  confirmedCount: number
  reservedCount: number
  startsAt: string | null
  endsAt: string | null
  version: number
  variants: VariantView[]
  auditLogs: AuditView[]
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...init,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`)
  return data as T
}

function CampaignEditor({ campaign, onSaved }: { campaign: CampaignView; onSaved: () => Promise<void> }) {
  const t = useTranslations('admin')
  const common = useTranslations('common')
  const { toast } = useToast()
  const [startsAt, setStartsAt] = useState(campaign.startsAt?.slice(0, 10) ?? '')
  const [endsAt, setEndsAt] = useState(campaign.endsAt?.slice(0, 10) ?? '')
  const [totalQuota, setTotalQuota] = useState(campaign.totalQuota)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const mutate = async (payload: Record<string, unknown>) => {
    if (!reason.trim()) {
      toast({ title: t('cpPublishReason'), variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      await apiFetch('/api/admin/v1/promotions', {
        method: 'PATCH',
        body: JSON.stringify({
          campaignId: campaign.id,
          expectedVersion: campaign.version,
          reason: reason.trim(),
          ...payload,
        }),
      })
      toast({ title: t('cpSaved') })
      setReason('')
      await onSaved()
    } catch (error) {
      toast({
        title: t('cpError'),
        description: error instanceof Error ? error.message : '',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const updateCampaign = (status = campaign.status) =>
    mutate({
      action: 'campaign_update',
      status,
      totalQuota,
      startsAt: startsAt ? new Date(`${startsAt}T00:00:00`).toISOString() : null,
      endsAt: endsAt ? new Date(`${endsAt}T23:59:59`).toISOString() : null,
    })

  const updateVariantQuota = (variantId: string, newQuota: number) =>
    mutate({ action: 'variant_quota', variantId, newQuota })

  const updateAllocationQuota = (allocation: AllocationView, newQuota: number) =>
    mutate({
      action: 'allocation_quota',
      allocationId: allocation.id,
      expectedAllocationVersion: allocation.version,
      newQuota,
    })

  return (
    <div className="space-y-5">
      <div className="hero-lagon rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Megaphone className="h-5 w-5 text-lagoon" />
              <h2 className="font-display text-xl font-bold">{campaign.name}</h2>
              <Badge variant="outline">{campaign.status}</Badge>
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{campaign.code} · v{campaign.version}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{t('cpPromoConfirmed')}: {campaign.confirmedCount}</div>
            <div>{t('cpPromoQuota')}: {campaign.totalQuota}</div>
          </div>
        </div>
      </div>

      <div className="glass-card-lagon rounded-2xl p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold">{t('cpPromoQuota')}</label>
            <input
              type="number"
              min={0}
              value={totalQuota}
              onChange={(event) => setTotalQuota(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">{t('cpPromoStartsAt')}</label>
            <input
              type="date"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">{t('cpPromoEndsAt')}</label>
            <input
              type="date"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold">{t('cpPublishReason')}</label>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('cpReasonPlaceholder')}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void updateCampaign()}>
            <Save className="h-4 w-4" />
            {common('save')}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void updateCampaign('SCHEDULED')}>
            <Timer className="h-4 w-4" />
            {t('cpSchedule')}
          </Button>
          <Button size="sm" disabled={busy} onClick={() => void updateCampaign('ACTIVE')}>
            <CheckCircle2 className="h-4 w-4" />
            {t('cpPublish')}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void updateCampaign('PAUSED')}>
            <PauseCircle className="h-4 w-4" />
            {t('cpPause')}
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => void updateCampaign('ENDED')}>
            <XCircle className="h-4 w-4" />
            {t('cpArchive')}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {campaign.variants.map((variant) => (
          <VariantQuotaEditor
            key={`${variant.id}:${campaign.version}`}
            variant={variant}
            disabled={busy}
            onVariantSave={updateVariantQuota}
            onAllocationSave={updateAllocationQuota}
          />
        ))}
      </div>

      {campaign.auditLogs.length > 0 && (
        <div className="glass-card-lagon rounded-2xl p-5">
          <h3 className="font-display text-base font-bold">{t('navAudit')}</h3>
          <div className="mt-3 space-y-2">
            {campaign.auditLogs.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border/50 px-3 py-2 text-xs">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-mono font-semibold">{entry.action}</span>
                  <span className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                {entry.reason ? <p className="mt-1 text-muted-foreground">{entry.reason}</p> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function VariantQuotaEditor({
  variant,
  disabled,
  onVariantSave,
  onAllocationSave,
}: {
  variant: VariantView
  disabled: boolean
  onVariantSave: (variantId: string, quota: number) => Promise<void>
  onAllocationSave: (allocation: AllocationView, quota: number) => Promise<void>
}) {
  const t = useTranslations('admin')
  const common = useTranslations('common')
  const [variantQuota, setVariantQuota] = useState(variant.quota)
  const [allocationQuotas, setAllocationQuotas] = useState<Record<string, number>>(
    Object.fromEntries(variant.allocations.map((allocation) => [allocation.id, allocation.quota]))
  )

  return (
    <div className="glass-card-lagon rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold">{variant.code}</span>
        <Badge variant="secondary">{variant.status}</Badge>
        <span className="text-xs text-muted-foreground">{variant.billingPeriod}</span>
      </div>

      <div className="mt-3 flex max-w-sm items-end gap-2">
        <div className="flex-1">
          <label className="text-xs font-semibold">{t('cpPromoQuota')}</label>
          <input
            type="number"
            min={0}
            value={variantQuota}
            onChange={(event) => setVariantQuota(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => void onVariantSave(variant.id, variantQuota)}>
          {common('save')}
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">{t('cpPromoCode')}</th>
              <th className="px-3 py-2">{t('cpPromoQuota')}</th>
              <th className="px-3 py-2">{t('cpPromoConfirmed')}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {variant.allocations.map((allocation) => (
              <tr key={allocation.id} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2 font-mono text-xs">
                  {allocation.platform}{allocation.planId ? ` · ${allocation.planId}` : ''}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={allocationQuotas[allocation.id] ?? allocation.quota}
                    onChange={(event) =>
                      setAllocationQuotas((current) => ({ ...current, [allocation.id]: Number(event.target.value) }))
                    }
                    className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </td>
                <td className="px-3 py-2">{allocation.confirmedCount}</td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => void onAllocationSave(allocation, allocationQuotas[allocation.id] ?? allocation.quota)}
                  >
                    {common('save')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AdminPromotionsPage() {
  const t = useTranslations('admin')
  const common = useTranslations('common')
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<CampaignView[] | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ campaigns: CampaignView[] }>('/api/admin/v1/promotions')
      setCampaigns(data.campaigns)
    } catch (error) {
      toast({
        title: t('cpError'),
        description: error instanceof Error ? error.message : '',
        variant: 'destructive',
      })
      setCampaigns([])
    }
  }, [t, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">{t('navMarketing')}</p>
          <h1 className="font-display text-2xl font-bold">{t('cpPromotionsTitle')}</h1>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
            {common('back')}
          </Link>
        </Button>
      </div>

      {campaigns === null && <p className="text-sm text-muted-foreground">{common('loading2')}</p>}
      {campaigns !== null && campaigns.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          {t('cpPromotionsEmpty')}
        </div>
      )}
      {campaigns?.map((campaign) => (
        <CampaignEditor key={`${campaign.id}:${campaign.version}`} campaign={campaign} onSaved={load} />
      ))}
    </main>
  )
}
