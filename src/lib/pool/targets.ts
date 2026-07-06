// Plages cibles idéales par paramètre (mode propriétaire)
// Source : standards piscine, adaptés grand public

export interface TargetRange {
  min: number
  max: number
  idealLow: number
  idealHigh: number
  unit: string
  label: string
  severityLow: 'critical' | 'warning'
  severityHigh: 'critical' | 'warning'
  consequenceLow: string
  consequenceHigh: string
}

export const TARGETS: Record<string, TargetRange> = {
  ph: {
    min: 6.8,
    max: 7.8,
    idealLow: 7.0,
    idealHigh: 7.4,
    unit: '',
    label: 'pH',
    severityLow: 'critical',
    severityHigh: 'warning',
    consequenceLow: 'Eau acide : irritation, corrosion équipements, chlore instable.',
    consequenceHigh: 'Eau basique : chlore moins efficace, tartre, eau trouble.',
  },
  freeChlorine: {
    min: 0.5,
    max: 4,
    idealLow: 1,
    idealHigh: 3,
    unit: 'mg/L',
    label: 'Chlore libre',
    severityLow: 'critical',
    severityHigh: 'warning',
    consequenceLow: 'Désinfection insuffisante : risque algues et bactéries.',
    consequenceHigh: 'Surchloration : irritation, odeur, surdosage.',
  },
  combinedChlorine: {
    min: 0,
    max: 0.6,
    idealLow: 0,
    idealHigh: 0.4,
    unit: 'mg/L',
    label: 'Chlore combiné',
    severityLow: 'warning',
    severityHigh: 'critical',
    consequenceLow: '—',
    consequenceHigh: 'Chlore combiné élevé : odeur forte, irritation yeux, chloramines.',
  },
  alkalinity: {
    min: 60,
    max: 150,
    idealLow: 80,
    idealHigh: 120,
    unit: 'mg/L',
    label: 'Alcalinité (TAC)',
    severityLow: 'warning',
    severityHigh: 'warning',
    consequenceLow: 'pH instable, variations rapides.',
    consequenceHigh: 'pH difficile à ajuster, eau trouble.',
  },
  calciumHardness: {
    min: 150,
    max: 500,
    idealLow: 200,
    idealHigh: 400,
    unit: 'mg/L',
    label: 'Dureté calcium (TH)',
    severityLow: 'warning',
    severityHigh: 'warning',
    consequenceLow: 'Eau agressive : corrosion, mousse.',
    consequenceHigh: 'Tartre, dépôts, eau trouble.',
  },
  cyanuricAcid: {
    min: 0,
    max: 80,
    idealLow: 30,
    idealHigh: 50,
    unit: 'mg/L',
    label: 'Stabilisant (CYA)',
    severityLow: 'warning',
    severityHigh: 'critical',
    consequenceLow: 'Chlore dégradé vite par le soleil.',
    consequenceHigh: 'Chlore bloqué : traitement inefficace, risque algues.',
  },
  salt: {
    min: 2,
    max: 8,
    idealLow: 4,
    idealHigh: 7,
    unit: 'g/L',
    label: 'Sel',
    severityLow: 'critical',
    severityHigh: 'warning',
    consequenceLow: 'Électrolyseur ne produit pas assez de chlore.',
    consequenceHigh: 'Surconsommation électrolyseur, goût.',
  },
  bromine: {
    min: 1,
    max: 5,
    idealLow: 2,
    idealHigh: 4,
    unit: 'mg/L',
    label: 'Brome',
    severityLow: 'critical',
    severityHigh: 'warning',
    consequenceLow: 'Désinfection insuffisante.',
    consequenceHigh: 'Surdosage, irritation.',
  },
  phosphates: {
    min: 0,
    max: 0.5,
    idealLow: 0,
    idealHigh: 0.1,
    unit: 'mg/L',
    label: 'Phosphates',
    severityLow: 'warning',
    severityHigh: 'critical',
    consequenceLow: '—',
    consequenceHigh: 'Nourrit les algues : risque eau verte élevé.',
  },
  temperature: {
    min: 10,
    max: 40,
    idealLow: 26,
    idealHigh: 30,
    unit: '°C',
    label: 'Température',
    severityLow: 'warning',
    severityHigh: 'warning',
    consequenceLow: 'Eau froide, faible activité chimique.',
    consequenceHigh: 'Évaporation, algues, surconsommation chlore.',
  },
}

export type ParamStatus = 'low_critical' | 'low_warning' | 'ok' | 'high_warning' | 'high_critical'

export function evaluateParam(key: string, value: number): ParamStatus {
  const t = TARGETS[key]
  if (!t) return 'ok'
  if (value < t.min) return t.severityLow === 'critical' ? 'low_critical' : 'low_warning'
  if (value > t.max) return t.severityHigh === 'critical' ? 'high_critical' : 'high_warning'
  if (value < t.idealLow) return 'low_warning'
  if (value > t.idealHigh) return 'high_warning'
  return 'ok'
}
