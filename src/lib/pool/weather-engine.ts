// Weather Risk Engine — déterministe
// Prend les conditions météo et génère des recommandations piscine concrètes.
//
// i18n strategy: each WeatherAlert / FiltrationRecommendation / WeatherAssessment
// exposes `*Key` translation keys (under the `weather` namespace) alongside the
// legacy French literals so consumers can call `t(alert.titleKey)` and
// `t(alert.messageKey, { temp })` etc.

export interface WeatherData {
  location: string
  currentTempC: number
  feelsLikeC: number
  humidity: number
  uvIndex: number
  windKmph: number
  precipMm: number
  weatherCode: number  // wttr.in code
  weatherDesc: string  // French fallback (legacy)
  tomorrowMaxC: number
  tomorrowMinC: number
  tomorrowChanceRain: number  // %
  tomorrowChanceStorm: number // %
  next3days: { date: string; maxC: number; chanceRain: number; desc: string; code?: number }[]
}

export type WeatherRisk = 'low' | 'medium' | 'high' | 'extreme'

export interface WeatherAlert {
  id: string
  type: 'storm' | 'heat' | 'rain' | 'wind' | 'uv' | 'cold'
  severity: WeatherRisk
  title: string         // French fallback (legacy)
  titleKey: string      // translation key, e.g. 'alerts.storm_soon.title'
  message: string       // French fallback (legacy)
  messageKey: string    // translation key (ICU params may apply, e.g. { percent }, { temp }, { wind })
  action: string        // French fallback (legacy)
  actionKey: string     // translation key
  when: string          // French fallback (legacy)
  whenKey: string       // translation key
  /** ICU params for messageKey interpolation (passed to t(messageKey, params)). */
  messageParams?: Record<string, string | number>
}

export interface FiltrationRecommendation {
  hoursPerDay: number
  reason: string        // French fallback (legacy)
  reasonKey: string     // translation key (ICU { temp })
  reasonParams?: Record<string, string | number>
  schedule: string      // French fallback (legacy)
  scheduleKey: string   // translation key — picks between nocturnal/diurnal variants
}

export interface WeatherAssessment {
  alerts: WeatherAlert[]
  filtration: FiltrationRecommendation
  algaeRisk: WeatherRisk
  testRecommended: boolean
  testReason: string       // French fallback (legacy)
  testReasonKey: string    // translation key (ICU { days } for some variants)
  testReasonParams?: Record<string, string | number>
  swimComfort: 'ideal' | 'good' | 'fresh' | 'cold' | 'too_cold'
  summary: string          // French fallback (legacy)
  summaryKey: string       // translation key (ICU { location, hours } or { count, titles })
  summaryParams?: Record<string, string | number>
  /** AQWELIA Climate — optional climate mode assessment (set by the API). */
  climate?: ClimateAssessmentLite
}

/**
 * Lightweight climate assessment embedded in WeatherAssessment.
 * The full assessment lives in `@/lib/pool/climate-engine` (server-side).
 * We embed only the keys the UI needs (badge + adjustments) to avoid a
 * circular import: weather-engine.ts is imported by climate-engine.ts via
 * the WeatherData type, so we keep the types split.
 */
export interface ClimateAssessmentLite {
  mode: string
  modeLabelKey: string
  modeDescKey: string
  modeLabel: string
  modeDesc: string
  filtrationBoostHours: number
  adjustments: string[]
  badgeHue: number
}

