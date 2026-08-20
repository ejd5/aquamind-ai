/**
 * AQWELIA — Admin Control Plane V1 · feature flags SÛRS (lecture seule).
 *
 * Les flags ENV critiques ne sont JAMAIS exposés ni modifiables via l'admin :
 *   - sécurité (AUTH_*, TURNSTILE_*, SIGNING_*…)
 *   - kill switches techniques et infrastructure (DATABASE_URL, VERCEL_*…)
 *   - paiement/fournisseur (STRIPE_*, REVENUECAT_*, APPLE_*, GOOGLE_*)
 *   - secrets de signature (LAUNCH_*_SECRET, NEXTAUTH_SECRET…)
 *
 * Seule une allowlist explicite de flags PRODUIT sûrs est visible en lecture
 * seule. Aucune écriture DB de flags dans cette V1 : l'admin ne déplace pas
 * aveuglément les flags ENV vers la base.
 */

export interface SafeFlagView {
  key: string
  value: boolean
  /** Clé i18n `admin.*` — traduite côté UI dans les 7 locales. */
  descriptionKey: string
}

/** Allowlist explicite — flags produit sans risque sécurité/paiement/infra. */
const SAFE_PRODUCT_FLAGS: Array<{ key: string; descriptionKey: string }> = [
  { key: 'NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED', descriptionKey: 'cpFlagArqweliaLot1' },
  { key: 'NEXT_PUBLIC_ARQWELIA_DEMO_MODE', descriptionKey: 'cpFlagArqweliaDemo' },
  { key: 'AQWELIA_LAUNCH_OFFERS_ENABLED', descriptionKey: 'cpFlagLaunchOffers' },
]

/** Flags critiques jamais exposés — liste documentaire, pas exhaustive (défense en profondeur). */
export const CRITICAL_FLAG_PATTERNS = [
  'AUTH',
  'SECRET',
  'TURNSTILE',
  'STRIPE',
  'REVENUECAT',
  'DATABASE',
  'POSTGRES',
  'NEON',
  'VERCEL',
  'SIGNING',
  'APPLE',
  'GOOGLE',
  'NEXTAUTH',
  'RESEND',
  'SMTP',
  'MAIL',
  'GEOCODING',
] as const

export function isCriticalFlagKey(key: string): boolean {
  return CRITICAL_FLAG_PATTERNS.some((p) => key.toUpperCase().includes(p))
}

/** Vue lecture seule pour l'admin — jamais la valeur d'un flag critique. */
export function getSafeFlagsView(env: NodeJS.ProcessEnv = process.env): SafeFlagView[] {
  return SAFE_PRODUCT_FLAGS.map((f) => ({ ...f, value: env[f.key] === 'true' }))
}
