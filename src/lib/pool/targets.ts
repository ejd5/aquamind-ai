// Plages cibles idéales par paramètre (mode propriétaire)
// Source : standards piscine, adaptés grand public

export interface TargetRange {
  min: number
  max: number
  idealLow: number
  idealHigh: number
  unit: string
  /** French fallback label — displayed when labelKey is not resolved */
  label: string
  /** next-intl key under the `targets` namespace, e.g. `ph.label` */
  labelKey: string
  severityLow: 'critical' | 'warning'
  severityHigh: 'critical' | 'warning'
  /** French fallback for the low-out-of-range consequence */
  consequenceLow: string
  /** next-intl key under the `targets` namespace, e.g. `ph.consequenceLow`.
   *  Omitted when `consequenceLow` is the universal placeholder "—". */
  consequenceLowKey?: string
  /** French fallback for the high-out-of-range consequence */
  consequenceHigh: string
  /** next-intl key under the `targets` namespace, e.g. `ph.consequenceHigh`.
   *  Omitted when `consequenceHigh` is the universal placeholder "—". */
  consequenceHighKey?: string
}

export const TARGETS: Record<string, TargetRange> = {
  ph: {
    min: 6.8,
    max: 7.8,
    idealLow: 7.0,
    idealHigh: 7.4,
    unit: '',
    label: 'pH',
    labelKey: 'ph.label',
    severityLow: 'critical',
    severityHigh: 'warning',
    consequenceLow: 'Eau acide : irritation, corrosion équipements, chlore instable.',
    consequenceLowKey: 'ph.consequenceLow',
    consequenceHigh: 'Eau basique : chlore moins efficace, tartre, eau trouble.',
    consequenceHighKey: 'ph.consequenceHigh',
  },
  freeChlorine: {
    min: 0.5,
    max: 4,
    idealLow: 1,
    idealHigh: 3,
    unit: 'mg/L',
    label: 'Chlore libre',
    labelKey: 'freeChlorine.label',
    severityLow: 'critical',
    severityHigh: 'warning',
    consequenceLow: 'Désinfection insuffisante : risque algues et bactéries.',
    consequenceLowKey: 'freeChlorine.consequenceLow',
    consequenceHigh: 'Surchloration : irritation, odeur, surdosage.',
    consequenceHighKey: 'freeChlorine.consequenceHigh',
  },
  combinedChlorine: {
    min: 0,
    max: 0.6,
    idealLow: 0,
    idealHigh: 0.4,
    unit: 'mg/L',
    label: 'Chlore combiné',
    labelKey: 'combinedChlorine.label',
    severityLow: 'warning',
    severityHigh: 'critical',
    consequenceLow: '—',
    consequenceHigh: 'Chlore combiné élevé : odeur forte, irritation yeux, chloramines.',
    consequenceHighKey: 'combinedChlorine.consequenceHigh',
  },
  alkalinity: {
    min: 60,
    max: 150,
    idealLow: 80,
    idealHigh: 120,
    unit: 'mg/L',
    label: 'Alcalinité (TAC)',
    labelKey: 'alkalinity.label',
    severityLow: 'warning',
    severityHigh: 'warning',
    consequenceLow: 'pH instable, variations rapides.',
    consequenceLowKey: 'alkalinity.consequenceLow',
    consequenceHigh: 'pH difficile à ajuster, eau trouble.',
    consequenceHighKey: 'alkalinity.consequenceHigh',
  },
  calciumHardness: {
    min: 150,
    max: 500,
    idealLow: 200,
    idealHigh: 400,
    unit: 'mg/L',
    label: 'Dureté calcium (TH)',
    labelKey: 'calciumHardness.label',
    severityLow: 'warning',
    severityHigh: 'warning',
    consequenceLow: 'Eau agressive : corrosion, mousse.',
    consequenceLowKey: 'calciumHardness.consequenceLow',
    consequenceHigh: 'Tartre, dépôts, eau trouble.',
    consequenceHighKey: 'calciumHardness.consequenceHigh',
  },
  cyanuricAcid: {
    min: 0,
    max: 80,
    idealLow: 30,
    idealHigh: 50,
    unit: 'mg/L',
    label: 'Stabilisant (CYA)',
    labelKey: 'cyanuricAcid.label',
    severityLow: 'warning',
    severityHigh: 'critical',
    consequenceLow: 'Chlore dégradé vite par le soleil.',
    consequenceLowKey: 'cyanuricAcid.consequenceLow',
    consequenceHigh: 'Chlore bloqué : traitement inefficace, risque algues.',
    consequenceHighKey: 'cyanuricAcid.consequenceHigh',
  },
  salt: {
    min: 2,
    max: 8,
    idealLow: 4,
    idealHigh: 7,
    unit: 'g/L',
    label: 'Sel',
    labelKey: 'salt.label',
    severityLow: 'critical',
    severityHigh: 'warning',
    consequenceLow: 'Électrolyseur ne produit pas assez de chlore.',
    consequenceLowKey: 'salt.consequenceLow',
    consequenceHigh: 'Surconsommation électrolyseur, goût.',
    consequenceHighKey: 'salt.consequenceHigh',
  },
  bromine: {
    min: 1,
    max: 5,
    idealLow: 2,
    idealHigh: 4,
    unit: 'mg/L',
    label: 'Brome',
    labelKey: 'bromine.label',
    severityLow: 'critical',
    severityHigh: 'warning',
    consequenceLow: 'Désinfection insuffisante.',
    consequenceLowKey: 'bromine.consequenceLow',
    consequenceHigh: 'Surdosage, irritation.',
    consequenceHighKey: 'bromine.consequenceHigh',
  },
  phosphates: {
    min: 0,
    max: 0.5,
    idealLow: 0,
    idealHigh: 0.1,
    unit: 'mg/L',
    label: 'Phosphates',
    labelKey: 'phosphates.label',
    severityLow: 'warning',
    severityHigh: 'critical',
    consequenceLow: '—',
    consequenceHigh: 'Nourrit les algues : risque eau verte élevé.',
    consequenceHighKey: 'phosphates.consequenceHigh',
  },
  temperature: {
    min: 10,
    max: 40,
    idealLow: 26,
    idealHigh: 30,
    unit: '°C',
    label: 'Température',
    labelKey: 'temperature.label',
    severityLow: 'warning',
    severityHigh: 'warning',
    consequenceLow: 'Eau froide, faible activité chimique.',
    consequenceLowKey: 'temperature.consequenceLow',
    consequenceHigh: 'Évaporation, algues, surconsommation chlore.',
    consequenceHighKey: 'temperature.consequenceHigh',
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
