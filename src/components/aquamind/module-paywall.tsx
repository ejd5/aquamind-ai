'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Crown,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  Loader2,
  ChevronDown,
  HelpCircle,
  Waves,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from '@/hooks/use-toast'
import { useTranslations, useLocale } from 'next-intl'
import type { PlanId } from '@/lib/pool/freemium'
import { billing } from '@/lib/billing'
import { isNative } from '@/lib/platform'
import { offlineApi } from '@/lib/offline/api-cache'
import { api } from '@/lib/api-client'
import { useOfflineStore } from '@/lib/offline/offline-store'
import { trackEvent } from '@/lib/analytics-client'

type Duration = 'week' | 'month' | 'halfyear' | 'year'

interface Plan {
  id: PlanId
  name: string
  nameKey: string
  tagline: string
  taglineKey: string
  price: { week: number; month: number; quarter: number; halfyear: number; year: number }
  features: string[]
  featureKeys: string[]
  limits: {
    maxPools: number
    maxSpas: number
    maxPhotoScansPerMonth: number
    maxTestsPerMonth: number
    weatherEnabled: boolean
    smartReminders: boolean
    guidesAccess: string
    multiPool: boolean
    pdfReport: boolean
    proMode: boolean
    historyDays: number
    spaSupport: boolean
  }
  highlighted?: boolean
  color: string
  icon: string
}

const DURATIONS: { id: Duration; suffixKey: 'perWeek' | 'perMonth' | 'perHalfyear' | 'perYear'; labelKey: 'week' | 'month' | 'halfyear' | 'year'; save?: string; emergency?: boolean }[] = [
  { id: 'week', labelKey: 'week', suffixKey: 'perWeek', emergency: true },
  { id: 'month', labelKey: 'month', suffixKey: 'perMonth' },
  { id: 'halfyear', labelKey: 'halfyear', suffixKey: 'perHalfyear', save: '20%' },
  { id: 'year', labelKey: 'year', suffixKey: 'perYear', save: '30%' },
]

// Feature comparison table rows: { labelKey, key, accessor }
const COMPARISON: {
  labelKey: 'photoScans' | 'weather' | 'reminders' | 'guides' | 'multiPool' | 'pdfReport' | 'proMode' | 'history' | 'spa'
  values: (p: Plan) => { ok: boolean; text?: string }
}[] = [
  { labelKey: 'photoScans', values: (p) => ({ ok: p.limits.maxPhotoScansPerMonth >= 999, text: p.limits.maxPhotoScansPerMonth >= 999 ? 'unlimited' : `${p.limits.maxPhotoScansPerMonth}` }) },
  { labelKey: 'weather', values: (p) => ({ ok: p.limits.weatherEnabled && p.id !== 'decouverte' }) },
  { labelKey: 'reminders', values: (p) => ({ ok: p.limits.smartReminders }) },
  { labelKey: 'guides', values: (p) => ({ ok: p.limits.guidesAccess !== 'basic' }) },
  { labelKey: 'multiPool', values: (p) => ({ ok: p.limits.multiPool, text: p.limits.maxPools >= 999 ? 'unlimited' : `${p.limits.maxPools}` }) },
  { labelKey: 'pdfReport', values: (p) => ({ ok: p.limits.pdfReport }) },
  { labelKey: 'proMode', values: (p) => ({ ok: p.limits.proMode }) },
  { labelKey: 'history', values: (p) => ({ ok: p.limits.historyDays >= 90, text: p.limits.historyDays >= 9999 ? 'unlimited' : 'days' }) },
  { labelKey: 'spa', values: (p) => ({ ok: p.limits.spaSupport, text: p.limits.maxSpas > 0 ? `${p.limits.maxSpas}` : undefined }) },
]

const FAQ_KEYS = ['changePlan', 'endSubscription', 'annual', 'refund'] as const

