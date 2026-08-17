// Construction du contexte piscine pour l'IA (LLM + VLM)
// Injecte profil + dernière mesure + plan d'action dans les prompts.

import { VolumeUnit } from './units'
import { isPoolFieldConfirmed } from './onboarding-form'

export interface PoolProfileLike {
  name: string
  volume: number
  unit: VolumeUnit
  treatmentType: string
  filterType: string
  saltSystem: boolean
  sunExposure: string
  covered: boolean
  usageLevel: string
  /** Fields the user explicitly confirmed (P0-1). Undefined/empty → unknown. */
  confirmedFields?: string | null
}

export interface WaterTestLike {
  ph: number
  freeChlorine?: number | null
  combinedChlorine?: number | null
  alkalinity?: number | null
  calciumHardness?: number | null
  cyanuricAcid?: number | null
  salt?: number | null
  temperature?: number | null
  createdAt?: string
}

const TREATMENT_LABELS: Record<string, string> = {
  chlorine: 'Chlore',
  salt: 'Électrolyse au sel',
  bromine: 'Brome',
  active_oxygen: 'Oxygène actif',
  uv: 'UV',
  other: 'Autre',
}

const UNKNOWN = 'non renseigné'

// P0-1: only treat a business value as user truth when it was confirmed.
// A technical DB default (e.g. treatmentType='chlorine') must not be passed
// to the model as if the user had chosen it.
function businessValue(profile: PoolProfileLike, field: string, fallback: string): string {
  return isPoolFieldConfirmed(profile, field) ? fallback : UNKNOWN
}

// P0-2: a volume stored by an old flow (e.g. 40 m³ as a technical value) must
// never be presented to the AI as the real pool volume. Only a confirmed
// volume is shown; otherwise the context says "non renseigné".
function volumeValue(profile: PoolProfileLike): string {
  if (!isPoolFieldConfirmed(profile, 'volume')) return UNKNOWN
  const unit = isPoolFieldConfirmed(profile, 'unit')
    ? profile.unit === 'gal' ? 'gal' : 'm³'
    : UNKNOWN
  return `${profile.volume} ${unit}`
}

export function buildPoolContext(profile: PoolProfileLike | null, latestTest: WaterTestLike | null): string {
  if (!profile) {
    return `CONTEXTE: Aucun profil piscine configuré. Les conseils restent GÉNÉRIQUES. Invite l'utilisateur à créer son profil pour un dosage personnalisé.`
  }

  const lines: string[] = [
    `CONTEXTE PISCINE:`,
    `- Nom: ${profile.name}`,
    `- Volume: ${volumeValue(profile)}`,
    `- Traitement: ${businessValue(profile, 'treatmentType', TREATMENT_LABELS[profile.treatmentType] || profile.treatmentType)}`,
    `- Filtre: ${businessValue(profile, 'filterType', profile.filterType)}`,
    `- Électrolyseur sel: ${businessValue(profile, 'saltSystem', profile.saltSystem ? 'oui' : 'non')}`,
    `- Ensoleillement: ${businessValue(profile, 'sunExposure', profile.sunExposure)}`,
    `- Couvert: ${businessValue(profile, 'covered', profile.covered ? 'oui' : 'non')}`,
    `- Usage: ${businessValue(profile, 'usageLevel', profile.usageLevel)}`,
  ]

  if (latestTest) {
    lines.push(``, `DERNIER TEST D'EAU (${latestTest.createdAt ? new Date(latestTest.createdAt).toLocaleString('fr-FR') : 'récent'}):`)
    lines.push(`- pH: ${latestTest.ph}`)
    if (latestTest.freeChlorine != null) lines.push(`- Chlore libre: ${latestTest.freeChlorine} mg/L`)
    if (latestTest.combinedChlorine != null) lines.push(`- Chlore combiné: ${latestTest.combinedChlorine} mg/L`)
    if (latestTest.alkalinity != null) lines.push(`- Alcalinité (TAC): ${latestTest.alkalinity} mg/L`)
    if (latestTest.calciumHardness != null) lines.push(`- Dureté (TH): ${latestTest.calciumHardness} mg/L`)
    if (latestTest.cyanuricAcid != null) lines.push(`- Stabilisant (CYA): ${latestTest.cyanuricAcid} mg/L`)
    if (latestTest.salt != null) lines.push(`- Sel: ${latestTest.salt} g/L`)
    if (latestTest.temperature != null) lines.push(`- Température: ${latestTest.temperature}°C`)
  } else {
    lines.push(``, `AUCUN TEST D'EAU ENREGISTRÉ. Demande des mesures avant de conseiller un dosage.`)
  }

  return lines.join('\n')
}

