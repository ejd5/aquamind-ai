/**
 * AQWELIA Launch offers — configuration (spec v1.0).
 *
 * Tous les montants sont dérivés du catalogue (plans.ts) ou des stores, jamais
 * codés en dur ici. La campagne est désactivée par défaut et reste inerte tant
 * que les identifiants fournisseurs réels (Stripe/Apple/Google) ne sont pas
 * fournis. Les valeurs dépendantes de l'environnement sont lues à chaque appel
 * (getters) afin de permettre le toggling et des tests déterministes.
 */

export function launchOffersEnabled(): boolean {
  return process.env.AQWELIA_LAUNCH_OFFERS_ENABLED === 'true'
}

export function launchCampaignCode(): string {
  return process.env.AQWELIA_LAUNCH_CAMPAIGN_CODE || 'AQWELIA_LAUNCH_2026'
}

export function launchCampaignName(): string {
  return 'Offres de lancement AQWELIA'
}

export function launchTotalQuota(): number {
  return Number(process.env.AQWELIA_LAUNCH_TOTAL_QUOTA || 500)
}

export function launchReservationTtlSeconds(): number {
  return Number(process.env.AQWELIA_LAUNCH_RESERVATION_TTL || 1800)
}

export function launchExactRemainingThresholdRatio(): number {
  return Number(process.env.AQWELIA_LAUNCH_EXACT_THRESHOLD || 0.25)
}

export function launchEligibleCountries(): string[] {
  return (process.env.AQWELIA_LAUNCH_ELIGIBLE_COUNTRIES || 'FR')
    .split(',').map((s) => s.trim()).filter(Boolean)
}

export function launchEligiblePlanIds(): string[] {
  return (process.env.AQWELIA_LAUNCH_ELIGIBLE_PLANS || 'oasis,wellness,spa365')
    .split(',').map((s) => s.trim()).filter(Boolean)
}

/** Comptes exclus (internes/test/fraude/partenaire). */
export function launchExcludedRoles(): string[] {
  return (process.env.AQWELIA_LAUNCH_EXCLUDED_ROLES || '')
    .split(',').map((s) => s.trim()).filter(Boolean)
}

export const LAUNCH_OFFER_A_CODE = 'LAUNCH50_MONTHLY'
export const LAUNCH_OFFER_B_CODE = 'LAUNCH3FOR2_QUARTERLY'

export function launchQuotaA(): number {
  return Number(process.env.AQWELIA_LAUNCH_QUOTA_A || 300)
}

export function launchQuotaB(): number {
  return Number(process.env.AQWELIA_LAUNCH_QUOTA_B || 200)
}

/** Allocation initiale par canal (configurable en admin, uniquement places non consommées). */
export function launchAllocationDefaults(): Record<string, { web: number; ios: number; android: number }> {
  return {
    [LAUNCH_OFFER_A_CODE]: { web: 180, ios: 75, android: 45 },
    [LAUNCH_OFFER_B_CODE]: { web: 120, ios: 50, android: 30 },
  }
}

export type LaunchPlatform = 'WEB' | 'IOS' | 'ANDROID'

export function isLaunchPlatform(value: string): value is LaunchPlatform {
  return value === 'WEB' || value === 'IOS' || value === 'ANDROID'
}
