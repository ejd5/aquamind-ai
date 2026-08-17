/**
 * AQWELIA — Normalisation + localisation de la sortie IA du diagnostic photo.
 *
 * Le modèle vision (NVIDIA NEMO) répond souvent en anglais, même quand on lui
 * demande du français (« greenish water », « floating debris », …). Cette couche
 * applique :
 *   1. une normalisation des codes canoniques (imageType) ;
 *   2. une traduction FR des tokens d'observation piscine les plus fréquents,
 *      appliquée aux champs texte libres (résumé, problèmes, causes, prochaine
 *      étape, données manquantes, avertissements) ;
 *   3. un fallback localisé quand la réponse n'a pas pu être structurée.
 *
 * C'est la source de vérité côté serveur : l'UI ne reçoit plus de texte anglais
 * brut quand la locale active est le français.
 */

export type CanonicalImageType =
  | 'water'
  | 'wall'
  | 'filter'
  | 'electrolyzer'
  | 'pump'
  | 'strip'
  | 'product'
  | 'equipment'
  | 'unknown'

const IMAGE_TYPE_ALIASES: Record<string, CanonicalImageType> = {
  water: 'water',
  'green water': 'water',
  'cloudy water': 'water',
  pool: 'water',
  piscine: 'water',
  eau: 'water',
  wall: 'wall',
  'pool wall': 'wall',
  liner: 'wall',
  paroi: 'wall',
  filter: 'filter',
  'filter pump': 'filter',
  filtre: 'filter',
  electrolyzer: 'electrolyzer',
  'electrolysis cell': 'electrolyzer',
  'salt cell': 'electrolyzer',
  electrolyseur: 'electrolyzer',
  'sel generator': 'electrolyzer',
  pump: 'pump',
  pompe: 'pump',
  strip: 'strip',
  'test strip': 'strip',
  'bandelette': 'strip',
  product: 'product',
  produit: 'product',
  equipment: 'equipment',
  'other equipment': 'equipment',
  unknown: 'unknown',
}

/** Traductions FR des tokens d'observation piscine renvoyés par l'IA. */
const FR_OBSERVATION_TOKENS: Record<string, string> = {
  'greenish water': 'eau verdâtre',
  'green water': 'eau verte',
  'cloudy water': 'eau trouble',
  'milky water': 'eau laiteuse',
  'turbid water': 'eau trouble',
  'murky water': 'eau trouble',
  'floating debris': 'débris flottants',
  'floating particles': 'particules flottantes',
  'algae growth': 'développement d’algues',
  'visible algae': 'algues visibles',
  'algae on walls': 'algues sur les parois',
  'green tint': 'teinte verdâtre',
  'greenish tint': 'teinte verdâtre',
  'foam on surface': 'mousse en surface',
  'foam': 'mousse',
  'scale deposits': 'dépôts de calcaire',
  'calcium scale': 'calcaire',
  'water line stain': 'trace de ligne d’eau',
  'low water level': 'niveau d’eau bas',
  'leaf debris': 'feuilles mortes',
  'insects in water': 'insectes dans l’eau',
  'the image shows': 'l’image montre',
  'the photo shows': 'la photo montre',
  'this is a': 'il s’agit d’une',
  'i can see': 'je peux voir',
  'i observe': 'j’observe',
  'the water appears': 'l’eau semble',
  'water appears': 'l’eau semble',
  'pool appears': 'la piscine semble',
  'the pool': 'la piscine',
  'a rectangular pool': 'une piscine rectangulaire',
  'an oval pool': 'une piscine ovale',
  'a round pool': 'une piscine ronde',
  'likely causes': 'causes probables',
  'possible causes': 'causes possibles',
  'likely cause': 'cause probable',
  'recommended action': 'action recommandée',
  'check the filter': 'vérifier le filtre',
  'check the filtration': 'vérifier la filtration',
  'clean the filter': 'nettoyer le filtre',
  'run the pump': 'faire fonctionner la pompe',
  'shock treatment': 'traitement choc',
  'test the water': 'tester l’eau',
  'full water test': 'test d’eau complet',
  'no issues detected': 'aucun problème détecté',
  'the water is clear': 'l’eau est claire',
  'the pool looks clean': 'la piscine semble propre',
  'recommend checking': 'recommande de vérifier',
  'recommend a': 'recommande un',
  'not enough data': 'données insuffisantes',
  'insufficient data': 'données insuffisantes',
}

/** Applique la traduction FR sur une chaîne (phrase entière, token par token). */
function translateFrPhrase(input: string): string {
  if (!input) return input
  let out = input
  // Ordre décroissant de longueur pour éviter les remplacements partiels.
  const tokens = Object.keys(FR_OBSERVATION_TOKENS).sort((a, b) => b.length - a.length)
  for (const token of tokens) {
    if (!out) break
    out = out.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), FR_OBSERVATION_TOKENS[token])
  }
  return out
}

function translateStrings(list: string[] | undefined, locale: string): string[] {
  if (!list) return []
  if (locale !== 'fr') return list
  return list.map(translateFrPhrase)
}

export interface NormalizedPhotoDiagnostic {
  imageType: CanonicalImageType
  detectedIssues: string[]
  probableIssues: string[]
  confidence: number
  missingData: string[]
  recommendedNextStep: string | null
  safetyWarnings: string[]
  userFriendlySummary: string | null
  /** true quand la réponse brute n'a pas pu être structurée en JSON. */
  fallbackRaw: boolean
}

/**
 * Normalise la sortie du modèle pour la locale active. Ne mute jamais la
 * structure d'entrée ; renvoie un objet propre prêt à être persister/affiché.
 */
export function normalizePhotoDiagnostic(
  parsed: Record<string, unknown> | null,
  locale = 'fr',
  rawContent = '',
): NormalizedPhotoDiagnostic {
  const imageTypeRaw =
    typeof parsed?.imageType === 'string'
      ? parsed.imageType.toLowerCase()
      : ''
  const imageType: CanonicalImageType =
    IMAGE_TYPE_ALIASES[imageTypeRaw] ?? 'unknown'

  const toStrList = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean)
      : []

  const strOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null

  const fallbackRaw = !parsed

  let userFriendlySummary = strOrNull(parsed?.userFriendlySummary)
  if (fallbackRaw) {
    // Fallback localisé : on ne laisse JAMAIS un pavé anglais brut s'afficher.
    userFriendlySummary = null
  } else {
    userFriendlySummary = translateFrPhrase(userFriendlySummary ?? '') || null
  }

  return {
    imageType,
    detectedIssues: translateStrings(toStrList(parsed?.detectedIssues), locale),
    probableIssues: translateStrings(toStrList(parsed?.probableIssues), locale),
    confidence: Number(parsed?.confidence) || 0,
    missingData: translateStrings(toStrList(parsed?.missingData), locale),
    recommendedNextStep: strOrNull(parsed?.recommendedNextStep)
      ? translateFrPhrase(strOrNull(parsed?.recommendedNextStep) as string)
      : null,
    safetyWarnings: translateStrings(toStrList(parsed?.safetyWarnings), locale),
    userFriendlySummary,
    fallbackRaw,
  }
}
