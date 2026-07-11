/**
 * AQWELIA — Multilingual parameter synonyms for StripScan™
 *
 * Used by:
 *   - src/app/api/pool/strip-scan/route.ts (server-side: normalize AI response)
 *   - src/components/aquamind/strip-scanner.tsx (client-side: render param labels)
 *
 * This file is the SINGLE SOURCE OF TRUTH for multilingual keyword matching.
 * It contains NO user-facing strings — only matching keywords. This is why
 * the i18n hardcoded-string checker skips it (MULTILINGUAL_FILES whitelist).
 *
 * To add a new language: add the translated parameter name to each array.
 * To add a new parameter: add a new key + synonyms array.
 */

export const PARAM_SYNONYMS: Record<string, string[]> = {
  ph: ['ph', 'phvalue', 'ph value', 'potential hydrogen'],
  freeChlorine: [
    'free chlorine', 'free cl', 'cl libre', 'chlore libre', 'cl2 libre',
    'freies chlor', 'cloro libre', 'cloro attivo',
  ],
  totalChlorine: [
    'total chlorine', 'total cl', 'cl total', 'chlore total', 'cl2 total',
    'gesamtes chlor', 'cloro total', 'cloro totale',
  ],
  combinedChlorine: [
    'combined chlorine', 'chloramines', 'chlore combine', 'chlore combiné',
  ],
  alkalinity: [
    'total alkalinity', 'alkalinity', 'tac', 'alcalinite', 'alcalinité',
    'alcalinidad', 'alkalität', 'alcalinità',
  ],
  calciumHardness: [
    'hardness', 'calcium hardness', 'th', 'durete', 'dureté',
    'dureté calcique', 'dureza', 'härte', 'durezza',
  ],
  cyanuricAcid: [
    'cyanuric acid', 'cya', 'stabilizer', 'stabilisant', 'estabilizante',
    'stabilisator', 'acido cianurico', 'acido isocianurico',
  ],
  salt: ['salt', 'sel', 'salz', 'sale', 'sal', 'sodium chloride'],
  bromine: ['bromine', 'brome', 'brom', 'bromo'],
  phosphates: ['phosphates', 'phosphate', 'fosfatos', 'phosphat', 'fosfati'],
  temperature: ['temperature', 'temp', 'temperatur', 'temperatura'],
}

/**
 * Normalize a parameter name (from AI response) to a canonical key.
 * Returns null if no match is found.
 *
 * Strategy:
 *   1. Exact match (case-insensitive)
 *   2. Partial match (synonym appears as substring)
 *
 * Example: "Chlore libre" → "freeChlorine"
 *          "Alcalinité (TAC)" → "alkalinity"
 */
export function normalizeParamName(name: string): string | null {
  const lower = name.trim().toLowerCase()
  // 1. Exact match
  for (const [canonical, synonyms] of Object.entries(PARAM_SYNONYMS)) {
    if (synonyms.includes(lower)) return canonical
  }
  // 2. Partial match (substring)
  for (const [canonical, synonyms] of Object.entries(PARAM_SYNONYMS)) {
    if (synonyms.some((s) => lower.includes(s))) return canonical
  }
  return null
}
