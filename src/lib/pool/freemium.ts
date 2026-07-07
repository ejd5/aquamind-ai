// Freemium logic — plans, limites, gating
// 3 plans internationaux RevenueCat-ready : free / ripple / lagoon / atlas
// Noms internationaux (Série A) — fonctionnent dans toutes les langues

export type PlanId = 'free' | 'ripple' | 'lagoon' | 'atlas'

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  price: { week: number; month: number; quarter: number; halfyear: number }
  features: string[]
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
    multiClient: boolean
    teamAccounts: number
    apiAccess: boolean
    whiteLabel: boolean
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
      maxSpas: 0,
      maxPhotoScansPerMonth: 2,
      maxTestsPerMonth: 999,
      weatherEnabled: true,
      smartReminders: false,
      guidesAccess: 'basic',
      multiPool: false,
      pdfReport: false,
      proMode: false,
      historyDays: 14,
      spaSupport: false,
      multiClient: false,
      teamAccounts: 0,
      apiAccess: false,
      whiteLabel: false,
    },
    color: 'muted',
    icon: '💧',
  },
  {
    id: 'ripple',
    name: 'Ripple',
    tagline: "L'essentiel pour une eau claire",
    price: { week: 3.99, month: 14.99, quarter: 37.99, halfyear: 69.99 },
    features: [
      '1 piscine',
      'Scans photo illimités (IA Vision)',
      "Plan d'action guidé avec étapes + saisie mesures",
      'Analyse eau complète (pH, chlore, TAC, CYA, TH)',
      'Météo intelligente + alertes orage/canicule',
      'Tous les guides écrits (20+)',
      'Historique 90 jours',
      'Rappels intelligents',
      'Diagnostic itératif (avant/après + jauge satisfaction)',
    ],
    limits: {
      maxPools: 1,
      maxSpas: 0,
      maxPhotoScansPerMonth: 999,
      maxTestsPerMonth: 999,
      weatherEnabled: true,
      smartReminders: true,
      guidesAccess: 'all',
      multiPool: false,
      pdfReport: false,
      proMode: false,
      historyDays: 90,
      spaSupport: false,
      multiClient: false,
      teamAccounts: 0,
      apiAccess: false,
      whiteLabel: false,
    },
    color: 'primary',
    icon: '🌊',
  },
  {
    id: 'lagoon',
    name: 'Lagoon',
    tagline: 'Piscine et spa, tout en un',
    price: { week: 5.99, month: 22.99, quarter: 57.99, halfyear: 109.99 },
    features: [
      '1 piscine + 1 spa',
      'Tout Ripple',
      'Support spa complet (6 types, 10 marques, brome, oxygène actif)',
      'Surveillance température + alertes spa',
      'Rappels de vidange intelligents',
      'Rapport PDF partageable',
      'Historique illimité',
      'Tutoriels vidéo premium',
      'Support prioritaire',
    ],
    limits: {
      maxPools: 1,
      maxSpas: 1,
      maxPhotoScansPerMonth: 999,
      maxTestsPerMonth: 999,
      weatherEnabled: true,
      smartReminders: true,
      guidesAccess: 'all_plus_video',
      multiPool: false,
      pdfReport: true,
      proMode: true,
      historyDays: 9999,
      spaSupport: true,
      multiClient: false,
      teamAccounts: 0,
      apiAccess: false,
      whiteLabel: false,
    },
    highlighted: true,
    color: 'accent',
    icon: '🛁',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    tagline: 'Le copilote ultime pour piscinistes et techniciens',
    price: { week: 14.99, month: 57.99, quarter: 147.99, halfyear: 279.99 },
    features: [
      'Piscines + spas illimités',
      'Tout Lagoon',
      'Multi-clients illimité',
      'Comptes équipe (jusqu\'à 5 techniciens)',
      'Devis et planning de visites',
      'Photos avant/après par visite',
      'Notes techniques avancées (LSI, mode expert)',
      'Export comptable (CSV/PDF)',
      'API + intégrations',
      'Marque blanche (logo de votre entreprise)',
      'Support dédié (réponse < 24h)',
    ],
    limits: {
      maxPools: 999,
      maxSpas: 999,
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
      multiClient: true,
      teamAccounts: 5,
      apiAccess: true,
      whiteLabel: true,
    },
    color: 'primary',
    icon: '🛡️',
  },
]

export const DURATIONS = [
  { id: 'week', label: '7 jours', suffix: '/semaine' },
  { id: 'month', label: '1 mois', suffix: '/mois' },
  { id: 'quarter', label: '3 mois', suffix: '/3 mois', save: '-27%' },
  { id: 'halfyear', label: '6 mois', suffix: '/6 mois', save: '-35%' },
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
  | 'multi_client'
  | 'team_accounts'
  | 'api_access'
  | 'white_label'

// Vérifie si une feature est accessible selon le plan.
// ctaPlan pointe vers le plan minimum pour débloquer la feature :
//   - PLANS[1] = ripple : la plupart des features payantes
//   - PLANS[2] = lagoon : spa support, PDF, vidéos
//   - PLANS[3] = atlas  : multi-client, équipe, API, marque blanche
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
      return p.limits.multiPool ? { allowed: true } : { allowed: false, reason: 'Multi-piscines réservé au plan Atlas.', ctaPlan: PLANS[3].id }
    case 'pdf_report':
      return p.limits.pdfReport ? { allowed: true } : { allowed: false, reason: 'Rapport PDF réservé aux plans Lagoon et Atlas.', ctaPlan: PLANS[2].id }
    case 'pro_mode':
      return p.limits.proMode ? { allowed: true } : { allowed: false, reason: 'Mode pro réservé aux plans Lagoon et Atlas.', ctaPlan: PLANS[2].id }
    case 'history_extended':
      return p.limits.historyDays >= 90 ? { allowed: true } : { allowed: false, reason: 'Historique étendu réservé aux plans payants.', ctaPlan: PLANS[1].id }
    case 'spa_support':
      return p.limits.spaSupport ? { allowed: true } : { allowed: false, reason: 'Le support des spas est réservé au plan Lagoon.', ctaPlan: PLANS[2].id }
    case 'multi_client':
      return p.limits.multiClient ? { allowed: true } : { allowed: false, reason: 'Multi-clients réservé au plan Atlas.', ctaPlan: PLANS[3].id }
    case 'team_accounts':
      return p.limits.teamAccounts > 0 ? { allowed: true } : { allowed: false, reason: 'Comptes équipe réservés au plan Atlas.', ctaPlan: PLANS[3].id }
    case 'api_access':
      return p.limits.apiAccess ? { allowed: true } : { allowed: false, reason: 'API réservée au plan Atlas.', ctaPlan: PLANS[3].id }
    case 'white_label':
      return p.limits.whiteLabel ? { allowed: true } : { allowed: false, reason: 'Marque blanche réservée au plan Atlas.', ctaPlan: PLANS[3].id }
    default:
      return { allowed: true }
  }
}

// Plan par défaut (utilisateur non connecté / gratuit)
export const DEFAULT_PLAN: PlanId = 'free'

// Helper: trouver un plan par ID
export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) || PLANS[0]
}
