'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  FlaskConical,
  Droplets,
  Brush,
  Wind,
  Save,
  ChevronDown,
  ChevronUp,
  History,
  Info,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { api, ApiError } from '@/lib/api-client'
import { useTranslations } from 'next-intl'

// Type alias for the translation function returned by useTranslations.
type TFunc = ReturnType<typeof useTranslations>

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

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

interface InputField {
  /** matches a WaterTest column: ph, freeChlorine, alkalinity, temperature, ... */
  name: string
  label: string
  unit?: string
  placeholder?: string
  required?: boolean
  step?: string
  min?: number
  max?: number
}

interface ActionStep {
  id: string
  title: string
  /** Short intro line shown before instructions */
  intro: string
  /** Numbered detailed instructions — minimum 4-5 lines */
  instructions: string[]
  /** Product to use, e.g. "pH-" | "chlore choc" | "anti-algues" */
  productType?: string
  /** Dynamic dosage text — uses pool volume */
  dosageText?: (poolVolume: number) => string
  /** How long to wait before the next step, e.g. "2h", "24h", "0" */
  waitTime: string
  /** Optional fields to fill when validating the step */
  inputFields?: InputField[]
  urgency: 'critical' | 'important' | 'moderate' | 'low'
  done: boolean
  /** Values entered by user when validating */
  recordedValues?: Record<string, number>
  /** Previous WaterTest values (for before/after display) */
  previousValues?: Record<string, number>
}

interface DiagnosticActionPlanProps {
  diagnostic: DiagnosticResult
  activePoolId?: string | null
  onRecheck?: (newImage: string) => Promise<DiagnosticResult | null>
}

interface WaterTestRow {
  ph: number
  freeChlorine?: number | null
  totalChlorine?: number | null
  combinedChlorine?: number | null
  alkalinity?: number | null
  calciumHardness?: number | null
  cyanuricAcid?: number | null
  salt?: number | null
  bromine?: number | null
  phosphates?: number | null
  temperature?: number | null
  [key: string]: number | null | undefined
}

// ───────────────────────────────────────────────────────────────────────────
// Dosage helpers — user-friendly approximations for the action plan.
// These are pedagogical ballparks, NOT a substitute for the product label.
// (Deterministic precise engine lives in src/lib/pool/dosing-engine.ts)
// ───────────────────────────────────────────────────────────────────────────

function fmtQty(n: number, unit: 'g' | 'mL' | 'L'): string {
  if (unit === 'L') return `${(n / 1000).toFixed(2)} L`
  if (n >= 1000) return `${(n / 1000).toFixed(2)} kg`
  return `${Math.round(n)} ${unit}`
}

/** pH- (poudre) : ~10 g/m³ pour abaisser de 0.1 unité */
function phMinusGramsPer01(poolVolume: number): number {
  return Math.round(poolVolume * 10)
}
/** pH+ (carbonate) : ~15 g/m³ pour remonter de 0.1 unité */
function phPlusGramsPer01(poolVolume: number): number {
  return Math.round(poolVolume * 15)
}
/** Chlore choc curatif : ~10 g/m³ */
function chlorineShockGrams(poolVolume: number): number {
  return Math.round(poolVolume * 10)
}
/** Anti-algues curatif : ~20 mL/m³ */
function antiAlgaeMl(poolVolume: number): number {
  return Math.round(poolVolume * 20)
}
/** Floculant : ~5 mL/m³ */
function flocculantMl(poolVolume: number): number {
  return Math.round(poolVolume * 5)
}

/**
 * Compute a precise dosage recommendation for the user's measured pH.
 * Uses the deterministic engine from src/lib/pool/dosing-engine.ts.
 * Returns null if pH is already in the ideal range.
 */
