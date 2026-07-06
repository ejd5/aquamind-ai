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
import type { PlanId } from '@/lib/pool/freemium'

type Duration = 'week' | 'month' | 'quarter' | 'halfyear'

interface Plan {
  id: PlanId
  name: string
  tagline: string
  price: { week: number; month: number; quarter: number; halfyear: number }
  features: string[]
  limits: {
    maxPools: number
    maxPhotoScansPerMonth: number
    weatherEnabled: boolean
    smartReminders: boolean
    guidesAccess: string
    multiPool: boolean
    pdfReport: boolean
    proMode: boolean
    historyDays: number
  }
  highlighted?: boolean
  color: string
  icon: string
}

const DURATIONS: { id: Duration; label: string; suffix: string; save?: string }[] = [
  { id: 'week', label: '7 jours', suffix: '/semaine' },
  { id: 'month', label: '1 mois', suffix: '/mois' },
  { id: 'quarter', label: '3 mois', suffix: '/3 mois', save: '10%' },
  { id: 'halfyear', label: '6 mois', suffix: '/6 mois', save: '20%' },
]

// Feature comparison table rows: { label, key, accessor }
const COMPARISON: {
  label: string
  values: (p: Plan) => { ok: boolean; text?: string }
}[] = [
  { label: 'Scans photo / mois', values: (p) => ({ ok: p.limits.maxPhotoScansPerMonth >= 999, text: p.limits.maxPhotoScansPerMonth >= 999 ? 'Illimité' : `${p.limits.maxPhotoScansPerMonth}` }) },
  { label: 'Météo avancée + alertes', values: (p) => ({ ok: p.limits.weatherEnabled && p.id !== 'free' }) },
  { label: 'Rappels intelligents', values: (p) => ({ ok: p.limits.smartReminders }) },
  { label: 'Guides premium', values: (p) => ({ ok: p.limits.guidesAccess !== 'basic' }) },
  { label: 'Multi-piscines', values: (p) => ({ ok: p.limits.multiPool, text: p.limits.maxPools >= 999 ? 'Illimité' : `${p.limits.maxPools}` }) },
  { label: 'Rapport PDF', values: (p) => ({ ok: p.limits.pdfReport }) },
  { label: 'Mode pro (LSI avancé)', values: (p) => ({ ok: p.limits.proMode }) },
  { label: 'Historique', values: (p) => ({ ok: p.limits.historyDays >= 90, text: p.limits.historyDays >= 9999 ? 'Illimité' : `${p.limits.historyDays} j` }) },
]

const FAQ_ITEMS = [
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: "Oui. Vous pouvez monter ou descendre de plan quand vous le souhaitez. Le changement s'applique immédiatement et le prorata est calculé automatiquement.",
  },
  {
    q: "Que se passe-t-il à la fin de l'abonnement ?",
    a: "À la fin de la période payée, vous repassez automatiquement sur le plan Free (gratuit). Vos données sont conservées ; seules les fonctionnalités premium sont suspendues.",
  },
  {
    q: 'Une formule annuelle est-elle disponible ?',
    a: "Pour l'instant nous proposons 7 jours, 1 mois, 3 mois (-10%) et 6 mois (-20%). Une formule annuelle est en préparation — contactez-nous pour en bénéficier en avant-première.",
  },
  {
    q: 'Quelle est la politique de remboursement ?',
    a: "Vous pouvez demander un remboursement intégral sous 14 jours après le premier paiement, sans justification. Au-delà, contactez le support pour les cas particuliers.",
  },
]

