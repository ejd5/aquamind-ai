'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  Camera,
  RefreshCw,
  PartyPopper,
  ListChecks,
  Upload,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

interface DiagnosticResult {
  imageType?: string
  detectedIssues?: string[]
  probableIssues?: string[]
  confidence?: number
  userFriendlySummary?: string
  recommendedNextStep?: string
  safetyWarnings?: string[]
  missingData?: string[]
  _raw?: boolean
}

interface ActionStep {
  id: string
  title: string
  description: string
  estimatedTime: string
  urgency: 'critical' | 'important' | 'moderate' | 'low'
  done: boolean
}

interface DiagnosticActionPlanProps {
  diagnostic: DiagnosticResult
  onRecheck?: (newImage: string) => Promise<DiagnosticResult | null>
}

// Generate action steps based on detected issues
function generateSteps(diagnostic: DiagnosticResult): ActionStep[] {
  const issues = diagnostic.detectedIssues || []
  const summary = (diagnostic.userFriendlySummary || '').toLowerCase()
  const probableIssues = diagnostic.probableIssues || []
  const allText = [
    ...issues,
    summary,
    ...probableIssues,
  ].join(' ').toLowerCase()

  const steps: ActionStep[] = []

  const hasGreenWater =
    issues.some((i) => i.toLowerCase().includes('vert')) ||
    summary.includes('vert') ||
    allText.includes('eau verte')
  const hasAlgae =
    issues.some((i) => i.toLowerCase().includes('alg')) ||
    summary.includes('alg') ||
    allText.includes('algue')
  const hasCloudy =
    issues.some((i) => i.toLowerCase().includes('trouble')) ||
    summary.includes('trouble') ||
    allText.includes('eau trouble')
  const hasParticles = allText.includes('particul') || allText.includes('dépôt')

  if (hasGreenWater || hasAlgae) {
    steps.push(
      {
        id: 'ph-adjust',
        title: '1. Ajuster le pH',
        description:
          "Mesurez le pH et ajustez-le entre 7.0 et 7.4 avec du pH- ou pH+. Le pH doit être correct avant tout traitement.",
        estimatedTime: '15 min',
        urgency: 'critical',
        done: false,
      },
      {
        id: 'chlorine-shock',
        title: '2. Faire un traitement choc',
        description:
          "Ajoutez du chlore choc (ou brome choc) selon le volume de votre piscine. Dosage : voir l'étiquette du produit.",
        estimatedTime: '10 min',
        urgency: 'critical',
        done: false,
      },
      {
        id: 'anti-algae',
        title: '3. Ajouter un anti-algues',
        description:
          'Verser un traitement anti-algues préventif pour éliminer les algues restantes.',
        estimatedTime: '5 min',
        urgency: 'important',
        done: false,
      },
      {
        id: 'brush-walls',
        title: '4. Brosser les parois',
        description:
          'Brossez les parois et le fond de la piscine pour décoller les algues incrustées.',
        estimatedTime: '20 min',
        urgency: 'important',
        done: false,
      },
      {
        id: 'filtration-24h',
        title: '5. Laisser filtrer 24h',
        description:
          "Laissez la filtration tourner en continu pendant 24h minimum pour éliminer les algues et particules.",
        estimatedTime: '24h',
        urgency: 'critical',
        done: false,
      },
      {
        id: 'retest',
        title: "6. Re-tester l'eau",
        description:
          'Après 24h de filtration, faites un nouveau test d\'eau complet (pH, chlore, TAC).',
        estimatedTime: '5 min',
        urgency: 'important',
        done: false,
      },
    )
  } else if (hasCloudy || hasParticles) {
    steps.push(
      {
        id: 'check-filter',
        title: '1. Vérifier la filtration',
        description:
          "Nettoyez le filtre (backwash si sable, rincez si cartouche). Vérifiez la pression du manomètre.",
        estimatedTime: '15 min',
        urgency: 'important',
        done: false,
      },
      {
        id: 'flocculant',
        title: '2. Ajouter un floculant',
        description:
          'Verser un floculant pour agglomérer les particules fines et les envoyer vers le filtre.',
        estimatedTime: '5 min',
        urgency: 'moderate',
        done: false,
      },
      {
        id: 'filtration-12h',
        title: '3. Filtration continue 12h',
        description: "Laissez la filtration tourner 12h pour clarifier l'eau.",
        estimatedTime: '12h',
        urgency: 'important',
        done: false,
      },
      {
        id: 'retest-cloudy',
        title: "4. Re-tester l'eau",
        description: 'Après 12h, testez le pH et le chlore. Ajustez si nécessaire.',
        estimatedTime: '5 min',
        urgency: 'moderate',
        done: false,
      },
    )
  } else {
    // Generic steps based on recommendedNextStep
    steps.push({
      id: 'follow-reco',
      title: '1. Suivre la recommandation',
      description:
        diagnostic.recommendedNextStep ||
        "Suivez les recommandations de l'IA ci-dessus.",
      estimatedTime: '30 min',
      urgency: 'important',
      done: false,
    })
    steps.push({
      id: 'recheck-generic',
      title: '2. Vérifier le résultat',
      description:
        "Après avoir appliqué les recommandations, prenez une nouvelle photo pour vérifier.",
      estimatedTime: '24h',
      urgency: 'moderate',
      done: false,
    })
  }

  return steps
}

