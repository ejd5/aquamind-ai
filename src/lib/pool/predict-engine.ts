// AQWELIA Predict™ — Moteur de prédiction IA des problèmes piscine.
//
// Analyse les tendances des 5 derniers tests d'eau, croise avec la météo et
// le profil, et détecte des patterns connus (pH qui dérive, chlore qui baisse
// + canicule, CYA qui grimpe, TAC instable…). Retourne une liste de
// prédictions ordonnées par score de risque décroissant.
//
// i18n strategy: chaque Prediction expose des *Key (namespace `predict`) pour
// le titre, le message et l'action recommandée. Les fallbacks français
// (title / message / action) sont conservés pour compat legacy — ce fichier
// est dans src/lib/pool/ donc exempté du pre-commit hook hardcoded-strings.

import type { WeatherData } from './weather-engine'
import type { VolumeUnit } from './units'

export interface WaterTest {
  ph: number
  freeChlorine?: number | null
  combinedChlorine?: number | null
  alkalinity?: number | null // TAC mg/L
  calciumHardness?: number | null // TH mg/L
  cyanuricAcid?: number | null // CYA mg/L
  salt?: number | null // g/L
  phosphates?: number | null // mg/L
  temperature?: number | null // °C
  createdAt?: string | Date
}

export interface PoolProfileLike {
  name: string
  volume: number
  unit: VolumeUnit
  treatmentType: string
  filterType: string
  saltSystem: boolean
  sunExposure: string
  covered: boolean
  usageLevel: string
}

export type RiskLevel = 'low' | 'medium' | 'high'
export type PredictionCategory =
  | 'algae'
  | 'ph_drift'
  | 'cya_buildup'
  | 'tac_instability'
  | 'chlorine_depletion'
  | 'scaling'
  | 'corrosion'
  | 'storm_impact'

export interface Prediction {
  id: string
  category: PredictionCategory
  /** Score de risque 0-100 */
  riskScore: number
  level: RiskLevel
  /** Délai estimé avant que le problème ne se matérialise (heures) */
  etaHours: number
  /** Fallback FR — texte court affiché en-tête (ex: "Dans 3 jours : risque d'algues") */
  title: string
  /** next-intl key (namespace predict), ex: 'algae.title' */
  titleKey: string
  /** ICU params pour titleKey (ex: { days, level }) */
  titleParams?: Record<string, string | number>
  /** Fallback FR — détail du problème détecté */
  message: string
  /** next-intl key, ex: 'algae.message' */
  messageKey: string
  /** ICU params pour messageKey */
  messageParams?: Record<string, string | number>
  /** Fallback FR — action concrète recommandée */
  action: string
  /** next-intl key, ex: 'algae.action' */
  actionKey: string
  /** ICU params pour actionKey */
  actionParams?: Record<string, string | number>
  /** Sous-catégorie / pattern détecté (pour debug & analytics) */
  pattern: string
  /** Données chiffrées qui ont déclenché la prédiction */
  evidence: Record<string, string | number>
}

/** Trie les tests par date asc (le plus ancien en premier). */
function sortByDateAsc(tests: WaterTest[]): WaterTest[] {
  return [...tests].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return ta - tb
  })
}

/** Calcule la pente (variation moyenne par jour) d'une série de valeurs. */
function slopePerDay(values: number[], dates: (string | Date | undefined)[]): number | null {
  if (values.length < 2) return null
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < values.length; i++) {
    const d = dates[i]
    if (d == null) continue
    const t = new Date(d).getTime()
    if (Number.isNaN(t)) continue
    points.push({ x: t, y: values[i] })
  }
  if (points.length < 2) return null
  // Régression linéaire simple
  const n = points.length
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return null
  const msPerDay = 86400000
  return ((n * sumXY - sumX * sumY) / denom) * msPerDay
}

