/**
 * AQWELIA — Single source of truth for subscription plans.
 *
 * This file is the ONLY place where plan IDs, prices, rights, and limits
 * are defined. All other modules (freemium.ts, stripe.ts, revenuecat.ts,
 * API routes, UI components) MUST import from here.
 *
 * No plan, price, or right may be duplicated in another file.
 */

// ─── Plan ID (stable internal identifier) ───────────────────────────────────

export type PlanId = 'decouverte' | 'oasis' | 'wellness' | 'spa365'

// ─── Subscription status ────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'inactive'    // No subscription (default)
  | 'trialing'    // Free trial active
  | 'active'      // Paid, current
  | 'past_due'    // Payment failed, grace period
  | 'canceled'    // Canceled by user, still valid until expiry
  | 'expired'     // Subscription ended
  | 'grace_period' // Past due + still has access ( RevenueCat specific)

// ─── Billing platform ───────────────────────────────────────────────────────

export type BillingPlatform = 'web' | 'ios' | 'android'

// ─── Duration ───────────────────────────────────────────────────────────────

export type Duration = 'week' | 'month' | 'halfyear' | 'year'

// Stripe/RevenueCat use 'weekly', 'monthly', 'seasonal', 'yearly'
// We use 'week', 'month', 'halfyear', 'year' internally.
// This is the ONLY mapping.
export const DURATION_TO_PROVIDER: Record<Duration, string> = {
  week: 'weekly',
  month: 'monthly',
  halfyear: 'seasonal',
  year: 'yearly',
}

export const PROVIDER_TO_DURATION: Record<string, Duration> = {
  weekly: 'week',
  monthly: 'month',
  seasonal: 'halfyear',
  yearly: 'year',
}

// ─── Plan limits (what each plan includes) ──────────────────────────────────

