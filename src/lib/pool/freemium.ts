// Freemium logic — plans, limites, gating
// 3 plans RevenueCat-ready : decouverte / oasis / wellness
// (anciennement free / premium / expert — voir worklog P1-TARIFS)
//
// i18n strategy: the French literals stay as legacy fallback, but each Plan
// also exposes `nameKey`, `taglineKey`, and `featureKeys` (array of translation
// keys) so consumers can use `t(plan.nameKey)` and `plan.featureKeys.map(k => t(k))`.
// `canAccess()` exposes `reasonKey` (translation key) in addition to `reason`.
//
// Legacy i18n keys (free.*, premium.*, expert.*) are kept in locale files for
// backward compatibility but are no longer referenced by PLANS.

export type PlanId = 'decouverte' | 'oasis' | 'wellness'

export interface Plan {
  id: PlanId
  name: string          // French fallback (legacy)
  nameKey: string       // translation key, e.g. 'decouverte.name'
  tagline: string       // French fallback (legacy)
  taglineKey: string    // translation key, e.g. 'decouverte.tagline'
  price: { week: number; month: number; quarter: number; halfyear: number; year: number }
  features: string[]        // French fallback (legacy)
  featureKeys: string[]     // translation keys (one per feature), e.g. 'decouverte.features.poolProfile'
  limits: {
    maxPools: number
    maxSpas: number
    maxPhotoScansPerMonth: number
    maxTestsPerMonth: number
    weatherEnabled: boolean
    smartReminders: boolean
    guidesAccess: 'basic' | 'all' | 'all_plus_video'
    multiPool: boolean
    pdfReport: boolean
    proMode: boolean
    historyDays: number
    spaSupport: boolean
  }
  highlighted?: boolean
  color: string
  icon: string
}

export const PLANS: Plan[] = [
  {
    id: 'decouverte',
    name: 'Découverte',
    nameKey: 'decouverte.name',
    tagline: 'Gratuit — pour tester',
    taglineKey: 'decouverte.tagline',
    price: { week: 0, month: 0, quarter: 0, halfyear: 0, year: 0 },
    features: [
      "Création d'un profil piscine",
      'Accès limité aux guides (5 guides de base)',
      'Une analyse manuelle limitée (2 tests/mois)',
      'Aperçu des alertes météo (basique)',
      'Aperçu de l\'historique (14 jours)',
      '2 scans photo / mois',
      'Fonctions premium visibles mais verrouillées',
    ],
    featureKeys: [
      'decouverte.features.poolProfile',
      'decouverte.features.5guides',
      'decouverte.features.2tests',
      'decouverte.features.basicWeather',
      'decouverte.features.history14',
      'decouverte.features.2scans',
      'decouverte.features.lockedPremium',
    ],
    limits: {
      maxPools: 1,
      maxSpas: 0,
      maxPhotoScansPerMonth: 2,
      maxTestsPerMonth: 2,
      weatherEnabled: true,
      smartReminders: false,
      guidesAccess: 'basic',
      multiPool: false,
      pdfReport: false,
      proMode: false,
      historyDays: 14,
      spaSupport: false,
    },
    color: 'muted',
    icon: '🌊',
  },
  {
    id: 'oasis',
    name: 'Oasis',
    nameKey: 'oasis.name',
    tagline: 'Le copilote piscine complet',
    taglineKey: 'oasis.tagline',
    price: { week: 3.99, month: 9.99, quarter: 24.99, halfyear: 39.99, year: 59.99 },
    features: [
      'Jusqu\'à 3 piscines',
      'Analyses illimitées',
      'Recommandations personnalisées',
      'Calculs de dosage',
      'Analyse assistée bandelettes',
      'Alertes météo avancées',
      'Rappels intelligents',
      'Historique illimité',
      'Guides complets + vidéos',
      'Gestion du stock',
      'Recommandations AQWELIA Care',
      'Plan de remise en route',
      "Plan d'hivernage",
      'Assistance intelligente (AI chat)',
      'Rapport PDF',
      'Mode pro (LSI avancé)',
    ],
    featureKeys: [
      'oasis.features.3pools',
      'oasis.features.unlimitedTests',
      'oasis.features.personalizedRecos',
      'oasis.features.dosageCalc',
      'oasis.features.stripAssisted',
      'oasis.features.advancedWeather',
      'oasis.features.smartReminders',
      'oasis.features.unlimitedHistory',
      'oasis.features.allGuidesVideos',
      'oasis.features.stockMgmt',
      'oasis.features.careRecos',
      'oasis.features.startupPlan',
      'oasis.features.winteringPlan',
      'oasis.features.aiChat',
      'oasis.features.pdfReport',
      'oasis.features.proMode',
    ],
    limits: {
      maxPools: 3,
      maxSpas: 0,
      maxPhotoScansPerMonth: 999,
      maxTestsPerMonth: 999,
      weatherEnabled: true,
      smartReminders: true,
      guidesAccess: 'all_plus_video',
      multiPool: true,
      pdfReport: true,
      proMode: true,
      historyDays: 9999,
      spaSupport: false,
    },
    highlighted: true,
    color: 'accent',
    icon: '✨',
  },
  {
    id: 'wellness',
    name: 'Wellness',
    nameKey: 'wellness.name',
    tagline: 'Piscine + Spa, sereinement',
    taglineKey: 'wellness.tagline',
    price: { week: 5.99, month: 14.99, quarter: 39.99, halfyear: 54.99, year: 79.99 },
    features: [
      'Jusqu\'à 3 profils (piscine + spa)',
      'Tout Oasis',
      'Traitements spécifiques spa (brome, oxygène actif)',
      'Eau chaude',
      'Historiques illimités séparés',
      'Rapports PDF',
      "Profils d'eau séparés",
      'Alertes spécifiques spa',
    ],
    featureKeys: [
      'wellness.features.3profiles',
      'wellness.features.allOasis',
      'wellness.features.spaTreatments',
      'wellness.features.warmWater',
      'wellness.features.separatedHistory',
      'wellness.features.pdfReports',
      'wellness.features.separatedProfiles',
      'wellness.features.spaAlerts',
    ],
    limits: {
      maxPools: 3,
      maxSpas: 1,
      maxPhotoScansPerMonth: 999,
      maxTestsPerMonth: 999,
      weatherEnabled: true,
      smartReminders: true,
      guidesAccess: 'all_plus_video',
      multiPool: true,
      pdfReport: true,
      proMode: true,
      historyDays: 9999,
      spaSupport: true,
    },
    color: 'primary',
    icon: '🛡️',
  },
]

