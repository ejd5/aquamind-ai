'use client'

/**
 * AQWELIA Wave A3 — mobile B2C settings.
 *
 * Displays the account plan from the SERVER projection (GET /api/subscription),
 * never from local CustomerInfo. Links to /settings/subscription for managing
 * and restoring purchases.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronRight, Crown, Loader2, RefreshCw } from 'lucide-react'
import { offlineApi } from '@/lib/offline/api-cache'
import { MobileSubHeader } from '@/components/mobile/mobile-sub-header'
import { signOutWithBillingCleanup } from '@/lib/billing/sign-out'
import type { SubscriptionApiResponse } from '@/lib/billing/types'

export default function MobileSettingsPage() {
  const t = useTranslations('settings')
  const [plan, setPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await offlineApi.subscription()
      const projection = data as SubscriptionApiResponse | null
      setPlan(projection?.plan?.id ?? null)
    } catch {
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="safe-area-top min-h-screen bg-background pb-12">
      <MobileSubHeader title={t('subscription')} />
      <div className="space-y-3 px-4 pt-4">
        <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/15 text-gold">
              <Crown className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{t('subscription')}</p>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-base font-semibold">{plan ?? t('noActiveSubscription')}</p>
              )}
            </div>
          </div>
          <Link
            href="/settings/subscription"
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            {t('manage')}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </section>

        <button
          type="button"
          onClick={() => void signOutWithBillingCleanup({ callbackUrl: '/' })}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-semibold text-destructive"
        >
          <RefreshCw className="h-4 w-4" />
          {t('signOut')}
        </button>
      </div>
    </main>
  )
}
