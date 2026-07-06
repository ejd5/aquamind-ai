// Règles de sécurité baignade + interdictions produits
// Déterministe, prioritaire sur l'IA.

import { evaluateParam } from './targets'

export type SwimStatus = 'allowed' | 'avoid' | 'forbidden' | 'unknown'

export interface SwimAssessment {
  status: SwimStatus
  reasons: string[]
}

export function assessSwimSafety(test: {
  ph: number
  freeChlorine?: number | null
  combinedChlorine?: number | null
  cyanuricAcid?: number | null
  temperature?: number | null
}): SwimAssessment {
  const reasons: string[] = []
  let status: SwimStatus = 'allowed'

  const phStatus = evaluateParam('ph', test.ph)
  if (phStatus === 'low_critical' || phStatus === 'high_critical') {
    status = 'forbidden'
    reasons.push(`pH ${test.ph} hors plage de sécurité (${phStatus === 'low_critical' ? 'trop acide' : 'trop basique'}).`)
  } else if (phStatus === 'low_warning' || phStatus === 'high_warning') {
    if (status !== 'forbidden') status = 'avoid'
    reasons.push(`pH ${test.ph} légèrement hors plage idéale.`)
  }

  if (test.freeChlorine != null) {
    const cya = test.cyanuricAcid ?? 0
    const upperLimit = cya > 30 ? 5 : 4
    if (test.freeChlorine < 0.5) {
      status = 'forbidden'
      reasons.push('Chlore libre insuffisant : désinfection non assurée.')
    } else if (test.freeChlorine > upperLimit) {
      status = 'forbidden'
      reasons.push(`Chlore libre ${test.freeChlorine} mg/L trop élevé : irritation, surdosage.`)
    } else if (test.freeChlorine > 3 && cya <= 30) {
      if (status !== 'forbidden') status = 'avoid'
      reasons.push('Chlore libre en limite haute.')
    }
  } else {
    if (status !== 'forbidden') status = 'unknown'
    reasons.push('Chlore libre non mesuré.')
  }

  if (test.combinedChlorine != null && test.combinedChlorine > 0.4) {
    status = 'forbidden'
    reasons.push(`Chlore combiné ${test.combinedChlorine} mg/L : chloramines irritantes, odeur forte.`)
  }

  return { status, reasons }
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

export function shouldCallProfessional(test: {
  ph: number
  freeChlorine?: number | null
  combinedChlorine?: number | null
}): string | null {
  if (test.ph < 6.5 || test.ph > 8.2) {
    return 'pH extrême : un professionnel peut aider à rééquilibrer sans risque.'
  }
  if (test.freeChlorine != null && test.freeChlorine > 10) {
    return 'Surchloration massive : envisagez une dilution partielle ou un pro.'
  }
  if (test.combinedChlorine != null && test.combinedChlorine > 1) {
    return 'Chloramines très élevées : choc nécessaire, un pro peut piloter l\'opération.'
  }
  return null
}