export function ModulePaywall() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<PlanId>('free')
  const [subscription, setSubscription] = useState<{ expiresAt?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [duration, setDuration] = useState<Duration>('month')
  const [activating, setActivating] = useState<PlanId | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/subscription')
      const data = await res.json()
      setPlans(data.allPlans || [])
      setCurrentPlanId(data.plan?.id || 'free')
      setSubscription(data.subscription || null)
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const paidPlans = useMemo(() => plans.filter((p) => p.id !== 'free'), [plans])
  const freePlan = plans.find((p) => p.id === 'free')

  async function activate(planId: PlanId) {
    setActivating(planId)
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, duration }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setCurrentPlanId(planId)
      setSubscription({ expiresAt: data.subscription?.expiresAt })
      const plan = plans.find((p) => p.id === planId)
      toast({
        title: 'Abonnement activé !',
        description: `Plan ${plan?.name || planId} activé pour ${DURATIONS.find((d) => d.id === duration)?.label}.`,
      })
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Échec',
        variant: 'destructive',
      })
    } finally {
      setActivating(null)
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
                <span className="section-label">AQWELIA Premium</span>
                <span className="h-px w-8 bg-gold/40" />
              </div>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Passez à <span className="gradient-text-premium italic">AQWELIA Premium</span>
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                Des conseils illimités, des rappels intelligents, des rapports PDF et bien plus.
              </p>
            </div>
            {currentPlanId !== 'free' && (
              <Badge variant="outline" className="border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
                <Crown className="mr-1 h-3 w-3" />
                Plan actuel : {plans.find((p) => p.id === currentPlanId)?.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Duration selector */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <CreditCard className="h-3 w-3" />
          Choisissez la durée
        </p>
        <div className="custom-scroll flex gap-2 overflow-x-auto pb-1">
          {DURATIONS.map((d) => (
            <button
              key={d.id}
              onClick={() => setDuration(d.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                duration === d.id
                  ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                  : 'border-border bg-background hover:border-gold/30'
              }`}
            >
              {d.label}
              {d.save && (
                <Badge variant="outline" className="border-gold/40 bg-gold/10 px-1.5 text-[9px] font-bold text-gold">
                  -{d.save}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

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
                  Populaire
                </div>
              )}
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{plan.icon}</span>
                  <div>
                    <p className="font-display text-lg font-bold">{plan.name}</p>
                    <p className="text-[11px] text-muted-foreground">{plan.tagline}</p>
                  </div>
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="font-display text-3xl font-bold text-primary">{formatPrice(plan)}</span>
                  <span className="mb-1 text-xs text-muted-foreground">
                    {DURATIONS.find((d) => d.id === duration)?.suffix}
                  </span>
                </div>
                <ul className="flex-1 space-y-1.5 text-xs">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.7_0.15_155)]" />
                      <span className="text-foreground/90">{f}</span>
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
                      Plan actuel
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4" />
                      Choisir {plan.name}
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
                <p className="font-display text-sm font-bold">{freePlan.name}</p>
                <span className="text-xs text-muted-foreground">— Gratuit, pour découvrir</span>
                {currentPlanId === 'free' && (
                  <Badge variant="outline" className="border-border bg-secondary/60 text-[9px] text-muted-foreground">
                    Votre plan
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {freePlan.features.slice(0, 3).join(' · ')}
              </p>
            </div>
            {currentPlanId !== 'free' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => activate('free')}
                disabled={activating === 'free'}
                className="border-border/60"
              >
                {activating === 'free' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Revenir à Gratuit'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: RefreshCw, label: 'Sans engagement', sub: 'Annulez quand vous voulez' },
          { icon: ShieldCheck, label: 'Paiement sécurisé', sub: 'Connexion chiffrée' },
          { icon: CreditCard, label: 'Résiliable anytime', sub: 'En 1 clic' },
        ].map((t) => (
          <div
            key={t.label}
            className="flex flex-col items-center gap-1 rounded-xl border border-border/50 bg-card/40 p-3 text-center"
          >
            <t.icon className="h-5 w-5 text-gold" />
            <p className="text-xs font-semibold">{t.label}</p>
            <p className="text-[10px] text-muted-foreground">{t.sub}</p>
          </div>
        ))}
      </div>

      {/* Feature comparison table */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Sparkles className="h-4 w-4 text-gold" />
            Comparatif détaillé
          </CardTitle>
          <CardDescription className="text-xs">
            Tout ce que vous obtenez avec chaque plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Fonctionnalité
                </th>
                {plans.map((p) => (
                  <th key={p.id} className="px-2 py-2 text-center text-xs font-semibold">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-base">{p.icon}</span>
                      <span className="font-display text-sm">{p.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i} className="border-b border-border/30 last:border-b-0">
                  <td className="py-2.5 pr-3 text-xs font-medium">{row.label}</td>
                  {plans.map((p) => {
                    const v = row.values(p)
                    return (
                      <td key={p.id} className="px-2 py-2.5 text-center">
                        {v.ok ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="h-3.5 w-3.5 text-[oklch(0.7_0.15_155)]" />
                            {v.text && <span className="text-[11px] text-muted-foreground">{v.text}</span>}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            {v.text ? (
                              <span className="text-[11px]">{v.text}</span>
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
            Questions fréquentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2 text-left">
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    {item.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-xs leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {subscription?.expiresAt && currentPlanId !== 'free' && (
        <p className="text-center text-[11px] text-muted-foreground">
          Votre abonnement est actif jusqu'au{' '}
          {new Date(subscription.expiresAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
          .
        </p>
      )}
    </div>
  )
}
