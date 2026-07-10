// AQWELIA — Savings Tracker engine.
//
// Models the cost difference between a traditional monthly pisciniste contract
// (~80 €/mo in France → ~960 €/yr) and the AQWELIA self-service approach
// (~30 €/mo in products → ~360 €/yr). The minimum yearly saving is therefore
// 50 €/mo × 12 = 600 €/yr.
//
// The engine is PURE: it takes a list of water tests (+ optional interventions)
// and returns a SavingsReport. It is consumed by:
//   - GET /api/pool/savings            (server route, persists nothing)
//   - <SavingsWidget />                (dashboard card with animated counter)
//
// i18n: every user-facing string is exposed as a translation key under the
// `modules.savings` namespace. French fallbacks are NOT embedded here — the
// widget renders exclusively via next-intl.

export const PISCINISTE_MONTHLY_COST = 80 // €/mo — average French pisciniste
export const AQWELIA_MONTHLY_COST = 30 // €/mo — products budget with AQWELIA
export const MONTHLY_SAVING = PISCINISTE_MONTHLY_COST - AQWELIA_MONTHLY_COST // 50 €
export const YEARLY_SAVING = MONTHLY_SAVING * 12 // 600 €

/** A pisciniste visit takes ~1h on site + ~30 min travel/admin ≈ 1.5 h. */
const HOURS_PER_INTERVENTION = 1.5
/** An AQWELIA water test takes ~5 min ≈ 0.083 h. */
const HOURS_PER_TEST = 0.083
/** Average interventions avoided per active month (in-season weighting). */
const INTERVENTIONS_PER_MONTH = 1.5

export interface SavingsWaterTest {
  createdAt: Date | string
}

export interface SavingsIntervention {
  createdAt: Date | string
  type?: string | null
}

export interface SavingsBadge {
  id: string
  /** € saved threshold to unlock. */
  threshold: number
  icon: string
  /** next-intl key under the `modules.savings` namespace. */
  titleKey: string
  unlocked: boolean
  unlockedAt?: Date | null
}

export interface SavingsTrendPoint {
  /** ISO month start (e.g. "2024-06-01T00:00:00.000Z"). */
  month: string
  /** € saved during this month (0 if before user's first test). */
  monthly: number
  /** Cumulative € saved up to and including this month. */
  cumulative: number
}

export interface SavingsReport {
  proMonthlyCost: number
  aqweliaMonthlyCost: number
  monthlySaving: number
  yearlySaving: number
  /** Total € saved since the user's first water test. */
  totalSaved: number
  /** € saved during the current calendar year. */
  totalSavedThisYear: number
  interventionsAvoided: number
  hoursSaved: number
  monthsActive: number
  monthsActiveThisYear: number
  trend: SavingsTrendPoint[]
  badges: SavingsBadge[]
  nextBadge: SavingsBadge | null
  /** 0–100 progress towards `nextBadge`. */
  progressToNext: number
  /** ISO date of the user's first water test (null if none). */
  startedAt: string | null
}

interface InternalBadgeDef {
  id: string
  threshold: number
  icon: string
  titleKey: string
}

export const SAVINGS_BADGES: InternalBadgeDef[] = [
  { id: 'savings_100', threshold: 100, icon: '💰', titleKey: 'savingsBadge100' },
  { id: 'savings_500', threshold: 500, icon: '🏆', titleKey: 'savingsBadge500' },
  { id: 'savings_1000', threshold: 1000, icon: '👑', titleKey: 'savingsBadge1000' },
]

