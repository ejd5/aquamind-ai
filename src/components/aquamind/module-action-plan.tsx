'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ListChecks,
  Droplets,
  ShieldX,
  Clock,
  Euro,
  RefreshCw,
  AlertTriangle,
  PhoneCall,
  ArrowRight,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import type { TabId } from './app-shell'

interface Props {
  onNavigate: (tab: TabId) => void
}

interface LatestPlan {
  id: string
  diagnosis: string
  severity: 'low' | 'medium' | 'high' | 'urgent'
  confidence: number
  immediateActions: { order: number; action: string; detail: string; product?: string }[]
  chemicalDosages: {
    param: string
    product: string
    quantity: string
    method: string
    filtrationHours: number
    retestInHours: number
    waitBeforeSwimHours: number
    warnings: string[]
    estimatedCost: string
  }[]
  filtrationHours: number
  retestInHours: number
  swimSafety: string
  doNotDo: string[]
  estimatedCost: string
  whenToCallProfessional: string | null
  createdAt: string
  waterTestId: string
}

const SEVERITY_CONFIG: Record<string, { label: string; cls: string }> = {
  low: { label: 'Tout va bien', cls: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]' },
  medium: { label: 'À surveiller', cls: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300' },
  high: { label: 'Action recommandée', cls: 'border-orange-400/30 bg-orange-400/10 text-orange-700 dark:text-orange-300' },
  urgent: { label: 'Urgent', cls: 'border-destructive/30 bg-destructive/10 text-destructive' },
}

const SWIM_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
  allowed: { label: 'Baignade autorisée', cls: 'border-[oklch(0.7_0.15_155)]/40 bg-[oklch(0.7_0.15_155)]/15 text-[oklch(0.4_0.13_155)]', icon: 'bg-[oklch(0.7_0.15_155)]' },
  avoid: { label: 'Baignade déconseillée', cls: 'border-yellow-400/40 bg-yellow-400/15 text-yellow-700 dark:text-yellow-200', icon: 'bg-yellow-500' },
  forbidden: { label: 'Baignade interdite', cls: 'border-destructive/40 bg-destructive/15 text-destructive', icon: 'bg-destructive' },
  unknown: { label: 'Baignade à confirmer', cls: 'border-border bg-muted text-muted-foreground', icon: 'bg-muted-foreground' },
}

export function ModuleActionPlan({ onNavigate }: Props) {
  const [plan, setPlan] = useState<LatestPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      const data = await res.json()
      setPlan(data.latestPlan || null)
    } catch {
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function regenerate() {
    if (!plan?.waterTestId) return
    setRegenerating(true)
    try {
      const res = await fetch('/api/pool/action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: plan.waterTestId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      toast({ title: 'Plan régénéré', description: 'Le plan a été recalculé.' })
      load()
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Régénération impossible',
        variant: 'destructive',
      })
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!plan) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-display text-lg font-semibold">Aucun plan d'action disponible</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Saisissez une mesure d'eau pour générer automatiquement un plan d'action ordonné :
            actions immédiates, dosages, sécurité baignade.
          </p>
          <Button
            onClick={() => onNavigate('water')}
            className="bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-lg shadow-primary/20"
          >
            <Droplets className="h-4 w-4" />
            Saisir une mesure
          </Button>
        </CardContent>
      </Card>
    )
  }

  const sev = SEVERITY_CONFIG[plan.severity] || SEVERITY_CONFIG.low
  const swim = SWIM_CONFIG[plan.swimSafety] || SWIM_CONFIG.unknown

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="section-label">Plan d'action</span>
            <span className="h-px w-8 bg-gold/40" />
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Plan d'action
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Généré automatiquement à partir de votre dernière mesure. Suivez les étapes dans
            l'ordre.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={regenerate} disabled={regenerating}>
          <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          Régénérer
        </Button>
      </div>

      {/* Diagnosis card */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Sparkles className="h-5 w-5 text-gold" />
              Diagnostic
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={sev.cls}>
                {sev.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {new Date(plan.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
          <CardDescription className="pt-2 text-sm leading-relaxed text-foreground/80">
            {plan.diagnosis}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Swim safety banner */}
      <div className={`flex items-center gap-4 rounded-2xl border-2 p-4 ${swim.cls}`}>
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${swim.icon} shadow-md`}>
          <ShieldAlert className="h-5 w-5 text-white" />
        </span>
        <div>
          <p className="font-display text-lg font-bold">{swim.label}</p>
          <p className="text-xs opacity-80">
            Évaluez la sécurité avant toute baignade. En cas d'irritation, sortez de l'eau.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Immediate actions */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <ListChecks className="h-4 w-4 text-gold" />
              Actions immédiates — dans cet ordre
            </CardTitle>
            <CardDescription className="text-xs">
              L'ordre compte : TAC avant pH, pH avant chlore, chlore avant filtration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2.5">
              {plan.immediateActions.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-xs font-bold text-primary-foreground shadow-md shadow-primary/30">
                    {a.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                    {a.product && (
                      <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">
                        {a.product}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Side info */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Synthèse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Re-test
                </span>
                <span className="font-display font-bold text-primary">
                  {Math.round(plan.retestInHours)}h
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Filtration min.
                </span>
                <span className="font-display font-bold text-primary">
                  {plan.filtrationHours}h
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Euro className="h-3.5 w-3.5" />
                  Coût estimé
                </span>
                <span className="font-display font-bold text-gold">
                  {plan.estimatedCost}
                </span>
              </div>
            </CardContent>
          </Card>

          {plan.whenToCallProfessional && (
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-gold">
                <PhoneCall className="h-3.5 w-3.5" />
                Faire appel à un pro
              </p>
              <p className="mt-1 text-foreground/80">{plan.whenToCallProfessional}</p>
            </div>
          )}
        </div>
      </div>

      {/* Chemical dosages */}
      {plan.chemicalDosages.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Droplets className="h-4 w-4 text-primary" />
              Dosages recommandés
            </CardTitle>
            <CardDescription className="text-xs">
              Quantités calculées d'après votre volume d'eau et votre méthode de traitement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plan.chemicalDosages.map((d, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/50 bg-background/60 p-3 transition-all hover:border-gold/30 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {d.param}
                      </p>
                      <p className="font-display text-sm font-semibold">{d.product}</p>
                    </div>
                    <p className="font-display text-2xl font-bold text-gold">{d.quantity}</p>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{d.method}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                      <Clock className="h-3 w-3" />
                      Filtr. {d.filtrationHours}h
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                      <ArrowRight className="h-3 w-3" />
                      Re-test {d.retestInHours}h
                    </span>
                    {d.waitBeforeSwimHours > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                        ⌛ Baignade {d.waitBeforeSwimHours}h
                      </span>
                    )}
                  </div>
                  {d.estimatedCost && d.estimatedCost !== '—' && (
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      ≈ <span className="font-semibold text-gold">{d.estimatedCost}</span>
                    </p>
                  )}
                  {d.warnings.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-[10px] text-destructive">
                      {d.warnings.map((w, j) => (
                        <li key={j}>⚠ {w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Do not do */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base text-destructive">
            <ShieldX className="h-4 w-4" />
            À ne jamais faire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-1.5 text-xs text-destructive/90 sm:grid-cols-2">
            {plan.doNotDo.map((d, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-background/40 p-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                {d}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Footer disclaimer + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
          AquaMind aide au diagnostic et à l'entretien mais ne remplace pas un professionnel.
          Respectez les notices produits.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('water')}>
            <Droplets className="h-3.5 w-3.5" />
            Nouveau test
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('log')}>
            Voir le carnet
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
