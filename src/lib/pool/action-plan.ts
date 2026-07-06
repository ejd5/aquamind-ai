// Générateur de plan d'action DÉTERMINISTE
// Ordonne les actions selon les règles piscine : pH avant tout, TAC avant pH, etc.
// Combine dosing-engine + safety-rules + water-balance.

import { calculateDosage, DosageResult, estimateCost } from './dosing-engine'
import { assessSwimSafety, shouldCallProfessional, FORBIDDEN_ACTIONS } from './safety-rules'
import { calculateClearWaterIndex, calculateLSI, lsiInterpretation } from './water-balance'
import { evaluateParam, TARGETS } from './targets'
import { VolumeUnit } from './units'

export interface WaterTestInput {
  ph: number
  freeChlorine?: number | null
  totalChlorine?: number | null
  combinedChlorine?: number | null
  alkalinity?: number | null
  calciumHardness?: number | null
  cyanuricAcid?: number | null
  salt?: number | null
  phosphates?: number | null
  temperature?: number | null
}

export interface PoolProfileInput {
  volume: number
  unit: VolumeUnit
  treatmentType: string
  saltSystem: boolean
}

export interface ActionItem {
  order: number
  action: string
  detail: string
  product?: string
  quantity?: string
  method?: string
}

export interface ChemicalDosage {
  param: string
  product: string
  quantity: string
  method: string
  filtrationHours: number
  retestInHours: number
  waitBeforeSwimHours: number
  warnings: string[]
  estimatedCost: string
}

export interface GeneratedActionPlan {
  diagnosis: string
  severity: 'low' | 'medium' | 'high' | 'urgent'
  confidence: number
  immediateActions: ActionItem[]
  chemicalDosages: ChemicalDosage[]
  filtrationHours: number
  retestInHours: number
  swimSafety: 'allowed' | 'avoid' | 'forbidden' | 'unknown'
  swimReasons: string[]
  doNotDo: string[]
  estimatedCost: string
  whenToCallProfessional: string | null
  clearWaterIndex: number
  lsi: number | null
  lsiLabel: string
}

const IDEAL_PH = 7.2
const IDEAL_TAC = 100
const IDEAL_CHLORINE = 2
const IDEAL_CYA = 40

