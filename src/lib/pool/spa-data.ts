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
  { id: 'jacuzzi', name: 'Jacuzzi', origin: 'USA/Italie', category: 'premium', notes: 'Marque historique, qualité premium, pompes fiables' },
  { id: 'sundance', name: 'Sundance Spas', origin: 'USA', category: 'premium', notes: 'Filtration avancée, économe en énergie' },
  { id: 'hsr', name: 'Hot Spring Spas', origin: 'USA', category: 'premium', notes: 'Système de filtration multiple, très silencieux' },
  { id: 'bestway', name: 'Bestway / Lay-Z-Spa', origin: 'Chine/UK', category: 'budget', notes: 'Spas gonflables, pompe intégrée, bon rapport qualité/prix' },
  { id: 'intex', name: 'Intex', origin: 'Chine', category: 'budget', notes: 'Spas gonflables populaires, économiques' },
  { id: 'aquatopia', name: 'Aquatopia', origin: 'Chine', category: 'mid_range', notes: 'Spas rigides d\'entrée de gamme' },
  { id: 'pearl', name: 'Pearl Spas', origin: 'Chine', category: 'mid_range', notes: 'Spas rigides, bon rapport qualité/prix' },
  { id: 'desjoyaux', name: 'Desjoyaux', origin: 'France', category: 'premium', notes: 'Spas français, filtration unique' },
  { id: 'wellis', name: 'Wellis', origin: 'Hongrie', category: 'mid_range', notes: 'Spas européens, bon compromis' },
  { id: 'other', name: 'Autre / Générique', origin: 'Chine', category: 'budget', notes: 'Spa générique chinois sans marque' },
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
    name: 'Brome',
    pros: ['Stable à haute température', 'Moins irritant que le chlore', 'Efficace en eau chaude', 'Pas d\'odeur'],
    cons: ['Plus cher que le chlore', 'Nécessite un activateur', 'Dosage plus délicat'],
    recommended: true,
    temperatureMax: 40,
  },
  {
    type: 'active_oxygen',
    name: 'Oxygène actif',
    pros: ['Sans chlore ni brome', 'Respectueux de la peau', 'Pas d\'odeur', 'Écologique'],
    cons: ['Moins stable que le brome', 'Doit être ajouté régulièrement', 'Moins efficace en eau très chaude (>35°C)'],
    recommended: true,
    temperatureMax: 35,
  },
  {
    type: 'chlorine',
    name: 'Chlore (non recommandé pour spa)',
    pros: ['Économique', 'Disponible partout'],
    cons: ['S\'évapore vite en eau chaude', 'Irritant pour la peau et les yeux', 'Odeur forte', 'Forme des chloramines à haute température'],
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
    title: 'Vérification rapide',
    description: 'Vérifiez la température, le niveau d\'eau, et l\'absence de mousse excessive. Si l\'eau est trouble ou sent mauvais, testez immédiatement.',
  },
  {
    id: 'weekly_test',
    frequency: 'Hebdomadaire',
    title: 'Test complet de l\'eau',
    description: 'Mesurez le pH (7.0-7.6), le brome (3-5 mg/L) ou l\'oxygène actif (8 mg/L), et le TAC (80-120 mg/L). Ajustez si nécessaire.',
  },
  {
    id: 'weekly_filter',
    frequency: 'Hebdomadaire',
    title: 'Nettoyage du filtre',
    description: 'Sortez la cartouche filtrante et rincez-la au jet d\'eau. Tous les 2 mois, faites tremper dans un nettoyant pour filtre de spa.',
  },
  {
    id: 'cover_daily',
    frequency: 'Quotidien',
    title: 'Bâchage après usage',
    description: 'Couvrez toujours le spa après utilisation pour : éviter l\'évaporation (eau + produits), empêcher la photosynthèse (algues), conserver la chaleur, protéger des débris.',
  },
  {
    id: 'drain_3months',
    frequency: 'Tous les 3-4 mois',
    title: 'Vidange complète',
    description: 'Vidangez complètement le spa tous les 3-4 mois (ou après 100-150 bains). Une vidange est souvent PLUS ÉCONOMIQUE que de saturer l\'eau en produits. Renouvelez l\'eau, nettoyez la coque, et recommencez le traitement.',
    isDrainage: true,
  },
  {
    id: 'drain_heavy_use',
    frequency: 'Selon usage',
    title: 'Vidange anticipée (usage intensif)',
    description: 'Si le spa est utilisé très fréquemment (plus de 4 fois/semaine) ou par beaucoup de personnes, vidangez plus souvent (tous les 2 mois). Surveillez la qualité de l\'eau: si elle reste trouble malgré les traitements, c\'est le signal d\'une vidange.',
    isDrainage: true,
  },
  {
    id: 'pump_program',
    frequency: 'Configuration',
    title: 'Programme de filtration/pompe',
    description: 'Configurez la pompe pour filtrer au minimum 4h/jour (ou 2 cycles de 2h). En usage intensif, augmentez à 6h/jour. Vérifiez les jets et la pompe de massage régulièrement.',
  },
  {
    id: 'shell_clean',
    frequency: 'À chaque vidange',
    title: 'Nettoyage de la coque',
    description: 'À chaque vidange, nettoyez la coque avec un produit adapté (pas de détergent ménager!). Vérifiez l\'état du revêtement, des jets, et des buses.',
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
