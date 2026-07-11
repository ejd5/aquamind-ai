// AQWELIA — Spa-specific data and recommendations
// Le spa est un bassin d'eau chaude (28-40°C) qui demande un traitement
// radicalement différent de la piscine : le chlore s'y évapore trop vite,
// il faut privilégier le brome ou l'oxygène actif, et programmer des vidanges
// régulières (souvent plus économiques que de sur-traiter une eau saturée).
//
// i18n strategy:
//   - SpaTreatment / SpaMaintenanceTask / SpaBrand already expose key fields
//     (`name`, `pros`, `cons`, `notes`, `title`, `description`) whose values
//     ARE translation keys (resolved by consumers via `t(key)` from the
//     `spaData` namespace). We keep that convention and add `frequencyKey`
//     to SpaMaintenanceTask, plus key-based returns for getSpaRecommendations
//     and calculateDrainageFrequency.
//   - SPA_SPECIFICS gains `seatsLabelKey` and `usageFrequencyOptionKeys`
//     arrays so consumers can translate labels without literals.

export type WaterBodyType = 'pool' | 'spa' | 'both'

export interface SpaBrand {
  id: string
  name: string  // Brand name (proper noun — usually not translated)
  origin: string  // Origin country (proper noun — usually not translated)
  category: 'premium' | 'mid_range' | 'budget'
  notes: string  // translation key under `spaData` namespace
}

export const SPA_BRANDS: SpaBrand[] = [
  { id: 'jacuzzi', name: 'Jacuzzi', origin: 'USA/Italie', category: 'premium', notes: 'brand_jacuzzi_notes' },
  { id: 'sundance', name: 'Sundance Spas', origin: 'USA', category: 'premium', notes: 'brand_sundance_notes' },
  { id: 'hsr', name: 'Hot Spring Spas', origin: 'USA', category: 'premium', notes: 'brand_hsr_notes' },
  { id: 'bestway', name: 'Bestway / Lay-Z-Spa', origin: 'Chine/UK', category: 'budget', notes: 'brand_bestway_notes' },
  { id: 'intex', name: 'Intex', origin: 'Chine', category: 'budget', notes: 'brand_intex_notes' },
  { id: 'aquatopia', name: 'Aquatopia', origin: 'Chine', category: 'mid_range', notes: 'brand_aquatopia_notes' },
  { id: 'pearl', name: 'Pearl Spas', origin: 'Chine', category: 'mid_range', notes: 'brand_pearl_notes' },
  { id: 'desjoyaux', name: 'Desjoyaux', origin: 'France', category: 'premium', notes: 'brand_desjoyaux_notes' },
  { id: 'wellis', name: 'Wellis', origin: 'Hongrie', category: 'mid_range', notes: 'brand_wellis_notes' },
  { id: 'other', name: 'Autre / Générique', origin: 'Chine', category: 'budget', notes: 'brand_other_notes' },
]

export interface SpaTreatment {
  type: string
  name: string         // translation key under `spaData` namespace
  pros: string[]       // translation keys
  cons: string[]       // translation keys
  recommended: boolean
  temperatureMax: number // °C max recommended
}

export const SPA_TREATMENTS: SpaTreatment[] = [
  {
    type: 'bromine',
    name: 'treatment_bromine',
    pros: ['treatment_bromine_pro1', 'treatment_bromine_pro2', 'treatment_bromine_pro3', 'treatment_bromine_pro4'],
    cons: ['treatment_bromine_con1', 'treatment_bromine_con2', 'treatment_bromine_con3'],
    recommended: true,
    temperatureMax: 40,
  },
  {
    type: 'active_oxygen',
    name: 'treatment_oxygen',
    pros: ['treatment_oxygen_pro1', 'treatment_oxygen_pro2', 'treatment_oxygen_pro3', 'treatment_oxygen_pro4'],
    cons: ['treatment_oxygen_con1', 'treatment_oxygen_con2', 'treatment_oxygen_con3'],
    recommended: true,
    temperatureMax: 35,
  },
  {
    type: 'chlorine',
    name: 'treatment_chlorine',
    pros: ['treatment_chlorine_pro1', 'treatment_chlorine_pro2'],
    cons: ['treatment_chlorine_con1', 'treatment_chlorine_con2', 'treatment_chlorine_con3', 'treatment_chlorine_con4'],
    recommended: false,
    temperatureMax: 30,
  },
]

export interface SpaMaintenanceTask {
  id: string
  frequency: string       // French fallback (legacy)
  frequencyKey: string    // translation key under `spaData` namespace (ICU params via frequencyParams?)
  frequencyParams?: Record<string, string | number>
  title: string           // translation key under `spaData` namespace
  description: string     // translation key
  isDrainage?: boolean
}

