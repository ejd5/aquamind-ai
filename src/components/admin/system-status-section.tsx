'use client'

/**
 * AQWELIA — Admin Control Plane · SYSTEM STATUS (PR111) — READ ONLY.
 * Vue opérationnelle sûre : statuts HEALTHY/DEGRADED/UNAVAILABLE/UNKNOWN,
 * aucun secret, timeouts bornés.
 */

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Activity, CheckCircle2, Database, ShieldCheck, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SystemStatus {
  status: string
  runtime: string
  environment: string
  appVersion: string | null
  gitSha: string | null
  database: {
    provider: string
    connectivity: string
    prismaMigrationsApplied: number | null
  }
  adminControlPlane: { tablesAvailable: boolean }
  providerConfigurationPresence: { stripe: boolean; revenuecat: boolean; storage: boolean }
}

type Health = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN'

const HEALTH_BADGE: Record<Health, string> = {
  HEALTHY: 'success',
  DEGRADED: 'warning',
  UNAVAILABLE: 'destructive',
  UNKNOWN: 'secondary',
}

export function SystemStatusSection() {
  const t = useTranslations('admin')
  const [data, setData] = useState<SystemStatus | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/v1/system')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData((await res.json()) as SystemStatus)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const row = (label: string, value: string, health: Health, icon: React.ReactNode) => (
    <div className="glass-card-lagon flex items-center justify-between gap-3 rounded-xl px-4 py-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
        <Badge variant={(HEALTH_BADGE[health] ?? 'secondary') as never}>{health}</Badge>
      </span>
    </div>
  )

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold">{t('cpSystemTitle')}</h2>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-semibold text-destructive">{t('cpError')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">{t('cpSystemTitle')}</h2>
        <p className="text-xs text-muted-foreground">{t('cpSystemDesc')}</p>
      </div>

      {data === null && <p className="text-sm text-muted-foreground">…</p>}

      {data !== null && (
        <div className="space-y-2">
          {row(
            t('cpSystemStatus'),
            data.status,
            (data.status as Health) ?? 'UNKNOWN',
            <Activity className="h-4 w-4 text-lagoon" />
          )}
          {row(
            t('cpSystemEnvironment'),
            data.environment,
            data.environment === 'production' ? 'HEALTHY' : 'DEGRADED',
            <ShieldCheck className="h-4 w-4 text-lagoon" />
          )}
          {row(
            t('cpSystemDatabase'),
            data.database.provider,
            (data.database.connectivity as Health) ?? 'UNKNOWN',
            <Database className="h-4 w-4 text-lagoon" />
          )}
          {row(
            t('cpSystemMigrations'),
            data.database.prismaMigrationsApplied !== null
              ? String(data.database.prismaMigrationsApplied)
              : '—',
            data.database.prismaMigrationsApplied !== null ? 'HEALTHY' : 'UNKNOWN',
            <CheckCircle2 className="h-4 w-4 text-lagoon" />
          )}
          {row(
            t('cpSystemAdminTables'),
            data.adminControlPlane.tablesAvailable ? 'OK' : '—',
            data.adminControlPlane.tablesAvailable ? 'HEALTHY' : 'UNAVAILABLE',
            data.adminControlPlane.tablesAvailable ? (
              <CheckCircle2 className="h-4 w-4 text-lagoon" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )
          )}
          {row(
            t('cpSystemVersion'),
            [data.appVersion, data.gitSha].filter(Boolean).join(' · ') || '—',
            'UNKNOWN',
            <Activity className="h-4 w-4 text-lagoon" />
          )}
          <div className="rounded-xl border border-border/50 px-4 py-3 text-xs text-muted-foreground">
            {t('cpSystemRuntime')}: {new Date(data.runtime).toLocaleString()}
            <span className="ml-3">
              {t('cpSystemProviders')}: Stripe {data.providerConfigurationPresence.stripe ? '✓' : '—'} · RevenueCat{' '}
              {data.providerConfigurationPresence.revenuecat ? '✓' : '—'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
