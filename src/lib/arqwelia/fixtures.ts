/**
 * ARQWELIA Lot 1 — Fixture/demo data for the simulated analysis.
 *
 * IMPORTANT: everything in this module is SIMULATED. No real AI, no real
 * image analysis, no real constraint detection. Used by:
 *   - the "Voir la démonstration" path (no user upload)
 *   - the analysis step (deterministic result based on questionnaire answers)
 *
 * Namespaced under `arqwelia/fixtures` so it's easy to grep. Never imported
 * by production billing/auth/subscription code.
 */
import type { ArqQuestionnaireData, ArqProjectType, ArqStyle, ArqConcept } from './types'

export interface ArqAnalysisStep {
  key: 'photos' | 'zone' | 'constraints' | 'concepts'
  label: string
  /** ms before this step completes — for the visual progression */
  durationMs: number
}

export const ANALYSIS_STEPS_FR: ArqAnalysisStep[] = [
  { key: 'photos', label: 'Photos reçues', durationMs: 1200 },
  { key: 'zone', label: 'Zone principale détectée', durationMs: 1600 },
  { key: 'constraints', label: 'Contraintes estimées', durationMs: 1800 },
  { key: 'concepts', label: 'Concepts préparés', durationMs: 1400 },
]

/** Demo fixture photos (transparent/placeholder SVGs shown as garden previews). */
export const DEMO_PHOTOS = [
  { id: 'demo-1', name: 'jardin-sud.png', size: 0, type: 'image/png', dataUrl: '' },
  { id: 'demo-2', name: 'jardin-est.png', size: 0, type: 'image/png', dataUrl: '' },
] as const

export interface ArqConceptCard {
  id: ArqConcept
  title: string
  subtitle: string
  tone: 'realiste' | 'inspiration'
  dimensions: string
  badgeSun: string
  badgeAccess: string
  badgeBudget: string
}

/** Build two concept cards coherent with the questionnaire answers. */
export function buildConcepts(q: Partial<ArqQuestionnaireData>): ArqConceptCard[] {
  const surf = surfaceByType(q.projectType)
  const budget = budgetLabel(q.budget)
  const style = styleLabel(q.style)

  return [
    {
      id: 'A',
      title: 'Concept A — Réaliste',
      subtitle: 'Dimensions prudents, insertion respectueuse du terrain',
      tone: 'realiste',
      dimensions: `${surf.longueur} × ${surf.largeur} m — ${surf.profondeur} m de profondeur`,
      badgeSun: 'Ensoleillement : à confirmer sur place',
      badgeAccess: 'Accès engin : à confirmer',
      badgeBudget: `Budget déclaré : ${budget}`,
    },
    {
      id: 'B',
      title: 'Concept B — Inspiration',
      subtitle: 'Direction plus émotionnelle, jeux d\'eau et ambiance',
      tone: 'inspiration',
      dimensions: `${surf.longueur} × ${surf.largeur} m — variantes de profondeur`,
      badgeSun: 'Ensoleillement : à confirmer sur place',
      badgeAccess: 'Accès : à confirmer',
      badgeBudget: `Budget déclaré : ${budget} — ${style}`,
    },
  ]
}

function surfaceByType(type?: ArqProjectType) {
  switch (type) {
    case 'mini_piscine':
      return { longueur: 4, largeur: 2.5, profondeur: 1.4 }
    case 'spa_swim_spa':
      return { longueur: 5, largeur: 2.4, profondeur: 1.35 }
    case 'piscine_enterrée':
    default:
      return { longueur: 8, largeur: 4, profondeur: 1.5 }
  }
}

function budgetLabel(b?: string) {
  switch (b) {
    case '<25k':
      return 'moins de 25 k€'
    case '25-40k':
      return '25 à 40 k€'
    case '40-60k':
      return '40 à 60 k€'
    case '>60k':
      return '60 k€ et plus'
    default:
      return 'non défini'
  }
}

function styleLabel(s?: ArqStyle) {
  switch (s) {
    case 'mediterranean':
      return 'style méditerranéen'
    case 'contemporary':
      return 'style contemporain'
    case 'natural':
      return 'style naturel'
    case 'familial':
      return 'style familial'
    default:
      return 'style libre'
  }
}

/** Reality Score of demonstration — a deterministic 0-100 derived from inputs. */
export function demoRealityScore(q: Partial<ArqQuestionnaireData>): number {
  let score = 40
  if (q.projectType) score += 12
  if (q.timeline && q.timeline !== 'undecided') score += 10
  if (q.budget && q.budget !== 'undefined') score += 12
  if (q.style) score += 8
  if (q.knownMeasureValue && q.knownMeasureValue > 0) score += 8
  return Math.max(0, Math.min(100, score))
}

/** Anonymous pro preview fixture — no contact revealed. */
export const DEMO_PRO_OPPORTUNITY = {
  projectType: 'piscine_enterrée' as ArqProjectType,
  zoneApprox: 'Sud-Ouest (zone anonymisée)',
  budget: '25-40k' as const,
  timeline: '6-12m' as const,
  completeness: 78,
  maturityScore: 64,
  contactRevealed: false,
}
