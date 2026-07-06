// Freemium logic — plans, limites, gating
// 3 plans RevenueCat-ready : free / premium / expert
// (anciennement surface / limpide / cristal / gardien — voir worklog L1-C)

export type PlanId = 'free' | 'premium' | 'expert'

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  price: { week: number; month: number; quarter: number; halfyear: number }
  features: string[]
  limits: {
    maxPools: number
    maxPhotoScansPerMonth: number
    maxTestsPerMonth: number
    weatherEnabled: boolean
    smartReminders: boolean
    guidesAccess: 'basic' | 'all' | 'all_plus_video'
    multiPool: boolean
    pdfReport: boolean
    proMode: boolean
    historyDays: number
  }
  highlighted?: boolean
  color: string
  icon: string
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Gratuit — pour découvrir',
    price: { week: 0, month: 0, quarter: 0, halfyear: 0 },
    features: [
      '1 piscine',
      "Test d'eau illimité (manuel)",
      'Indice eau claire + sécurité baignade',
      '2 scans photo / mois',
      'Météo simple',
      '5 guides de base',
      'Historique 14 jours',
    ],
    limits: {
      maxPools: 1,
      maxPhotoScansPerMonth: 2,
      maxTestsPerMonth: 999,
      weatherEnabled: true,
      smartReminders: false,
      guidesAccess: 'basic',
      multiPool: false,
      pdfReport: false,
      proMode: false,
      historyDays: 14,
    },
    color: 'muted',
    icon: '🌊',
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Le copilote complet',
    price: { week: 4.99, month: 12.99, quarter: 32.99, halfyear: 57.99 },
    features: [
      '3 piscines',
      'Scans photo illimités',
      'Météo avancée + alertes',
      'Tous les guides + vidéos',
      'Rappels intelligents',
      'Rapport PDF partageable',
      'Mode pro (LSI avancé)',
      'Historique illimité',
      'Support prioritaire',
    ],
    limits: {
      maxPools: 3,
      maxPhotoScansPerMonth: 999,
      maxTestsPerMonth: 999,
      weatherEnabled: true,
      smartReminders: true,
      guidesAccess: 'all_plus_video',
      multiPool: true,
      pdfReport: true,
      proMode: true,
      historyDays: 9999,
    },
    highlighted: true,
    color: 'accent',
    icon: '✨',
  },
  {
    id: 'expert',
    name: 'Expert',
    tagline: 'Pour piscinistes et techniciens',
    price: { week: 9.99, month: 24.99, quarter: 59.99, halfyear: 109.99 },
    features: [
      'Tout Premium',
      'Multi-clients illimité',
      'Devis et planning visites',
      'Photos avant/après',
      'Notes techniques avancées',
      'Export comptable',
      'API + intégrations',
    ],
    limits: {
      maxPools: 999,
      maxPhotoScansPerMonth: 999,
      maxTestsPerMonth: 999,
      weatherEnabled: true,
      smartReminders: true,
      guidesAccess: 'all_plus_video',
      multiPool: true,
      pdfReport: true,
      proMode: true,
      historyDays: 9999,
    },
    color: 'primary',
    icon: '🛡️',
  },
]

export const DURATIONS = [
  { id: 'week', label: '7 jours', suffix: '/semaine' },
  { id: 'month', label: '1 mois', suffix: '/mois' },
  { id: 'quarter', label: '3 mois', suffix: '/3 mois', save: '10%' },
  { id: 'halfyear', label: '6 mois', suffix: '/6 mois', save: '20%' },
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

// Vérifie si une feature est accessible selon le plan.
// ctaPlan pointe vers le plan minimum pour débloquer la feature :
//   - PLANS[1] = premium : la plupart des features payantes (multi-piscines, PDF, mode pro, météo avancée…)
//   - PLANS[2] = expert  : réservé aux gates futures (multi-client illimité, API) — non listées ici
export function canAccess(plan: PlanId, feature: FeatureGate, usage?: { photoScansThisMonth?: number }): { allowed: boolean; reason?: string; ctaPlan?: PlanId } {
  const p = PLANS.find((x) => x.id === plan) || PLANS[0]

  switch (feature) {
    case 'photo_scan':
      if (usage?.photoScansThisMonth != null && usage.photoScansThisMonth >= p.limits.maxPhotoScansPerMonth) {
        return { allowed: false, reason: `Limite de ${p.limits.maxPhotoScansPerMonth} scans/mois atteinte.`, ctaPlan: PLANS[1].id }
      }
      return { allowed: true }
    case 'weather_advanced':
      return p.limits.weatherEnabled ? { allowed: true } : { allowed: false, reason: 'Météo avancée réservée aux plans payants.', ctaPlan: PLANS[1].id }
    case 'smart_reminders':
      return p.limits.smartReminders ? { allowed: true } : { allowed: false, reason: 'Rappels intelligents réservés aux plans payants.', ctaPlan: PLANS[1].id }
    case 'guides_premium':
      return p.limits.guidesAccess !== 'basic' ? { allowed: true } : { allowed: false, reason: 'Guides premium réservés aux plans payants.', ctaPlan: PLANS[1].id }
    case 'multi_pool':
      return p.limits.multiPool ? { allowed: true } : { allowed: false, reason: 'Multi-piscines réservé à Premium et Expert.', ctaPlan: PLANS[1].id }
    case 'pdf_report':
      return p.limits.pdfReport ? { allowed: true } : { allowed: false, reason: 'Rapport PDF réservé à Premium et Expert.', ctaPlan: PLANS[1].id }
    case 'pro_mode':
      return p.limits.proMode ? { allowed: true } : { allowed: false, reason: 'Mode pro réservé à Premium et Expert.', ctaPlan: PLANS[1].id }
    case 'history_extended':
      return p.limits.historyDays >= 90 ? { allowed: true } : { allowed: false, reason: 'Historique étendu réservé aux plans payants.', ctaPlan: PLANS[1].id }
    default:
      return { allowed: true }
  }
}

// Plan par défaut (utilisateur non connecté / gratuit)
export const DEFAULT_PLAN: PlanId = 'free'
