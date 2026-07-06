// Équilibre de l'eau : indice de saturation de Langelier (LSI) + indice eau claire

import { evaluateParam } from './targets'

function tempFactor(tempC: number): number {
  if (tempC <= 0) return 0.0
  if (tempC <= 10) return 0.3
  if (tempC <= 20) return 0.7
  if (tempC <= 25) return 1.0
  if (tempC <= 30) return 1.3
  if (tempC <= 40) return 1.7
  return 2.0
}

function calciumFactor(th: number): number {
  if (th <= 50) return 1.5
  if (th <= 75) return 1.7
  if (th <= 100) return 1.9
  if (th <= 150) return 2.1
  if (th <= 200) return 2.3
  if (th <= 300) return 2.5
  if (th <= 400) return 2.6
  if (th <= 800) return 2.9
  return 3.1
}

function alkalinityFactor(tac: number): number {
  return Math.log10(tac) * 0.1 + 1.0
}

export function calculateLSI(test: {
  ph: number
  temperature?: number | null
  calciumHardness?: number | null
  alkalinity?: number | null
}): number | null {
  if (test.calciumHardness == null || test.alkalinity == null) return null
  const temp = test.temperature ?? 25
  const tf = tempFactor(temp)
  const cf = calciumFactor(test.calciumHardness)
  const af = alkalinityFactor(test.alkalinity)
  const lsi = test.ph + tf + cf + af - 12.1
  return Math.round(lsi * 100) / 100
}

export function lsiInterpretation(lsi: number | null): { label: string; status: string; advice: string } {
  if (lsi == null) return { label: '—', status: 'unknown', advice: 'Manque de données (TH, TAC, température).' }
  if (lsi < -0.5) return { label: 'Eau agressive', status: 'warning', advice: 'Risque corrosion. Augmenter TAC/TH ou pH.' }
  if (lsi < -0.3) return { label: 'Légèrement agressive', status: 'warning', advice: 'Léger déséquilibre.' }
  if (lsi <= 0.3) return { label: 'Équilibrée', status: 'ok', advice: 'Équilibre idéal.' }
  if (lsi <= 0.5) return { label: 'Légèrement entartrante', status: 'warning', advice: 'Léger risque tartre.' }
  return { label: 'Entartrante', status: 'warning', advice: 'Risque tartre. Baisser pH/TAC.' }
}

export function calculateClearWaterIndex(test: {
  ph: number
  freeChlorine?: number | null
  combinedChlorine?: number | null
  alkalinity?: number | null
  calciumHardness?: number | null
  cyanuricAcid?: number | null
  phosphates?: number | null
}): number {
  let score = 100
  const penalize = (key: string, val: number) => {
    const status = evaluateParam(key, val)
    if (status === 'low_warning' || status === 'high_warning') score -= 10
    if (status === 'low_critical' || status === 'high_critical') score -= 25
  }
  penalize('ph', test.ph)
  if (test.freeChlorine != null) penalize('freeChlorine', test.freeChlorine)
  if (test.combinedChlorine != null && test.combinedChlorine > 0.4) score -= 15
  if (test.alkalinity != null) penalize('alkalinity', test.alkalinity)
  if (test.calciumHardness != null) penalize('calciumHardness', test.calciumHardness)
  if (test.cyanuricAcid != null) penalize('cyanuricAcid', test.cyanuricAcid)
  if (test.phosphates != null && test.phosphates > 0.1) score -= 15
  return Math.max(0, Math.min(100, score))
}

export function clarityLabel(score: number): { label: string; status: string; color: string } {
  if (score >= 85) return { label: 'Eau parfaite', status: 'ok', color: 'accent' }
  if (score >= 65) return { label: 'À surveiller', status: 'warning', color: 'yellow' }
  if (score >= 40) return { label: 'Action recommandée', status: 'warning', color: 'orange' }
  return { label: 'Urgence', status: 'critical', color: 'destructive' }
}
