// AQWELIA — Spa-specific data and recommendations
// Le spa est un bassin d'eau chaude (28-40°C) qui demande un traitement
// radicalement différent de la piscine : le chlore s'y évapore trop vite,
// il faut privilégier le brome ou l'oxygène actif, et programmer des vidanges
// régulières (souvent plus économiques que de sur-traiter une eau saturée).

export type WaterBodyType = 'pool' | 'spa' | 'both'

export interface SpaBrand {
  id: string
  name: string
  origin: string
  category: 'premium' | 'mid_range' | 'budget'
  notes: string
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
  name: string
  pros: string[]
  cons: string[]
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
  frequency: string
  title: string
  description: string
  isDrainage?: boolean
}

export const SPA_MAINTENANCE: SpaMaintenanceTask[] = [
  {
    id: 'daily_check',
    frequency: 'Quotidien',
    title: 'maint_daily_check',
    description: 'maint_daily_check_desc',
  },
  {
    id: 'weekly_test',
    frequency: 'Hebdomadaire',
    title: 'maint_weekly_test',
    description: 'maint_weekly_test_desc',
  },
  {
    id: 'weekly_filter',
    frequency: 'Hebdomadaire',
    title: 'maint_weekly_filter',
    description: 'maint_weekly_filter_desc',
  },
  {
    id: 'cover_daily',
    frequency: 'Quotidien',
    title: 'maint_cover_daily',
    description: 'maint_cover_daily_desc',
  },
  {
    id: 'drain_3months',
    frequency: 'Tous les 3-4 mois',
    title: 'maint_drain_3months',
    description: 'maint_drain_3months_desc',
    isDrainage: true,
  },
  {
    id: 'drain_heavy_use',
    frequency: 'Selon usage',
    title: 'maint_drain_heavy_use',
    description: 'maint_drain_heavy_use_desc',
    isDrainage: true,
  },
  {
    id: 'pump_program',
    frequency: 'Configuration',
    title: 'maint_pump_program',
    description: 'maint_pump_program_desc',
  },
  {
    id: 'shell_clean',
    frequency: 'À chaque vidange',
    title: 'maint_shell_clean',
    description: 'maint_shell_clean_desc',
  },
]

export interface SpaSpecifics {
  seatsRange: { min: number; max: number; label: string }
  temperatureRange: { min: number; max: number; ideal: number; unit: string }
  volumeRange: { min: number; max: number; unit: string }
  usageFrequencyOptions: string[]
}

export const SPA_SPECIFICS: SpaSpecifics = {
  seatsRange: { min: 2, max: 8, label: 'Nombre de places assises' },
  temperatureRange: { min: 28, max: 40, ideal: 37, unit: '°C' },
  volumeRange: { min: 0.8, max: 3, unit: 'm³' },
  usageFrequencyOptions: ['Occasionnel (1-2x/semaine)', 'Régulier (3-4x/semaine)', 'Intensif (5+/semaine)'],
}

export function getSpaRecommendations(temperature: number, treatmentType: string): string[] {
  const recs: string[] = []

  if (temperature > 35) {
    recs.push('⚠️ Température élevée — le chlore n\'est PAS recommandé. Utilisez du brome.')
    recs.push('Surveillez la température: au-delà de 38°C, limitez les sessions à 15-20 min.')
  }
  if (temperature > 38) {
    recs.push('🔴 Température critique (>38°C) — risquez pour la santé. Réduisez la température.')
  }

  if (treatmentType === 'chlorine' && temperature > 30) {
    recs.push('⚠️ Le chlore s\'évapore rapidement en eau chaude. Passez au brome pour plus d\'efficacité.')
  }

  recs.push('Couvrez le spa après chaque utilisation pour éviter l\'évaporation et la photosynthèse.')
  recs.push('Vidangez tous les 3-4 mois — c\'est plus économique que de sur-traiter.')

  return recs
}

export function calculateDrainageFrequency(usagePerWeek: number, seats: number): { months: number; reason: string } {
  // Base: 3-4 months
  let months = 4

  // More usage = more frequent drainage
  if (usagePerWeek >= 5) months = 2
  else if (usagePerWeek >= 3) months = 3

  // More seats = more bathers = more frequent
  if (seats >= 6) months = Math.max(2, months - 1)

  return {
    months,
    reason: usagePerWeek >= 5
      ? 'Usage intensif détecté — vidange recommandée tous les ' + months + ' mois pour éviter la saturation en produits.'
      : 'Vidange recommandée tous les ' + months + ' mois (plus économique que sur-traitement).',
  }
}