export function generateActionPlan(test: WaterTestInput, profile: PoolProfileInput): GeneratedActionPlan {
  const actions: ActionItem[] = []
  const dosages: ChemicalDosage[] = []
  const doNotDo: string[] = [...FORBIDDEN_ACTIONS]
  let maxFiltration = 0
  let minRetest = 24

  const addDosage = (param: any, current: number, target: number) => {
    const r = calculateDosage({ param, current, target, volume: profile.volume, volumeUnit: profile.unit })
    if (!r) return
    dosages.push({
      param,
      product: r.product,
      quantity: formatQty(r.quantity, r.unit),
      method: r.method,
      filtrationHours: r.filtrationHours,
      retestInHours: r.retestInHours,
      waitBeforeSwimHours: r.waitBeforeSwimHours,
      warnings: r.warnings,
      estimatedCost: estimateCost(param, r.quantity),
    })
    maxFiltration = Math.max(maxFiltration, r.filtrationHours)
    minRetest = Math.min(minRetest, r.retestInHours)
  }

  // 1. Alcalinité (TAC) en premier si hors plage — le TAC stabilise le pH
  if (test.alkalinity != null) {
    const tacStatus = evaluateParam('alkalinity', test.alkalinity)
    if (tacStatus !== 'ok' && test.alkalinity < IDEAL_TAC) {
      addDosage('alkalinity_plus', test.alkalinity, IDEAL_TAC)
      actions.push({
        order: actions.length + 1,
        action: 'Ajuster l\'alcalinité (TAC)',
        detail: `TAC ${test.alkalinity} mg/L → cible ${IDEAL_TAC} mg/L. À faire AVANT le pH.`,
        product: 'TAC+',
      })
    }
  }

  // 2. pH (après TAC) — toujours prioritaire avant chlore
  const phStatus = evaluateParam('ph', test.ph)
  if (phStatus !== 'ok') {
    if (test.ph > 7.4) {
      addDosage('ph_minus', test.ph, IDEAL_PH)
      actions.push({
        order: actions.length + 1,
        action: 'Baisser le pH',
        detail: `pH ${test.ph} → cible ${IDEAL_PH}. Indispensable avant tout traitement chlore.`,
        product: 'pH-',
      })
    } else if (test.ph < 7.0) {
      addDosage('ph_plus', test.ph, IDEAL_PH)
      actions.push({
        order: actions.length + 1,
        action: 'Monter le pH',
        detail: `pH ${test.ph} → cible ${IDEAL_PH}.`,
        product: 'pH+',
      })
    }
  } else {
    actions.push({
      order: actions.length + 1,
      action: 'pH correct',
      detail: `pH ${test.ph} dans la plage idéale. Ne pas toucher.`,
    })
  }

  // 3. Chlore (après pH équilibré)
  if (test.freeChlorine != null) {
    const fcStatus = evaluateParam('freeChlorine', test.freeChlorine)
    if (test.freeChlorine < 0.5) {
      // Chlore critique : choc
      addDosage('chlorine_shock', test.freeChlorine, IDEAL_CHLORINE)
      actions.push({
        order: actions.length + 1,
        action: 'Chloration choc',
        detail: `Chlore libre ${test.freeChlorine} mg/L trop bas. Faire un choc (après pH équilibré).`,
        product: 'Chlore choc',
      })
      doNotDo.push('Ne pas se baigner pendant au moins 8h après le choc.')
    } else if (test.freeChlorine < 1) {
      addDosage('chlorine_slow', 0, 0)
      actions.push({
        order: actions.length + 1,
        action: 'Ajouter chlore lent',
        detail: `Chlore libre ${test.freeChlorine} mg/L un peu bas. Compléter avec chlore lent.`,
        product: 'Chlore lent',
      })
    }
  }

  // 4. Chlore combiné (chloramines)
  if (test.combinedChlorine != null && test.combinedChlorine > 0.4) {
    actions.push({
      order: actions.length + 1,
      action: 'Traitement chloramines',
      detail: `Chlore combiné ${test.combinedChlorine} mg/L élevé. Chloration choc pour casser les chloramines (odeur, irritation).`,
    })
    doNotDo.push('Ne pas masquer l\'odeur de chlore avec du parfum : c\'est un signe de chloramines.')
  }

  // 5. Stabilisant (CYA)
  if (test.cyanuricAcid != null) {
    const cyaStatus = evaluateParam('cyanuricAcid', test.cyanuricAcid)
    if (cyaStatus !== 'ok' && test.cyanuricAcid < IDEAL_CYA) {
      addDosage('stabilizer_plus', test.cyanuricAcid, IDEAL_CYA)
      actions.push({
        order: actions.length + 1,
        action: 'Ajouter stabilisant',
        detail: `CYA ${test.cyanuricAcid} mg/L → cible ${IDEAL_CYA} mg/L.`,
      })
    } else if (test.cyanuricAcid > 60) {
      actions.push({
        order: actions.length + 1,
        action: 'Diluer l\'eau (CYA trop haut)',
        detail: `CYA ${test.cyanuricAcid} mg/L bloque le chlore. Renouveler 20-30% de l'eau.`,
      })
      doNotDo.push('Ne pas ajouter de stabilisant : le niveau est déjà trop élevé.')
    }
  }

  // 6. Sel (si électrolyseur)
  if (profile.saltSystem && test.salt != null) {
    const saltStatus = evaluateParam('salt', test.salt)
    if (saltStatus !== 'ok' && test.salt < 4) {
      addDosage('salt_plus', test.salt, 5)
      actions.push({
        order: actions.length + 1,
        action: 'Ajouter du sel',
        detail: `Sel ${test.salt} g/L trop bas pour l'électrolyseur.`,
      })
    }
  }

  // 7. Phosphates
  if (test.phosphates != null && test.phosphates > 0.2) {
    actions.push({
      order: actions.length + 1,
      action: 'Traiter les phosphates',
      detail: `Phosphates ${test.phosphates} mg/L : nourrissent les algues. Utiliser un réducteur de phosphates.`,
    })
  }

  // 8. Filtration finale
  actions.push({
    order: actions.length + 1,
    action: 'Maintenir la filtration',
    detail: maxFiltration > 0
      ? `Filtrer au moins ${maxFiltration}h pour bien répartir les produits.`
      : 'Filtration normale (moitié de la température de l\'eau en heures).',
  })

  // Re-test
  actions.push({
    order: actions.length + 1,
    action: 'Re-tester l\'eau',
    detail: minRetest < 24
      ? `Refaire un test dans ${minRetest}h pour vérifier l'effet.`
      : 'Refaire un test dans 24-48h.',
  })

  // Sécurité baignade
  const swim = assessSwimSafety(test)

  // Diagnostic global
  const cwi = calculateClearWaterIndex(test)
  const lsi = calculateLSI(test)
  const lsiInfo = lsiInterpretation(lsi)

  let severity: GeneratedActionPlan['severity'] = 'low'
  if (cwi < 40) severity = 'urgent'
  else if (cwi < 65) severity = 'high'
  else if (cwi < 85) severity = 'medium'

  const diagnosis = buildDiagnosis(test, cwi, severity, swim.status)

  const totalCost = dosages.reduce((sum, d) => {
    const m = d.estimatedCost.match(/[\d.]+/)
    return sum + (m ? parseFloat(m[0]) : 0)
  }, 0)

  return {
    diagnosis,
    severity,
    confidence: 0.9, // déterministe donc confiance élevée
    immediateActions: actions,
    chemicalDosages: dosages,
    filtrationHours: maxFiltration,
    retestInHours: minRetest,
    swimSafety: swim.status,
    swimReasons: swim.reasons,
    doNotDo,
    estimatedCost: totalCost > 0 ? `≈ ${totalCost.toFixed(2)} €` : '—',
    whenToCallProfessional: shouldCallProfessional(test),
    clearWaterIndex: cwi,
    lsi,
    lsiLabel: lsiInfo.label,
  }
}

