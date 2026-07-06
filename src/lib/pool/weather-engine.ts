// Weather Risk Engine — déterministe
// Prend les conditions météo et génère des recommandations piscine concrètes.

export interface WeatherData {
  location: string
  currentTempC: number
  feelsLikeC: number
  humidity: number
  uvIndex: number
  windKmph: number
  precipMm: number
  weatherCode: number  // wttr.in code
  weatherDesc: string
  tomorrowMaxC: number
  tomorrowMinC: number
  tomorrowChanceRain: number  // %
  tomorrowChanceStorm: number // %
  next3days: { date: string; maxC: number; chanceRain: number; desc: string }[]
}

export type WeatherRisk = 'low' | 'medium' | 'high' | 'extreme'

export interface WeatherAlert {
  id: string
  type: 'storm' | 'heat' | 'rain' | 'wind' | 'uv' | 'cold'
  severity: WeatherRisk
  title: string
  message: string
  action: string  // action concrète
  when: string    // quand agir
}

export interface FiltrationRecommendation {
  hoursPerDay: number
  reason: string
  schedule: string
}

export interface WeatherAssessment {
  alerts: WeatherAlert[]
  filtration: FiltrationRecommendation
  algaeRisk: WeatherRisk
  testRecommended: boolean
  testReason: string
  swimComfort: 'ideal' | 'good' | 'fresh' | 'cold' | 'too_cold'
  summary: string
}

export function assessWeather(w: WeatherData, lastTestDaysAgo: number): WeatherAssessment {
  const alerts: WeatherAlert[] = []
  let algaeRisk: WeatherRisk = 'low'
  let testRecommended = false
  let testReason = ''

  // 1. Risque orage
  if (w.tomorrowChanceStorm >= 60) {
    alerts.push({
      id: 'storm_soon',
      type: 'storm',
      severity: 'high',
      title: 'Orage prévu demain',
      message: `${w.tomorrowChanceStorm}% de risque d'orage. L'orage dilue le chlore et fait monter le pH.`,
      action: "Vérifiez le chlore libre ce soir avant l'orage. Renforcez la filtration demain.",
      when: 'Ce soir avant 20h',
    })
    algaeRisk = algaeRisk === 'low' ? 'medium' : algaeRisk
    testRecommended = true
    testReason = "Test recommandé avant l'orage prévu demain."
  }

  // 2. Canicule / forte chaleur
  if (w.tomorrowMaxC >= 35) {
    alerts.push({
      id: 'heat_extreme',
      type: 'heat',
      severity: 'extreme',
      title: 'Canicule prévue',
      message: `${w.tomorrowMaxC}°C prévu. Eau très chaude = chlore consommé plus vite + prolifération algues.`,
      action: 'Augmentez la filtration de 2h/jour. Vérifiez le chlore chaque matin. Envisagez anti-algues préventif.',
      when: 'Dès maintenant et pendant la vague',
    })
    algaeRisk = 'high'
    testRecommended = true
    testReason = 'Test quotidien recommandé pendant la canicule.'
  } else if (w.tomorrowMaxC >= 30) {
    alerts.push({
      id: 'heat_high',
      type: 'heat',
      severity: 'medium',
      title: 'Forte chaleur prévue',
      message: `${w.tomorrowMaxC}°C prévu. Surconsommation de chlore probable.`,
      action: "Augmentez la filtration d'1h/jour et testez le chlore demain.",
      when: 'Demain matin',
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
      message: 'La pluie dilue les produits, fait baisser le pH et apporte des débris.',
      action: 'Après la pluie : vérifiez pH et chlore, nettoyez skimmer et panier de pompe.',
      when: 'Après la pluie',
    })
    testRecommended = true
    if (!testReason) testReason = 'Test pH + chlore recommandé après la pluie.'
  }

  // 4. Vent fort
  if (w.windKmph >= 40) {
    alerts.push({
      id: 'wind_strong',
      type: 'wind',
      severity: 'medium',
      title: 'Vent fort prévu',
      message: `${w.windKmph} km/h. Débris, feuilles, poussière dans la piscine.`,
      action: "Vérifiez skimmer et panier de pompe. Nettoyez la ligne d'eau.",
      when: 'Après le vent',
    })
  }

  // 5. UV très élevé
  if (w.uvIndex >= 8) {
    alerts.push({
      id: 'uv_high',
      type: 'uv',
      severity: 'medium',
      title: 'UV très élevés',
      message: 'Le soleil dégrade le chlore non stabilisé plus vite.',
      action: 'Vérifiez votre stabilisant (CYA) et le chlore libre.',
      when: 'Cette semaine',
    })
  }

  // 6. Froid / gel
  if (w.tomorrowMinC <= 2) {
    alerts.push({
      id: 'frost_risk',
      type: 'cold',
      severity: 'high',
      title: 'Risque de gel',
      message: 'Température négative prévue. Risque pour les équipements et canalisations.',
      action: 'Protégez le local technique. Laissez tourner la filtration la nuit pour éviter le gel. Hivernez si pas fait.',
      when: 'Cette nuit',
    })
  }

  // 7. Rappel test périodique (si pas de test récent)
  if (lastTestDaysAgo >= 4 && !testRecommended) {
    testRecommended = true
    testReason = `Dernier test il y a ${lastTestDaysAgo} jours. Test de routine recommandé.`
  } else if (lastTestDaysAgo >= 7) {
    testRecommended = true
    testReason = `Dernier test il y a ${lastTestDaysAgo} jours : test urgent recommandé.`
  }

  // Filtration recommandée (moitié de la température eau en heures, min 4h)
  // On utilise la temp prévue comme proxy
  const estWaterTemp = (w.currentTempC + w.tomorrowMaxC) / 2 - 3 // l'eau est généralement plus fraîche que l'air le jour
  const filtrationHours = Math.max(4, Math.round(estWaterTemp / 2))
  const filtration: FiltrationRecommendation = {
    hoursPerDay: filtrationHours,
    reason: `Règle : moitié de la température de l'eau (${Math.round(estWaterTemp)}°C) en heures de filtration.`,
    schedule: estWaterTemp >= 25
      ? "Préférez la filtration nocturne (moins d'évaporation, meilleure efficacité chlore)."
      : 'Filtration diurne recommandée.',
  }

  // Confort baignade
  let swimComfort: WeatherAssessment['swimComfort'] = 'too_cold'
  if (estWaterTemp >= 28) swimComfort = 'ideal'
  else if (estWaterTemp >= 25) swimComfort = 'good'
  else if (estWaterTemp >= 20) swimComfort = 'fresh'
  else if (estWaterTemp >= 15) swimComfort = 'cold'

  // Résumé
  const summary = alerts.length === 0
    ? `Météo clémente à ${w.location}. Pas d'alerte particulière. Filtrez ${filtrationHours}h/jour.`
    : `${alerts.length} alerte(s) météo : ${alerts.map(a => a.title).join(', ')}. Suivez les actions recommandées.`

  return { alerts, filtration, algaeRisk, testRecommended, testReason, swimComfort, summary }
}

// Mapping code wttr.in → description FR
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
