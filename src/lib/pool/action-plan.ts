// Générateur de plan d'action DÉTERMINISTE
// Ordonne les actions selon les règles piscine : pH avant tout, TAC avant pH, etc.
// Combine dosing-engine + safety-rules + water-balance.
//
// i18n: parallel `*Key` / `*Params` fields are exposed alongside the legacy
// French literals so the consumer (module-action-plan.tsx / module-water-test.tsx)
// can translate them via next-intl under the `actionPlan` namespace. French
// literals are kept for backward compat (older persisted DB rows, etc.).

import { calculateDosage, estimateCost } from './dosing-engine'
import { assessSwimSafety, shouldCallProfessional, FORBIDDEN_ACTIONS, FORBIDDEN_ACTION_KEYS } from './safety-rules'
import { calculateClearWaterIndex, calculateLSI, lsiInterpretation } from './water-balance'
import { evaluateParam } from './targets'
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
  actionKey: string
  detail: string
  detailKey: string
  detailParams?: Record<string, string | number>
  product?: string
  productKey?: string
}

export interface ChemicalDosage {
  param: string
  product: string
  productKey: string
  quantity: string
  method: string
  methodKey: string
  filtrationHours: number
  retestInHours: number
  waitBeforeSwimHours: number
  warnings: string[]
  warningKeys: string[]
  warningParams: Record<string, string | number>[]
  estimatedCost: string
}

export interface GeneratedActionPlan {
  diagnosis: string
  diagnosisKey: string
  diagnosisParams: Record<string, string | number>
  severity: 'low' | 'medium' | 'high' | 'urgent'
  confidence: number
  immediateActions: ActionItem[]
  chemicalDosages: ChemicalDosage[]
  filtrationHours: number
  retestInHours: number
  swimSafety: 'allowed' | 'avoid' | 'forbidden' | 'unknown'
  swimReasons: string[]
  swimReasonKeys: string[]
  swimReasonParams: Record<string, string | number>[]
  doNotDo: string[]
  doNotDoKeys: string[]
  estimatedCost: string
  whenToCallProfessional: string | null
  whenToCallProfessionalKey: string | null
  whenToCallProfessionalParams?: Record<string, string | number> | null
  clearWaterIndex: number
  lsi: number | null
  lsiLabel: string
  lsiLabelKey: string
}

const IDEAL_PH = 7.2
const IDEAL_TAC = 100
const IDEAL_CHLORINE = 2
const IDEAL_CYA = 40

