// AQWELIA — Gamification engine: badges, streaks, rank.
//
// Pure functions consumed by:
//   - GET /api/pool/gamification     (server route)
//   - <GamificationWidget />         (dashboard card with badge grid + streak)
//
// A "perfect day" = a day with at least one water test whose pH is in the
// ideal range [7.0, 7.4] AND clearWaterIndex ≥ 80. The streak counter walks
// back from the most recent perfect day, allowing a 1-day grace window so
// users who skip a single day don't lose their streak.
//
// i18n: every user-facing string is exposed as a translation key under the
// `modules.gamification` namespace. French fallbacks are NOT embedded here.

import { evaluateParam } from './targets'

export interface GamificationWaterTest {
  createdAt: Date | string
  ph: number
  freeChlorine?: number | null
  combinedChlorine?: number | null
  clearWaterIndex?: number | null
  /** 'ok' | 'warning' | 'critical' — DB status column. */
  status?: string | null
}

export interface GamificationActionPlan {
  createdAt: Date | string
  severity?: string | null
}

export interface GamificationProfile {
  createdAt?: Date | string
  /** Count of weather alerts the user anticipated (acted on). Optional. */
  weatherAnticipated?: number
  /** Count of weather problems NOT anticipated. 0 = unlocked. */
  weatherMissed?: number
}

export interface Badge {
  id: string
  icon: string
  /** next-intl key under `modules.gamification` namespace. */
  titleKey: string
  /** next-intl key under `modules.gamification` namespace. */
  descKey: string
  unlocked: boolean
  /** 0–100 progress towards unlock. */
  progress: number
  /** Human-readable progress (e.g. "3/4", "12/20"). */
  progressLabel?: string
}

export interface Streak {
  /** Current consecutive-day streak (with 1-day grace window). */
  current: number
  /** Best historical streak. */
  best: number
  unit: 'day'
}

export interface Rank {
  /** French fallback label (kept for debug — UI uses `tierKey`). */
  tier: string
  /** next-intl key under `modules.gamification` namespace. */
  tierKey: string
  /** 1–100, lower = better (e.g. 15 = top 15%). */
  percentile: number
}

export interface GamificationReport {
  badges: Badge[]
  streak: Streak
  rank: Rank
  totalBadges: number
  unlockedBadges: number
  nextBadge: Badge | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function toMs(d: Date | string): number {
  return d instanceof Date ? d.getTime() : new Date(d).getTime()
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfWeek(d: Date): Date {
  // Monday-based week
  const day = d.getDay() // 0=Sun, 1=Mon, ...
  const diff = (day === 0 ? -6 : 1 - day) // shift to Monday
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff))
}

function daysBetween(a: Date, b: Date): number {
  const aStart = startOfDay(a).getTime()
  const bStart = startOfDay(b).getTime()
  return Math.round((bStart - aStart) / (1000 * 60 * 60 * 24))
}

function isPerfectTest(t: GamificationWaterTest): boolean {
  if (t.ph < 7.0 || t.ph > 7.4) return false
  if (t.clearWaterIndex != null && t.clearWaterIndex < 80) return false
  if (t.status === 'critical') return false
  return true
}

function hasOverdosage(t: GamificationWaterTest): boolean {
  if (t.freeChlorine != null) {
    const s = evaluateParam('freeChlorine', t.freeChlorine)
    if (s === 'high_warning' || s === 'high_critical') return true
  }
  return false
}

// ─── Streak ──────────────────────────────────────────────────────────────

export function calculateStreak(waterTests: GamificationWaterTest[]): Streak {
  if (waterTests.length === 0) return { current: 0, best: 0, unit: 'day' }

  // Build set of perfect-day keys (YYYY-MM-DD)
  const perfectDays = new Set<string>()
  for (const t of waterTests) {
    const d = new Date(toMs(t.createdAt))
    if (isNaN(d.getTime())) continue
    if (isPerfectTest(t)) perfectDays.add(startOfDay(d).toISOString())
  }

  if (perfectDays.size === 0) return { current: 0, best: 0, unit: 'day' }

  const sortedDesc = Array.from(perfectDays)
    .map((s) => new Date(s))
    .sort((a, b) => b.getTime() - a.getTime())
  const sortedAsc = Array.from(perfectDays)
    .map((s) => new Date(s))
    .sort((a, b) => a.getTime() - b.getTime())

  // Current streak: walk back from most recent perfect day.
  // Allow a 1-day grace window (most recent perfect day may be today or yesterday).
  const today = startOfDay(new Date())
  const mostRecent = sortedDesc[0]
  const diffFromToday = daysBetween(mostRecent, today)
  let current = 0
  if (diffFromToday <= 1) {
    let cursor = startOfDay(mostRecent)
    for (const d of sortedDesc) {
      const dStart = startOfDay(d)
      const gap = daysBetween(dStart, cursor)
      if (gap === 0) {
        current++
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1)
      } else if (gap > 0) {
        // Gap in the sequence — streak broken.
        break
      }
      // gap < 0 means dStart is after cursor — duplicate, skip.
    }
  }

  // Best streak: scan ascending, count longest consecutive run.
  let best = 0
  let run = 0
  let prev: Date | null = null
  for (const d of sortedAsc) {
    const dStart = startOfDay(d)
    if (prev && daysBetween(prev, dStart) === 1) {
      run++
    } else {
      run = 1
    }
    best = Math.max(best, run)
    prev = dStart
  }

  return { current, best, unit: 'day' }
}