export const DURATIONS = [
  { id: 'week', label: '7 jours', suffix: '/semaine', labelKey: 'week', suffixKey: 'perWeek' },
  { id: 'month', label: '1 mois', suffix: '/mois', labelKey: 'month', suffixKey: 'perMonth' },
  { id: 'halfyear', label: '6 mois', suffix: '/6 mois', save: '20%', labelKey: 'halfyear', suffixKey: 'perHalfyear' },
  { id: 'year', label: '12 mois', suffix: '/an', save: '30%', labelKey: 'year', suffixKey: 'perYear' },
] as const

export type FeatureGate =
  | 'photo_scan'
  | 'weather_advanced'
  | 'smart_reminders'
  | 'guides_premium'
  | 'multi_pool'
  | 'pdf_report'
  | 'pro_mode'
  | 'history_extended'
  | 'spa_support'

export interface CanAccessResult {
  allowed: boolean
  reason?: string         // French fallback (legacy)
  reasonKey?: string      // translation key (ICU params via reasonParams)
  reasonParams?: Record<string, string | number>
  ctaPlan?: PlanId
}

// Vérifie si une feature est accessible selon le plan.
// ctaPlan pointe vers le plan minimum pour débloquer la feature :
//   - PLANS[1] = oasis    : la plupart des features payantes (PDF, mode pro, météo avancée…)
//   - PLANS[2] = wellness : spa + traitements spa (brome, oxygène actif, eau chaude)
export function canAccess(plan: PlanId, feature: FeatureGate, usage?: { photoScansThisMonth?: number }): CanAccessResult {
  const p = PLANS.find((x) => x.id === plan) || PLANS[0]

  switch (feature) {
    case 'photo_scan':
      if (usage?.photoScansThisMonth != null && usage.photoScansThisMonth >= p.limits.maxPhotoScansPerMonth) {
        return {
          allowed: false,
          reason: `Limite de ${p.limits.maxPhotoScansPerMonth} scans/mois atteinte.`,
          reasonKey: 'gates.photo_scan_limit',
          reasonParams: { n: p.limits.maxPhotoScansPerMonth },
          ctaPlan: PLANS[1].id,
        }
      }
      return { allowed: true }
    case 'weather_advanced':
      return p.limits.weatherEnabled && p.id !== 'decouverte'
        ? { allowed: true }
        : { allowed: false, reason: 'Météo avancée réservée aux plans payants.', reasonKey: 'gates.weather_advanced', ctaPlan: PLANS[1].id }
    case 'smart_reminders':
      return p.limits.smartReminders
        ? { allowed: true }
        : { allowed: false, reason: 'Rappels intelligents réservés aux plans payants.', reasonKey: 'gates.smart_reminders', ctaPlan: PLANS[1].id }
    case 'guides_premium':
      return p.limits.guidesAccess !== 'basic'
        ? { allowed: true }
        : { allowed: false, reason: 'Guides premium réservés aux plans payants.', reasonKey: 'gates.guides_premium', ctaPlan: PLANS[1].id }
    case 'multi_pool':
      return p.limits.multiPool
        ? { allowed: true }
        : { allowed: false, reason: 'Multi-piscines réservé à Oasis et Wellness.', reasonKey: 'gates.multi_pool', ctaPlan: PLANS[1].id }
    case 'pdf_report':
      return p.limits.pdfReport
        ? { allowed: true }
        : { allowed: false, reason: 'Rapport PDF réservé à Oasis et Wellness.', reasonKey: 'gates.pdf_report', ctaPlan: PLANS[1].id }
    case 'pro_mode':
      return p.limits.proMode
        ? { allowed: true }
        : { allowed: false, reason: 'Mode pro réservé à Oasis et Wellness.', reasonKey: 'gates.pro_mode', ctaPlan: PLANS[1].id }
    case 'history_extended':
      return p.limits.historyDays >= 90
        ? { allowed: true }
        : { allowed: false, reason: 'Historique étendu réservé aux plans payants.', reasonKey: 'gates.history_extended', ctaPlan: PLANS[1].id }
    case 'spa_support':
      return p.limits.spaSupport
        ? { allowed: true }
        : { allowed: false, reason: 'Le support des spas est réservé au plan Wellness.', reasonKey: 'gates.spa_support', ctaPlan: PLANS[2].id }
    default:
      return { allowed: true }
  }
}

// Plan par défaut (utilisateur non connecté / gratuit)
export const DEFAULT_PLAN: PlanId = 'decouverte'