function toMs(d: Date | string): number {
  return d instanceof Date ? d.getTime() : new Date(d).getTime()
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/**
 * Compute the user's savings report from their water-test history.
 *
 * `interventions` is optional and currently informational — it can be used to
 * refine `interventionsAvoided` if real pro-visit data is available. By
 * default we estimate from `monthsActive`.
 */
export function calculateSavings(
  waterTests: SavingsWaterTest[],
  interventions: SavingsIntervention[] = [],
): SavingsReport {
  const now = new Date()

  // Parse + sort tests ascending
  const tests = waterTests
    .map((t) => ({ raw: t, d: new Date(toMs(t.createdAt)) }))
    .filter((t) => !isNaN(t.d.getTime()))
    .sort((a, b) => a.d.getTime() - b.d.getTime())

  const firstTestAt = tests.length > 0 ? tests[0].d : null

  // Months active (1-indexed — the month of the first test counts as month 1)
  let monthsActive = 1
  if (firstTestAt) {
    const diffMs = now.getTime() - firstTestAt.getTime()
    const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24))
    monthsActive = Math.floor(diffDays / 30) + 1
  }

  // Months active this calendar year (from Jan 1 or firstTest, whichever is later)
  const yearStart = startOfMonth(new Date(now.getFullYear(), 0, 1))
  const yearRef = firstTestAt && firstTestAt > yearStart ? firstTestAt : yearStart
  const diffDaysY = Math.max(0, (now.getTime() - yearRef.getTime()) / (1000 * 60 * 60 * 24))
  const monthsActiveThisYear = Math.floor(diffDaysY / 30) + 1

  const totalSaved = monthsActive * MONTHLY_SAVING
  const totalSavedThisYear = monthsActiveThisYear * MONTHLY_SAVING

  // If real interventions are provided, prefer them; otherwise estimate.
  const realInterventions = interventions.filter(
    (i) => !isNaN(new Date(toMs(i.createdAt)).getTime()),
  )
  const interventionsAvoided =
    realInterventions.length > 0
      ? Math.max(realInterventions.length, Math.round(monthsActive * INTERVENTIONS_PER_MONTH))
      : Math.round(monthsActive * INTERVENTIONS_PER_MONTH)

  // Time saved = interventions avoided × (visit time − test time)
  const hoursSaved = Math.round(interventionsAvoided * (HOURS_PER_INTERVENTION - HOURS_PER_TEST) * 10) / 10

  // 6-month trend (monthly + cumulative)
  const trend: SavingsTrendPoint[] = []
  let cumulative = 0
  const firstTestMonth = firstTestAt ? startOfMonth(firstTestAt).getTime() : null
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStart = d.getTime()
    const inRange = firstTestMonth == null || monthStart >= firstTestMonth
    const monthly = inRange ? MONTHLY_SAVING : 0
    cumulative += monthly
    trend.push({ month: d.toISOString(), monthly, cumulative })
  }

  // Badges
  const badges: SavingsBadge[] = SAVINGS_BADGES.map((b) => {
    const unlocked = totalSaved >= b.threshold
    return {
      ...b,
      unlocked,
      unlockedAt: unlocked ? badgeUnlockedAt(b.threshold, firstTestAt) : undefined,
    }
  })

  const nextBadge = badges.find((b) => !b.unlocked) || null
  const prevThreshold = nextBadge
    ? badges.filter((b) => b.unlocked).reduce((m, b) => Math.max(m, b.threshold), 0)
    : 0
  const progressToNext = nextBadge
    ? Math.min(
        100,
        Math.round(((totalSaved - prevThreshold) / (nextBadge.threshold - prevThreshold)) * 100),
      )
    : 100

  return {
    proMonthlyCost: PISCINISTE_MONTHLY_COST,
    aqweliaMonthlyCost: AQWELIA_MONTHLY_COST,
    monthlySaving: MONTHLY_SAVING,
    yearlySaving: YEARLY_SAVING,
    totalSaved,
    totalSavedThisYear,
    interventionsAvoided,
    hoursSaved,
    monthsActive,
    monthsActiveThisYear,
    trend,
    badges,
    nextBadge,
    progressToNext,
    startedAt: firstTestAt ? firstTestAt.toISOString() : null,
  }
}

/**
 * Estimate when a savings badge was unlocked — the month at which cumulative
 * savings crossed `threshold`. Used for the "unlocked at" tooltip.
 */
function badgeUnlockedAt(threshold: number, firstTestAt: Date | null): Date | null {
  if (!firstTestAt) return null
  const monthsNeeded = Math.ceil(threshold / MONTHLY_SAVING)
  const d = new Date(firstTestAt.getFullYear(), firstTestAt.getMonth() + monthsNeeded - 1, 1)
  return d
}