export function assessWeather(w: WeatherData, lastTestDaysAgo: number): WeatherAssessment {
  const alerts: WeatherAlert[] = []
  let algaeRisk: WeatherRisk = 'low'
  let testRecommended = false
  let testReason = ''
  let testReasonKey = ''
  let testReasonParams: Record<string, string | number> | undefined

  // 1. Risque orage
  if (w.tomorrowChanceStorm >= 60) {
    alerts.push({
      id: 'storm_soon',
      type: 'storm',
      severity: 'high',
      title: 'Orage prévu demain',
      titleKey: 'alerts.storm_soon.title',
      message: `${w.tomorrowChanceStorm}% de risque d'orage. L'orage dilue le chlore et fait monter le pH.`,
      messageKey: 'alerts.storm_soon.message',
      messageParams: { percent: w.tomorrowChanceStorm },
      action: "Vérifiez le chlore libre ce soir avant l'orage. Renforcez la filtration demain.",
      actionKey: 'alerts.storm_soon.action',
      when: 'Ce soir avant 20h',
      whenKey: 'alerts.storm_soon.when',
    })
    algaeRisk = algaeRisk === 'low' ? 'medium' : algaeRisk
    testRecommended = true
    testReason = "Test recommandé avant l'orage prévu demain."
    testReasonKey = 'testReason.before_storm'
  }

  // 2. Canicule / forte chaleur
  if (w.tomorrowMaxC >= 35) {
    alerts.push({
      id: 'heat_extreme',
      type: 'heat',
      severity: 'extreme',
      title: 'Canicule prévue',
      titleKey: 'alerts.heat_extreme.title',
      message: `${w.tomorrowMaxC}°C prévu. Eau très chaude = chlore consommé plus vite + prolifération algues.`,
      messageKey: 'alerts.heat_extreme.message',
      messageParams: { temp: w.tomorrowMaxC },
      action: 'Augmentez la filtration de 2h/jour. Vérifiez le chlore chaque matin. Envisagez anti-algues préventif.',
      actionKey: 'alerts.heat_extreme.action',
      when: 'Dès maintenant et pendant la vague',
      whenKey: 'alerts.heat_extreme.when',
    })
    algaeRisk = 'high'
    testRecommended = true
    testReason = 'Test quotidien recommandé pendant la canicule.'
    testReasonKey = 'testReason.during_heatwave'
  } else if (w.tomorrowMaxC >= 30) {
    alerts.push({
      id: 'heat_high',
      type: 'heat',
      severity: 'medium',
      title: 'Forte chaleur prévue',
      titleKey: 'alerts.heat_high.title',
      message: `${w.tomorrowMaxC}°C prévu. Surconsommation de chlore probable.`,
      messageKey: 'alerts.heat_high.message',
      messageParams: { temp: w.tomorrowMaxC },
      action: "Augmentez la filtration d'1h/jour et testez le chlore demain.",
      actionKey: 'alerts.heat_high.action',
      when: 'Demain matin',
      whenKey: 'alerts.heat_high.when',
    })
    if (algaeRisk === 'low') algaeRisk = 'medium'
  }

  // 3. Fortes pluies
  if (w.tomorrowChanceRain >= 70 || w.precipMm > 10) {
    alerts.push({
      id: 'heavy_rain',
      type: 'rain',
      severity: 'medium',
      title: 'Fortes pluies attendues',
      titleKey: 'alerts.heavy_rain.title',
      message: 'La pluie dilue les produits, fait baisser le pH et apporte des débris.',
      messageKey: 'alerts.heavy_rain.message',
      action: 'Après la pluie : vérifiez pH et chlore, nettoyez skimmer et panier de pompe.',
      actionKey: 'alerts.heavy_rain.action',
      when: 'Après la pluie',
      whenKey: 'alerts.heavy_rain.when',
    })
    testRecommended = true
    if (!testReason) {
      testReason = 'Test pH + chlore recommandé après la pluie.'
      testReasonKey = 'testReason.after_rain'
    }
  }

  // 4. Vent fort
  if (w.windKmph >= 40) {
    alerts.push({
      id: 'wind_strong',
      type: 'wind',
      severity: 'medium',
      title: 'Vent fort prévu',
      titleKey: 'alerts.wind_strong.title',
      message: `${w.windKmph} km/h. Débris, feuilles, poussière dans la piscine.`,
      messageKey: 'alerts.wind_strong.message',
      messageParams: { wind: w.windKmph },
      action: "Vérifiez skimmer et panier de pompe. Nettoyez la ligne d'eau.",
      actionKey: 'alerts.wind_strong.action',
      when: 'Après le vent',
      whenKey: 'alerts.wind_strong.when',
    })
  }

  // 5. UV très élevé
  if (w.uvIndex >= 8) {
    alerts.push({
      id: 'uv_high',
      type: 'uv',
      severity: 'medium',
      title: 'UV très élevés',
      titleKey: 'alerts.uv_high.title',
      message: 'Le soleil dégrade le chlore non stabilisé plus vite.',
      messageKey: 'alerts.uv_high.message',
      action: 'Vérifiez votre stabilisant (CYA) et le chlore libre.',
      actionKey: 'alerts.uv_high.action',
      when: 'Cette semaine',
      whenKey: 'alerts.uv_high.when',
    })
  }

  // 6. Froid / gel
  if (w.tomorrowMinC <= 2) {
    alerts.push({
      id: 'frost_risk',
      type: 'cold',
      severity: 'high',
      title: 'Risque de gel',
      titleKey: 'alerts.frost_risk.title',
      message: 'Température négative prévue. Risque pour les équipements et canalisations.',
      messageKey: 'alerts.frost_risk.message',
      action: 'Protégez le local technique. Laissez tourner la filtration la nuit pour éviter le gel. Hivernez si pas fait.',
      actionKey: 'alerts.frost_risk.action',
      when: 'Cette nuit',
      whenKey: 'alerts.frost_risk.when',
    })
  }

  // 7. Rappel test périodique (si pas de test récent)
  if (lastTestDaysAgo >= 4 && !testRecommended) {
    testRecommended = true
    testReason = `Dernier test il y a ${lastTestDaysAgo} jours. Test de routine recommandé.`
    testReasonKey = 'testReason.routine'
    testReasonParams = { days: lastTestDaysAgo }
  } else if (lastTestDaysAgo >= 7) {
    testRecommended = true
    testReason = `Dernier test il y a ${lastTestDaysAgo} jours : test urgent recommandé.`
    testReasonKey = 'testReason.urgent'
    testReasonParams = { days: lastTestDaysAgo }
  }

  // Filtration recommandée (moitié de la température eau en heures, min 4h)
  // On utilise la temp prévue comme proxy
  const estWaterTemp = (w.currentTempC + w.tomorrowMaxC) / 2 - 3 // l'eau est généralement plus fraîche que l'air le jour
  const filtrationHours = Math.max(4, Math.round(estWaterTemp / 2))
  const filtration: FiltrationRecommendation = {
    hoursPerDay: filtrationHours,
    reason: `Règle : moitié de la température de l'eau (${Math.round(estWaterTemp)}°C) en heures de filtration.`,
    reasonKey: 'filtration.reason',
    reasonParams: { temp: Math.round(estWaterTemp) },
    schedule: estWaterTemp >= 25
      ? "Préférez la filtration nocturne (moins d'évaporation, meilleure efficacité chlore)."
      : 'Filtration diurne recommandée.',
    scheduleKey: estWaterTemp >= 25 ? 'filtration.schedule.nocturnal' : 'filtration.schedule.diurnal',
  }

  // Confort baignade
  let swimComfort: WeatherAssessment['swimComfort'] = 'too_cold'
  if (estWaterTemp >= 28) swimComfort = 'ideal'
  else if (estWaterTemp >= 25) swimComfort = 'good'
  else if (estWaterTemp >= 20) swimComfort = 'fresh'
  else if (estWaterTemp >= 15) swimComfort = 'cold'

  // Résumé
  let summary: string
  let summaryKey: string
  let summaryParams: Record<string, string | number> | undefined
  if (alerts.length === 0) {
    summary = `Météo clémente à ${w.location}. Pas d'alerte particulière. Filtrez ${filtrationHours}h/jour.`
    summaryKey = 'summary.calm'
    summaryParams = { location: w.location, hours: filtrationHours }
  } else {
    summary = `${alerts.length} alerte(s) météo : ${alerts.map(a => a.title).join(', ')}. Suivez les actions recommandées.`
    summaryKey = 'summary.withAlerts'
    summaryParams = { count: alerts.length, titles: alerts.map(a => a.title).join(', ') }
  }

  return { alerts, filtration, algaeRisk, testRecommended, testReason, testReasonKey, testReasonParams, swimComfort, summary, summaryKey, summaryParams }
}

