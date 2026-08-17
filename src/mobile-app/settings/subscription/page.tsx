'use client'

/**
 * AQWELIA Wave A3/A4 — mobile subscription management + restore.
 *
 *   - Restore follows the server-only contract (none / pending / converged);
 *     the plan displayed after convergence comes from /api/subscription, never
 *     from local CustomerInfo.
 *   - Management targets are resolved from /api/subscription.sources and the
 *     user picks a provider explicitly when several are administrable (no
 *     arbitrary provider selection).
 *   - signOut clears the RevenueCat identity BEFORE the NextAuth session ends.
 *   - Sandbox builds expose a dedicated read-only diagnostics screen.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Activity, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { MobileSubHeader } from '@/components/mobile/mobile-sub-header'
import { billing } from '@/lib/billing'
import { resolveSubscriptionManagementTargets } from '@/lib/billing/management-targets'
import { offlineApi } from '@/lib/offline/api-cache'
import { toast } from '@/hooks/use-toast'
import type { SubscriptionApiResponse } from '@/lib/billing/types'

type Target = 'stripe' | 'apple' | 'google'

const SANDBOX_DIAGNOSTICS = process.env.NEXT_PUBLIC_MOBILE_SANDBOX_DIAGNOSTICS === 'true'

export default function MobileSubscriptionPage() {
  const t = useTranslations('settings')
  const [restoring, setRestoring] = useState(false)
  const [managing, setManaging] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [sources, setSources] = useState<{ provider?: string; store?: string | null; environment?: string }[]>([])

  const load = useCallback(async (): Promise<string | null> => {
    try {
      const { data } = await offlineApi.subscription()
      const projection = data as SubscriptionApiResponse | null
      const serverPlan = projection?.plan?.id ?? null
      setPlan(serverPlan)
      setSources((projection?.sources as { provider?: string; store?: string | null; environment?: string }[]) || [])
      return serverPlan
    } catch {
      setPlan(null)
      setSources([])
      return null
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRestore() {
    setRestoring(true)
    try {
      const result = await billing.restorePurchases()
      if (result.state === 'none' || !result.restored) {
        toast({ title: t('noPurchases') })
        return
      }
      if (result.state === 'pending' || result.serverConverged === false) {
        toast({ title: t('restorePending'), description: t('restorePendingDesc') })
        await load()
        return
      }
      // converged → reload /api/subscription; only the returned server plan is shown.
      const serverPlan = await load()
      toast({
        title: t('restoreSuccess'),
        description: t('restoreSuccessDesc', { plan: serverPlan ?? 'decouverte' }),
      })
    } catch {
      toast({ title: t('restoreFailed'), variant: 'destructive' })
    } finally {
      setRestoring(false)
    }
  }

  const targets = resolveSubscriptionManagementTargets(sources)

  async function openTarget(target: Target) {
    setManaging(true)
    try {
      await billing.manageSubscriptionForTarget(target)
    } catch {
      toast({ title: t('portalFailed'), variant: 'destructive' })
    } finally {
      setManaging(false)
    }
  }

  return (
    <main className="safe-area-top min-h-screen bg-background pb-12">
      <MobileSubHeader title={t('subscription')} backHref="/settings" />
      <div className="space-y-3 px-4 pt-4">
        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">{t('subscription')}</p>
          <p className="text-xl font-bold">{plan ?? t('noActiveSubscription')}</p>
          <button
            type="button"
            onClick={() => void handleRestore()}
            disabled={restoring}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-semibold"
          >
            {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t('restore')}
          </button>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gold" />
            <p className="text-sm font-semibold">{t('manage')}</p>
          </div>
          {targets.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">{t('noActiveSubscriptionDesc')}</p>
          )}
          {targets.map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => void openTarget(target)}
              disabled={managing}
              className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-semibold"
            >
              {managing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {target === 'stripe' ? t('manageStripe') : target === 'apple' ? t('manageApple') : t('manageGoogle')}
            </button>
          ))}
        </section>

        {SANDBOX_DIAGNOSTICS ? (
          <Link
            href="/settings/subscription/diagnostics"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-5 text-sm font-semibold text-primary"
          >
            <Activity className="h-4 w-4" />
            Sandbox diagnostics
          </Link>
        ) : null}
      </div>
    </main>
  )
}