// ─── Badges ──────────────────────────────────────────────────────────────

export function calculateBadges(
  waterTests: GamificationWaterTest[],
  _actionPlans: GamificationActionPlan[] = [],
  profile: GamificationProfile = {},
): Badge[] {
  const now = new Date()
  const tests = waterTests
    .map((t) => ({ ...t, _d: new Date(toMs(t.createdAt)) }))
    .filter((t) => !isNaN(t._d.getTime()))
    .sort((a, b) => a._d.getTime() - b._d.getTime())

  // Compute week starts for the last 4 weeks (Monday-based)
  const thisWeekStart = startOfWeek(now)
  const weekStarts: Date[] = []
  for (let i = 3; i >= 0; i--) {
    const ws = new Date(thisWeekStart)
    ws.setDate(ws.getDate() - i * 7)
    weekStarts.push(ws)
  }

  const badges: Badge[] = []

  // 1. 🏆 Maître du pH — 4 weeks with at least one pH ∈ [7.0, 7.4] test
  let phWeeksGood = 0
  for (let w = 0; w < 4; w++) {
    const ws = weekStarts[w]
    const we = new Date(ws)
    we.setDate(we.getDate() + 7)
    const weekTests = tests.filter((t) => t._d >= ws && t._d < we)
    if (weekTests.some((t) => t.ph >= 7.0 && t.ph <= 7.4)) phWeeksGood++
  }
  badges.push({
    id: 'ph_master',
    icon: '🏆',
    titleKey: 'badgePhMaster',
    descKey: 'badgePhMasterDesc',
    unlocked: phWeeksGood >= 4,
    progress: Math.min(100, Math.round((phWeeksGood / 4) * 100)),
    progressLabel: `${phWeeksGood}/4`,
  })

  // 2. 🛡️ Chasseur d'algues — 30 days with no critical-status test
  const last30 = tests.filter((t) => {
    const diff = daysBetween(t._d, now)
    return diff >= 0 && diff <= 30
  })
  const criticalIn30 = last30.filter((t) => t.status === 'critical').length
  const earliestIn30 = last30.length > 0 ? last30[0]._d : null
  const daysCovered30 = earliestIn30 ? Math.min(30, daysBetween(earliestIn30, now)) : 0
  const algaeUnlocked = last30.length > 0 && criticalIn30 === 0 && daysCovered30 >= 30
  badges.push({
    id: 'algae_hunter',
    icon: '🛡️',
    titleKey: 'badgeAlgaeHunter',
    descKey: 'badgeAlgaeHunterDesc',
    unlocked: algaeUnlocked,
    progress: algaeUnlocked ? 100 : Math.min(100, Math.round((daysCovered30 / 30) * 100)),
    progressLabel: `${daysCovered30}/30`,
  })

  // 3. 💧 Éco-warrior — 60 days with no overdosage (high_warning/critical)
  const last60 = tests.filter((t) => {
    const diff = daysBetween(t._d, now)
    return diff >= 0 && diff <= 60
  })
  const overdosesIn60 = last60.filter(hasOverdosage).length
  const earliestIn60 = last60.length > 0 ? last60[0]._d : null
  const daysCovered60 = earliestIn60 ? Math.min(60, daysBetween(earliestIn60, now)) : 0
  const ecoUnlocked = last60.length > 0 && overdosesIn60 === 0 && daysCovered60 >= 60
  badges.push({
    id: 'eco_warrior',
    icon: '💧',
    titleKey: 'badgeEcoWarrior',
    descKey: 'badgeEcoWarriorDesc',
    unlocked: ecoUnlocked,
    progress: ecoUnlocked ? 100 : Math.min(100, Math.round((daysCovered60 / 60) * 100)),
    progressLabel: `${daysCovered60}/60`,
  })

  // 4 + 5. 🔥 Streak 30 / Streak 90 — based on perfect-day streak
  const streak = calculateStreak(waterTests)
  badges.push({
    id: 'streak_30',
    icon: '🔥',
    titleKey: 'badgeStreak30',
    descKey: 'badgeStreak30Desc',
    unlocked: streak.current >= 30,
    progress: Math.min(100, Math.round((streak.current / 30) * 100)),
    progressLabel: `${streak.current}/30`,
  })
  badges.push({
    id: 'streak_90',
    icon: '🔥',
    titleKey: 'badgeStreak90',
    descKey: 'badgeStreak90Desc',
    unlocked: streak.current >= 90,
    progress: Math.min(100, Math.round((streak.current / 90) * 100)),
    progressLabel: `${streak.current}/90`,
  })

  // 6. ⭐ Crystal Clear — 4 weeks with at least one CWI ≥ 90 test
  let cwiWeeksGood = 0
  for (let w = 0; w < 4; w++) {
    const ws = weekStarts[w]
    const we = new Date(ws)
    we.setDate(we.getDate() + 7)
    const weekTests = tests.filter((t) => t._d >= ws && t._d < we)
    if (weekTests.some((t) => (t.clearWaterIndex ?? 0) >= 90)) cwiWeeksGood++
  }
  badges.push({
    id: 'crystal_clear',
    icon: '⭐',
    titleKey: 'badgeCrystalClear',
    descKey: 'badgeCrystalClearDesc',
    unlocked: cwiWeeksGood >= 4,
    progress: Math.min(100, Math.round((cwiWeeksGood / 4) * 100)),
    progressLabel: `${cwiWeeksGood}/4`,
  })

  // 7. 📊 Data Scientist — 20 water tests registered
  const testsCount = tests.length
  badges.push({
    id: 'data_scientist',
    icon: '📊',
    titleKey: 'badgeDataScientist',
    descKey: 'badgeDataScientistDesc',
    unlocked: testsCount >= 20,
    progress: Math.min(100, Math.round((testsCount / 20) * 100)),
    progressLabel: `${Math.min(testsCount, 20)}/20`,
  })

  // 8. 🌡️ Weather Master — 0 unanticipated weather problem + ≥14 active days
  const weatherMissed = profile.weatherMissed ?? 0
  const earliestTest = tests.length > 0 ? tests[0]._d : null
  const activeDays = earliestTest ? Math.max(0, daysBetween(earliestTest, now)) : 0
  const wmUnlocked = weatherMissed === 0 && activeDays >= 14
  badges.push({
    id: 'weather_master',
    icon: '🌡️',
    titleKey: 'badgeWeatherMaster',
    descKey: 'badgeWeatherMasterDesc',
    unlocked: wmUnlocked,
    progress: Math.min(100, Math.round((activeDays / 14) * 100)),
    progressLabel: `${Math.min(activeDays, 14)}/14`,
  })

  return badges
}

