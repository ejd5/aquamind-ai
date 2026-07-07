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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { api, ApiError } from '@/lib/api-client'

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
      message: '✅ pH dans la plage idéale (7.0 - 7.4). Aucun ajustement nécessaire.',
    }
  }

  if (ph > IDEAL_HIGH) {
    // pH too high → pH-
    const drop = Math.min(ph - IDEAL_HIGH, 0.3) // safe delta cap
    const grams = (drop / 0.1) * phMinusGramsPer01(poolVolume)
    return {
      product: 'pH- (poudre, bisulfate de sodium)',
      quantity: grams,
      unit: 'g',
      message: `Votre pH ${ph.toFixed(2)} est trop haut. Ajoutez ${fmtQty(
        grams,
        'g',
      )} de pH- pour revenir vers 7.4 (baisse de ~${drop.toFixed(1)} unité).`,
      warning:
        'Verser devant les buses de refoulement, filtration en marche. Ne jamais verser pH- pur directement.',
    }
  }

  // pH too low → pH+
  const rise = Math.min(IDEAL_LOW - ph, 0.3)
  const grams = (rise / 0.1) * phPlusGramsPer01(poolVolume)
  return {
    product: 'pH+ (carbonate de sodium)',
    quantity: grams,
    unit: 'g',
    message: `Votre pH ${ph.toFixed(2)} est trop bas. Ajoutez ${fmtQty(
      grams,
      'g',
    )} de pH+ pour remonter vers 7.0 (hausse de ~${rise.toFixed(1)} unité).`,
    warning:
      'Diluer dans un seau d\'eau de piscine avant de verser devant les refoulements.',
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Step generation
// ───────────────────────────────────────────────────────────────────────────

function generateSteps(diagnostic: DiagnosticResult, poolVolume: number): ActionStep[] {
  const issues = diagnostic.detectedIssues || []
  const summary = (diagnostic.userFriendlySummary || '').toLowerCase()
  const probableIssues = diagnostic.probableIssues || []
  const allText = [...issues, summary, ...probableIssues].join(' ').toLowerCase()

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

  const phField: InputField = {
    name: 'ph',
    label: 'Entrez votre pH mesuré',
    unit: '',
    placeholder: '7.2',
    required: true,
    step: '0.01',
    min: 6,
    max: 9,
  }
  const chlorineField: InputField = {
    name: 'freeChlorine',
    label: 'Chlore libre mesuré',
    unit: 'mg/L',
    placeholder: '2.0',
    step: '0.1',
    min: 0,
    max: 20,
  }
  const tacField: InputField = {
    name: 'alkalinity',
    label: 'TAC mesuré',
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
        title: '1. Mesurer et ajuster le pH',
        intro:
          "Le pH doit être entre 7.0 et 7.4 AVANT tout traitement. Un pH incorrect rend le chlore inefficace (jusqu'à -90 %).",
        instructions: [
          'Prenez votre kit de test (gouttes ou bandelette) ou un testeur électronique.',
          'Récupérez un échantillon d\'eau à 30 cm de profondeur, loin des refoulements.',
          'Mesurez le pH actuel et notez-le ci-dessous.',
          'Si pH > 7.4 → ajoutez du pH- (acide). Si pH < 7.0 → ajoutez du pH+ (base).',
          `Dosage de référence : ~${phMinusGramsPer01(
            poolVolume,
          )} g de pH- pour abaisser de 0.1 unité sur ${poolVolume} m³.`,
          'Diluez le produit dans un seau d\'eau de la piscine, jamais pur directement.',
          'Versez lentement devant les buses de refoulement, filtration en marche.',
          'Patientez 2 heures avec la filtration en route avant de re-tester.',
        ],
        productType: 'pH- ou pH+ (selon votre mesure)',
        dosageText: (v) =>
          `~${phMinusGramsPer01(v)} g de pH- / 0.1 unité à abaisser (piscine de ${v} m³)`,
        waitTime: '2h',
        inputFields: [phField],
        urgency: 'critical',
        done: false,
      },
      {
        id: 'ph-retest',
        title: '2. Re-tester le pH (après 2h)',
        intro:
          'Après 2h de filtration, le pH a eu le temps de se stabiliser. Vérifiez qu\'il est maintenant dans la plage cible.',
        instructions: [
          'Reprenez un échantillon d\'eau à 30 cm de profondeur.',
          'Mesurez à nouveau le pH.',
          'Si pH entre 7.0 et 7.4 → ✅ passez à l\'étape suivante (traitement choc).',
          'Si pH encore trop haut/bas → ajustez à nouveau avec la MOITIÉ de la dose précédente.',
          'Re-testez 1h après ce second ajustement.',
        ],
        productType: 'pH- ou pH+ (dose réduite si réajustement)',
        dosageText: (v) =>
          `Réajustement : moitié de la dose initiale (~${Math.round(
            phMinusGramsPer01(v) / 2,
          )} g max pour ${v} m³)`,
        waitTime: '0',
        inputFields: [phField],
        urgency: 'critical',
        done: false,
      },
      {
        id: 'chlorine-shock',
        title: '3. Traitement choc au chlore',
        intro:
          "Le chlore choc détruit les algues, bactéries et virus. C'est l'étape la plus importante contre l'eau verte.",
        instructions: [
          '⚠ Vérifiez que le pH est correct (étapes 1-2). Sinon le choc sera inefficace.',
          `Calculez la dose curative : environ 10 g de chlore choc par m³.`,
          `Pour votre piscine de ${poolVolume} m³ : ${chlorineShockGrams(
            poolVolume,
          )} g de chlore choc (soit ~${(
            chlorineShockGrams(poolVolume) / 20
          ).toFixed(0)} pastilles de 20 g).`,
          'Préférez le soir, sans baigneurs, filtration en marche.',
          'Diluez le chlore en poudre/granulés dans un seau d\'eau de piscine.',
          'Versez devant les buses de refoulement, jamais dans le skimmer.',
          '🚫 INTERDICTION DE BAIGNADE pendant 8 heures minimum.',
        ],
        productType: 'Chlore choc (65 % actif, granulés ou pastilles)',
        dosageText: (v) => `${chlorineShockGrams(v)} g de chlore choc (pour ${v} m³)`,
        waitTime: '8h',
        inputFields: [{ ...chlorineField, required: false }],
        urgency: 'critical',
        done: false,
      },
      {
        id: 'anti-algae',
        title: '4. Anti-algues (préventif curatif)',
        intro:
          "L'anti-algues complète le chlore en détruisant les algues résistantes et en empêchant la repousse.",
        instructions: [
          "Attendez au moins 2h après le traitement choc (ne jamais mélanger directement).",
          `Dosage curatif : ~20 mL d'anti-algues par m³.`,
          `Pour ${poolVolume} m³ : ${antiAlgaeMl(
            poolVolume,
          )} mL d'anti-algues (soit ${(antiAlgaeMl(poolVolume) / 1000).toFixed(2)} L).`,
          'Versez directement devant les refoulements, filtration en marche.',
          'Brossez les parois juste après (voir étape suivante) pour décoller les algues.',
        ],
        productType: 'Anti-algues curatif',
        dosageText: (v) => `${antiAlgaeMl(v)} mL d'anti-algues (pour ${v} m³)`,
        waitTime: '2h',
        urgency: 'important',
        done: false,
      },
      {
        id: 'brush-walls',
        title: '5. Brosser les parois et le fond',
        intro:
          "Le brossage décolle les algues incrustées. Sans cette étape, le traitement chimique ne suffit pas.",
        instructions: [
          "Utilisez une brosse adaptée à votre revêtement : brosse nylon pour liner/coque, brosse acier pour béton.",
          "🚫 Jamais de brosse métallique sur liner ou membrane armée — vous la perceriez.",
          "Brossez du haut vers le bas, par sections de 1 m².",
          'Insistez sur les coins, marches, buses, échelles et la ligne d\'eau.',
          'Brossez aussi le fond si accessible (perche télescopique).',
          "C'est physique (15-30 min) mais INDISPENSABLE — sans ça les algues reviennent en 48h.",
        ],
        waitTime: '0',
        urgency: 'important',
        done: false,
      },
      {
        id: 'filtration-24h',
        title: '6. Filtration continue 24h',
        intro:
          "La filtration doit tourner 24h sans interruption pour évacuer les algues mortes et les particules.",
        instructions: [
          "Réglez la pompe en marche forcée (24h/24) — pas de programme horaire.",
          'Vérifiez la pression du manomètre du filtre.',
          'Si la pression monte > 0.3 bar au-dessus de la normale → faites un backwash (contre-lavage).',
          'Nettoyez le pré-filtre de la pompe (panier) s\'il est plein de débris.',
          'Videz les skimmers régulièrement pendant ces 24h.',
          'Pour un filtre à cartouche : rincez-la à mi-parcours si le débit baisse.',
        ],
        waitTime: '24h',
        urgency: 'critical',
        done: false,
      },
      {
        id: 'retest-full',
        title: '7. Re-test complet de l\'eau',
        intro:
          "Après 24h de filtration, faites un test complet pour vérifier que l'eau est saine et équilibrée.",
        instructions: [
          'Reprenez un échantillon à 30 cm de profondeur.',
          'Mesurez le pH (cible : 7.0 - 7.4).',
          'Mesurez le chlore libre (cible : 1 - 3 mg/L).',
          'Mesurez le TAC / alcalinité (cible : 80 - 120 mg/L).',
          'Entrez vos 3 valeurs ci-dessous — elles seront enregistrées dans votre carnet.',
          'Si tout est dans les plages → vous pouvez re-baigner. Sinon, ajustez.',
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
        title: '1. Vérifier et nettoyer la filtration',
        intro:
          "Une eau trouble vient le plus souvent d'une filtration inefficace. On commence toujours par là.",
        instructions: [
          "Coupez la pompe avant toute intervention de sécurité.",
          'Vérifiez la pression au manomètre : si > 0.3 bar au-dessus de la valeur initiale → nettoyer.',
          'Filtre à sable : faites un backwash (contre-lavage) 2-3 min puis rinçage 30 s.',
          'Filtre à cartouche : démontez, rincez au jet, remplacez si > 2 ans.',
          'Videz et nettoyez les paniers de skimmer et de pré-filtre de pompe.',
          'Remettez en route et vérifiez que le débit est bon (buses de refoulement).',
        ],
        waitTime: '0',
        urgency: 'important',
        done: false,
      },
      {
        id: 'ph-adjust-cloudy',
        title: '2. Mesurer et ajuster le pH',
        intro:
          "Un pH déséquilibré favorise la turbidité et diminue l'efficacité du chlore.",
        instructions: [
          'Mesurez le pH à 30 cm de profondeur.',
          'Si pH > 7.4 → ajoutez du pH- ; si pH < 7.0 → ajoutez du pH+.',
          `Référence : ~${phMinusGramsPer01(
            poolVolume,
          )} g de pH- pour abaisser de 0.1 unité sur ${poolVolume} m³.`,
          'Diluez dans un seau d\'eau de piscine, versez devant les refoulements.',
          'Filtration en marche pendant 2h avant de re-tester.',
        ],
        productType: 'pH- ou pH+ (selon votre mesure)',
        dosageText: (v) => `~${phMinusGramsPer01(v)} g de pH- / 0.1 unité (pour ${v} m³)`,
        waitTime: '2h',
        inputFields: [phField],
        urgency: 'critical',
        done: false,
      },
      {
        id: 'flocculant',
        title: '3. Ajouter un floculant (si filtre à sable)',
        intro:
          "Le floculant agglomère les particules fines en flocons que le filtre peut retenir. ⚠ Uniquement pour filtre à sable.",
        instructions: [
          "⚠ Ne JAMAIS utiliser de floculant avec un filtre à cartouche (colmatage).",
          `Dosage : ~5 mL de floculant liquide par m³.`,
          `Pour ${poolVolume} m³ : ${flocculantMl(poolVolume)} mL de floculant.`,
          'Versez devant les refoulements, filtration en marche 1h.',
          'Coupez ensuite la filtration 12h pour laisser décanter.',
          'Les flocons tombent au fond — aspirez-les au robot ou à l\'aspirateur manuel.',
        ],
        productType: 'Floculant liquide (filtre à sable uniquement)',
        dosageText: (v) => `${flocculantMl(v)} mL de floculant (pour ${v} m³)`,
        waitTime: '12h',
        urgency: 'moderate',
        done: false,
      },
      {
        id: 'filtration-12h',
        title: '4. Filtration continue 12h',
        intro:
          "Laissez la filtration tourner 12h pour clarifier l'eau après floculation/aspiration.",
        instructions: [
          'Remettez la pompe en marche forcée après aspiration des flocons.',
          'Surveillez la pression du filtre — backwash si elle monte.',
          'Vérifiez le panier de skimmer toutes les 4h.',
          'Au bout de 12h, l\'eau doit redevenir transparente.',
        ],
        waitTime: '12h',
        urgency: 'important',
        done: false,
      },
      {
        id: 'retest-cloudy',
        title: '5. Re-tester l\'eau',
        intro:
          "Vérifiez que l'eau est équilibrée et que le chlore est actif.",
        instructions: [
          'Mesurez le pH (cible : 7.0 - 7.4).',
          'Mesurez le chlore libre (cible : 1 - 3 mg/L).',
          'Entrez vos valeurs ci-dessous — elles seront enregistrées dans votre carnet.',
          'Si les valeurs sont OK et l\'eau claire → problème résolu.',
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
      title: '1. Suivre la recommandation',
      intro:
        "L'IA a identifié un problème mais sans motif typique (eau verte / trouble). Suivez la recommandation ci-dessous.",
      instructions: [
        diagnostic.recommendedNextStep ||
          "Suivez les recommandations de l'IA affichées ci-dessus.",
        'Mesurez votre pH avant tout traitement (cible : 7.0 - 7.4).',
        'Ajustez si nécessaire avec du pH- ou pH+.',
        'Enregistrez votre mesure ci-dessous pour l\'historique.',
        'Vérifiez que la filtration fonctionne au moins 8h/jour.',
      ],
      productType: diagnostic.recommendedNextStep?.match(/pH|chlore|brome/i)
        ? 'Selon recommandation'
        : undefined,
      waitTime: '24h',
      inputFields: [phField],
      urgency: 'important',
      done: false,
    },
    {
      id: 'recheck-generic',
      title: '2. Vérifier le résultat (24h)',
      intro:
        "Après avoir appliqué les recommandations, prenez une nouvelle photo pour confirmer la résolution.",
      instructions: [
        'Attendez au moins 24h de filtration continue.',
        'Reprenez une photo dans les mêmes conditions (même endroit, même éclairage).',
        'Cliquez sur "Vérifier le résultat" en bas du plan.',
        'L\'IA comparera et dira si le problème est résolu.',
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
// Component
// ───────────────────────────────────────────────────────────────────────────

export function DiagnosticActionPlan({
  diagnostic,
  onRecheck,
}: DiagnosticActionPlanProps) {
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
      .get<{ profile: { volume?: number } | null }>('/api/pool/profile')
      .then((d) => {
        const v = d?.profile?.volume
        if (typeof v === 'number' && v > 0) setPoolVolume(v)
      })
      .catch(() => {
        /* keep default 40 m³ */
      })
      .finally(() => setPoolVolumeLoaded(true))

    api
      .get<{ tests: WaterTestRow[] }>('/api/pool/water-test')
      .then((d) => {
        const t = d?.tests?.[0]
        if (t) setLatestWaterTest(t)
      })
      .catch(() => {
        /* no tests yet — that's fine */
      })
  }, [])

  // Regenerate steps when diagnostic or poolVolume changes
  useEffect(() => {
    if (!poolVolumeLoaded) return
    const newSteps = generateSteps(diagnostic, poolVolume)
    setSteps(newSteps)
    setResolved(false)
    setShowRecheck(false)
    setRecheckImage(null)
    setRecheckResult(null)
    setExpandedStepId(newSteps[0]?.id || null)
    setStepForms({})
  }, [diagnostic, poolVolume, poolVolumeLoaded])

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
          title: 'Étape validée',
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
          title: 'Champs requis manquants',
          description: 'Remplissez tous les champs obligatoires (*) avant de valider.',
          variant: 'destructive',
        })
        return
      }

      // Nothing to record (all optional fields empty) — just mark done
      if (Object.keys(payload).length === 0) {
        markStepDone(step.id)
        setExpandedStepId(null)
        toast({
          title: 'Étape validée (sans mesure)',
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
          source: 'action_plan',
          note: `Étape plan d'action: ${step.title}`,
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
          title: 'Mesure enregistrée ✓',
          description: `${Object.entries(payload)
            .map(([k, v]) => `${k} = ${v}`)
            .join(', ')} → carnet mis à jour.`,
        })
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Enregistrement impossible'
        toast({
          title: 'Erreur enregistrement',
          description: msg,
          variant: 'destructive',
        })
      } finally {
        setSubmitting(null)
      }
    },
    [stepForms, latestWaterTest, markStepDone],
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

  // ─────────────────────────────────────────────────────────────────────────
  // Action plan
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ListChecks className="h-4 w-4 text-gold" />
            Plan d&apos;action guidé
          </CardTitle>
          <Badge
            className={`${urgencyCfg.bg} ${urgencyCfg.color} ${urgencyCfg.border} border`}
          >
            <UrgencyIcon className="mr-1 h-3 w-3" />
            {urgencyCfg.label}
          </Badge>
        </div>

        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3 text-primary" />
          Piscine détectée : <span className="font-semibold text-foreground">{poolVolume} m³</span>
          — dosages calculés automatiquement.
        </p>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-semibold">
              {completedCount}/{steps.length} étapes
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-muted" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
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
              phPreview = computePhRecommendation(phNum, poolVolume)
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
                        {cfg.label}
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
                      Instructions détaillées
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
                          🧴 Produit
                        </p>
                        <p className="mt-0.5 font-medium">{step.productType}</p>
                      </div>
                    )}
                    {step.dosageText && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-primary">
                          ⚖️ Dosage
                        </p>
                        <p className="mt-0.5 font-medium">
                          {step.dosageText(poolVolume)}
                        </p>
                      </div>
                    )}
                    <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-300">
                        ⏱ Temps d&apos;attente
                      </p>
                      <p className="mt-0.5 font-medium">
                        {step.waitTime === '0' ? 'Immédiat' : step.waitTime}
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
                        Recommandation pour votre mesure
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
                        📝 Enregistrer vos mesures
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
                        💡 Les mesures sont enregistrées dans votre carnet (
                        <code className="rounded bg-muted px-1 py-0.5">
                          WaterTest
                        </code>
                        ) via l&apos;API.
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
                            ? 'Enregistrement…'
                            : step.inputFields && step.inputFields.length > 0
                              ? 'Valider et enregistrer'
                              : 'Marquer comme fait'}
                        </Button>
                        {step.inputFields && step.inputFields.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isSubmitting}
                            onClick={() => markStepDone(step.id)}
                            className="text-xs text-muted-foreground"
                          >
                            Ignorer cette étape
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
                        Annuler la validation
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
              Rappel
            </p>
            <p className="mt-1">
              Il vous reste {steps.length - completedCount} étape(s) à compléter.
              Suivez le plan jusqu&apos;au bout pour résoudre durablement le problème.
            </p>
          </div>
        )}

        {/* History hint when user has previous WaterTests */}
        {latestWaterTest && completedCount === 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-foreground/80">
            <p className="flex items-center gap-1.5 font-medium">
              <History className="h-3.5 w-3.5 text-primary" />
              Dernière mesure enregistrée
            </p>
            <p className="mt-0.5 font-mono text-[10px]">
              pH {latestWaterTest.ph}
              {typeof latestWaterTest.freeChlorine === 'number'
                ? ` · chlore ${latestWaterTest.freeChlorine} mg/L`
                : ''}
              {typeof latestWaterTest.alkalinity === 'number'
                ? ` · TAC ${latestWaterTest.alkalinity} mg/L`
                : ''}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Sera utilisée comme valeur &quot;avant&quot; pour comparer vos nouvelles mesures.
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