export interface PlanLimits {
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

// ─── Feature gates (checked server-side) ────────────────────────────────────

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

// ─── Plan definition ────────────────────────────────────────────────────────

export interface PlanDefinition {
  id: PlanId
  name: string                    // French fallback (legacy)
  nameKey: string                 // i18n key
  tagline: string                 // French fallback (legacy)
  taglineKey: string              // i18n key
  active: boolean                 // false = historical/retired plan
  platform: BillingPlatform[]     // where this plan is sold
  price: Record<Duration, number> // in EUR
  features: string[]              // French fallback (legacy)
  featureKeys: string[]           // i18n keys
  limits: PlanLimits
  // Stripe price IDs (from env vars). Empty string = not configured.
  stripePrices: Partial<Record<Duration, string>>
  // RevenueCat entitlement ID. null = not configured.
  revenueCatEntitlement: string | null
  highlighted?: boolean
  color: string
  icon: string
}

// ─── THE plans (single source of truth) ─────────────────────────────────────

export const PLANS: PlanDefinition[] = [
  {
    id: 'decouverte',
    name: 'Découverte',
    nameKey: 'decouverte.name',
    tagline: 'Gratuit — pour tester',
    taglineKey: 'decouverte.tagline',
    active: true,
    platform: ['web', 'ios', 'android'],
    price: { week: 0, month: 0, halfyear: 0, year: 0 },
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
      maxPhotoScansPerMonth: 999999, // Scans illimités (P0-A decision)
      maxTestsPerMonth: 999999,      // Tests illimités (P0-A decision)
      weatherEnabled: true,
      smartReminders: false,
      guidesAccess: 'basic',
      multiPool: false,
      pdfReport: false,
      proMode: false,
      historyDays: 14,
      spaSupport: false,
    },
    stripePrices: {}, // Free plan — no Stripe prices
    revenueCatEntitlement: null,
    color: 'muted',
    icon: '🌊',
  },
  {
    id: 'oasis',
    name: 'Oasis',
    nameKey: 'oasis.name',
    tagline: 'Le copilote piscine complet',
    taglineKey: 'oasis.tagline',
    active: true,
    platform: ['web', 'ios', 'android'],
    price: { week: 3.99, month: 9.99, halfyear: 39.99, year: 59.99 },
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
      maxPhotoScansPerMonth: 999999,
      maxTestsPerMonth: 999999,
      weatherEnabled: true,
      smartReminders: true,
      guidesAccess: 'all_plus_video',
      multiPool: true,
      pdfReport: true,
      proMode: true,
      historyDays: 9999,
      spaSupport: false,
    },
    stripePrices: {
      week: process.env.STRIPE_PRICE_OASIS_WEEKLY || '',
      month: process.env.STRIPE_PRICE_OASIS_MONTHLY || '',
      halfyear: process.env.STRIPE_PRICE_OASIS_SEASONAL || '',
      year: process.env.STRIPE_PRICE_OASIS_YEARLY || '',
    },
    revenueCatEntitlement: 'oasis',
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
    active: true,
    platform: ['web', 'ios', 'android'],
    price: { week: 5.99, month: 14.99, halfyear: 54.99, year: 79.99 },
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
      maxPhotoScansPerMonth: 999999,
      maxTestsPerMonth: 999999,
      weatherEnabled: true,
      smartReminders: true,
      guidesAccess: 'all_plus_video',
      multiPool: true,
      pdfReport: true,
      proMode: true,
      historyDays: 9999,
      spaSupport: true,
    },
    stripePrices: {
      week: process.env.STRIPE_PRICE_WELLNESS_WEEKLY || '',
      month: process.env.STRIPE_PRICE_WELLNESS_MONTHLY || '',
      halfyear: process.env.STRIPE_PRICE_WELLNESS_SEASONAL || '',
      year: process.env.STRIPE_PRICE_WELLNESS_YEARLY || '',
    },
    revenueCatEntitlement: 'wellness',
    color: 'primary',
    icon: '🛡️',
  },
  {
    id: 'spa365',
    name: 'Spa 365',
    nameKey: 'spa365.name',
    tagline: "Spa uniquement, toute l'année",
    taglineKey: 'spa365.tagline',
    active: true,
    platform: ['web', 'ios', 'android'],
    price: { week: 2.49, month: 6.99, halfyear: 32.99, year: 49.99 },
    features: [
      "1 spa",
      'Analyses illimitées',
      'Brome, chlore et oxygène actif',
      'Vidanges, filtres, canalisations',
      'Suivi consommation',
      'Gestion du stock',
      'Rappels intelligents',
    ],
    featureKeys: [
      'spa365.features.1spa',
      'spa365.features.unlimitedTests',
      'spa365.features.treatments',
      'spa365.features.drainsFilters',
      'spa365.features.consumption',
      'spa365.features.stock',
      'spa365.features.reminders',
    ],
    limits: {
      maxPools: 1,
      maxSpas: 1,
      maxPhotoScansPerMonth: 999999,
      maxTestsPerMonth: 999999,
      weatherEnabled: false,
      smartReminders: true,
      guidesAccess: 'all',
      multiPool: false,
      pdfReport: false,
      proMode: false,
      historyDays: 9999,
      spaSupport: true,
    },
    stripePrices: {
      week: process.env.STRIPE_PRICE_SPA365_WEEKLY || '',
      month: process.env.STRIPE_PRICE_SPA365_MONTHLY || '',
      halfyear: process.env.STRIPE_PRICE_SPA365_SEASONAL || '',
      year: process.env.STRIPE_PRICE_SPA365_YEARLY || '',
    },
    revenueCatEntitlement: 'spa365',
    color: 'accent',
    icon: '♨️',
  },
]

// ─── Helper functions ───────────────────────────────────────────────────────

export const DEFAULT_PLAN: PlanId = 'decouverte'

export function getPlan(id: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.id === id)
}

export function getPlanOrThrow(id: string): PlanDefinition {
  const plan = getPlan(id)
  if (!plan) throw new Error(`Unknown plan: ${id}`)
  return plan
}

export function getActivePlans(): PlanDefinition[] {
  return PLANS.filter((p) => p.active)
}

export function getPaidPlans(): PlanDefinition[] {
  return PLANS.filter((p) => p.active && p.id !== 'decouverte')
}

// ─── Status → access matrix ─────────────────────────────────────────────────

/**
 * Returns true if the subscription status grants access to paid features.
 * - active, trialing, grace_period, past_due (during grace) → access granted
 * - canceled (still valid until expiry) → access granted until expiresAt
 * - expired, inactive → access denied
 */
