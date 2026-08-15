/**
 * AQWELIA PR #96 — a scientifically INSUFFICIENT / partial water assessment must
 * NEVER be presented as a complete "globalement équilibrée / eau parfaite".
 *
 * - pH-only (in target) → partial diagnosis, no global "100/100" claim.
 * - pH-only (out of target) → the real pH anomaly stays visible AND the global
 *   balance stays "insufficient".
 * - No measured temperature → no temperature-derived filtration duration.
 * - A complete balanced test → the balanced conclusion is still available.
 */
import { describe, it, expect } from 'vitest'
import { generateScientificallyQualifiedActionPlan } from '@/lib/pool/scientific-action-plan'
import { generateActionPlan } from '@/lib/pool/action-plan'
import {
  isInsufficientAssessment,
  isInsufficientQualityScore,
  assessScientificQuality,
} from '@/lib/pool/scientific-quality'
import { calculateClearWaterIndex } from '@/lib/pool/water-balance'

const chlorinePool = {
  volume: 50,
  unit: 'm3' as const,
  treatmentType: 'chlorine',
  saltSystem: false,
  waterBodyType: 'pool',
  filterType: 'sand',
}

const phOnlyInTarget = {
  ph: 7.2,
  freeChlorine: null,
  totalChlorine: null,
  combinedChlorine: null,
  alkalinity: null,
  calciumHardness: null,
  cyanuricAcid: null,
  salt: null,
  phosphates: null,
  temperature: null,
  totalDissolvedSolids: null,
}

const completeTest = {
  ph: 7.2,
  freeChlorine: 2.0,
  totalChlorine: 2.2,
  combinedChlorine: 0.2,
  alkalinity: 100,
  calciumHardness: 300,
  cyanuricAcid: 40,
  salt: null,
  phosphates: 0.05,
  temperature: 26,
  totalDissolvedSolids: 1000,
}

describe('A. pH seul correct => faible confiance => PAS de conclusion globale équilibrée', () => {
  it('scientific quality is insufficient', () => {
    const quality = assessScientificQuality(phOnlyInTarget, chlorinePool)
    expect(quality.score).toBeLessThan(0.4)
    expect(isInsufficientAssessment(quality)).toBe(true)
    expect(isInsufficientQualityScore(quality.score)).toBe(true)
  })

  it('the qualified plan uses the partial diagnosis (no "globalement équilibrée")', () => {
    const plan = generateScientificallyQualifiedActionPlan(phOnlyInTarget, chlorinePool, 'fr')
    expect(plan.diagnosisKey).toBe('diagPartial')
    expect(plan.diagnosis).toContain("Données insuffisantes pour évaluer l'équilibre global")
    expect(plan.diagnosis).not.toContain('globalement équilibrée')
    // No global CWI score is claimed.
    expect(plan.diagnosis).not.toMatch(/\b100\/100\b/)
    // Severity must not read as "Équilibrée".
    expect(plan.severity).toBe('insufficient')
    // Swim stays "à confirmer".
    expect(plan.swimSafety).toBe('unknown')
  })

  it('clearWaterIndex is 100 internally but must not be the presented global conclusion', () => {
    // Confirms WHY the misleading 100/100 happened: the CWI starts at 100 and
    // only penalizes measured out-of-range values.
    expect(calculateClearWaterIndex(phOnlyInTarget)).toBe(100)
  })
})

describe('B. pH seul hors cible => anomalie visible ET bilan global incomplet', () => {
  const phOnlyHigh = { ...phOnlyInTarget, ph: 8.3 }

  it('the pH anomaly stays visible while the global balance is flagged insufficient', () => {
    const plan = generateScientificallyQualifiedActionPlan(phOnlyHigh, chlorinePool, 'fr')
    expect(plan.diagnosisKey).toBe('diagPartialIssues')
    expect(plan.diagnosis).toMatch(/Anomalie|pH/)
    expect(plan.diagnosis).toContain("Données insuffisantes pour évaluer l'équilibre global")
    // Not "globalement équilibrée", no fabricated global 100/100.
    expect(plan.diagnosis).not.toContain('globalement équilibrée')
    expect(plan.diagnosis).not.toMatch(/\b100\/100\b/)
  })
})

describe('C. température absente => PAS de durée de filtration calculée depuis température', () => {
  it('legacy engine emits the prudent no-temperature filtration message', () => {
    const plan = generateActionPlan(phOnlyInTarget, chlorinePool)
    const filtration = plan.immediateActions.find((a) => a.actionKey === 'iaMaintainFiltration')
    expect(filtration).toBeTruthy()
    expect(filtration?.detailKey).toBe('iaMaintainFiltrationNoTemp')
    expect(filtration?.detail).not.toMatch(/température de l\'eau en heures|moitié/i)
    // No numeric hours from temperature.
    expect(filtration?.detailParams?.hours).toBeUndefined()
  })

  it('with a real temperature the normal duration message is kept', () => {
    const plan = generateActionPlan({ ...phOnlyInTarget, temperature: 26 }, chlorinePool)
    const filtration = plan.immediateActions.find((a) => a.actionKey === 'iaMaintainFiltration')
    expect(filtration?.detailKey).toBe('iaMaintainFiltrationNormal')
  })
})

describe('D. analyse complète équilibrée => conclusion équilibrée toujours disponible', () => {
  it('a complete balanced test keeps the balanced conclusion', () => {
    const plan = generateScientificallyQualifiedActionPlan(completeTest, chlorinePool, 'fr')
    expect(isInsufficientAssessment(plan.scientificQuality)).toBe(false)
    expect(plan.diagnosisKey).toBe('diagBalanced')
    expect(plan.diagnosis).toContain('globalement équilibrée')
    expect(plan.severity).not.toBe('insufficient')
  })
})

describe('E. aucune régression PR #95 / signaux existants', () => {
  it('isInsufficientAssessment(null) fails closed (no assessment → partial)', () => {
    expect(isInsufficientAssessment(null)).toBe(true)
    expect(isInsufficientAssessment(undefined)).toBe(true)
    expect(isInsufficientQualityScore(null)).toBe(true)
    expect(isInsufficientQualityScore(undefined)).toBe(true)
  })

  it('a high-quality complete assessment is not gated', () => {
    expect(isInsufficientQualityScore(0.95)).toBe(false)
    expect(isInsufficientAssessment({ level: 'high' })).toBe(false)
    expect(isInsufficientAssessment({ level: 'medium' })).toBe(false)
    expect(isInsufficientAssessment({ level: 'low' })).toBe(false)
  })
})
