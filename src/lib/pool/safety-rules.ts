// Règles de sécurité baignade + interdictions produits
// Déterministe, prioritaire sur l'IA.
//
// i18n: parallel `*Key` / `*Params` fields are exposed alongside the legacy
// French literals so consumers (action-plan.ts, module-dashboard.tsx) can
// translate them via next-intl. French literals are kept for backward compat.

import { evaluateParam } from './targets'

export type SwimStatus = 'allowed' | 'avoid' | 'forbidden' | 'unknown'

export interface SwimAssessment {
  status: SwimStatus
  reasons: string[]
  // Parallel arrays to `reasons` — same length, same order. Each entry holds
  // a dotted translation key (e.g. "actionPlan.swimReasonPhCriticalAcidic")
  // and optional ICU params for that reason.
  reasonKeys: string[]
  reasonParams: Record<string, string | number>[]
}

export function assessSwimSafety(test: {
  ph: number
  freeChlorine?: number | null
  combinedChlorine?: number | null
  cyanuricAcid?: number | null
  temperature?: number | null
}): SwimAssessment {
  const reasons: string[] = []
  const reasonKeys: string[] = []
  const reasonParams: Record<string, string | number>[] = []
  let status: SwimStatus = 'allowed'

  const phStatus = evaluateParam('ph', test.ph)
  if (phStatus === 'low_critical' || phStatus === 'high_critical') {
    status = 'forbidden'
    if (phStatus === 'low_critical') {
      reasons.push(`pH ${test.ph} hors plage de sécurité (trop acide).`)
      reasonKeys.push('swimReasonPhCriticalAcidic')
      reasonParams.push({ ph: test.ph })
    } else {
      reasons.push(`pH ${test.ph} hors plage de sécurité (trop basique).`)
      reasonKeys.push('swimReasonPhCriticalBasic')
      reasonParams.push({ ph: test.ph })
    }
  } else if (phStatus === 'low_warning' || phStatus === 'high_warning') {
    if (status !== 'forbidden') status = 'avoid'
    reasons.push(`pH ${test.ph} légèrement hors plage idéale.`)
    reasonKeys.push('swimReasonPhWarning')
    reasonParams.push({ ph: test.ph })
  }

  if (test.freeChlorine != null) {
    const cya = test.cyanuricAcid ?? 0
    const upperLimit = cya > 30 ? 5 : 4
    if (test.freeChlorine < 0.5) {
      status = 'forbidden'
      reasons.push('Chlore libre insuffisant : désinfection non assurée.')
      reasonKeys.push('swimReasonChlorineInsufficient')
      reasonParams.push({})
    } else if (test.freeChlorine > upperLimit) {
      status = 'forbidden'
      reasons.push(`Chlore libre ${test.freeChlorine} mg/L trop élevé : irritation, surdosage.`)
      reasonKeys.push('swimReasonChlorineTooHigh')
      reasonParams.push({ chlorine: test.freeChlorine })
    } else if (test.freeChlorine > 3 && cya <= 30) {
      if (status !== 'forbidden') status = 'avoid'
      reasons.push('Chlore libre en limite haute.')
      reasonKeys.push('swimReasonChlorineHighLimit')
      reasonParams.push({})
    }
  } else {
    if (status !== 'forbidden') status = 'unknown'
    reasons.push('Chlore libre non mesuré.')
    reasonKeys.push('swimReasonChlorineNotMeasured')
    reasonParams.push({})
  }

  if (test.combinedChlorine != null && test.combinedChlorine > 0.4) {
    status = 'forbidden'
    reasons.push(`Chlore combiné ${test.combinedChlorine} mg/L : chloramines irritantes, odeur forte.`)
    reasonKeys.push('swimReasonCombinedChlorine')
    reasonParams.push({ combined: test.combinedChlorine })
  }

  return { status, reasons, reasonKeys, reasonParams }
}

export const FORBIDDEN_ACTIONS = [
  'Ne jamais mélanger deux produits chimiques différents (chlore + acide = gaz toxique).',
  'Ne jamais verser du produit pur directement dans la piscine sans dilution (sauf sel).',
  'Ne jamais ajouter de l\'eau dans un produit acide : toujours ajouter le produit dans l\'eau.',
  'Ne jamais faire une chloration choc sans avoir vérifié le pH au préalable.',
  'Ne jamais se baigner pendant ou juste après un traitement choc.',
  'Ne jamais stocker chlore et acide côte à côte.',
  'Ne pas dépasser 50 mg/L de stabilisant (CYA) : le chlore devient inefficace.',
]

// Parallel to FORBIDDEN_ACTIONS — same length, same order. Each entry is a
// dotted key into the `actionPlan` namespace (e.g. "actionPlan.dndNoMixChemicals").
// Consumers should use the key for display and fall back to the French literal
// when the key is missing (e.g. older persisted data).
export const FORBIDDEN_ACTION_KEYS: string[] = [
  'dndNoMixChemicals',
  'dndNoPurePour',
  'dndWaterIntoAcid',
  'dndNoShockWithoutPh',
  'dndNoBathAfterShock',
  'dndNoStoreChlorineAcid',
  'dndNoCyaOver50',
]

export function safetyWarningsForDosage(param: string): string[] {
  const w: string[] = []
  if (param === 'ph_minus') {
    w.push('Ne jamais mélanger pH- et chlore : dégagement de gaz toxique.')
  }
  if (param === 'chlorine_shock') {
    w.push('Toujours vérifier pH avant choc. Baignade interdite 8h minimum.')
  }
  return w
}

// `shouldCallProfessional` now returns a structured object so action-plan.ts
// can surface both the French literal (legacy) AND a translation key/params
// for the consumer. Returns null when no professional call is needed.
export interface ProfessionalAdvice {
  message: string
  messageKey: string
  messageParams?: Record<string, string | number>
}

export function shouldCallProfessional(test: {
  ph: number
  freeChlorine?: number | null
  combinedChlorine?: number | null
}): ProfessionalAdvice | null {
  if (test.ph < 6.5 || test.ph > 8.2) {
    return {
      message: 'pH extrême : un professionnel peut aider à rééquilibrer sans risque.',
      messageKey: 'proPhExtreme',
    }
  }
  if (test.freeChlorine != null && test.freeChlorine > 10) {
    return {
      message: 'Surchloration massive : envisagez une dilution partielle ou un pro.',
      messageKey: 'proOverChlorination',
    }
  }
  if (test.combinedChlorine != null && test.combinedChlorine > 1) {
    return {
      message: 'Chloramines très élevées : choc nécessaire, un pro peut piloter l\'opération.',
      messageKey: 'proHighChloramines',
    }
  }
  return null
}