function formatQty(amount: number, unit: string): string {
  if (unit === 'L') return `${amount.toFixed(2)} L`
  if (unit === 'ml') return `${Math.round(amount)} ml`
  if (unit === 'g') return `${Math.round(amount)} g`
  if (unit === 'kg') return `${amount.toFixed(2)} kg`
  if (unit === 'tablet') return `${Math.ceil(amount)} pastille(s)`
  return `${amount.toFixed(2)} ${unit}`
}

function buildDiagnosis(test: WaterTestInput, cwi: number, severity: string, swim: string): string {
  const issues: string[] = []
  if (evaluateParam('ph', test.ph) !== 'ok') issues.push(`pH ${test.ph}`)
  if (test.freeChlorine != null && evaluateParam('freeChlorine', test.freeChlorine) !== 'ok') {
    issues.push(`chlore libre ${test.freeChlorine} mg/L`)
  }
  if (test.combinedChlorine != null && test.combinedChlorine > 0.4) {
    issues.push(`chloramines élevées`)
  }
  if (test.alkalinity != null && evaluateParam('alkalinity', test.alkalinity) !== 'ok') {
    issues.push(`TAC ${test.alkalinity}`)
  }

  if (issues.length === 0) {
    return `Votre eau est globalement équilibrée (indice ${cwi}/100). Maintenez le rythme de tests et de filtration. Baignade : ${swimLabel(swim)}.`
  }

  const sevLabel = severity === 'urgent' ? 'URGENT' : severity === 'high' ? 'Action recommandée' : 'À surveiller'
  return `Diagnostic (${sevLabel}) — indice eau claire ${cwi}/100. Points à traiter : ${issues.join(', ')}. Suivez le plan d'action ordonné ci-dessous. Baignade : ${swimLabel(swim)}.`
}

function swimLabel(status: string): string {
  switch (status) {
    case 'allowed': return 'autorisée'
    case 'avoid': return 'déconseillée'
    case 'forbidden': return 'interdite'
    default: return 'à confirmer après mesures'
  }
}
