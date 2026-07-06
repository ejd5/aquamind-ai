'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Droplets,
  FlaskConical,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ListChecks,
  Clock,
  Euro,
  ShieldX,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { TARGETS, evaluateParam, type ParamStatus } from '@/lib/pool/targets'
import type { TabId } from './app-shell'
import { offlineApi } from '@/lib/offline/api-cache'
import { api } from '@/lib/api-client'
import { useOfflineStore } from '@/lib/offline/offline-store'

interface Props {
  onNavigate: (tab: TabId) => void
}

interface WaterTestRow {
  id: string
  ph: number
  freeChlorine: number | null
  totalChlorine: number | null
  combinedChlorine: number | null
  alkalinity: number | null
  calciumHardness: number | null
  cyanuricAcid: number | null
  salt: number | null
  phosphates: number | null
  temperature: number | null
  status: string
  clearWaterIndex: number
  swimSafety: string
  source: string
  note: string | null
  createdAt: string
}

interface ActionPlanResult {
  diagnosis: string
  severity: 'low' | 'medium' | 'high' | 'urgent'
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
  swimReasons?: string[]
  doNotDo: string[]
  estimatedCost: string
  whenToCallProfessional: string | null
}

const FIELDS: { key: string; label: string; placeholder: string; required?: boolean }[] = [
  { key: 'ph', label: 'pH', placeholder: '7.2', required: true },
  { key: 'freeChlorine', label: 'Chlore libre', placeholder: '2.0' },
  { key: 'totalChlorine', label: 'Chlore total', placeholder: '2.5' },
  { key: 'combinedChlorine', label: 'Chlore combiné', placeholder: '0.2' },
  { key: 'alkalinity', label: 'Alcalinité (TAC)', placeholder: '100' },
  { key: 'calciumHardness', label: 'Dureté (TH)', placeholder: '300' },
  { key: 'cyanuricAcid', label: 'Stabilisant (CYA)', placeholder: '40' },
  { key: 'salt', label: 'Sel (g/L)', placeholder: '5' },
  { key: 'phosphates', label: 'Phosphates', placeholder: '0.05' },
  { key: 'temperature', label: 'Température (°C)', placeholder: '26' },
]