function computePhRecommendation(
  ph: number,
  poolVolume: number,
  t: TFunc,
): {
  product: string
  quantity: number
  unit: 'g' | 'mL' | 'L'
  message: string
  warning?: string
} | null {
  const IDEAL_LOW = 7.0
  const IDEAL_HIGH = 7.4

  if (ph >= IDEAL_LOW && ph <= IDEAL_HIGH) {
    return {
      product: '—',
      quantity: 0,
      unit: 'g',
      message: t('phIdeal'),
    }
  }

  if (ph > IDEAL_HIGH) {
    // pH too high → pH-
    const drop = Math.min(ph - IDEAL_HIGH, 0.3) // safe delta cap
    const grams = (drop / 0.1) * phMinusGramsPer01(poolVolume)
    return {
      product: t('productPhMinus'),
      quantity: grams,
      unit: 'g',
      message: t('phHigh', {
        ph: ph.toFixed(2),
        qty: fmtQty(grams, 'g'),
        delta: drop.toFixed(1),
      }),
      warning: t('phHighWarning'),
    }
  }

  // pH too low → pH+
  const rise = Math.min(IDEAL_LOW - ph, 0.3)
  const grams = (rise / 0.1) * phPlusGramsPer01(poolVolume)
  return {
    product: t('productPhPlus'),
    quantity: grams,
    unit: 'g',
    message: t('phLow', {
      ph: ph.toFixed(2),
      qty: fmtQty(grams, 'g'),
      delta: rise.toFixed(1),
    }),
    warning: t('phLowWarning'),
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Step generation
// ───────────────────────────────────────────────────────────────────────────

function generateSteps(diagnostic: DiagnosticResult, poolVolume: number, t: TFunc): ActionStep[] {
  const issues = diagnostic.detectedIssues || []
  const summary = (diagnostic.userFriendlySummary || '').toLowerCase()
  const probableIssues = diagnostic.probableIssues || []
  const allText = [...issues, summary, ...probableIssues].join(' ').toLowerCase()

  // Multilingual detection patterns (fr/en/es/de/it/pt/nl) — AI may generate
  // text in any locale, so we match all supported language variants.
  const GREEN_WATER_PATTERNS = [
    'eau verte', 'green water', 'agua verde', 'água verde',
    'grünes wasser', 'gruenes wasser', 'acqua verde', 'groen water',
  ]
  const CLOUDY_WATER_PATTERNS = [
    'eau trouble', 'cloudy', 'agua turbia', 'água turva',
    'trübes wasser', 'truebes wasser', 'acqua torbida', 'troebel water',
  ]
  const DEPOSIT_PATTERNS = [
    'particul', 'dépôt', 'depot', 'deposit',
    'depósito', 'deposito', 'ablagerung', 'afzetting',
  ]

  const hasGreenWater =
    issues.some((i) => i.toLowerCase().includes('vert')) ||
    summary.includes('vert') ||
    GREEN_WATER_PATTERNS.some((p) => allText.includes(p))
  const hasAlgae =
    issues.some((i) => i.toLowerCase().includes('alg')) ||
    summary.includes('alg') ||
    allText.includes('algue')
  const hasCloudy =
    issues.some((i) => i.toLowerCase().includes('trouble')) ||
    summary.includes('trouble') ||
    CLOUDY_WATER_PATTERNS.some((p) => allText.includes(p))
  const hasParticles = DEPOSIT_PATTERNS.some((p) => allText.includes(p))

  const phField: InputField = {
    name: 'ph',
    label: t('fieldPhLabel'),
    unit: '',
    placeholder: '7.2',
    required: true,
    step: '0.01',
    min: 6,
    max: 9,
  }
  const chlorineField: InputField = {
    name: 'freeChlorine',
    label: t('fieldChlorineLabel'),
    unit: 'mg/L',
    placeholder: '2.0',
    step: '0.1',
    min: 0,
    max: 20,
  }
  const tacField: InputField = {
    name: 'alkalinity',
    label: t('fieldTacLabel'),
    unit: 'mg/L',
    placeholder: '100',
    step: '1',
    min: 0,
    max: 300,
  }

  if (hasGreenWater || hasAlgae) {
    return [
      {
        id: 'ph-adjust',
        title: t('greenS1Title'),
        intro: t('greenS1Intro'),
        instructions: [
          t('greenS1I1'),
          t('greenS1I2'),
          t('greenS1I3'),
          t('greenS1I4'),
          t('greenS1I5', { qty: phMinusGramsPer01(poolVolume), volume: poolVolume }),
          t('greenS1I6'),
          t('greenS1I7'),
          t('greenS1I8'),
        ],
        productType: t('greenS1Product'),
        dosageText: (v) =>
          t('greenS1Dosage', { qty: phMinusGramsPer01(v), volume: v }),
        waitTime: '2h',
        inputFields: [phField],
        urgency: 'critical',
        done: false,
      },
      {
        id: 'ph-retest',
        title: t('greenS2Title'),
        intro: t('greenS2Intro'),
        instructions: [
          t('greenS2I1'),
          t('greenS2I2'),
          t('greenS2I3'),
          t('greenS2I4'),
          t('greenS2I5'),
        ],
        productType: t('greenS2Product'),
        dosageText: (v) =>
          t('greenS2Dosage', { qty: Math.round(phMinusGramsPer01(v) / 2), volume: v }),
        waitTime: '0',
        inputFields: [phField],
        urgency: 'critical',
        done: false,
      },
      {
        id: 'chlorine-shock',
        title: t('greenS3Title'),
        intro: t('greenS3Intro'),
        instructions: [
          t('greenS3I1'),
          t('greenS3I2'),
          t('greenS3I3', {
            volume: poolVolume,
            qty: chlorineShockGrams(poolVolume),
            tablets: (chlorineShockGrams(poolVolume) / 20).toFixed(0),
          }),
          t('greenS3I4'),
          t('greenS3I5'),
          t('greenS3I6'),
          t('greenS3I7'),
        ],
        productType: t('greenS3Product'),
        dosageText: (v) => t('greenS3Dosage', { qty: chlorineShockGrams(v), volume: v }),
        waitTime: '8h',
        inputFields: [{ ...chlorineField, required: false }],
        urgency: 'critical',
        done: false,
      },
      {
        id: 'anti-algae',
        title: t('greenS4Title'),
        intro: t('greenS4Intro'),
        instructions: [
          t('greenS4I1'),
          t('greenS4I2'),
          t('greenS4I3', {
            volume: poolVolume,
            qty: antiAlgaeMl(poolVolume),
            liters: (antiAlgaeMl(poolVolume) / 1000).toFixed(2),
          }),
          t('greenS4I4'),
          t('greenS4I5'),
        ],
        productType: t('greenS4Product'),
        dosageText: (v) => t('greenS4Dosage', { qty: antiAlgaeMl(v), volume: v }),
        waitTime: '2h',
        urgency: 'important',
        done: false,
      },
      {
        id: 'brush-walls',
        title: t('greenS5Title'),
        intro: t('greenS5Intro'),
        instructions: [
          t('greenS5I1'),
          t('greenS5I2'),
          t('greenS5I3'),
          t('greenS5I4'),
          t('greenS5I5'),
          t('greenS5I6'),
        ],
        waitTime: '0',
        urgency: 'important',
        done: false,
      },
      {
        id: 'filtration-24h',
        title: t('greenS6Title'),
        intro: t('greenS6Intro'),
        instructions: [
          t('greenS6I1'),
          t('greenS6I2'),
          t('greenS6I3'),
          t('greenS6I4'),
          t('greenS6I5'),
          t('greenS6I6'),
        ],
        waitTime: '24h',
        urgency: 'critical',
        done: false,
      },
      {
        id: 'retest-full',
        title: t('greenS7Title'),
        intro: t('greenS7Intro'),
        instructions: [
          t('greenS7I1'),
          t('greenS7I2'),
          t('greenS7I3'),
          t('greenS7I4'),
          t('greenS7I5'),
          t('greenS7I6'),
        ],
        waitTime: '0',
        inputFields: [phField, chlorineField, tacField],
        urgency: 'important',
        done: false,
      },
    ]
  }

  if (hasCloudy || hasParticles) {
    return [
      {
        id: 'check-filter',
        title: t('cloudyS1Title'),
        intro: t('cloudyS1Intro'),
        instructions: [
          t('cloudyS1I1'),
          t('cloudyS1I2'),
          t('cloudyS1I3'),
          t('cloudyS1I4'),
          t('cloudyS1I5'),
          t('cloudyS1I6'),
        ],
        waitTime: '0',
        urgency: 'important',
        done: false,
      },
      {
        id: 'ph-adjust-cloudy',
        title: t('cloudyS2Title'),
        intro: t('cloudyS2Intro'),
        instructions: [
          t('cloudyS2I1'),
          t('cloudyS2I2'),
          t('cloudyS2I3', { qty: phMinusGramsPer01(poolVolume), volume: poolVolume }),
          t('cloudyS2I4'),
          t('cloudyS2I5'),
        ],
        productType: t('cloudyS2Product'),
        dosageText: (v) => t('cloudyS2Dosage', { qty: phMinusGramsPer01(v), volume: v }),
        waitTime: '2h',
        inputFields: [phField],
        urgency: 'critical',
        done: false,
      },
      {
        id: 'flocculant',
        title: t('cloudyS3Title'),
        intro: t('cloudyS3Intro'),
        instructions: [
          t('cloudyS3I1'),
          t('cloudyS3I2'),
          t('cloudyS3I3', { volume: poolVolume, qty: flocculantMl(poolVolume) }),
          t('cloudyS3I4'),
          t('cloudyS3I5'),
          t('cloudyS3I6'),
        ],
        productType: t('cloudyS3Product'),
        dosageText: (v) => t('cloudyS3Dosage', { qty: flocculantMl(v), volume: v }),
        waitTime: '12h',
        urgency: 'moderate',
        done: false,
      },
      {
        id: 'filtration-12h',
        title: t('cloudyS4Title'),
        intro: t('cloudyS4Intro'),
        instructions: [
          t('cloudyS4I1'),
          t('cloudyS4I2'),
          t('cloudyS4I3'),
          t('cloudyS4I4'),
        ],
        waitTime: '12h',
        urgency: 'important',
        done: false,
      },
      {
        id: 'retest-cloudy',
        title: t('cloudyS5Title'),
        intro: t('cloudyS5Intro'),
        instructions: [
          t('cloudyS5I1'),
          t('cloudyS5I2'),
          t('cloudyS5I3'),
          t('cloudyS5I4'),
        ],
        waitTime: '0',
        inputFields: [phField, chlorineField],
        urgency: 'moderate',
        done: false,
      },
    ]
  }

  // Generic fallback
  return [
    {
      id: 'follow-reco',
      title: t('genericTitle1'),
      intro: t('genericIntro1'),
      instructions: [
        diagnostic.recommendedNextStep || t('genericInstruction1Default'),
        t('genericInstruction2'),
        t('genericInstruction3'),
        t('genericInstruction4'),
        t('genericInstruction5'),
      ],
      productType: diagnostic.recommendedNextStep?.match(/pH|chlore|brome/i)
        ? t('genericProduct')
        : undefined,
      waitTime: '24h',
      inputFields: [phField],
      urgency: 'important',
      done: false,
    },
    {
      id: 'recheck-generic',
      title: t('genericTitle2'),
      intro: t('genericIntro2'),
      instructions: [
        t('genericInstruction2_1'),
        t('genericInstruction2_2'),
        t('genericInstruction2_3'),
        t('genericInstruction2_4'),
      ],
      waitTime: '24h',
      urgency: 'moderate',
      done: false,
    },
  ]
}

// ───────────────────────────────────────────────────────────────────────────
// Urgency config
// ───────────────────────────────────────────────────────────────────────────

const URGENCY_CONFIG = {
  critical: {
    labelKey: 'urgencyCritical',
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    icon: AlertTriangle,
  },
  important: {
    labelKey: 'urgencyImportant',
    color: 'text-orange-600 dark:text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: Clock,
  },
  moderate: {
    labelKey: 'urgencyModerate',
    color: 'text-yellow-600 dark:text-yellow-300',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: Clock,
  },
  low: {
    labelKey: 'urgencyLow',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
} as const

// ───────────────────────────────────────────────────────────────────────────
// Step icon mapping (visual hint by step theme)
// ───────────────────────────────────────────────────────────────────────────

function getStepIcon(stepId: string) {
  if (stepId.includes('ph')) return FlaskConical
  if (stepId.includes('chlorine')) return Droplets
  if (stepId.includes('algae')) return Droplets
  if (stepId.includes('brush')) return Brush
  if (stepId.includes('filtration')) return Wind
  if (stepId.includes('retest') || stepId.includes('recheck')) return RefreshCw
  if (stepId.includes('filter')) return Wind
  if (stepId.includes('flocculant')) return Droplets
  return ListChecks
}

// ───────────────────────────────────────────────────────────────────────────
// Satisfaction gauge + scoring
// ───────────────────────────────────────────────────────────────────────────

function SatisfactionGauge({
  score,
  label,
}: {
  score: number
  label: string
}) {
  // score: 0-100
  // 0-25: red (critical)
  // 26-50: orange (bad)
  // 51-75: yellow (moderate)
  // 76-100: green (good)
  const color =
    score <= 25
      ? 'bg-red-500'
      : score <= 50
        ? 'bg-orange-500'
        : score <= 75
          ? 'bg-yellow-500'
          : 'bg-emerald-500'
  const textColor =
    score <= 25
      ? 'text-red-600 dark:text-red-400'
      : score <= 50
        ? 'text-orange-600 dark:text-orange-400'
        : score <= 75
          ? 'text-yellow-600 dark:text-yellow-400'
          : 'text-emerald-600 dark:text-emerald-400'
  const emoji =
    score <= 25 ? '🔴' : score <= 50 ? '🟠' : score <= 75 ? '🟡' : '🟢'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {emoji} {label}
        </span>
        <span className={`text-2xl font-bold ${textColor}`}>{score}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

function calculateScore(diagnostic: DiagnosticResult): number {
  const issues = diagnostic.detectedIssues || []
  const summary = (diagnostic.userFriendlySummary || '').toLowerCase()
  const confidence = diagnostic.confidence || 0.5

  // Start at 100, subtract for each problem
  let score = 100

  // Critical issues
  if (summary.includes('vert') || issues.some((i) => i.toLowerCase().includes('vert')))
    score -= 40
  if (summary.includes('alg') || issues.some((i) => i.toLowerCase().includes('alg')))
    score -= 30
  if (
    summary.includes('trouble') ||
    issues.some((i) => i.toLowerCase().includes('trouble'))
  )
    score -= 25
  if (
    summary.includes('particul') ||
    issues.some((i) => i.toLowerCase().includes('particul'))
  )
    score -= 15
  if (
    summary.includes('fuite') ||
    issues.some((i) => i.toLowerCase().includes('fuite'))
  )
    score -= 20
  if (
    summary.includes('tartre') ||
    issues.some((i) => i.toLowerCase().includes('tartre'))
  )
    score -= 10

  // If no issues detected, high score
  if (issues.length === 0) score = Math.max(score, 85)

  // If summary mentions "sain", "clair", "propre", "bon"
  if (
    summary.includes('sain') ||
    summary.includes('clair') ||
    summary.includes('propre') ||
    summary.includes('bon')
  ) {
    score = Math.max(score, 80)
  }

  // Confidence boost: low confidence dampens the score slightly toward 60
  if (confidence < 0.4) {
    score = Math.round(score * 0.85)
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ───────────────────────────────────────────────────────────────────────────
// Complementary steps generator (used when re-check shows problem NOT resolved)
// ───────────────────────────────────────────────────────────────────────────

function generateComplementarySteps(
  current: DiagnosticResult,
  previous: DiagnosticResult,
  t: TFunc,
): { title: string; description: string; reason: string }[] {
  const currentIssues = (current.detectedIssues || []).map((i) =>
    i.toLowerCase(),
  )
  const prevIssues = (previous.detectedIssues || []).map((i) =>
    i.toLowerCase(),
  )
  const currentSummary = (current.userFriendlySummary || '').toLowerCase()
  const steps: { title: string; description: string; reason: string }[] = []

  const stillHasAlgae =
    currentIssues.some((i) => i.includes('alg') || i.includes('vert')) ||
    currentSummary.includes('alg') ||
    currentSummary.includes('vert')
  const stillCloudy =
    currentIssues.some(
      (i) => i.includes('trouble') || i.includes('particul'),
    ) ||
    currentSummary.includes('trouble') ||
    currentSummary.includes('particul')
  const hadAlgaeBefore = prevIssues.some(
    (i) => i.includes('alg') || i.includes('vert'),
  )
  const hadCloudyBefore = prevIssues.some(
    (i) => i.includes('trouble') || i.includes('particul'),
  )

  // New issues that appeared between the two diagnostics
  const newIssues = currentIssues.filter(
    (i) => !prevIssues.some((p) => p.includes(i) || i.includes(p)),
  )

  if (stillHasAlgae && hadAlgaeBefore) {
    steps.push({
      title: t('compAlgae1Title', { n: steps.length + 1 }),
      description: t('compAlgae1Desc'),
      reason: t('compAlgae1Reason'),
    })
    steps.push({
      title: t('compAlgae2Title', { n: steps.length + 1 }),
      description: t('compAlgae2Desc'),
      reason: t('compAlgae2Reason'),
    })
    steps.push({
      title: t('compAlgae3Title', { n: steps.length + 1 }),
      description: t('compAlgae3Desc'),
      reason: t('compAlgae3Reason'),
    })
  }

  if (stillCloudy && hadCloudyBefore) {
    steps.push({
      title: t('compCloudy1Title', { n: steps.length + 1 }),
      description: t('compCloudy1Desc'),
      reason: t('compCloudy1Reason'),
    })
    steps.push({
      title: t('compCloudy2Title', { n: steps.length + 1 }),
      description: t('compCloudy2Desc'),
      reason: t('compCloudy2Reason'),
    })
    steps.push({
      title: t('compCloudy3Title', { n: steps.length + 1 }),
      description: t('compCloudy3Desc'),
      reason: t('compCloudy3Reason'),
    })
  }

  // New issues that weren't there before
  if (newIssues.length > 0) {
    steps.push({
      title: t('compNewIssuesTitle', { n: steps.length + 1 }),
      description: t('compNewIssuesDesc', { issues: newIssues.join(', ') }),
      reason: t('compNewIssuesReason'),
    })
  }

  // If no specific issues but still not perfect
  if (steps.length === 0) {
    steps.push({
      title: t('compFallback1Title'),
      description: t('compFallback1Desc'),
      reason: t('compFallback1Reason'),
    })
    steps.push({
      title: t('compFallback2Title'),
      description: t('compFallback2Desc'),
      reason: t('compFallback2Reason'),
    })
  }

  return steps
}

function NewComplementarySteps({
  diagnostic,
  previousDiagnostic,
  t,
}: {
  diagnostic: DiagnosticResult
  previousDiagnostic: DiagnosticResult
  t: TFunc
}) {
  const steps = generateComplementarySteps(diagnostic, previousDiagnostic, t)

  return (
    <div className="mt-3 space-y-2">
      {steps.map((step, i) => (
        <div
          key={i}
          className="rounded-lg border border-primary/20 bg-background/60 p-3"
        >
          <p className="text-sm font-semibold">{step.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {step.description}
          </p>
          {step.reason && (
            <p className="mt-1 text-[11px] italic text-primary/70">
              💡 {step.reason}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────

export function DiagnosticActionPlan({
  diagnostic,
  activePoolId,
  onRecheck,
}: DiagnosticActionPlanProps) {
  const t = useTranslations('diagnosticActionPlan')
  const [steps, setSteps] = useState<ActionStep[]>([])
  const [poolVolume, setPoolVolume] = useState<number>(40)
  const [poolVolumeLoaded, setPoolVolumeLoaded] = useState(false)
  const [latestWaterTest, setLatestWaterTest] = useState<WaterTestRow | null>(
    null,
  )
  const [showRecheck, setShowRecheck] = useState(false)
  const [recheckImage, setRecheckImage] = useState<string | null>(null)
  const [rechecking, setRechecking] = useState(false)
  const [resolved, setResolved] = useState(false)
  const [recheckResult, setRecheckResult] = useState<DiagnosticResult | null>(
    null,
  )
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null)
  const [stepForms, setStepForms] = useState<
    Record<string, Record<string, string>>
  >({})
  const [submitting, setSubmitting] = useState<string | null>(null)

  // Fetch pool profile + latest water test on mount
  useEffect(() => {
    api
      .get<{ profile: { volume?: number } | null }>(
        `/api/pool/profile${activePoolId ? `?id=${encodeURIComponent(activePoolId)}` : ''}`,
      )
      .then((d) => {
        const v = d?.profile?.volume
        if (typeof v === 'number' && v > 0) setPoolVolume(v)
      })
      .catch(() => {
        /* keep default 40 m³ */
      })
      .finally(() => setPoolVolumeLoaded(true))

    api
      .get<{ tests: WaterTestRow[] }>(
        `/api/pool/water-test${activePoolId ? `?poolId=${encodeURIComponent(activePoolId)}` : ''}`,
      )
      .then((d) => {
        const latest = d?.tests?.[0]
        if (latest) setLatestWaterTest(latest)
      })
      .catch(() => {
        /* no tests yet — that's fine */
      })
  }, [activePoolId])

  // Regenerate steps when diagnostic or poolVolume changes
  useEffect(() => {
    if (!poolVolumeLoaded) return
    const newSteps = generateSteps(diagnostic, poolVolume, t)
    setSteps(newSteps)
    setResolved(false)
    setShowRecheck(false)
    setRecheckImage(null)
    setRecheckResult(null)
    setExpandedStepId(newSteps[0]?.id || null)
    setStepForms({})
  }, [diagnostic, poolVolume, poolVolumeLoaded, t])

  const completedCount = useMemo(
    () => steps.filter((s) => s.done).length,
    [steps],
  )
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0
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

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const markStepDone = useCallback((id: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: true } : s)),
    )
  }, [])

  const toggleStep = useCallback((id: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, done: !s.done, recordedValues: s.recordedValues } : s,
      ),
    )
  }, [])

  /**
   * Validate a step: POST the measured values to /api/pool/water-test,
   * then mark the step done with before/after values.
   */
  const validateStep = useCallback(
    async (step: ActionStep) => {
      if (!step.inputFields || step.inputFields.length === 0) {
        markStepDone(step.id)
        toast({
          title: t('toastStepValidated'),
          description: step.title,
        })
        return
      }

      // Collect form values
      const formVals = stepForms[step.id] || {}
      const payload: Record<string, number> = {}
      const recordedValues: Record<string, number> = {}
      let missingRequired = false

      for (const field of step.inputFields) {
        const raw = formVals[field.name]
        if (raw === undefined || raw === '') {
          if (field.required) missingRequired = true
          continue
        }
        const num = Number(raw)
        if (isNaN(num)) {
          if (field.required) missingRequired = true
          continue
        }
        payload[field.name] = num
        recordedValues[field.name] = num
      }

      if (missingRequired) {
        toast({
          title: t('toastMissingRequired'),
          description: t('toastMissingRequiredDesc'),
          variant: 'destructive',
        })
        return
      }

      // Nothing to record (all optional fields empty) — just mark done
      if (Object.keys(payload).length === 0) {
        markStepDone(step.id)
        setExpandedStepId(null)
        toast({
          title: t('toastStepValidatedNoMeasure'),
          description: step.title,
        })
        return
      }

      setSubmitting(step.id)
      try {
        // Build before/after
        const previousValues: Record<string, number> = {}
        if (latestWaterTest) {
          for (const key of Object.keys(payload)) {
            const prev = latestWaterTest[key]
            if (typeof prev === 'number') previousValues[key] = prev
          }
        }

        await api.post('/api/pool/water-test', {
          ...payload,
          ...(activePoolId ? { poolId: activePoolId } : {}),
          source: 'action_plan',
          note: JSON.stringify({ key: 'noteActionPlan', params: { title: step.title } }),
        })

        // Update local "latest" so subsequent steps show the new "before"
        setLatestWaterTest((prev) => {
          const merged: WaterTestRow = {
            ...(prev || {
              ph: 0,
              freeChlorine: null,
              totalChlorine: null,
              combinedChlorine: null,
              alkalinity: null,
              calciumHardness: null,
              cyanuricAcid: null,
              salt: null,
              bromine: null,
              phosphates: null,
              temperature: null,
            }),
          } as WaterTestRow
          for (const [k, v] of Object.entries(payload)) {
            ;(merged as Record<string, number>)[k] = v
          }
          return merged
        })

        setSteps((prev) =>
          prev.map((s) =>
            s.id === step.id
              ? {
                  ...s,
                  done: true,
                  recordedValues,
                  previousValues,
                }
              : s,
          ),
        )
        setExpandedStepId(null)
        toast({
          title: t('toastMeasureSaved'),
          description: t('toastMeasureSavedDesc', {
            measures: Object.entries(payload)
              .map(([k, v]) => `${k} = ${v}`)
              .join(', '),
          }),
        })
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : t('toastSaveFailed')
        toast({
          title: t('toastSaveFailedTitle'),
          description: msg,
          variant: 'destructive',
        })
      } finally {
        setSubmitting(null)
      }
    },
    [stepForms, latestWaterTest, markStepDone, activePoolId, t],
  )

  async function handleRecheck() {
    if (!recheckImage || !onRecheck) return
    setRechecking(true)
    try {
      const result = await onRecheck(recheckImage)
      setRecheckResult(result)
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
          title: t('toastRecheckResolvedTitle'),
          description: t('toastRecheckResolvedDesc'),
        })
      } else {
        toast({
          title: t('toastRecheckNotResolvedTitle'),
          description: t('toastRecheckNotResolvedDesc'),
        })
      }
    } catch {
      toast({
        title: t('toastRecheckErrorTitle'),
        description: t('toastRecheckErrorDesc'),
        variant: 'destructive',
      })
    } finally {
      setRechecking(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Resolved state
  // ─────────────────────────────────────────────────────────────────────────

  if (resolved) {
    return (
      <Card className="glass-card border-emerald-500/40">
        <CardContent className="p-6 text-center">
          <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <PartyPopper className="h-8 w-8 text-emerald-600" />
            <span className="pointer-events-none absolute -top-2 -left-1 animate-pulse text-base">🎉</span>
            <span className="pointer-events-none absolute -top-3 right-0 animate-pulse text-sm">✨</span>
            <span className="pointer-events-none absolute bottom-0 -left-2 animate-pulse text-sm">🎊</span>
            <span className="pointer-events-none absolute bottom-0 -right-2 animate-pulse text-base">🎉</span>
          </div>
          <h3 className="font-display text-xl font-bold text-emerald-700 dark:text-emerald-400">
            {t('resolvedTitle')}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('resolvedDesc')}
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

  // ─────────────────────────────────────────────────────────────────────────
  // Action plan
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ListChecks className="h-4 w-4 text-gold" />
            {t('title')}
          </CardTitle>
          <Badge
            className={`${urgencyCfg.bg} ${urgencyCfg.color} ${urgencyCfg.border} border`}
          >
            <UrgencyIcon className="mr-1 h-3 w-3" />
            {t(urgencyCfg.labelKey as any)}
          </Badge>
        </div>

        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3 text-primary" />
          {t('poolDetected')} <span className="font-semibold text-foreground">{poolVolume} m³</span>
          {t('poolDetectedSuffix')}
        </p>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('progress')}</span>
            <span className="font-semibold">
              {t('stepsCount', { done: completedCount, total: steps.length })}
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-muted" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Initial satisfaction gauge */}
        <div className="rounded-xl border border-border/50 bg-background/60 p-3">
          <SatisfactionGauge
            score={calculateScore(diagnostic)}
            label={t('poolState')}
          />
        </div>
        {steps.map((step) => {
          const cfg = URGENCY_CONFIG[step.urgency]
          const StepIcon = step.done ? CheckCircle2 : getStepIcon(step.id)
          const isExpanded = expandedStepId === step.id
          const formVals = stepForms[step.id] || {}
          const isSubmitting = submitting === step.id

          // Dynamic pH recommendation preview (only for steps with ph field)
          let phPreview: ReturnType<typeof computePhRecommendation> = null
          const phRaw = formVals.ph
          if (
            step.inputFields?.some((f) => f.name === 'ph') &&
            phRaw !== undefined &&
            phRaw !== ''
          ) {
            const phNum = Number(phRaw)
            if (!isNaN(phNum)) {
              phPreview = computePhRecommendation(phNum, poolVolume, t)
            }
          }

          return (
            <div
              key={step.id}
              className={`rounded-xl border transition-all ${
                step.done
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : `${cfg.bg} ${cfg.border}`
              }`}
            >
              {/* Header (clickable to expand/collapse) */}
              <button
                onClick={() =>
                  setExpandedStepId(isExpanded ? null : step.id)
                }
                className="flex w-full items-start gap-3 p-3 text-left"
                aria-expanded={isExpanded}
              >
                <span className="mt-0.5 shrink-0">
                  <StepIcon
                    className={`h-5 w-5 ${step.done ? 'text-emerald-600' : cfg.color}`}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`text-sm font-semibold ${
                        step.done ? 'text-emerald-700 dark:text-emerald-400' : ''
                      }`}
                    >
                      {step.title}
                    </p>
                    {!step.done && (
                      <span
                        className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${cfg.bg} ${cfg.color} ${cfg.border}`}
                      >
                        {t(cfg.labelKey as any)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {step.intro}
                  </p>

                  {/* Before/after summary when done */}
                  {step.done && step.recordedValues && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {Object.entries(step.recordedValues).map(([k, v]) => {
                        const prev = step.previousValues?.[k]
                        const isPh = k === 'ph'
                        const inRange =
                          !isPh || (v >= 7.0 && v <= 7.4)
                        return (
                          <span
                            key={k}
                            className={`rounded-md px-1.5 py-0.5 font-mono ${
                              inRange
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'bg-orange-500/10 text-orange-700 dark:text-orange-300'
                            }`}
                          >
                            {k}: {typeof prev === 'number' ? `${prev} → ` : ''}{v}
                            {inRange ? ' ✓' : ' ⚠'}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
                <span className="mt-1 shrink-0 text-muted-foreground">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border/40 px-4 pb-4 pt-3">
                  {/* Intro reminder */}
                  <p className="text-xs italic text-foreground/70">{step.intro}</p>

                  {/* Instructions */}
                  <div className="mt-3 rounded-lg bg-background/60 p-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      <ListChecks className="h-3 w-3" />
                      {t('instructionsTitle')}
                    </p>
                    <ol className="space-y-1 text-xs leading-relaxed text-foreground/90">
                      {step.instructions.map((ins, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                            {i + 1}
                          </span>
                          <span>{ins}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Product + dosage + wait */}
                  <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-3">
                    {step.productType && (
                      <div className="rounded-lg border border-gold/20 bg-gold/5 p-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-gold">
                          🧴 {t('product')}
                        </p>
                        <p className="mt-0.5 font-medium">{step.productType}</p>
                      </div>
                    )}
                    {step.dosageText && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-primary">
                          ⚖️ {t('dosage')}
                        </p>
                        <p className="mt-0.5 font-medium">
                          {step.dosageText(poolVolume)}
                        </p>
                      </div>
                    )}
                    <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-300">
                        ⏱ {t('waitTime')}
                      </p>
                      <p className="mt-0.5 font-medium">
                        {step.waitTime === '0' ? t('immediate') : step.waitTime}
                      </p>
                    </div>
                  </div>

                  {/* Live pH recommendation preview */}
                  {phPreview && (
                    <div
                      className={`mt-3 rounded-lg border p-2.5 text-xs ${
                        phPreview.quantity === 0
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-gold/30 bg-gold/5'
                      }`}
                    >
                      <p className="flex items-center gap-1.5 font-semibold">
                        <FlaskConical className="h-3.5 w-3.5" />
                        {t('recommendation')}
                      </p>
                      <p className="mt-1 text-foreground/90">
                        {phPreview.message}
                      </p>
                      {phPreview.warning && (
                        <p className="mt-1 text-[10px] italic text-muted-foreground">
                          ⚠ {phPreview.warning}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Input fields (inline form) */}
                  {step.inputFields && step.inputFields.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        📝 {t('recordMeasures')}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {step.inputFields.map((field) => (
                          <div key={field.name} className="space-y-1">
                            <label
                              htmlFor={`${step.id}-${field.name}`}
                              className="text-[11px] font-medium text-foreground/80"
                            >
                              {field.label}
                              {field.unit ? ` (${field.unit})` : ''}
                              {field.required ? ' *' : ''}
                            </label>
                            <Input
                              id={`${step.id}-${field.name}`}
                              type="number"
                              step={field.step || 'any'}
                              min={field.min}
                              max={field.max}
                              placeholder={field.placeholder}
                              value={formVals[field.name] || ''}
                              disabled={step.done || isSubmitting}
                              onChange={(e) =>
                                setStepForms((prev) => ({
                                  ...prev,
                                  [step.id]: {
                                    ...(prev[step.id] || {}),
                                    [field.name]: e.target.value,
                                  },
                                }))
                              }
                              className="h-9 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        💡 {t('waterTestNote')}
                        <code className="rounded bg-muted px-1 py-0.5">
                          WaterTest
                        </code>
                        {t('waterTestNoteSuffix')}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!step.done ? (
                      <>
                        <Button
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => validateStep(step)}
                          className="gap-1.5 bg-gradient-to-r from-primary to-ocean-light text-primary-foreground"
                        >
                          {isSubmitting ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          {isSubmitting
                            ? t('validating')
                            : step.inputFields && step.inputFields.length > 0
                              ? t('validateAndSave')
                              : t('markAsDone')}
                        </Button>
                        {step.inputFields && step.inputFields.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isSubmitting}
                            onClick={() => markStepDone(step.id)}
                            className="text-xs text-muted-foreground"
                          >
                            {t('skipStep')}
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleStep(step.id)}
                        className="text-xs text-muted-foreground"
                      >
                        {t('cancelValidation')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Reminder if not all done after some progress */}
        {!allDone && completedCount > 0 && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 text-xs text-orange-700 dark:text-orange-300">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('reminderTitle')}
            </p>
            <p className="mt-1">
              {t('reminderDesc', { count: steps.length - completedCount })}
            </p>
          </div>
        )}

        {/* History hint when user has previous WaterTests */}
        {latestWaterTest && completedCount === 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-foreground/80">
            <p className="flex items-center gap-1.5 font-medium">
              <History className="h-3.5 w-3.5 text-primary" />
              {t('lastMeasureTitle')}
            </p>
            <p className="mt-0.5 font-mono text-[10px]">
              pH {latestWaterTest.ph}
              {typeof latestWaterTest.freeChlorine === 'number'
                ? ` · ${t('lastMeasureChlorine')} ${latestWaterTest.freeChlorine} mg/L`
                : ''}
              {typeof latestWaterTest.alkalinity === 'number'
                ? ` · ${t('lastMeasureTac')} ${latestWaterTest.alkalinity} mg/L`
                : ''}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {t('lastMeasureDesc')}
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
            {t('recheckButton')}
          </Button>
        )}

        {/* Re-check photo upload */}
        {showRecheck && !resolved && (
          <div className="space-y-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gold">
              <Camera className="h-4 w-4" />
              {t('recheckTakeNewPhoto')}
            </p>
            {/* Photo upload UI — hidden once we have a recheckResult (to leave room for the rich experience) */}
            {!recheckResult && (
              <>
                {recheckImage ? (
                  <div className="relative">
                    <img
                      src={recheckImage}
                      alt={t('recheckNewPhotoAlt')}
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
                      {t('recheckClickToUpload')}
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
                    {rechecking ? t('recheckAnalyzing') : t('recheckAnalyze')}
                  </Button>
                )}
              </>
            )}

            {/* RICH ITERATIVE EXPERIENCE — shown when re-check shows problem NOT resolved */}
            {recheckResult && !resolved && (
              <div className="space-y-4">
                {/* Satisfaction gauge - BEFORE vs AFTER */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('recheckBefore')}
                    </p>
                    <SatisfactionGauge
                      score={calculateScore(diagnostic)}
                      label={t('initialState')}
                    />
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('recheckAfter')}
                    </p>
                    <SatisfactionGauge
                      score={calculateScore(recheckResult)}
                      label={t('afterTreatment')}
                    />
                  </div>
                </div>

                {/* Progress indicator */}
                {calculateScore(recheckResult) > calculateScore(diagnostic) ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-300">
                      {t('recheckImprovement', {
                        n: calculateScore(recheckResult) - calculateScore(diagnostic),
                      })}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 text-sm">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-orange-700 dark:text-orange-300">
                      {t('recheckLittleImprovement')}
                    </span>
                  </div>
                )}

                {/* AI analysis of the new photo */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <Sparkles className="h-4 w-4" />
                    {t('recheckAnalyzeNewPhoto')}
                  </p>
                  <p className="mt-2 text-sm text-foreground/80">
                    {recheckResult.userFriendlySummary}
                  </p>
                  {recheckResult.detectedIssues &&
                    recheckResult.detectedIssues.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold text-destructive">
                          {t('recheckPersistentIssues')}
                        </p>
                        {recheckResult.detectedIssues.map((issue, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            • {issue}
                          </p>
                        ))}
                      </div>
                    )}
                </div>

                {/* NEW complementary action plan */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <RefreshCw className="h-4 w-4" />
                    {t('recheckNewPlan')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('recheckNewPlanDesc')}
                  </p>

                  {/* Generate NEW steps based on the recheckResult */}
                  <NewComplementarySteps
                    diagnostic={recheckResult}
                    previousDiagnostic={diagnostic}
                    t={t}
                  />
                </div>

                {/* Allow another re-check */}
                <Button
                  onClick={() => {
                    setRecheckImage(null)
                    setRecheckResult(null)
                    setShowRecheck(true)
                  }}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Camera className="h-4 w-4" />
                  {t('recheckAgain')}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
