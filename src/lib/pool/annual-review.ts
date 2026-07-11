// AQWELIA Annual Review — Saison-Bilan engine.
//
// Pure function `generateAnnualReview(waterTests, actionPlans, diagnostics, profile)`
// returns an `AnnualReview` summarizing a pool season: total tests, incidents
// (critical-status tests), products consumed (from inventory), total spent,
// actions count, interventions count, and a list of recommendations for the
// next season.
//
// i18n strategy: every recommendation is exposed as a translation key under
// the `annualReview` namespace (recommendations.recos.*). French fallbacks
// are kept ONLY because `src/lib/pool/*` files are exempt from the pre-commit
// hardcoded-strings check.
//
// Consumed by:
//   - GET /api/pool/annual-review  (server route, persists nothing)
//   - <AnnualReviewWidget />       (dashboard card)

export interface AnnualReviewWaterTest {
  createdAt: Date | string
  status?: string | null
  clearWaterIndex?: number | null
  ph?: number | null
  freeChlorine?: number | null
  bromine?: number | null
  combinedChlorine?: number | null
}

export interface AnnualReviewActionPlan {
  createdAt: Date | string
  severity?: string | null
}

export interface AnnualReviewDiagnostic {
  createdAt: Date | string
  confidence?: number | null
}

export interface AnnualReviewProduct {
  productName: string
  category: string
  quantity: number
  unit: string
  price?: number | null
}

export interface AnnualReviewReminder {
  createdAt: Date | string
  type?: string | null
}

export interface AnnualReviewProfile {
  volume?: number | null
  treatmentType?: string | null
  waterBodyType?: string | null
}

export interface AnnualReview {
  /** Season label, e.g. "2025" (calendar year) or "2024-2025" (winter-spanning). */
  season: string
  /** Total number of water tests during the season. */
  totalTests: number
  /** Number of incidents (tests with status='critical' or CWI < 50). */
  incidents: number
  /** Total products consumed (count of inventory items used). */
  productsConsumed: number
  /** Total € spent (sum of product prices × quantity). */
  totalSpent: number
  /** Number of action plans generated. */
  actionsCount: number
  /** Number of interventions (proxied by reminders with type containing 'filter_clean' or 'cell_clean'). */
  interventionsCount: number
  /** Average clear water index across the season (0 if no tests). */
  avgClearWaterIndex: number
  /** Recommendation keys (translation keys under `annualReview.recos.*`). */
  recommendations: string[]
  /** French fallbacks for each recommendation (same order). */
  recommendationsFr: string[]
  /** ISO date the review was generated. */
  generatedAt: string
}

/**
 * Generate an annual review for the given water tests, action plans,
 * diagnostics, products, reminders, and profile.
 *
 * The "season" is the calendar year of the most recent test (or the current
 * year if no tests). All inputs are pre-filtered by the API to the relevant
 * season window — this function just aggregates.
 */
export function generateAnnualReview(
  waterTests: AnnualReviewWaterTest[],
  actionPlans: AnnualReviewActionPlan[],
  diagnostics: AnnualReviewDiagnostic[],
  profile: AnnualReviewProfile | null,
  products: AnnualReviewProduct[] = [],
  reminders: AnnualReviewReminder[] = [],
  now: Date = new Date(),
): AnnualReview {
  // Determine season label (calendar year of most recent test, or current year).
  const latestTestDate = waterTests.length
    ? new Date(
        waterTests.reduce((latest, t) => {
          const d = new Date(t.createdAt).getTime()
          return d > latest ? d : latest
        }, 0),
      )
    : now
  const season = String(latestTestDate.getFullYear())

  const totalTests = waterTests.length

  // Incidents: tests with status='critical' OR clearWaterIndex < 50
  const incidents = waterTests.filter(
    (t) => t.status === 'critical' || (typeof t.clearWaterIndex === 'number' && t.clearWaterIndex < 50),
  ).length

  // Average CWI
  const cwiValues = waterTests
    .map((t) => t.clearWaterIndex)
    .filter((v): v is number => typeof v === 'number' && v >= 0)
  const avgClearWaterIndex = cwiValues.length
    ? Math.round(cwiValues.reduce((s, v) => s + v, 0) / cwiValues.length)
    : 0

  // Products consumed & total spent
  const productsConsumed = products.length
  const totalSpent = products.reduce((sum, p) => {
    const price = typeof p.price === 'number' ? p.price : 0
    return sum + price * (p.quantity || 0)
  }, 0)

  // Actions count
  const actionsCount = actionPlans.length

  // Interventions — proxy: reminders of type filter_clean, cell_clean, equipment_maintenance
  const interventionTypes = new Set([
    'filter_clean',
    'cell_clean',
    'equipment_maintenance',
    'pump_check',
    'filter_replacement',
    'winterize',
    'startup',
  ])
  const interventionsCount = reminders.filter((r) => {
    const type = r.type?.toLowerCase() || ''
    return interventionTypes.has(type)
  }).length

  // Recommendations — translation keys under annualReview.recos.*
  const recommendations: string[] = []
  const recommendationsFr: string[] = []

  if (incidents > 5) {
    recommendations.push('annualReview.recos.tooManyIncidents')
    recommendationsFr.push('Trop d\'incidents cette saison : anticipez vos tests au printemps prochain.')
  }
  if (avgClearWaterIndex > 0 && avgClearWaterIndex < 70) {
    recommendations.push('annualReview.recos.lowCwi')
    recommendationsFr.push('Indice eau claire moyen bas : renforcez la filtration et les tests réguliers.')
  } else if (avgClearWaterIndex >= 90) {
    recommendations.push('annualReview.recos.excellentCwi')
    recommendationsFr.push('Excellent indice eau claire : maintenez ce rythme la saison prochaine.')
  }
  if (totalTests < 10) {
    recommendations.push('annualReview.recos.moreTests')
    recommendationsFr.push('Testez plus souvent la saison prochaine (objectif : 1 test/semaine).')
  }
  if (totalSpent > 200) {
    recommendations.push('annualReview.recos.optimizeBudget')
    recommendationsFr.push('Budget produits élevé : envisagez l\'achat en gros ou le rechargement auto.')
  }
  if (diagnostics.length > 3) {
    recommendations.push('annualReview.recos.manyDiagnostics')
    recommendationsFr.push('Plusieurs diagnostics photo : surveillez les algues dès le printemps.')
  }
  if (profile?.treatmentType === 'chlorine' && incidents > 2) {
    recommendations.push('annualReview.recos.considerSalt')
    recommendationsFr.push('Plusieurs incidents avec chlore : l\'électrolyse au sel pourrait simplifier l\'entretien.')
  }
  if (interventionsCount === 0) {
    recommendations.push('annualReview.recos.scheduleMaintenance')
    recommendationsFr.push('Aucune intervention enregistrée : planifiez un lavage de filtre mensuel.')
  }

  // Always include at least one generic recommendation
  if (recommendations.length === 0) {
    recommendations.push('annualReview.recos.keepGoing')
    recommendationsFr.push('Belle saison ! Continuez ainsi l\'année prochaine.')
  }

  return {
    season,
    totalTests,
    incidents,
    productsConsumed,
    totalSpent: Math.round(totalSpent * 100) / 100,
    actionsCount,
    interventionsCount,
    avgClearWaterIndex,
    recommendations,
    recommendationsFr,
    generatedAt: now.toISOString(),
  }
}
