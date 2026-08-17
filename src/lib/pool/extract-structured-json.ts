/**
 * AQWELIA — Parsing JSON robuste de la sortie du modèle vision.
 *
 * Le modèle peut répondre avec :
 *   - du JSON pur ;
 *   - un bloc ```json ... ``` (avec ou sans retour à la ligne) ;
 *   - du texte parasite avant/après un objet JSON ;
 *   - plusieurs objets imbriqués (un seul objet racine attendu).
 *
 * Ce helper extrait UN objet JSON valide, rejette array/primitif, et ne lève
 * jamais (retourne null si invalide). Il remplace la regex gloutonne fragile
 * `content.match(/\{[\s\S]*\}/)`.
 */

function tryParseAt(text: string, start: number): { value: unknown; end: number } | null {
  // Trouve la position du premier '{' ou '[' en tenant compte des chaînes.
  let i = start
  let brace = -1
  let square = -1
  for (; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      // skip string literal
      i++
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue }
        if (text[i] === '"') break
        i++
      }
      continue
    }
    if (ch === '{') { brace = i; break }
    if (ch === '[') { square = i; break }
  }
  // On préfère un objet racine ; un array racine est rejeté.
  if (brace === -1) return null
  if (square !== -1 && square < brace) return null

  // Scanne jusqu'à l'objet équilibré.
  let depth = 0
  let inString = false
  let escaped = false
  let j = brace
  for (; j < text.length; j++) {
    const ch = text[j]
    if (inString) {
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        const candidate = text.slice(brace, j + 1)
        try {
          return { value: JSON.parse(candidate), end: j + 1 }
        } catch {
          return null
        }
      }
    }
  }
  return null
}

/**
 * Extrait et parse un objet JSON valide depuis la réponse brute du modèle.
 * - accepte JSON pur, ```json ```, texte parasite autour, retours à la ligne ;
 * - rejette un array racine et toute valeur primitive ;
 * - retourne null sans throw si aucun objet JSON valide n'est trouvé.
 */
export function extractStructuredJson(content: string): Record<string, unknown> | null {
  if (typeof content !== 'string' || content.trim() === '') return null

  // Cherche un objet JSON partout dans la réponse (ignore les fences markdown).
  let from = 0
  for (;;) {
    const res = tryParseAt(content, from)
    if (!res) return null
    const value = res.value
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
    // array ou primitif : on avance après cet élément et on continue.
    from = res.end
    if (from >= content.length) return null
  }
}