export function statusGrantsAccess(
  status: SubscriptionStatus,
  expiresAt: Date | null,
  now: Date = new Date()
): boolean {
  switch (status) {
    case 'active':
      return true
    case 'trialing':
      // Trialing must have a future expiry (trial end)
      if (!expiresAt) return true // no expiry = treat as active during trial
      return now < expiresAt
    case 'grace_period':
      // Grace period must have a future date
      if (!expiresAt) return false
      return now < expiresAt
    case 'past_due':
      // Past due gives access for a limited grace period (7 days)
      if (!expiresAt) return false
      const graceEnd = new Date(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000)
      return now < graceEnd
    case 'canceled':
      // Canceled subscriptions remain valid until their expiry date
      if (!expiresAt) return false
      return now < expiresAt
    case 'expired':
    case 'inactive':
      return false
    default:
      return false
  }
}

// ─── Feature gate evaluation ────────────────────────────────────────────────

export interface CanAccessResult {
  allowed: boolean
  reason?: string
  reasonKey?: string
  reasonParams?: Record<string, string | number>
  ctaPlan?: PlanId
}

/**
 * Check if a feature is accessible given the user's plan and subscription status.
 * This is the SERVER-SIDE gate. UI gating is a secondary defense only.
 *
 * @param planId - The user's current plan
 * @param status - The user's subscription status
 * @param feature - The feature to check
 * @param usage - Optional usage data (e.g. scans this month)
 */
export function canAccess(
  planId: PlanId,
  status: SubscriptionStatus,
  feature: FeatureGate,
  usage?: { photoScansThisMonth?: number },
  expiresAt?: Date | null
): CanAccessResult {
  const plan = getPlan(planId) || PLANS[0]

  // If subscription doesn't grant access, deny everything except free features
  if (planId !== 'decouverte' && !statusGrantsAccess(status, expiresAt ?? null)) {
    return {
      allowed: false,
      reason: 'Subscription expired or inactive.',
      reasonKey: 'gates.subscription_expired',
      ctaPlan: 'oasis',
    }
  }

  switch (feature) {
    case 'photo_scan':
      if (usage?.photoScansThisMonth != null && usage.photoScansThisMonth >= plan.limits.maxPhotoScansPerMonth) {
        return {
          allowed: false,
          reason: `Limite de ${plan.limits.maxPhotoScansPerMonth} scans/mois atteinte.`,
          reasonKey: 'gates.photo_scan_limit',
          reasonParams: { n: plan.limits.maxPhotoScansPerMonth },
          ctaPlan: 'oasis',
        }
      }
      return { allowed: true }

    case 'weather_advanced':
      return plan.limits.weatherEnabled && plan.id !== 'decouverte'
        ? { allowed: true }
        : { allowed: false, reason: 'Météo avancée réservée aux plans payants.', reasonKey: 'gates.weather_advanced', ctaPlan: 'oasis' }

    case 'smart_reminders':
      return plan.limits.smartReminders
        ? { allowed: true }
        : { allowed: false, reason: 'Rappels intelligents réservés aux plans payants.', reasonKey: 'gates.smart_reminders', ctaPlan: 'oasis' }

    case 'guides_premium':
      return plan.limits.guidesAccess !== 'basic'
        ? { allowed: true }
        : { allowed: false, reason: 'Guides premium réservés aux plans payants.', reasonKey: 'gates.guides_premium', ctaPlan: 'oasis' }

    case 'multi_pool':
      return plan.limits.multiPool
        ? { allowed: true }
        : { allowed: false, reason: 'Multi-piscines réservé à Oasis et Wellness.', reasonKey: 'gates.multi_pool', ctaPlan: 'oasis' }

    case 'pdf_report':
      return plan.limits.pdfReport
        ? { allowed: true }
        : { allowed: false, reason: 'Rapport PDF réservé à Oasis et Wellness.', reasonKey: 'gates.pdf_report', ctaPlan: 'oasis' }

    case 'pro_mode':
      return plan.limits.proMode
        ? { allowed: true }
        : { allowed: false, reason: 'Mode pro réservé à Oasis et Wellness.', reasonKey: 'gates.pro_mode', ctaPlan: 'oasis' }

    case 'history_extended':
      return plan.limits.historyDays >= 90
        ? { allowed: true }
        : { allowed: false, reason: 'Historique étendu réservé aux plans payants.', reasonKey: 'gates.history_extended', ctaPlan: 'oasis' }

    case 'spa_support':
      // spa365 and wellness both unlock spa features; the CTA points to the
      // cheapest plan that unlocks the feature — spa365 for spa-only users,
      // wellness for pool+spa owners.
      return plan.limits.spaSupport
        ? { allowed: true }
        : { allowed: false, reason: 'Le support des spas est réservé aux plans Spa 365 et Wellness.', reasonKey: 'gates.spa_support', ctaPlan: 'spa365' }

    default:
      return { allowed: true }
  }
}