export function ModulePaywall() {
  const t = useTranslations('plans')
  const locale = useLocale()
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<PlanId>('decouverte')
  const [subscription, setSubscription] = useState<{ expiresAt?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const duration: Duration = 'month'
  const [activating, setActivating] = useState<PlanId | null>(null)
  const [restoring, setRestoring] = useState(false)
  const queueAction = useOfflineStore((s) => s.queueAction)
  const isOnline = useOfflineStore((s) => s.isOnline)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await offlineApi.subscription()
      setPlans((data as any)?.allPlans || [])
      setCurrentPlanId((data as any)?.plan?.id || 'decouverte')
      setSubscription((data as any)?.subscription || null)
      // On native, also refresh entitlements from RevenueCat
      if (isNative()) {
        const activePlan = await billing.getActivePlan()
        if (activePlan) setCurrentPlanId(activePlan)
      }
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Analytics — paywall shown. Fire once on mount with the current plan
  // (if any) so we can compute upgrade conversion rates in PostHog.
  useEffect(() => {
    trackEvent('paywall_shown', {
      currentPlan: currentPlanId,
      platform: isNative() ? 'native' : 'web',
    })
  }, [])

  const paidPlans = useMemo(() => plans.filter((p) => p.id !== 'decouverte'), [plans])
  const freePlan = plans.find((p) => p.id === 'decouverte')

  async function activate(planId: PlanId) {
    setActivating(planId)
    try {
      if (planId === 'decouverte') {
        // Downgrade — no billing needed
        await api.post('/api/subscription', { plan: planId, duration })
        setCurrentPlanId(planId)
        setSubscription(null)
        toast({ title: t('freeActivated'), description: t('freeActivatedDesc') })
        return
      }

      if (isNative()) {
        // Native: use RevenueCat IAP
        const productId = `aqwelia_${planId}_monthly`
        const result = await billing.purchase(productId)
        if (result.userCancelled) {
          toast({ title: t('purchaseCancelled'), description: t('purchaseCancelledDesc') })
          return
        }
        if (!result.success) {
          throw new Error(result.error || t('failed'))
        }
        setCurrentPlanId(planId)
        setSubscription({ expiresAt: result.entitlement?.expiresAt?.toISOString() })
        toast({ title: t('subscriptionActivated'), description: t('subscriptionActivatedDesc', { plan: planId }) })
      } else {
        // Web: redirect to Stripe Checkout
        if (!isOnline) {
          toast({ title: t('offline'), description: t('offlineDesc'), variant: 'destructive' })
          return
        }
        const productId = `${planId}_monthly`
        const result = await api.post<{ url: string }>('/api/stripe/checkout', { productId })
        if (result?.url) {
          window.location.href = result.url
        }
      }
    } catch (e) {
      toast({
        title: t('error'),
        description: e instanceof Error ? e.message : t('failed'),
        variant: 'destructive',
      })
    } finally {
      setActivating(null)
    }
  }

  async function restorePurchases() {
    setRestoring(true)
    try {
      const entitlements = await billing.restorePurchases()
      const active = entitlements.find((e) => e.isActive)
      if (active) {
        setCurrentPlanId(active.plan)
        setSubscription({ expiresAt: active.expiresAt?.toISOString() })
        toast({ title: t('restored'), description: t('restoredDesc', { plan: active.plan }) })
      } else {
        toast({ title: t('noPurchase'), description: t('noPurchaseDesc') })
      }
    } catch {
      toast({ title: t('error'), description: t('restoreError'), variant: 'destructive' })
    } finally {
      setRestoring(false)
    }
  }

  async function manageSubscription() {
    try {
      await billing.manageSubscription()
    } catch {
      toast({ title: t('error'), description: t('manageError'), variant: 'destructive' })
    }
  }

  function formatPrice(plan: Plan) {
    const p = plan.price[duration]
    if (p === 0) return '0 €'
    return `${p.toFixed(2).replace('.', ',')} €`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-24" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="relative overflow-hidden border-gold/30 bg-gradient-to-br from-primary/10 via-gold/5 to-background">
        <div className="aurora-orb -right-10 -top-10 h-48 w-48 bg-gold/30" />
        <CardContent className="relative py-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-gold to-primary opacity-60 blur-sm" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-primary shadow-lg shadow-gold/30">
                <Crown className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="section-label">{t('premiumLabel')}</span>
                <span className="h-px w-8 bg-gold/40" />
              </div>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t('passTo', { plan: 'AQWELIA Pool' })}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                {t('heroSubtitle')}
              </p>
            </div>
            {currentPlanId !== 'decouverte' && (
              <Badge variant="outline" className="border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
                <Crown className="mr-1 h-3 w-3" />
                {t('currentPlan', { name: plans.find((p) => p.id === currentPlanId)?.nameKey ? t(plans.find((p) => p.id === currentPlanId)!.nameKey) : '' })}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {paidPlans.map((plan) => {
          const isCurrent = plan.id === currentPlanId
          const highlighted = plan.highlighted
          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 ${
                highlighted
                  ? 'border-gold/60 bg-gradient-to-br from-gold/8 to-background shadow-xl shadow-gold/10'
                  : 'glass-card'
              }`}
            >
              {highlighted && (
                <div className="absolute right-0 top-0 rounded-bl-xl bg-gradient-to-r from-gold to-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  {t('popular')}
                </div>
              )}
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{plan.icon}</span>
                  <div>
                    <p className="font-display text-lg font-bold">{t(plan.nameKey)}</p>
                    <p className="text-[11px] text-muted-foreground">{t(plan.taglineKey)}</p>
                  </div>
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="font-display text-3xl font-bold text-primary">{formatPrice(plan)}</span>
                  <span className="mb-1 text-xs text-muted-foreground">
                    {t(DURATIONS.find((d) => d.id === duration)?.suffixKey || 'perMonth')}
                  </span>
                </div>
                <ul className="flex-1 space-y-1.5 text-xs">
                  {plan.featureKeys.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.7_0.15_155)]" />
                      <span className="text-foreground/90">{t(f)}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  disabled={isCurrent || activating === plan.id}
                  onClick={() => activate(plan.id)}
                  className={`w-full ${
                    highlighted
                      ? 'bg-gradient-to-r from-gold to-primary text-white shadow-lg shadow-gold/30 hover:shadow-xl hover:shadow-gold/40'
                      : 'bg-gradient-to-r from-primary to-gold text-primary-foreground'
                  }`}
                >
                  {activating === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    <>
                      <Check className="h-4 w-4" />
                      {t('current')}
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4" />
                      {t('choosePlan', { name: t(plan.nameKey) })}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Free plan — smaller */}
      {freePlan && (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/70">
              <Waves className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-display text-sm font-bold">{t(freePlan.nameKey)}</p>
                <span className="text-xs text-muted-foreground">— {t('freeTagline')}</span>
                {currentPlanId === 'decouverte' && (
                  <Badge variant="outline" className="border-border bg-secondary/60 text-[9px] text-muted-foreground">
                    {t('yourPlan')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {freePlan.featureKeys.slice(0, 3).map((k) => t(k)).join(' · ')}
              </p>
            </div>
            {currentPlanId !== 'decouverte' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => activate('decouverte')}
                disabled={activating === 'decouverte'}
                className="border-border/60"
              >
                {activating === 'decouverte' ? <Loader2 className="h-4 w-4 animate-spin" /> : t('backToFree')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: RefreshCw, label: t('noCommitment'), sub: t('trustSub.noCommitment') },
          { icon: ShieldCheck, label: t('securePayment'), sub: t('trustSub.securePayment') },
          { icon: CreditCard, label: t('cancelAnytime'), sub: t('trustSub.cancelAnytime') },
        ].map((tr) => (
          <div
            key={tr.label}
            className="flex flex-col items-center gap-1 rounded-xl border border-border/50 bg-card/40 p-3 text-center"
          >
            <tr.icon className="h-5 w-5 text-gold" />
            <p className="text-xs font-semibold">{tr.label}</p>
            <p className="text-[10px] text-muted-foreground">{tr.sub}</p>
          </div>
        ))}
      </div>

      {/* Restore + Manage buttons (required for App Store / Google Play) */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={restorePurchases}
          disabled={restoring}
          className="border-border/60 text-xs"
        >
          {restoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {t('restore')}
        </Button>
        {currentPlanId !== 'decouverte' && (
          <Button
            variant="outline"
            size="sm"
            onClick={manageSubscription}
            className="border-border/60 text-xs"
          >
            <CreditCard className="h-3.5 w-3.5" />
            {t('manage')}
          </Button>
        )}
      </div>

      {/* Feature comparison table */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Sparkles className="h-4 w-4 text-gold" />
            {t('comparisonTitle')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('comparisonDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('featureCol')}
                </th>
                {plans.map((p) => (
                  <th key={p.id} className="px-2 py-2 text-center text-xs font-semibold">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-base">{p.icon}</span>
                      <span className="font-display text-sm">{t(p.nameKey)}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i} className="border-b border-border/30 last:border-b-0">
                  <td className="py-2.5 pr-3 text-xs font-medium">{t(`comparison.${row.labelKey}`)}</td>
                  {plans.map((p) => {
                    const v = row.values(p)
                    return (
                      <td key={p.id} className="px-2 py-2.5 text-center">
                        {v.ok ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="h-3.5 w-3.5 text-[oklch(0.7_0.15_155)]" />
                            {v.text && <span className="text-[11px] text-muted-foreground">{v.text === 'unlimited' ? t('unlimited') : v.text === 'days' ? t('daysShort', { n: p.limits.historyDays }) : v.text}</span>}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            {v.text ? (
                              <span className="text-[11px]">{v.text === 'unlimited' ? t('unlimited') : v.text === 'days' ? t('daysShort', { n: p.limits.historyDays }) : v.text}</span>
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <HelpCircle className="h-4 w-4 text-gold" />
            {t('faqTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {FAQ_KEYS.map((key, i) => (
              <AccordionItem key={key} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2 text-left">
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    {t(`faq.${key}.q`)}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-xs leading-relaxed text-muted-foreground">
                  {t(`faq.${key}.a`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {subscription?.expiresAt && currentPlanId !== 'decouverte' && (
        <p className="text-center text-[11px] text-muted-foreground">
          {t('subscriptionActive', { date: new Date(subscription.expiresAt).toLocaleDateString(locale, {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }) })}
        </p>
      )}
    </div>
  )
}
