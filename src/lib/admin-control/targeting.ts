/**
 * AQWELIA — Admin Control Plane V1 · ciblage.
 *
 * Le ciblage est stocké en JSON structuré et validé (schemas.ts). La
 * RÉSOLUTION canonique (match) reçoit UNIQUEMENT un contexte serveur :
 * locale de session, pays vérifié (User.country, jamais ?country= client),
 * plan de l'abonnement serveur, plateforme réelle de la requête, zone de
 * l'application et ancienneté du compte. Aucun champ fourni par le navigateur
 * n'est accepté ici.
 */
import type { Targeting } from './schemas'

export interface TargetingContext {
  /** Locale de session (serveur). */
  locale: string
  /** Pays vérifié côté serveur (User.country) — jamais un paramètre client. */
  country: string
  /** Plan actif côté serveur (Subscription.plan) — jamais un paramètre client. */
  plan: string | null
  /** Plateforme réelle de la requête : WEB (défaut serveur), IOS, ANDROID. */
  platform: 'WEB' | 'IOS' | 'ANDROID'
  /** Zone de l'application où le contenu serait affiché. */
  zone: string
  /** true si le compte a été créé récemment (seuil serveur). */
  isNewUser: boolean
}

export function isKnownTargetingKey(key: string): boolean {
  return ['locales', 'countries', 'plans', 'platforms', 'zones', 'userSegments'].includes(key)
}

/**
 * Renvoie true si le contexte serveur correspond au ciblage.
 * - ciblage absent/partiel vide → tout le monde (V1 conservative).
 * - aucune confiance dans les valeurs client : le contexte vient du serveur.
 */
export function resolveTargetingMatch(
  targeting: Targeting | null | undefined,
  ctx: TargetingContext
): boolean {
  if (!targeting) return true
  const checks: boolean[] = []

  if (targeting.locales?.length) {
    checks.push(targeting.locales.includes(ctx.locale as (typeof targeting.locales)[number]))
  }
  if (targeting.countries?.length) {
    checks.push(targeting.countries.includes(ctx.country.toUpperCase()))
  }
  if (targeting.plans?.length) {
    if (!ctx.plan) return false
    checks.push(targeting.plans.includes(ctx.plan))
  }
  if (targeting.platforms?.length) {
    checks.push(targeting.platforms.includes(ctx.platform))
  }
  if (targeting.zones?.length) {
    checks.push(targeting.zones.includes(ctx.zone as (typeof targeting.zones)[number]))
  }
  if (targeting.userSegments?.length) {
    const segment = ctx.isNewUser ? 'NEW' : 'EXISTING'
    checks.push(targeting.userSegments.includes(segment))
  }

  // V1 conservative : un ciblage déclaré mais vide ne bloque personne.
  return checks.every(Boolean)
}

/** Complétude des 7 locales d'un JSON de traductions. */
export function translationCompleteness(translations: Record<string, unknown>): {
  filled: number
  total: number
  missing: string[]
} {
  const locales = ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl']
  const missing: string[] = []
  for (const l of locales) {
    const value = translations?.[l]
    const filled =
      typeof value === 'string'
        ? value.trim().length > 0
        : typeof value === 'object' && value !== null
          ? Object.values(value).some((v) => typeof v === 'string' && v.trim().length > 0)
          : false
    if (!filled) missing.push(l)
  }
  return { filled: locales.length - missing.length, total: locales.length, missing }
}

/** Fenêtre de publication active ? (server clock uniquement). */
export function isWithinSchedule(startAt: Date | null | undefined, endAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (startAt && now.getTime() < startAt.getTime()) return false
  if (endAt && now.getTime() > endAt.getTime()) return false
  return true
}
