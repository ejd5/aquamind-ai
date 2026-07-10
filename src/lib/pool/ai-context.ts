// Construction du contexte piscine pour l'IA (LLM + VLM)
// Injecte profil + dernière mesure + plan d'action dans les prompts.

import { VolumeUnit } from './units'

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

export function buildPoolContext(profile: PoolProfileLike | null, latestTest: WaterTestLike | null): string {
  if (!profile) {
    return `CONTEXTE: Aucun profil piscine configuré. Les conseils restent GÉNÉRIQUES. Invite l'utilisateur à créer son profil pour un dosage personnalisé.`
  }

  const lines: string[] = [
    `CONTEXTE PISCINE:`,
    `- Nom: ${profile.name}`,
    `- Volume: ${profile.volume} ${profile.unit === 'gal' ? 'gal' : 'm³'}`,
    `- Traitement: ${TREATMENT_LABELS[profile.treatmentType] || profile.treatmentType}`,
    `- Filtre: ${profile.filterType}`,
    `- Électrolyseur sel: ${profile.saltSystem ? 'oui' : 'non'}`,
    `- Ensoleillement: ${profile.sunExposure}`,
    `- Couvert: ${profile.covered ? 'oui' : 'non'}`,
    `- Usage: ${profile.usageLevel}`,
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

export const VISION_DIAGNOSTIC_PROMPT = `You are an expert in visual analysis of swimming pools and pool equipment.

IMPORTANT: You MUST analyze the provided image. Describe what you see, even if the image is not perfect. Never refuse to analyze — do your best with what you see.

After analyzing the image, respond in JSON format (try to follow this format, but if you can't, respond in free text and the system will adapt):

{
  "imageType": "water | wall | filter | electrolyzer | pump | strip | product | equipment | unknown",
  "detectedIssues": ["visual observation 1", "..."],
  "probableIssues": ["probable issue 1", "..."],
  "confidence": 0.0 to 1.0,
  "missingData": ["what is missing to confirm"],
  "recommendedNextStep": "next concrete action",
  "safetyWarnings": ["any safety alert"],
  "userFriendlySummary": "summary in 1-2 sentences of what you see in the image"
}

CAUTION RULES:
- If you read a test strip, give values as "probable" with a confidence level, NEVER as exact.
- NEVER give a precise dosage without knowing the pool volume.
- If the photo is blurry or poorly lit, set a low confidence and ask for a better photo.
- Detect: green water, cloudy water, milky water, algae, foam, deposits, scale, leaks, error lights, etc.
- For a test strip: ask for a photo on a white background, good lighting, no shadows.
- You MUST always provide a userFriendlySummary describing what you see.`
