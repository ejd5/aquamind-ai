/**
 * AQWELIA — Admin Product Control (PR112) · allowlist de contenu SÛR.
 *
 * Seules ces clés marketing (copy non scientifique) peuvent être gérées via
 * l'admin. Tout le reste — recommandations scientifiques, warnings de
 * sécurité, règles de dosage, copy légale/compliance, prix, conditions de
 * billing, messages auth/security — est EXCLU par construction : le serveur
 * refuse toute clé hors allowlist.
 */

export interface SafeContentBlockDef {
  key: string
  kind: 'title' | 'title_body' | 'body'
  /** Clé i18n admin.* — traduite dans les 7 locales. */
  descriptionKey: string
}

export const SAFE_CONTENT_ALLOWLIST: SafeContentBlockDef[] = [
  { key: 'landing.hero.title', kind: 'title', descriptionKey: 'cpContentDescHeroTitle' },
  { key: 'landing.hero.subtitle', kind: 'body', descriptionKey: 'cpContentDescHeroSubtitle' },
  { key: 'landing.cta.primary', kind: 'title', descriptionKey: 'cpContentDescCtaPrimary' },
  { key: 'landing.cta.secondary', kind: 'title', descriptionKey: 'cpContentDescCtaSecondary' },
  { key: 'landing.trust.badges', kind: 'body', descriptionKey: 'cpContentDescTrustBadges' },
  { key: 'landing.section.features.title', kind: 'title', descriptionKey: 'cpContentDescFeaturesTitle' },
  { key: 'landing.section.features.subtitle', kind: 'body', descriptionKey: 'cpContentDescFeaturesSubtitle' },
  { key: 'landing.section.how.title', kind: 'title', descriptionKey: 'cpContentDescHowTitle' },
  { key: 'landing.section.how.subtitle', kind: 'body', descriptionKey: 'cpContentDescHowSubtitle' },
]

export function isSafeContentKey(key: string): boolean {
  return SAFE_CONTENT_ALLOWLIST.some((def) => def.key === key)
}

export function getSafeContentDef(key: string): SafeContentBlockDef | undefined {
  return SAFE_CONTENT_ALLOWLIST.find((def) => def.key === key)
}