export function generateActionPlan(test: WaterTestInput, profile: PoolProfileInput): GeneratedActionPlan {
  const actions: ActionItem[] = []
  const dosages: ChemicalDosage[] = []
  const doNotDo: string[] = [...FORBIDDEN_ACTIONS]
  const doNotDoKeys: string[] = [...FORBIDDEN_ACTION_KEYS]
  let maxFiltration = 0
  let minRetest = 24

  const addDosage = (param: any, current: number, target: number) => {
    const r = calculateDosage({ param, current, target, volume: profile.volume, volumeUnit: profile.unit })
    if (!r) return
    dosages.push({
      param,
      product: r.product,
      productKey: r.productKey,
      quantity: formatQty(r.quantity, r.unit),
      method: r.method,
      methodKey: r.methodKey,
      filtrationHours: r.filtrationHours,
      retestInHours: r.retestInHours,
      waitBeforeSwimHours: r.waitBeforeSwimHours,
      warnings: r.warnings,
      warningKeys: r.warningKeys,
      warningParams: r.warningParams,
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
        actionKey: 'iaAdjustTac',
        detail: `TAC ${test.alkalinity} mg/L → cible ${IDEAL_TAC} mg/L. À faire AVANT le pH.`,
        detailKey: 'iaAdjustTacDetail',
        detailParams: { current: test.alkalinity, target: IDEAL_TAC },
        product: 'TAC+',
        productKey: 'iaAdjustTacProduct',
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
        actionKey: 'iaLowerPh',
        detail: `pH ${test.ph} → cible ${IDEAL_PH}. Indispensable avant tout traitement chlore.`,
        detailKey: 'iaLowerPhDetail',
        detailParams: { current: test.ph, target: IDEAL_PH },
        product: 'pH-',
        productKey: 'iaLowerPhProduct',
      })
    } else if (test.ph < 7.0) {
      addDosage('ph_plus', test.ph, IDEAL_PH)
      actions.push({
        order: actions.length + 1,
        action: 'Monter le pH',
        actionKey: 'iaRaisePh',
        detail: `pH ${test.ph} → cible ${IDEAL_PH}.`,
        detailKey: 'iaRaisePhDetail',
        detailParams: { current: test.ph, target: IDEAL_PH },
        product: 'pH+',
        productKey: 'iaRaisePhProduct',
      })
    }
  } else {
    actions.push({
      order: actions.length + 1,
      action: 'pH correct',
      actionKey: 'iaPhOk',
      detail: `pH ${test.ph} dans la plage idéale. Ne pas toucher.`,
      detailKey: 'iaPhOkDetail',
      detailParams: { ph: test.ph },
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
        actionKey: 'iaChlorineShock',
        detail: `Chlore libre ${test.freeChlorine} mg/L trop bas. Faire un choc (après pH équilibré).`,
        detailKey: 'iaChlorineShockDetail',
        detailParams: { chlorine: test.freeChlorine },
        product: 'Chlore choc',
        productKey: 'iaChlorineShockProduct',
      })
      doNotDo.push('Ne pas se baigner pendant au moins 8h après le choc.')
      doNotDoKeys.push('dndNoBath8h')
    } else if (test.freeChlorine < 1) {
      addDosage('chlorine_slow', 0, 0)
      actions.push({
        order: actions.length + 1,
        action: 'Ajouter chlore lent',
        actionKey: 'iaAddSlowChlorine',
        detail: `Chlore libre ${test.freeChlorine} mg/L un peu bas. Compléter avec chlore lent.`,
        detailKey: 'iaAddSlowChlorineDetail',
        detailParams: { chlorine: test.freeChlorine },
        product: 'Chlore lent',
        productKey: 'iaAddSlowChlorineProduct',
      })
    }
  }

  // 4. Chlore combiné (chloramines)
  if (test.combinedChlorine != null && test.combinedChlorine > 0.4) {
    actions.push({
      order: actions.length + 1,
      action: 'Traitement chloramines',
      actionKey: 'iaTreatChloramines',
      detail: `Chlore combiné ${test.combinedChlorine} mg/L élevé. Chloration choc pour casser les chloramines (odeur, irritation).`,
      detailKey: 'iaTreatChloraminesDetail',
      detailParams: { combined: test.combinedChlorine },
    })
    doNotDo.push('Ne pas masquer l\'odeur de chlore avec du parfum : c\'est un signe de chloramines.')
    doNotDoKeys.push('dndNoMaskChlorineSmell')
  }

  // 5. Stabilisant (CYA)
  if (test.cyanuricAcid != null) {
    const cyaStatus = evaluateParam('cyanuricAcid', test.cyanuricAcid)
    if (cyaStatus !== 'ok' && test.cyanuricAcid < IDEAL_CYA) {
      addDosage('stabilizer_plus', test.cyanuricAcid, IDEAL_CYA)
      actions.push({
        order: actions.length + 1,
        action: 'Ajouter stabilisant',
        actionKey: 'iaAddStabilizer',
        detail: `CYA ${test.cyanuricAcid} mg/L → cible ${IDEAL_CYA} mg/L.`,
        detailKey: 'iaAddStabilizerDetail',
        detailParams: { current: test.cyanuricAcid, target: IDEAL_CYA },
      })
    } else if (test.cyanuricAcid > 60) {
      actions.push({
        order: actions.length + 1,
        action: 'Diluer l\'eau (CYA trop haut)',
        actionKey: 'iaDiluteWater',
        detail: `CYA ${test.cyanuricAcid} mg/L bloque le chlore. Renouveler 20-30% de l'eau.`,
        detailKey: 'iaDiluteWaterDetail',
        detailParams: { cya: test.cyanuricAcid },
      })
      doNotDo.push('Ne pas ajouter de stabilisant : le niveau est déjà trop élevé.')
      doNotDoKeys.push('dndNoAddStabilizer')
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
        actionKey: 'iaAddSalt',
        detail: `Sel ${test.salt} g/L trop bas pour l'électrolyseur.`,
        detailKey: 'iaAddSaltDetail',
        detailParams: { salt: test.salt },
      })
    }
  }

  // 7. Phosphates
  if (test.phosphates != null && test.phosphates > 0.2) {
    actions.push({
      order: actions.length + 1,
      action: 'Traiter les phosphates',
      actionKey: 'iaTreatPhosphates',
      detail: `Phosphates ${test.phosphates} mg/L : nourrissent les algues. Utiliser un réducteur de phosphates.`,
      detailKey: 'iaTreatPhosphatesDetail',
      detailParams: { phosphates: test.phosphates },
    })
  }

  // 8. Filtration finale
  if (maxFiltration > 0) {
    actions.push({
      order: actions.length + 1,
      action: 'Maintenir la filtration',
      actionKey: 'iaMaintainFiltration',
      detail: `Filtrer au moins ${maxFiltration}h pour bien répartir les produits.`,
      detailKey: 'iaMaintainFiltrationHours',
      detailParams: { hours: maxFiltration },
    })
  } else {
    actions.push({
      order: actions.length + 1,
      action: 'Maintenir la filtration',
      actionKey: 'iaMaintainFiltration',
      detail: 'Filtration normale (moitié de la température de l\'eau en heures).',
      detailKey: 'iaMaintainFiltrationNormal',
    })
  }

  // Re-test
  if (minRetest < 24) {
    actions.push({
      order: actions.length + 1,
      action: 'Re-tester l\'eau',
      actionKey: 'iaRetest',
      detail: `Refaire un test dans ${minRetest}h pour vérifier l'effet.`,
      detailKey: 'iaRetestHours',
      detailParams: { hours: minRetest },
    })
  } else {
    actions.push({
      order: actions.length + 1,
      action: 'Re-tester l\'eau',
      actionKey: 'iaRetest',
      detail: 'Refaire un test dans 24-48h.',
      detailKey: 'iaRetestDefault',
    })
  }

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

  const diagnosisResult = buildDiagnosis(test, cwi, severity, swim.status)

  const totalCost = dosages.reduce((sum, d) => {
    const m = d.estimatedCost.match(/[\d.]+/)
    return sum + (m ? parseFloat(m[0]) : 0)
  }, 0)

  // Translate shouldCallProfessional result into the legacy string + parallel key
  const proAdvice = shouldCallProfessional(test)
  const whenToCallProfessional: string | null = proAdvice ? proAdvice.message : null
  const whenToCallProfessionalKey: string | null = proAdvice ? proAdvice.messageKey : null
  const whenToCallProfessionalParams: Record<string, string | number> | null = proAdvice?.messageParams ?? null

  return {
    diagnosis: diagnosisResult.diagnosis,
    diagnosisKey: diagnosisResult.diagnosisKey,
    diagnosisParams: diagnosisResult.diagnosisParams,
    severity,
    confidence: 0.9, // déterministe donc confiance élevée
    immediateActions: actions,
    chemicalDosages: dosages,
    filtrationHours: maxFiltration,
    retestInHours: minRetest,
    swimSafety: swim.status,
    swimReasons: swim.reasons,
    swimReasonKeys: swim.reasonKeys,
    swimReasonParams: swim.reasonParams,
    doNotDo,
    doNotDoKeys,
    estimatedCost: totalCost > 0 ? `≈ ${totalCost.toFixed(2)} €` : '—',
    whenToCallProfessional,
    whenToCallProfessionalKey,
    whenToCallProfessionalParams,
    clearWaterIndex: cwi,
    lsi,
    lsiLabel: lsiInfo.label,
    lsiLabelKey: lsiInfo.labelKey,
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

interface DiagnosisResult {
  diagnosis: string
  diagnosisKey: string
  diagnosisParams: Record<string, string | number>
}

function buildDiagnosis(test: WaterTestInput, cwi: number, severity: string, swim: string): DiagnosisResult {
  // Issues are built as parallel arrays: French literal fragments + their
  // translation keys (under the `actionPlan` namespace) + ICU params.
  const issues: string[] = []
  const issueKeys: string[] = []
  const issueParams: Record<string, string | number>[] = []

  if (evaluateParam('ph', test.ph) !== 'ok') {
    issues.push(`pH ${test.ph}`)
    issueKeys.push('issuePh')
    issueParams.push({ ph: test.ph })
  }
  if (test.freeChlorine != null && evaluateParam('freeChlorine', test.freeChlorine) !== 'ok') {
    issues.push(`chlore libre ${test.freeChlorine} mg/L`)
    issueKeys.push('issueFreeChlorine')
    issueParams.push({ chlorine: test.freeChlorine })
  }
  if (test.combinedChlorine != null && test.combinedChlorine > 0.4) {
    issues.push(`chloramines élevées`)
    issueKeys.push('issueCombinedChlorine')
    issueParams.push({})
  }
  if (test.alkalinity != null && evaluateParam('alkalinity', test.alkalinity) !== 'ok') {
    issues.push(`TAC ${test.alkalinity}`)
    issueKeys.push('issueTac')
    issueParams.push({ tac: test.alkalinity })
  }

  if (issues.length === 0) {
    return {
      diagnosis: `Votre eau est globalement équilibrée (indice ${cwi}/100). Maintenez le rythme de tests et de filtration. Baignade : ${swimLabel(swim)}.`,
      diagnosisKey: 'diagBalanced',
      diagnosisParams: { cwi, swim: swimKey(swim) },
    }
  }

  const sevLabel = severity === 'urgent' ? 'URGENT' : severity === 'high' ? 'Action recommandée' : 'À surveiller'
  const sevLabelKey = severity === 'urgent' ? 'sevLabelUrgent' : severity === 'high' ? 'sevLabelHigh' : 'sevLabelMedium'
  return {
    diagnosis: `Diagnostic (${sevLabel}) — indice eau claire ${cwi}/100. Points à traiter : ${issues.join(', ')}. Suivez le plan d'action ordonné ci-dessous. Baignade : ${swimLabel(swim)}.`,
    diagnosisKey: 'diagIssues',
    diagnosisParams: {
      sevLabel: sevLabelKey,
      cwi,
      issues: issues.join(', '),
      issueKeys: issueKeys.join(','),
      issueParams: JSON.stringify(issueParams),
      swim: swimKey(swim),
    },
  }
}

function swimLabel(status: string): string {
  switch (status) {
    case 'allowed': return 'autorisée'
    case 'avoid': return 'déconseillée'
    case 'forbidden': return 'interdite'
    default: return 'à confirmer après mesures'
  }
}

function swimKey(status: string): string {
  switch (status) {
    case 'allowed': return 'swimLabelAllowed'
    case 'avoid': return 'swimLabelAvoid'
    case 'forbidden': return 'swimLabelForbidden'
    default: return 'swimLabelUnknown'
  }
}