const URGENCY_CONFIG = {
  critical: {
    label: 'Urgent',
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    icon: AlertTriangle,
  },
  important: {
    label: 'Important',
    color: 'text-orange-600 dark:text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: Clock,
  },
  moderate: {
    label: 'À surveiller',
    color: 'text-yellow-600 dark:text-yellow-300',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: Clock,
  },
  low: {
    label: 'OK',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
} as const

export function DiagnosticActionPlan({
  diagnostic,
  onRecheck,
}: DiagnosticActionPlanProps) {
  const [steps, setSteps] = useState<ActionStep[]>([])
  const [showRecheck, setShowRecheck] = useState(false)
  const [recheckImage, setRecheckImage] = useState<string | null>(null)
  const [rechecking, setRechecking] = useState(false)
  const [resolved, setResolved] = useState(false)
  const [recheckResult, setRecheckResult] = useState<DiagnosticResult | null>(
    null,
  )

  useEffect(() => {
    setSteps(generateSteps(diagnostic))
    setResolved(false)
    setShowRecheck(false)
    setRecheckImage(null)
    setRecheckResult(null)
  }, [diagnostic])

  const completedCount = useMemo(
    () => steps.filter((s) => s.done).length,
    [steps],
  )
  const progress =
    steps.length > 0 ? (completedCount / steps.length) * 100 : 0
  const allDone = completedCount === steps.length && steps.length > 0

  // Determine overall urgency
  const overallUrgency: keyof typeof URGENCY_CONFIG = steps.some(
    (s) => s.urgency === 'critical',
  )
    ? 'critical'
    : steps.some((s) => s.urgency === 'important')
      ? 'important'
      : steps.some((s) => s.urgency === 'moderate')
        ? 'moderate'
        : 'low'

  const urgencyCfg = URGENCY_CONFIG[overallUrgency]
  const UrgencyIcon = urgencyCfg.icon

  function toggleStep(id: string) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    )
  }

  async function handleRecheck() {
    if (!recheckImage || !onRecheck) return
    setRechecking(true)
    try {
      const result = await onRecheck(recheckImage)
      setRecheckResult(result)
      // Check if resolved — if no critical issues detected
      const issues = result?.detectedIssues || []
      const stillBad = issues.some(
        (i) =>
          i.toLowerCase().includes('vert') ||
          i.toLowerCase().includes('alg') ||
          i.toLowerCase().includes('trouble'),
      )
      if (!stillBad && (result?.confidence || 0) > 0.5) {
        setResolved(true)
        toast({
          title: 'Problème résolu !',
          description: '✅ Votre piscine est maintenant saine.',
        })
      } else {
        toast({
          title: 'Pas encore résolu',
          description: 'Continuez le traitement et re-vérifiez plus tard.',
        })
      }
    } catch {
      toast({
        title: 'Erreur',
        description: 'Analyse impossible',
        variant: 'destructive',
      })
    } finally {
      setRechecking(false)
    }
  }

  // === RESOLVED STATE ===
  if (resolved) {
    return (
      <Card className="glass-card border-emerald-500/40">
        <CardContent className="p-6 text-center">
          <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <PartyPopper className="h-8 w-8 text-emerald-600" />
            {/* Confetti effect — simple emoji burst */}
            <span className="pointer-events-none absolute -top-2 -left-1 animate-pulse text-base">🎉</span>
            <span className="pointer-events-none absolute -top-3 right-0 animate-pulse text-sm">✨</span>
            <span className="pointer-events-none absolute bottom-0 -left-2 animate-pulse text-sm">🎊</span>
            <span className="pointer-events-none absolute bottom-0 -right-2 animate-pulse text-base">🎉</span>
          </div>
          <h3 className="font-display text-xl font-bold text-emerald-700 dark:text-emerald-400">
            ✅ Résolu avec AQWELIA
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre piscine est maintenant saine. L&apos;analyse de contrôle confirme que le
            problème est résolu.
          </p>
          {recheckResult?.userFriendlySummary && (
            <p className="mt-3 rounded-lg bg-emerald-500/5 p-3 text-xs text-foreground/70">
              {recheckResult.userFriendlySummary}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // === ACTION PLAN ===
  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ListChecks className="h-4 w-4 text-gold" />
            Plan d&apos;action
          </CardTitle>
          <Badge
            className={`${urgencyCfg.bg} ${urgencyCfg.color} ${urgencyCfg.border} border`}
          >
            <UrgencyIcon className="mr-1 h-3 w-3" />
            {urgencyCfg.label}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-semibold">
              {completedCount}/{steps.length} étapes
            </span>
          </div>
          <Progress
            value={progress}
            className="h-2 bg-muted"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {steps.map((step) => {
          const cfg = URGENCY_CONFIG[step.urgency]
          const StepIcon = step.done ? CheckCircle2 : Circle
          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
                step.done
                  ? 'border-emerald-500/30 bg-emerald-500/5 opacity-60'
                  : `${cfg.bg} ${cfg.border}`
              }`}
            >
              <button
                onClick={() => toggleStep(step.id)}
                className="mt-0.5 shrink-0"
                aria-label={
                  step.done ? 'Marquer comme non fait' : 'Marquer comme fait'
                }
              >
                <StepIcon
                  className={`h-5 w-5 ${step.done ? 'text-emerald-600' : cfg.color}`}
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm font-semibold ${step.done ? 'line-through' : ''}`}
                  >
                    {step.title}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.description}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                  <span className={`flex items-center gap-1 ${cfg.color}`}>
                    <Clock className="h-3 w-3" />
                    {step.estimatedTime}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className={cfg.color}>{cfg.label}</span>
                </div>
              </div>
              {!step.done && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-emerald-500/30 text-xs text-emerald-600 hover:bg-emerald-500/10"
                  onClick={() => toggleStep(step.id)}
                >
                  Valider
                </Button>
              )}
            </div>
          )
        })}

        {/* Reminder if not all done after some time */}
        {!allDone && completedCount > 0 && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 text-xs text-orange-700 dark:text-orange-300">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              Rappel
            </p>
            <p className="mt-1">
              Il vous reste {steps.length - completedCount} étape(s) à compléter.
              Suivez le plan pour résoudre le problème rapidement.
            </p>
          </div>
        )}

        {/* Re-check button when all steps done */}
        {allDone && !showRecheck && (
          <Button
            onClick={() => setShowRecheck(true)}
            className="w-full gap-2 bg-gradient-to-r from-primary to-ocean-light text-primary-foreground"
          >
            <Camera className="h-4 w-4" />
            Vérifier le résultat (nouvelle photo)
          </Button>
        )}

        {/* Re-check photo upload */}
        {showRecheck && !resolved && (
          <div className="space-y-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gold">
              <Camera className="h-4 w-4" />
              Prenez une nouvelle photo pour vérifier
            </p>
            {recheckImage ? (
              <div className="relative">
                <img
                  src={recheckImage}
                  alt="Nouvelle photo"
                  className="max-h-48 w-full rounded-lg object-cover"
                />
                <button
                  onClick={() => setRecheckImage(null)}
                  className="absolute right-2 top-2 rounded-full bg-background/80 px-2.5 py-1 text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gold/30 bg-gold/5 px-4 py-6 text-center">
                <Upload className="h-6 w-6 text-gold" />
                <span className="text-xs font-medium">
                  Cliquez pour charger une photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      const reader = new FileReader()
                      reader.onload = () =>
                        setRecheckImage(reader.result as string)
                      reader.readAsDataURL(f)
                    }
                  }}
                />
              </label>
            )}
            {recheckImage && (
              <Button
                onClick={handleRecheck}
                disabled={rechecking}
                className="w-full gap-2 bg-gradient-to-r from-primary to-gold text-primary-foreground"
              >
                {rechecking ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {rechecking ? 'Analyse en cours...' : 'Analyser et vérifier'}
              </Button>
            )}
            {recheckResult && !resolved && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-2 text-xs">
                <p className="font-semibold text-orange-700 dark:text-orange-300">
                  Pas encore résolu
                </p>
                <p className="mt-1 text-muted-foreground">
                  {recheckResult.userFriendlySummary}
                </p>
                <p className="mt-1 text-[10px]">
                  Continuez le traitement et re-vérifiez dans quelques heures.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
