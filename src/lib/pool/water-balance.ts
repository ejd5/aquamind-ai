// Équilibre de l'eau : indice de saturation de Langelier (LSI) + indice eau claire
//
// P1 Scientific Quality: LSI now follows the US EPA pHs equation and is only
// emitted when every required measurement is present and plausible. No silent
// 25 °C or TDS assumption is used.
//
// i18n: parallel `*Key` fields are exposed alongside the legacy French
// literals so consumers can translate them via next-intl.

import { evaluateParam } from './targets'
import {
  isScientificallyValidMeasurement,
  type ScientificMeasurementKey,
} from './scientific-quality'

export const LSI_METHOD_VERSION = 'epa-phs-9.3-v1' as const

export interface LsiInput {
  ph: number
  temperature?: number | null
  calciumHardness?: number | null
  alkalinity?: number | null
  /** Total dissolved solids in mg/L. */
  totalDissolvedSolids?: number | null
}

export interface LsiCalculation {
  value: number | null
  saturationPh: number | null
  missingInputs: ScientificMeasurementKey[]
  invalidInputs: ScientificMeasurementKey[]
  methodVersion: typeof LSI_METHOD_VERSION
  estimated: false
}

/**
 * US EPA pHs relationship:
 *   LSI = pH - pHs
 *   pHs = (9.3 + A + B) - (C + D)
 *   A = (log10(TDS) - 1) / 10
 *   B = -13.12 × log10(temperature °C + 273) + 34.55
 *   C = log10(calcium hardness as CaCO3) - 0.4
 *   D = log10(total alkalinity as CaCO3)
 */
export function calculateLsiAssessment(test: LsiInput): LsiCalculation {
  const required: Array<[ScientificMeasurementKey, number | null | undefined]> = [
    ['ph', test.ph],
    ['temperature', test.temperature],
    ['calciumHardness', test.calciumHardness],
    ['alkalinity', test.alkalinity],
    ['totalDissolvedSolids', test.totalDissolvedSolids],
  ]

  const missingInputs = required
    .filter(([, value]) => value == null)
    .map(([key]) => key)
  const invalidInputs = required
    .filter(([, value]) => value != null)
    .filter(([key, value]) => !isScientificallyValidMeasurement(key, value))
    .map(([key]) => key)

  if (missingInputs.length > 0 || invalidInputs.length > 0) {
    return {
      value: null,
      saturationPh: null,
      missingInputs,
      invalidInputs,
      methodVersion: LSI_METHOD_VERSION,
      estimated: false,
    }
  }

  const temperature = test.temperature as number
  const calcium = test.calciumHardness as number
  const alkalinity = test.alkalinity as number
  const tds = test.totalDissolvedSolids as number

  // Logarithmic terms require positive concentrations. Zero can be physically
  // represented by a test result, but cannot yield a valid pHs calculation.
  if (calcium <= 0 || alkalinity <= 0 || tds <= 0 || temperature <= -273) {
    const logarithmicInvalid: ScientificMeasurementKey[] = []
    if (calcium <= 0) logarithmicInvalid.push('calciumHardness')
    if (alkalinity <= 0) logarithmicInvalid.push('alkalinity')
    if (tds <= 0) logarithmicInvalid.push('totalDissolvedSolids')
    if (temperature <= -273) logarithmicInvalid.push('temperature')
    return {
      value: null,
      saturationPh: null,
      missingInputs: [],
      invalidInputs: logarithmicInvalid,
      methodVersion: LSI_METHOD_VERSION,
      estimated: false,
    }
  }

  const a = (Math.log10(tds) - 1) / 10
  const b = -13.12 * Math.log10(temperature + 273) + 34.55
  const c = Math.log10(calcium) - 0.4
  const d = Math.log10(alkalinity)
  const saturationPh = (9.3 + a + b) - (c + d)
  const value = test.ph - saturationPh

  return {
    value: Math.round(value * 100) / 100,
    saturationPh: Math.round(saturationPh * 100) / 100,
    missingInputs: [],
    invalidInputs: [],
    methodVersion: LSI_METHOD_VERSION,
    estimated: false,
  }
}

export function calculateLSI(test: LsiInput): number | null {
  return calculateLsiAssessment(test).value
}

export interface LsiInterpretation {
  label: string
  labelKey: string
  status: string
  advice: string
  adviceKey: string
}

export function lsiInterpretation(lsi: number | null): LsiInterpretation {
  if (lsi == null) {
    return {
      label: '—',
      labelKey: 'lsiMissingLabel',
      status: 'unknown',
      advice: 'Mesures requises manquantes ou invalides (TH, TAC, température, TDS).',
      adviceKey: 'lsiMissing',
    }
  }
  if (lsi < -0.5) {
    return {
      label: 'Eau agressive',
      labelKey: 'lsiAgressiveLabel',
      status: 'warning',
      advice: 'Risque corrosion. Augmenter TAC/TH ou pH.',
      adviceKey: 'lsiAgressiveAdvice',
    }
  }
  if (lsi < -0.3) {
    return {
      label: 'Légèrement agressive',
      labelKey: 'lsiSlightlyAgressiveLabel',
      status: 'warning',
      advice: 'Léger déséquilibre.',
      adviceKey: 'lsiSlightlyAgressiveAdvice',
    }
  }
  if (lsi <= 0.3) {
    return {
      label: 'Équilibrée',
      labelKey: 'lsiBalancedLabel',
      status: 'ok',
      advice: 'Équilibre idéal.',
      adviceKey: 'lsiBalancedAdvice',
    }
  }
  if (lsi <= 0.5) {
    return {
      label: 'Légèrement entartrante',
      labelKey: 'lsiSlightlyScalingLabel',
      status: 'warning',
      advice: 'Léger risque tartre.',
      adviceKey: 'lsiSlightlyScalingAdvice',
    }
  }
  return {
    label: 'Entartrante',
    labelKey: 'lsiScalingLabel',
    status: 'warning',
    advice: 'Risque tartre. Baisser pH/TAC.',
    adviceKey: 'lsiScalingAdvice',
  }
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

export interface ClarityLabel {
  label: string
  labelKey: string
  status: string
  color: string
}

export function clarityLabel(score: number): ClarityLabel {
  if (score >= 85) return { label: 'Eau parfaite', labelKey: 'clarityPerfect', status: 'ok', color: 'accent' }
  if (score >= 65) return { label: 'À surveiller', labelKey: 'clarityWatch', status: 'warning', color: 'yellow' }
  if (score >= 40) return { label: 'Action recommandée', labelKey: 'clarityAction', status: 'warning', color: 'orange' }
  return { label: 'Urgence', labelKey: 'clarityUrgent', status: 'critical', color: 'destructive' }
}