// ─── Rank ────────────────────────────────────────────────────────────────

/**
 * Compute the user's rank (tier + percentile) from a composite score.
 *
 * Score breakdown (0–100):
 *   - savings (€):      0–1000 €  → 0–40 pts
 *   - streak (days):    0–90 days → 0–30 pts
 *   - badges unlocked:  0–8       → 0–30 pts
 */
export function calculateRank(
  savings: number,
  streak: number,
  badgesUnlocked: number,
): Rank {
  const savingsPts = Math.min(40, (savings / 1000) * 40)
  const streakPts = Math.min(30, (streak / 90) * 30)
  const badgePts = Math.min(30, (badgesUnlocked / 8) * 30)
  const score = savingsPts + streakPts + badgePts

  let tier: string
  let tierKey: string
  if (score >= 85) {
    tier = 'Légende AQWELIA'
    tierKey = 'rankLegend'
  } else if (score >= 65) {
    tier = 'Maître Nageur'
    tierKey = 'rankMaster'
  } else if (score >= 45) {
    tier = "Gardien de l'Eau"
    tierKey = 'rankGuardian'
  } else if (score >= 25) {
    tier = 'Apprenti Pisciniste'
    tierKey = 'rankApprentice'
  } else {
    tier = 'Novice'
    tierKey = 'rankNovice'
  }

  // Percentile: score 100 → top 1%, score 0 → top 100%.
  const percentile = Math.max(1, Math.min(100, Math.round(100 - score)))

  return { tier, tierKey, percentile }
}

// ─── Aggregate ───────────────────────────────────────────────────────────

export function buildGamificationReport(
  waterTests: GamificationWaterTest[],
  actionPlans: GamificationActionPlan[],
  profile: GamificationProfile,
  savings: number,
): GamificationReport {
  const badges = calculateBadges(waterTests, actionPlans, profile)
  const streak = calculateStreak(waterTests)
  const unlockedBadges = badges.filter((b) => b.unlocked).length
  const rank = calculateRank(savings, streak.current, unlockedBadges)
  return {
    badges,
    streak,
    rank,
    totalBadges: badges.length,
    unlockedBadges,
    nextBadge: badges.find((b) => !b.unlocked) || null,
  }
}