// Mapping code wttr.in → clé de traduction (namespace weather.codes)
// La fonction renvoie une clé (ex: 'codes.113') ; le fallback français
// reste disponible via wttrCodeToFr() ci-dessous pour les consommateurs legacy.
export function wttrCodeToKey(code: number): string {
  return `codes.${code}`
}

// Mapping code wttr.in → description FR (legacy, gardé pour compat).
export function wttrCodeToFr(code: number): string {
  const map: Record<number, string> = {
    113: 'Ensoleillé',
    116: 'Partiellement nuageux',
    119: 'Nuageux',
    122: 'Très nuageux',
    143: 'Brume',
    176: 'Pluies éparses',
    179: 'Neige éparses',
    182: 'Grésil épars',
    185: 'Pluie verglaçante éparses',
    200: 'Orageux',
    227: 'Neige',
    230: 'Fortes chutes de neige',
    248: 'Brouillard',
    260: 'Brouillard givrant',
    263: 'Pluie légère',
    266: 'Pluie légère',
    281: 'Pluie verglaçante',
    284: 'Forte pluie verglaçante',
    293: 'Pluies éparses',
    296: 'Pluie',
    299: 'Forte pluie',
    302: 'Très forte pluie',
    305: 'Pluies violentes',
    308: 'Pluies torrentielles',
    311: 'Pluie verglaçante',
    314: 'Pluie verglaçante forte',
    317: 'Grésil',
    320: 'Neige',
    323: 'Neige éparses',
    326: 'Neige',
    329: 'Fortes chutes',
    332: 'Fortes chutes',
    335: 'Très fortes chutes',
    338: 'Blizzard',
    350: 'Grésil',
    353: 'Averses',
    356: 'Forte averse',
    359: 'Averse violente',
    362: 'Averse grésil',
    365: 'Forte averse grésil',
    368: 'Averse neige',
    371: 'Forte averse neige',
    374: 'Averse grésil',
    377: 'Averse pluie verglaçante',
    386: 'Orage épars',
    389: 'Orage fort',
    392: 'Orage neige',
    395: 'Fort orage neige',
  }
  return map[code] || 'Indéterminé'
}

// Détecte si le code météo implique un orage
export function isStormCode(code: number): boolean {
  return [200, 386, 389, 392, 395].includes(code)
}
