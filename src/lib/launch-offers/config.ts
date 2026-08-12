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

// Répartition commerciale des canaux (parts). Les valeurs par défaut 300/200
// donnent exactement 180/75/45 et 120/50/30. Ces ratios servent à dériver les
// allocations d'une variante depuis SON quota configuré (P1#1) : quelle que soit
// la valeur de AQWELIA_LAUNCH_QUOTA_A/_B, la somme des allocations == quota.
const ALLOCATION_RATIOS: Record<string, { web: number; ios: number; android: number }> = {
  [LAUNCH_OFFER_A_CODE]: { web: 0.6, ios: 0.25, android: 0.15 },
  [LAUNCH_OFFER_B_CODE]: { web: 0.6, ios: 0.25, android: 0.15 },
}

/**
 * Décompose le quota d'une variante en allocations WEB/IOS/ANDROID.
 *
 * - Répartition déterministe (méthode des plus grands restes, ordre WEB→IOS→
 *   ANDROID) : somme des allocations === quota exactement, chaque part ≥ 0.
 * - Jamais de dépassement : somme === quota (borné).
 */
export function computeLaunchAllocationSplit(offerCode: string, variantQuota: number): { web: number; ios: number; android: number } {
  const ratios = ALLOCATION_RATIOS[offerCode] ?? { web: 0.6, ios: 0.25, android: 0.15 }
  const order: Array<'web' | 'ios' | 'android'> = ['web', 'ios', 'android']
  const exact = order.map((p) => variantQuota * ratios[p])
  const base = exact.map((v) => Math.floor(v))
  const frac = exact.map((v) => v - Math.floor(v))
  let remainder = variantQuota - base.reduce((a, b) => a + b, 0)

  // Distribue les unités restantes par plus grande fraction (déterministe).
  const byFrac = order.map((p, i) => ({ p, i, f: frac[i] })).sort((a, b) => b.f - a.f || a.i - b.i)
  for (let k = 0; k < remainder && k < byFrac.length; k += 1) {
    base[byFrac[k].i] += 1
  }

  return { web: base[0], ios: base[1], android: base[2] }
}

export type LaunchPlatform = 'WEB' | 'IOS' | 'ANDROID'

export function isLaunchPlatform(value: string): value is LaunchPlatform {
  return value === 'WEB' || value === 'IOS' || value === 'ANDROID'
}
