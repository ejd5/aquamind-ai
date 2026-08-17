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
 *
 * @param parsed objet JSON structuré extrait de la réponse (ou null si invalide)
 * @param locale locale active (défaut 'fr')
 * @param rawContent réponse brute (non utilisée comme contenu structuré)
 * @param typeHint hint utilisateur pour le type d'image — conservé en fallback
 *   canonique si le modèle ne fournit pas d'imageType exploitable.
 */
export function normalizePhotoDiagnostic(
  parsed: Record<string, unknown> | null,
  locale = 'fr',
  rawContent = '',
  typeHint?: string | null,
): NormalizedPhotoDiagnostic {
  // Round 2 (3/4) : imageType strict — trim + lowercase + alias canonique,
  // puis fallback sur un typeHint valide, sinon "unknown".
  const imageTypeRaw =
    typeof parsed?.imageType === 'string'
      ? parsed.imageType.trim().toLowerCase()
      : ''
  const hintedRaw = typeof typeHint === 'string' ? typeHint.trim().toLowerCase() : ''
  const imageType: CanonicalImageType =
    IMAGE_TYPE_ALIASES[imageTypeRaw] ??
    IMAGE_TYPE_ALIASES[hintedRaw] ??
    'unknown'

  const toStrList = (v: unknown): string[] =>
    Array.isArray(v)
      ? v
          .filter((x): x is string => typeof x === 'string')
          .map((x) => x.trim())
          .filter((x) => x.length > 0)
      : []

  const strOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null

  // Round 2 (3/4) : confidence strictement clampée 0..1. NaN / Infinity /
  // négatif / >1 sont ramenés dans le domaine. Aucun undefined/NaN dans le
  // contrat normalisé.
  let confidence = 0
  const rawConf = parsed?.confidence
  if (typeof rawConf === 'number' && Number.isFinite(rawConf)) {
    confidence = Math.max(0, Math.min(1, rawConf))
  } else if (typeof rawConf === 'string' && rawConf.trim() !== '') {
    const n = Number(rawConf)
    if (Number.isFinite(n)) confidence = Math.max(0, Math.min(1, n))
  }

  const fallbackRaw = !parsed

  // P0-A i18n (Round 2) : la traduction du dictionnaire EN→FR ne s'applique
  // QUE lorsque la locale active est "fr". Une requête EN/ES/PT/DE/IT/NL ne
  // doit JAMAIS recevoir artificiellement des morceaux de français : on préserve
  // alors le texte renvoyé par le modèle.
  const localize = locale === 'fr'
  const localizeString = (s: string | null): string | null =>
    s == null ? null : localize ? translateFrPhrase(s) : s

  let userFriendlySummary = strOrNull(parsed?.userFriendlySummary)
  if (fallbackRaw) {
    // Fallback sécurisé : on ne laisse JAMAIS un pavé brut s'afficher comme résumé.
    userFriendlySummary = null
  } else {
    userFriendlySummary = localizeString(userFriendlySummary) || null
  }

  return {
    imageType,
    detectedIssues: translateStrings(toStrList(parsed?.detectedIssues), locale),
    probableIssues: translateStrings(toStrList(parsed?.probableIssues), locale),
    confidence,
    missingData: translateStrings(toStrList(parsed?.missingData), locale),
    recommendedNextStep: localizeString(strOrNull(parsed?.recommendedNextStep)),
    safetyWarnings: translateStrings(toStrList(parsed?.safetyWarnings), locale),
    userFriendlySummary,
    fallbackRaw,
  }
}