// ─── Stripe product ID mapping ──────────────────────────────────────────────

/**
 * Map a Stripe product/price ID to a PlanId + Duration.
 * Returns null if the ID doesn't match any configured plan.
 */
export function getPlanFromStripePriceId(priceId: string): { plan: PlanId; duration: Duration } | null {
  if (!priceId || priceId.trim() === '') return null
  for (const plan of PLANS) {
    for (const [dur, id] of Object.entries(plan.stripePrices)) {
      if (id === priceId) {
        return { plan: plan.id, duration: dur as Duration }
      }
    }
  }
  return null
}

/**
 * Map a product ID string (from metadata or webhook) to a PlanId.
 * Convention: the string contains the plan name (e.g. "oasis_yearly" → "oasis").
 */
export function getPlanFromProductId(productId: string): PlanId {
  if (productId.includes('wellness')) return 'wellness'
  if (productId.includes('spa365') || productId.includes('spa_365')) return 'spa365'
  if (productId.includes('oasis')) return 'oasis'
  return 'decouverte'
}

// ─── RevenueCat exact product mapping ────────────────────────────────────────
// Maps exact RC product IDs to (planId, duration).
// Convention: aqwelia_<plan>_<duration>
//   plan: oasis | wellness | spa365
//   duration: weekly | monthly | seasonal | yearly
const RC_PRODUCT_MAP: Record<string, { plan: PlanId; duration: Duration }> = {
  'aqwelia_oasis_weekly':     { plan: 'oasis',    duration: 'week' },
  'aqwelia_oasis_monthly':    { plan: 'oasis',    duration: 'month' },
  'aqwelia_oasis_seasonal':   { plan: 'oasis',    duration: 'halfyear' },
  'aqwelia_oasis_yearly':     { plan: 'oasis',    duration: 'year' },
  'aqwelia_wellness_weekly':  { plan: 'wellness', duration: 'week' },
  'aqwelia_wellness_monthly': { plan: 'wellness', duration: 'month' },
  'aqwelia_wellness_seasonal':{ plan: 'wellness', duration: 'halfyear' },
  'aqwelia_wellness_yearly':  { plan: 'wellness', duration: 'year' },
  'aqwelia_spa365_weekly':    { plan: 'spa365',   duration: 'week' },
  'aqwelia_spa365_monthly':   { plan: 'spa365',   duration: 'month' },
  'aqwelia_spa365_seasonal':  { plan: 'spa365',   duration: 'halfyear' },
  'aqwelia_spa365_yearly':    { plan: 'spa365',   duration: 'year' },
}

/**
 * Map a RevenueCat product ID to (planId, duration) using EXACT matching ONLY.
 * No includes() fallback — unknown products return null (no access granted).
 */
export function getPlanFromRCProductId(productId: string): { plan: PlanId; duration: Duration } | null {
  return RC_PRODUCT_MAP[productId] || null
}

// ─── Duration display (legacy compat) ───────────────────────────────────────

export const DURATIONS = [
  { id: 'week' as const, label: '7 jours', suffix: '/semaine', labelKey: 'week', suffixKey: 'perWeek' },
  { id: 'month' as const, label: '1 mois', suffix: '/mois', labelKey: 'month', suffixKey: 'perMonth' },
  { id: 'halfyear' as const, label: '6 mois', suffix: '/6 mois', save: '20%', labelKey: 'halfyear', suffixKey: 'perHalfyear' },
  { id: 'year' as const, label: '12 mois', suffix: '/an', save: '30%', labelKey: 'year', suffixKey: 'perYear' },
]