/** Écart-type (échantillon) — utilisé pour mesurer l'instabilité du TAC. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/** Extrait les valeurs non-null d'un champ sur les tests. */
function extractField<K extends keyof WaterTest>(tests: WaterTest[], field: K): number[] {
  const out: number[] = []
  for (const t of tests) {
    const v = t[field]
    if (typeof v === 'number' && !Number.isNaN(v)) out.push(v)
  }
  return out
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function levelFromScore(score: number): RiskLevel {
  if (score >= 65) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

/**
 * Cœur du moteur : analyse les 5 derniers tests + météo + profil et retourne
 * une liste de prédictions ordonnées par score décroissant.
 */
export function predictProblems(
  latestTests: WaterTest[],
  weather: WeatherData | null,
  profile: PoolProfileLike | null,
): Prediction[] {
  const predictions: Prediction[] = []

  // On prend les 5 derniers tests triés du plus ancien au plus récent.
  const sorted = sortByDateAsc(latestTests).slice(-5)
  if (sorted.length === 0) return predictions

  const latest = sorted[sorted.length - 1]
  const dates = sorted.map((t) => t.createdAt)

  // ─── 1. pH qui dérive régulièrement vers le haut ───────────────────────
  const phValues = extractField(sorted, 'ph')
  if (phValues.length >= 3) {
    const phSlope = slopePerDay(phValues, dates)
    if (phSlope != null && phSlope > 0.05) {
      // > 0.05/jour = dérive notable
      const daysObserved = phValues.length >= 2 && dates[0] && dates[dates.length - 1]
        ? Math.max(1, Math.round((new Date(dates[dates.length - 1]!).getTime() - new Date(dates[0]!).getTime()) / 86400000))
        : phValues.length
      const ratePerDay = Number(phSlope.toFixed(2))
      // Si pH déjà > 7.5 + pente positive → urgence ; sinon warning.
      const baseScore = latest.ph > 7.5 ? 55 : 35
      const slopeBonus = Math.min(25, Math.abs(phSlope) * 80)
      const score = clampScore(baseScore + slopeBonus)
      predictions.push({
        id: 'ph_drift_up',
        category: 'ph_drift',
        riskScore: score,
        level: levelFromScore(score),
        etaHours: latest.ph > 7.5 ? 24 : 72,
        title: `Votre pH augmente de ${ratePerDay}/jour depuis ${daysObserved} jours`,
        titleKey: 'ph_drift.title',
        titleParams: { rate: ratePerDay, days: daysObserved },
        message: `Tendance haussière détectée sur les ${phValues.length} derniers tests. Sans action, le pH dérivera hors plage idéale (7.0-7.4) et le chlore perdra en efficacité.`,
        messageKey: 'ph_drift.message',
        messageParams: { count: phValues.length },
        action: 'Ajoutez du pH- maintenant pour revenir sous 7.4.',
        actionKey: 'ph_drift.action',
        pattern: 'ph_positive_slope',
        evidence: {
          slopePerDay: ratePerDay,
          samples: phValues.length,
          currentPh: latest.ph,
        },
      })
    }
  }

  // ─── 2. Chlore bas + canicule prévue → algues ──────────────────────────
  const clValues = extractField(sorted, 'freeChlorine')
  const heatwaveSoon = weather != null && weather.tomorrowMaxC >= 30
  if (clValues.length >= 1 && latest.freeChlorine != null) {
    const cl = latest.freeChlorine
    const clSlope = clValues.length >= 2 ? slopePerDay(clValues, dates) : null
    const decreasing = clSlope != null && clSlope < -0.05
    if (cl < 1.5 && (heatwaveSoon || decreasing)) {
      // ETA estimé : 3 jours en canicule, sinon 5 jours
      const etaDays = heatwaveSoon ? 3 : 5
      const baseScore = cl < 0.8 ? 60 : cl < 1.2 ? 45 : 30
      const heatBonus = heatwaveSoon ? (weather!.tomorrowMaxC >= 35 ? 25 : 15) : 0
      const slopeBonus = decreasing ? Math.min(15, Math.abs(clSlope!) * 30) : 0
      const score = clampScore(baseScore + heatBonus + slopeBonus)
      predictions.push({
        id: 'algae_risk_chlorine_heat',
        category: 'algae',
        riskScore: score,
        level: levelFromScore(score),
        etaHours: etaDays * 24,
        title: `Dans ${etaDays} jours : risque d'algues`,
        titleKey: 'algae.title',
        titleParams: { days: etaDays },
        message: heatwaveSoon
          ? `Chlore libre à ${cl} mg/L et canicule prévue (${weather!.tomorrowMaxC}°C). L'eau chaude consomme le chlore plus vite et favorise la prolifération d'algues.`
          : `Chlore libre à ${cl} mg/L et en baisse. Sans traitement, les algues pourraient apparaître sous ${etaDays} jours.`,
        messageKey: heatwaveSoon ? 'algae.message_heat' : 'algae.message_decline',
        messageParams: heatwaveSoon
          ? { chlorine: cl, temp: weather!.tomorrowMaxC }
          : { chlorine: cl, days: etaDays },
        action: 'Chlore choc recommandé dès maintenant + filtration continue 24h.',
        actionKey: 'algae.action',
        pattern: heatwaveSoon ? 'low_chlorine_plus_heat' : 'chlorine_declining',
        evidence: {
          chlorine: cl,
          slopePerDay: clSlope != null ? Number(clSlope.toFixed(2)) : 0,
          tomorrowMaxC: weather?.tomorrowMaxC ?? 0,
        },
      })
    }
  }

  // ─── 3. CYA qui augmente → renouvellement d'eau ────────────────────────
  const cyaValues = extractField(sorted, 'cyanuricAcid')
  if (cyaValues.length >= 2 && latest.cyanuricAcid != null) {
    const cya = latest.cyanuricAcid
    const cyaSlope = slopePerDay(cyaValues, dates)
    const increasing = cyaSlope != null && cyaSlope > 0.2
    if (cya >= 50 || (cya >= 40 && increasing)) {
      const baseScore = cya >= 70 ? 65 : cya >= 60 ? 50 : cya >= 50 ? 35 : 25
      const slopeBonus = increasing ? Math.min(15, cyaSlope! * 20) : 0
      const score = clampScore(baseScore + slopeBonus)
      const renewPct = cya >= 70 ? 30 : cya >= 60 ? 25 : 20
      predictions.push({
        id: 'cya_buildup',
        category: 'cya_buildup',
        riskScore: score,
        level: levelFromScore(score),
        etaHours: 14 * 24, // 2 semaines
        title: `Votre stabilisant atteint ${cya} mg/L`,
        titleKey: 'cya_buildup.title',
        titleParams: { value: cya },
        message: cya >= 70
          ? `CYA très élevé : le chlore devient inefficace (effet "chlorine lock"). Renouvelez ${renewPct}% de l'eau pour diluer.`
          : `CYA en hausse. Au-dessus de 70 mg/L, le chlore perd de son efficacité. Surveillez et prévoyez un renouvellement.`,
        messageKey: cya >= 70 ? 'cya_buildup.message_high' : 'cya_buildup.message_warn',
        messageParams: { value: cya, percent: renewPct },
        action: `Renouvelez ${renewPct}% de l'eau de la piscine.`,
        actionKey: 'cya_buildup.action',
        actionParams: { percent: renewPct },
        pattern: 'cya_high',
        evidence: {
          current: cya,
          slopePerDay: cyaSlope != null ? Number(cyaSlope.toFixed(2)) : 0,
        },
      })
    }
  }

  // ─── 4. TAC instable ───────────────────────────────────────────────────
  const tacValues = extractField(sorted, 'alkalinity')
  if (tacValues.length >= 3 && latest.alkalinity != null) {
    const sd = stdDev(tacValues)
    if (sd > 12) {
      const score = clampScore(35 + Math.min(30, sd * 1.5))
      predictions.push({
        id: 'tac_unstable',
        category: 'tac_instability',
        riskScore: score,
        level: levelFromScore(score),
        etaHours: 5 * 24,
        title: 'Votre TAC varie beaucoup',
        titleKey: 'tac_instability.title',
        message: `Écart-type de ${Math.round(sd)} mg/L sur ${tacValues.length} mesures. Un TAC instable entraîne un pH erratique et des dosages difficiles.`,
        messageKey: 'tac_instability.message',
        messageParams: { stddev: Math.round(sd), count: tacValues.length },
        action: 'Vérifiez la filtration et stabilisez le TAC entre 80 et 120 mg/L.',
        actionKey: 'tac_instability.action',
        pattern: 'tac_high_variance',
        evidence: {
          stddev: Math.round(sd),
          samples: tacValues.length,
          latest: latest.alkalinity,
        },
      })
    }
  }

  // ─── 5. Orage prévu → dilution chlore + remontée pH ────────────────────
  if (weather != null && weather.tomorrowChanceStorm >= 60) {
    const score = clampScore(40 + Math.min(20, (weather.tomorrowChanceStorm - 60) / 2))
    predictions.push({
      id: 'storm_impact',
      category: 'storm_impact',
      riskScore: score,
      level: levelFromScore(score),
      etaHours: 18,
      title: 'Orage prévu demain',
      titleKey: 'storm_impact.title',
      message: `${weather.tomorrowChanceStorm}% de risque d'orage. L'orage dilue le chlore et fait monter le pH — vérifiez votre eau ce soir.`,
      messageKey: 'storm_impact.message',
      messageParams: { percent: weather.tomorrowChanceStorm },
      action: 'Vérifiez le chlore libre ce soir avant l\'orage. Renforcez la filtration demain.',
      actionKey: 'storm_impact.action',
      pattern: 'storm_forecast',
      evidence: {
        stormChance: weather.tomorrowChanceStorm,
        tomorrowMaxC: weather.tomorrowMaxC,
      },
    })
  }

  // ─── 6. TH très haut → tartre (avec chaleur) ───────────────────────────
  if (latest.calciumHardness != null && latest.calciumHardness > 400) {
    const heatBonus = weather != null && weather.tomorrowMaxC >= 28 ? 15 : 0
    const score = clampScore(35 + heatBonus + Math.min(15, (latest.calciumHardness - 400) / 8))
    predictions.push({
      id: 'scaling_risk',
      category: 'scaling',
      riskScore: score,
      level: levelFromScore(score),
      etaHours: 7 * 24,
      title: `TH élevé (${latest.calciumHardness} mg/L)`,
      titleKey: 'scaling.title',
      titleParams: { value: latest.calciumHardness },
      message: 'Dureté calcium élevée. Risque de tartre sur équipements et ligne d\'eau, surtout en période chaude.',
      messageKey: 'scaling.message',
      action: 'Envisagez un séquestrant anti-tartre et vérifiez le pH (le maintenir sous 7.4).',
      actionKey: 'scaling.action',
      pattern: 'high_calcium',
      evidence: { value: latest.calciumHardness, tomorrowMaxC: weather?.tomorrowMaxC ?? 0 },
    })
  }

  // ─── 7. TH très bas + pH bas → corrosion ───────────────────────────────
  if (latest.calciumHardness != null && latest.calciumHardness < 150 && latest.ph < 7.0) {
    const score = clampScore(40 + (7.0 - latest.ph) * 30)
    predictions.push({
      id: 'corrosion_risk',
      category: 'corrosion',
      riskScore: score,
      level: levelFromScore(score),
      etaHours: 7 * 24,
      title: 'Eau agressive (TH bas + pH bas)',
      titleKey: 'corrosion.title',
      message: `TH ${latest.calciumHardness} mg/L et pH ${latest.ph}. Eau agressive : corrosion équipements, mousse possible.`,
      messageKey: 'corrosion.message',
      messageParams: { th: latest.calciumHardness, ph: latest.ph },
      action: 'Remontez le pH au-dessus de 7.0 et ajoutez du TH+ pour atteindre 200 mg/L.',
      actionKey: 'corrosion.action',
      pattern: 'aggressive_water',
      evidence: { th: latest.calciumHardness, ph: latest.ph },
    })
  }

  // ─── 8. Phosphates élevés + chaleur → risque algues ────────────────────
  if (latest.phosphates != null && latest.phosphates > 0.2) {
    const heatBonus = weather != null && weather.tomorrowMaxC >= 28 ? 20 : 5
    const score = clampScore(30 + heatBonus + Math.min(20, (latest.phosphates - 0.2) * 40))
    predictions.push({
      id: 'algae_risk_phosphates',
      category: 'algae',
      riskScore: score,
      level: levelFromScore(score),
      etaHours: 5 * 24,
      title: `Phosphates élevés (${latest.phosphates} mg/L)`,
      titleKey: 'algae.phosphates_title',
      titleParams: { value: latest.phosphates },
      message: 'Les phosphates nourrissent les algues. Plus il fait chaud, plus le risque est élevé.',
      messageKey: 'algae.phosphates_message',
      messageParams: { value: latest.phosphates },
      action: 'Utilisez un anti-phosphates et brossez les parois.',
      actionKey: 'algae.phosphates_action',
      pattern: 'high_phosphates',
      evidence: { phosphates: latest.phosphates, tomorrowMaxC: weather?.tomorrowMaxC ?? 0 },
    })
  }

  // ─── Bonus : profil exposition forte + usage intensif ──────────────────
  if (profile && profile.sunExposure === 'high' && profile.usageLevel === 'high' && latest.freeChlorine != null && latest.freeChlorine < 2) {
    predictions.push({
      id: 'high_usage_chlorine_demand',
      category: 'chlorine_depletion',
      riskScore: 35,
      level: 'medium',
      etaHours: 48,
      title: 'Demande en chlore élevée',
      titleKey: 'chlorine_depletion.title',
      message: 'Forte exposition soleil + usage intensif = consommation chlore accélérée.',
      messageKey: 'chlorine_depletion.message',
      action: 'Surveillez le chlore quotidiennement et ajustez la filtration.',
      actionKey: 'chlorine_depletion.action',
      pattern: 'high_demand_profile',
      evidence: {
        sunExposure: profile.sunExposure,
        usageLevel: profile.usageLevel,
        chlorine: latest.freeChlorine,
      },
    })
  }

  // Tri par score décroissant
  return predictions.sort((a, b) => b.riskScore - a.riskScore)
}

/**
 * Score global de risque (0-100) : moyenne pondérée des prédictions.
 * Les prédictions "high" pèsent 3x, "medium" 2x, "low" 1x.
 */
export function computeGlobalRiskScore(predictions: Prediction[]): number {
  if (predictions.length === 0) return 0
  const weights: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 }
  let totalWeight = 0
  let weightedSum = 0
  for (const p of predictions) {
    const w = weights[p.level]
    weightedSum += p.riskScore * w
    totalWeight += w
  }
  return clampScore(weightedSum / totalWeight)
}