function statusDot(s: ParamStatus | 'unknown') {
  switch (s) {
    case 'ok':
      return 'bg-[oklch(0.7_0.15_155)]'
    case 'low_warning':
    case 'high_warning':
      return 'bg-yellow-500'
    case 'low_critical':
    case 'high_critical':
      return 'bg-destructive'
    default:
      return 'bg-muted-foreground'
  }
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ok: { label: 'Équilibrée', cls: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]' },
  warning: { label: 'Attention', cls: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300' },
  critical: { label: 'Critique', cls: 'border-destructive/30 bg-destructive/10 text-destructive' },
}

const SEVERITY_CONFIG: Record<string, { label: string; cls: string }> = {
  low: { label: 'Tout va bien', cls: 'border-[oklch(0.7_0.15_155)]/30 bg-[oklch(0.7_0.15_155)]/10 text-[oklch(0.45_0.13_155)]' },
  medium: { label: 'À surveiller', cls: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300' },
  high: { label: 'Action recommandée', cls: 'border-orange-400/30 bg-orange-400/10 text-orange-700 dark:text-orange-300' },
  urgent: { label: 'Urgent', cls: 'border-destructive/30 bg-destructive/10 text-destructive' },
}

const SWIM_LABEL: Record<string, string> = {
  allowed: 'Baignade autorisée',
  avoid: 'Baignade déconseillée',
  forbidden: 'Baignade interdite',
  unknown: 'Baignade à confirmer',
}

export function ModuleWaterTest({ onNavigate }: Props) {
  const [values, setValues] = useState<Record<string, string>>({
    ph: '',
    freeChlorine: '',
    totalChlorine: '',
    combinedChlorine: '',
    alkalinity: '',
    calciumHardness: '',
    cyanuricAcid: '',
    salt: '',
    phosphates: '',
    temperature: '',
  })
  const [source, setSource] = useState<'manual' | 'strip_photo'>('manual')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<ActionPlanResult | null>(null)
  const [tests, setTests] = useState<WaterTestRow[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [stale, setStale] = useState(false)

  const isOnline = useOfflineStore((s) => s.isOnline)
  const queueAction = useOfflineStore((s) => s.queueAction)

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const { data, stale } = await offlineApi.waterTests()
      const d = data as { tests?: WaterTestRow[] } | null
      setTests(d?.tests || [])
      setStale(stale)
    } catch {
      setTests([])
      setStale(false)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  function update(key: string, val: string) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  async function submit() {
    const ph = Number(values.ph)
    if (isNaN(ph)) {
      toast({ title: 'pH requis', description: 'Entrez au moins la valeur du pH.', variant: 'destructive' })
      return
    }
    setSaving(true)
    setPlan(null)
    const body: Record<string, unknown> = { ph, source, note: note.trim() || undefined }
    for (const f of FIELDS) {
      if (f.key === 'ph') continue
      if (values[f.key] !== '') body[f.key] = values[f.key]
    }
    try {
      if (!isOnline) {
        queueAction({ method: 'POST', path: '/api/pool/water-test', body })
        toast({
          title: 'Mesure enregistrée',
          description: 'Sera synchronisée quand vous serez en ligne.',
        })
        // reset required fields, keep optionals
        setValues((v) => ({ ...v, ph: '' }))
        setNote('')
        return
      }
      const data = await api.post<{ actionPlan?: ActionPlanResult; error?: string }>(
        '/api/pool/water-test',
        body,
      )
      setPlan(data.actionPlan || null)
      toast({
        title: 'Mesure enregistrée',
        description: data.actionPlan
          ? "Plan d'action généré ci-dessous."
          : 'Aucun profil : configurez la piscine pour un plan.',
      })
      // reset required fields, keep optionals
      setValues((v) => ({ ...v, ph: '' }))
      setNote('')
      loadHistory()
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Échec de la sauvegarde',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function removeTest(id: string) {
    try {
      if (!isOnline) {
        queueAction({ method: 'DELETE', path: `/api/pool/water-test?id=${id}` })
        setTests((t) => t.filter((x) => x.id !== id))
        toast({
          title: 'Suppression enregistrée',
          description: 'Sera synchronisée quand vous serez en ligne.',
        })
        return
      }
      await api.delete(`/api/pool/water-test?id=${id}`)
      setTests((t) => t.filter((x) => x.id !== id))
      toast({ title: 'Mesure supprimée' })
    } catch {
      toast({ title: 'Erreur', description: 'Suppression impossible', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="section-label">Analyse d'eau</span>
          <span className="h-px w-8 bg-gold/40" />
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Entrer une mesure d'eau
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Saisissez les valeurs de votre test (pH obligatoire). Le plan d'action est généré
          automatiquement à l'enregistrement.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Form */}
        <Card className="glass-card lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <FlaskConical className="h-4 w-4 text-primary" />
              Mesure
            </CardTitle>
            <CardDescription className="text-xs">
              pH requis. Les autres paramètres sont optionnels mais améliorent la précision.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Source toggle */}
            <div className="flex gap-2">
              {[
                { v: 'manual' as const, label: 'Saisie manuelle' },
                { v: 'strip_photo' as const, label: 'Bandelette photo' },
              ].map((s) => (
                <button
                  key={s.v}
                  onClick={() => setSource(s.v)}
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    source === s.v
                      ? 'border-gold/60 bg-gold/10 text-gold shadow-sm'
                      : 'border-border bg-background hover:border-gold/30'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {FIELDS.map((f) => {
                const target = TARGETS[f.key]
                const val = values[f.key] ? Number(values[f.key]) : NaN
                const status = !isNaN(val) ? evaluateParam(f.key, val) : 'unknown'
                return (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={f.key} className="flex items-center justify-between text-xs">
                      <span className="font-medium">
                        {f.label}
                        {f.required && <span className="ml-0.5 text-destructive">*</span>}
                      </span>
                      {target && (
                        <span className="text-[9px] text-muted-foreground">
                          {target.idealLow}–{target.idealHigh}
                          {target.unit && ` ${target.unit}`}
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id={f.key}
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={values[f.key]}
                        onChange={(e) => update(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className={`pr-7 ${f.required && !values[f.key] ? 'border-gold/40' : ''}`}
                      />
                      {values[f.key] && (
                        <span
                          className={`absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${statusDot(status)}`}
                          title={status}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-1">
              <Label htmlFor="note" className="text-xs">Note (optionnel)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex : test après orage, eau un peu trouble…"
                className="min-h-[60px] resize-none"
              />
            </div>

            <Button
              onClick={submit}
              disabled={saving || !values.ph}
              className="w-full bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement & génération du plan…
                </>
              ) : (
                <>
                  <Droplets className="h-4 w-4" />
                  Enregistrer & générer le plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Side: ideal ranges */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Plages idéales</CardTitle>
            <CardDescription className="text-xs">
              Référence pour vos mesures (mode propriétaire AQWELIA).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(TARGETS).map(([key, t]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-1.5 text-xs"
              >
                <span className="font-medium">{t.label}</span>
                <span className="font-mono text-gold">
                  {t.idealLow}–{t.idealHigh}
                  <span className="ml-1 text-[10px] text-muted-foreground">{t.unit}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Generated plan */}
      {plan && (
        <Card className="glass-card border-gold/30">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Sparkles className="h-5 w-5 text-gold" />
                Plan d'action généré
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={SEVERITY_CONFIG[plan.severity]?.cls || ''}>
                  {SEVERITY_CONFIG[plan.severity]?.label || plan.severity}
                </Badge>
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                  {SWIM_LABEL[plan.swimSafety] || plan.swimSafety}
                </Badge>
              </div>
            </div>
            <CardDescription className="text-sm leading-relaxed text-foreground/80">
              {plan.diagnosis}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Immediate actions */}
            {plan.immediateActions.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
                  <ListChecks className="h-3.5 w-3.5" />
                  À faire — dans cet ordre
                </p>
                <ol className="space-y-2">
                  {plan.immediateActions.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/60 p-2.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-xs font-bold text-primary-foreground">
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
              </div>
            )}

            {/* Chemical dosages */}
            {plan.chemicalDosages.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <Droplets className="h-3.5 w-3.5" />
                  Dosages recommandés
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {plan.chemicalDosages.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border/50 bg-background/60 p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">{d.param}</p>
                          <p className="font-display text-sm font-semibold">{d.product}</p>
                        </div>
                        <p className="font-display text-lg font-bold text-gold">{d.quantity}</p>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">{d.method}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Filtr. {d.filtrationHours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          Re-test {d.retestInHours}h
                        </span>
                        {d.estimatedCost && d.estimatedCost !== '—' && (
                          <span className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            {d.estimatedCost}
                          </span>
                        )}
                      </div>
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
              </div>
            )}

            {/* Do not do */}
            {plan.doNotDo.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-destructive">
                  <ShieldX className="h-3.5 w-3.5" />
                  À ne pas faire
                </p>
                <ul className="space-y-1 text-xs text-destructive/90">
                  {plan.doNotDo.slice(0, 6).map((d, i) => (
                    <li key={i}>• {d}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer info */}
            <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Re-test dans {Math.round(plan.retestInHours)}h
              </span>
              <span className="flex items-center gap-1">
                <Euro className="h-3 w-3" />
                Coût total : {plan.estimatedCost}
              </span>
              <Button size="sm" variant="outline" onClick={() => onNavigate('plan')}>
                Voir le plan complet
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            {plan.whenToCallProfessional && (
              <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                <p className="text-foreground/80">
                  <strong className="text-gold">Conseil pro :</strong> {plan.whenToCallProfessional}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Clock className="h-4 w-4 text-primary" />
            Mesures récentes
            {stale && (
              <span className="text-[10px] font-normal italic text-muted-foreground">
                données en cache
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : tests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <FlaskConical className="h-8 w-8 text-muted-foreground/40" />
              Aucune mesure. Saisissez votre premier test ci-dessus.
            </div>
          ) : (
            <div className="custom-scroll max-h-96 space-y-2 overflow-y-auto pr-1">
              {tests.map((t) => {
                const st = STATUS_BADGE[t.status] || STATUS_BADGE.ok
                return (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-background/60 p-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="font-display text-lg font-bold">{t.ph.toFixed(2)}</span>
                      <span className="text-[10px] text-muted-foreground">pH</span>
                    </div>
                    <div className="flex flex-1 flex-wrap gap-3 text-xs">
                      {[
                        { l: 'Cl', v: t.freeChlorine },
                        { l: 'TAC', v: t.alkalinity },
                        { l: 'TH', v: t.calciumHardness },
                        { l: 'CYA', v: t.cyanuricAcid },
                        { l: 'Sel', v: t.salt },
                      ].map(
                        (m) =>
                          m.v != null && (
                            <span key={m.l} className="text-muted-foreground">
                              {m.l} <span className="font-semibold text-foreground">{m.v}</span>
                            </span>
                          )
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={st.cls}>
                        {st.label}
                      </Badge>
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                        {t.clearWaterIndex}/100
                      </span>
                      <button
                        onClick={() => removeTest(t.id)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating helper */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-[oklch(0.7_0.15_155)]" />
        Astuce : mesurez le pH en premier, puis chlore, TAC et CYA. Le plan d'action s'adapte
        automatiquement.
      </div>
    </div>
  )
}
