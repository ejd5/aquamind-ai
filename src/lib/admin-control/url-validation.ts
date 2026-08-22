/**
 * AQWELIA — Admin Control Plane V1 · validation d'URL explicite et testable.
 *
 * Deux formes autorisées uniquement :
 *   1. chemin interne same-origin : exactement UN `/` initial, jamais `//`,
 *      aucun backslash (le WHATWG URL parser normalise `\` dangereusement),
 *      aucun caractère de contrôle, aucun whitespace, aucun schéma ;
 *   2. URL externe : parser WHATWG `new URL()`, protocol EXACTEMENT `https:`,
 *      hostname non vide, et aucun username/password (URL trompeuse).
 *
 * Tout le reste (http:, javascript:, data:, file:, vbscript:, ftp:, mailto:,
 * tel:, protocol-relative) est refusé.
 */

const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/
const WHITESPACE_RE = /\s/
const SCHEME_IN_PATH_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/

/** Chemin interne sûr : /dashboard, /tarifs, /guides?source=banner, /assets/promo.webp */
export function isValidInternalPath(value: string): boolean {
  if (!value.startsWith('/')) return false
  if (value.startsWith('//')) return false
  if (value.includes('\\')) return false
  if (CONTROL_CHARS_RE.test(value)) return false
  if (WHITESPACE_RE.test(value)) return false
  if (SCHEME_IN_PATH_RE.test(value)) return false
  return true
}

/** URL externe sûre : forme littérale `https://` PUIS parse WHATWG (protocol,
 * hostname non vide, aucun username/password). Le double verrou rejette les
 * formes ambiguës normalisées par le navigateur (ex. `https:evil.example.com`). */
export function isValidExternalHttpsUrl(value: string): boolean {
  // Verrou 1 : forme littérale explicite https:// (rejette https:evil…).
  if (!/^https:\/\//i.test(value)) return false
  // Verrou 2 : parser WHATWG réel.
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  if (!url.hostname) return false
  if (url.username || url.password) return false
  return true
}

/** Forme d'entrée acceptée pour ctaUrl / imageUrl (vide = non fourni). */
export function isValidAdminUrl(value: string): boolean {
  return value === '' || isValidInternalPath(value) || isValidExternalHttpsUrl(value)
}