export const SPA_MAINTENANCE: SpaMaintenanceTask[] = [
  {
    id: 'daily_check',
    frequency: 'Quotidien',
    frequencyKey: 'freq_daily',
    title: 'maint_daily_check',
    description: 'maint_daily_check_desc',
  },
  {
    id: 'weekly_test',
    frequency: 'Hebdomadaire',
    frequencyKey: 'freq_weekly',
    title: 'maint_weekly_test',
    description: 'maint_weekly_test_desc',
  },
  {
    id: 'weekly_filter',
    frequency: 'Hebdomadaire',
    frequencyKey: 'freq_weekly',
    title: 'maint_weekly_filter',
    description: 'maint_weekly_filter_desc',
  },
  {
    id: 'cover_daily',
    frequency: 'Quotidien',
    frequencyKey: 'freq_daily',
    title: 'maint_cover_daily',
    description: 'maint_cover_daily_desc',
  },
  {
    id: 'drain_3months',
    frequency: 'Tous les 3-4 mois',
    frequencyKey: 'freq_every_3_4_months',
    title: 'maint_drain_3months',
    description: 'maint_drain_3months_desc',
    isDrainage: true,
  },
  {
    id: 'drain_heavy_use',
    frequency: 'Selon usage',
    frequencyKey: 'freq_per_usage',
    title: 'maint_drain_heavy_use',
    description: 'maint_drain_heavy_use_desc',
    isDrainage: true,
  },
  {
    id: 'pump_program',
    frequency: 'Configuration',
    frequencyKey: 'freq_config',
    title: 'maint_pump_program',
    description: 'maint_pump_program_desc',
  },
  {
    id: 'shell_clean',
    frequency: 'À chaque vidange',
    frequencyKey: 'freq_per_drain',
    title: 'maint_shell_clean',
    description: 'maint_shell_clean_desc',
  },
]

export interface SpaSpecifics {
  seatsRange: { min: number; max: number; label: string; labelKey: string }
  temperatureRange: { min: number; max: number; ideal: number; unit: string }
  volumeRange: { min: number; max: number; unit: string }
  usageFrequencyOptions: string[]            // French fallback (legacy)
  usageFrequencyOptionKeys: string[]         // translation keys under `spaData` namespace
}

export const SPA_SPECIFICS: SpaSpecifics = {
  seatsRange: { min: 2, max: 8, label: 'Nombre de places assises', labelKey: 'seats_label' },
  temperatureRange: { min: 28, max: 40, ideal: 37, unit: '°C' },
  volumeRange: { min: 0.8, max: 3, unit: 'm³' },
  usageFrequencyOptions: ['Occasionnel (1-2x/semaine)', 'Régulier (3-4x/semaine)', 'Intensif (5+/semaine)'],
  usageFrequencyOptionKeys: ['usage_occasional', 'usage_regular', 'usage_intensive'],
}

/**
 * Recommandations spa selon température + traitement.
 * Renvoie un tableau de clés de traduction (namespace `spaData`).
 * Les éléments peuvent être interpolés : pour une clé `rec_temp_high_warning`
 * la valeur ICU sera par ex. `⚠️ Température élevée — le chlore n'est PAS recommandé. Utilisez du brome.`
 * Pas d'interpolation actuellement — les recommandations sont statiques.
 */
export function getSpaRecommendations(temperature: number, treatmentType: string): string[] {
  const recs: string[] = []

  if (temperature > 35) {
    recs.push('rec_temp_high_chlorine_warning')
    recs.push('rec_temp_high_session_limit')
  }
  if (temperature > 38) {
    recs.push('rec_temp_critical_health')
  }

  if (treatmentType === 'chlorine' && temperature > 30) {
    recs.push('rec_chlorine_evaporates')
  }

  recs.push('rec_cover_after_use')
  recs.push('rec_drain_economic')

  return recs
}

export interface DrainageFrequencyResult {
  months: number
  reason: string        // French fallback (legacy)
  reasonKey: string     // translation key (ICU { months })
}

export function calculateDrainageFrequency(usagePerWeek: number, seats: number): DrainageFrequencyResult {
  // Base: 3-4 months
  let months = 4

  // More usage = more frequent drainage
  if (usagePerWeek >= 5) months = 2
  else if (usagePerWeek >= 3) months = 3

  // More seats = more bathers = more frequent
  if (seats >= 6) months = Math.max(2, months - 1)

  const isIntensive = usagePerWeek >= 5
  return {
    months,
    reason: isIntensive
      ? 'Usage intensif détecté — vidange recommandée tous les ' + months + ' mois pour éviter la saturation en produits.'
      : 'Vidange recommandée tous les ' + months + ' mois (plus économique que sur-traitement).',
    reasonKey: isIntensive ? 'drainage_reason_intensive' : 'drainage_reason_standard',
  }
}