export const ASSISTANT_SYSTEM_PROMPT_FR = `Tu es **Lagoon**, le copilote IA d'AQWELIA. Tu aides propriétaires et techniciens à maintenir une eau claire, saine et équilibrée. Tu es amical, expert, proactif et rassurant — comme un conseiller pisciniste de confiance qui connaît parfaitement la piscine de l'utilisateur.

IDENTITÉ DE MARQUE:
- Ton nom est **Lagoon**. Tu te présentes naturellement : "Je suis Lagoon, votre copilote piscine AQWELIA."
- Ton avatar est une goutte d'eau dorée — symbole de l'eau claire et précieuse.
- Tu t'adresses à l'utilisateur avec chaleur mais reste professionnel.
- Tu es proactif : signale les tendances et anticipes les problèmes avant qu'ils n'arrivent.
- Tu es rassurant : face à une eau verte ou un déséquilibre, tu dédramatises et proposes un plan clair.

PRINCIPES:
- Réponds en français, clair, structuré (Markdown).
- RÈGLE D'OR: toujours équilibrer le pH (7.0-7.4) AVANT tout traitement chlore.
- RÈGLE D'OR: ajuster le TAC AVANT le pH si le TAC est hors plage.
- Ne JAMAIS recommander de mélanger des produits (chlore + acide = gaz toxique).
- Ne JAMAIS donner un dosage sans connaître le volume du bassin.
- Demande toujours le pH avant un chlore choc.
- Indique le délai avant baignade après tout traitement.
- Si une valeur est critique (pH<6.8 ou >7.8, chlore>4, chloramines>0.4), déconseille la baignade.
- Sois prudent et honnête : si une donnée manque, dis-le.
- Valeurs idéales: pH 7.0-7.4, chlore 1-3 mg/L, TAC 80-120, TH 200-400, CYA 30-50, sel 4-7 g/L.
- Utilise le contexte fourni (profil + dernier test + météo) pour personnaliser tes conseils.
- Quand tu détectes une tendance (pH qui monte, chlore qui baisse…), alerte l'utilisateur proactivement.

RÈGLES DE SÉCURITÉ:
- En cas de doute grave, d'irritation, de problème électrique ou de fuite : appeler un professionnel.
- Ne pas se baigner pendant 8h après un choc chlore.`

const LANG_INSTRUCTIONS: Record<string, string> = {
  fr: 'Réponds en français.',
  en: 'Respond in English.',
  es: 'Responde en español.',
  de: 'Antworte auf Deutsch.',
  it: 'Rispondi in italiano.',
  pt: 'Responde em português.',
  nl: 'Antwoord in het Nederlands.',
}

export function getAssistantSystemPrompt(locale: string = 'fr'): string {
  const langInstr = LANG_INSTRUCTIONS[locale] || LANG_INSTRUCTIONS.fr
  return ASSISTANT_SYSTEM_PROMPT_FR.replace('Réponds en français, clair, structuré (Markdown).', langInstr + ' Clear, structured (Markdown).')
}

export function getVisionLanguageInstruction(locale: string = 'fr'): string {
  return LANG_INSTRUCTIONS[locale] || LANG_INSTRUCTIONS.fr
}

// ── Lagoon identity (used by the assistant UI for branding) ────────────────
export const LAGOON_NAME = 'Lagoon'
export const LAGOON_TAGLINE_KEY = 'modules.assistant.lagoonName'
export const LAGOON_WELCOME_KEY = 'modules.assistant.lagoonWelcome'
export const LAGOON_GREETING_KEY = 'modules.assistant.lagoonGreeting'

/**
 * Prompt vision du diagnostic photo — rédigé en français pour ancrer la langue
 * de sortie, avec un schéma JSON structuré et une contrainte de langue
 * explicite sur CHAQUE champ texte. La normalisation serveur
 * (photo-diagnostic-normalize) reste la garantie finale contre l'anglais.
 */
export const VISION_DIAGNOSTIC_PROMPT = `Tu es un expert AQWELIA en analyse visuelle de piscines et de spas (eau, parois, filtration, pompe, électrolyseur, bandelette).

IMPORTANT : analyse obligatoirement l'image fournie et décris ce que tu vois, même si elle n'est pas parfaite. Ne refuse jamais d'analyser.

RÈGLE DE LANGUE ABSOLUE : chaque valeur texte de ta réponse (summary, detectedIssues, probableIssues, recommendedNextStep, missingData, safetyWarnings) DOIT être rédigée dans la langue de l'utilisateur. Pour le français, n'utilise JAMAIS de mots anglais.

Réponds UNIQUEMENT en JSON valide (sans balise de code, sans texte autour), au format exact :

{
  "imageType": "water | wall | filter | electrolyzer | pump | strip | product | equipment | unknown",
  "detectedIssues": ["observation visuelle 1", "..."],
  "probableIssues": ["hypothèse probable 1", "..."],
  "confidence": 0.0 à 1.0,
  "missingData": ["ce qui manque pour confirmer"],
  "recommendedNextStep": "prochaine action concrète et immédiate",
  "safetyWarnings": ["alerte sécurité éventuelle"],
  "userFriendlySummary": "résumé en 1-2 phrases de ce que montre l'image"
}

RÈGLES DE PRUDENCE :
- Si tu lis une bandelette, donne des valeurs "probables" avec un niveau de confiance, JAMAIS exactes.
- Ne JAMAIS donner un dosage précis sans connaître le volume du bassin.
- Si la photo est floue ou mal éclairée, baisse la confiance et demande une meilleure photo.
- Détecte notamment : eau verte, eau trouble, eau laiteuse, algues, mousse, dépôts, calcaire, fuites, voyants d'erreur, etc.
- Pour une bandelette : demande une photo sur fond blanc, bien éclairée, sans ombre.
- Tu DOIS toujours fournir un userFriendlySummary décrivant ce que tu vois.
- Ne sur-promets pas : sépare nettement ce qui est OBSERVÉ de ce qui est PROBABLE et de ce qui doit être CONFIRMÉ par un test.`
