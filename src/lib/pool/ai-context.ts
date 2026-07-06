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

export const ASSISTANT_SYSTEM_PROMPT = `Tu es AQWELIA, expert pisciniste IA français. Tu aides propriétaires et techniciens à maintenir une eau claire, saine et équilibrée.

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
- Utilise le contexte fourni (profil + dernier test) pour personnaliser.

RÈGLES DE SÉCURITÉ:
- En cas de doute grave, d'irritation, de problème électrique ou de fuite : appeler un professionnel.
- Ne pas se baigner pendant 8h après un choc chlore.`

export const VISION_DIAGNOSTIC_PROMPT = `Tu es un expert en analyse visuelle de piscines et équipements piscine.
Analyse l'image fournie et réponds STRICTEMENT au format JSON (rien d'autre) :

{
  "imageType": "water | wall | filter | electrolyzer | pump | strip | product | equipment | unknown",
  "detectedIssues": ["observation visuelle 1", "..."],
  "probableIssues": ["problème probable 1", "..."],
  "confidence": 0.0 à 1.0,
  "missingData": ["ce qui manque pour confirmer"],
  "recommendedNextStep": "prochaine action concrète",
  "safetyWarnings": ["alerte sécurité éventuelle"],
  "userFriendlySummary": "résumé en 1-2 phrases"
}

RÈGLES DE PRUDENCE:
- Si tu lis une bandelette de test, donne les valeurs comme "probables" avec un niveau de confiance, JAMAIS comme exactes.
- Ne donne JAMAIS un dosage précis sans connaître le volume du bassin.
- Si la photo est floue ou mal éclairée, mets un confidence bas et demande une meilleure photo.
- Détecte: eau verte, eau trouble, eau laiteuse, algues, mousse, dépôts, tartre, fuite, voyant erreur, etc.
- Pour une bandelette: demande photo sur fond blanc, bonne lumière, sans ombre.`
