/**
 * ARQWELIA Lot 2 Phase 0A — Concept B prompt TEMPLATE (versioned, static).
 *
 * Concept B: premium, more ambitious landscaping, inspirational render; the
 * house and the original perspective are preserved; no people, no text, no
 * logos.
 *
 * This is a STATIC template string. `buildArqweliaPrompt` interpolates only
 * the closed-vocabulary tokens `{style}`, `{shape}`, `{budgetRange}`,
 * `{terraceClause}` and `{constraints}` from `vocabulary.ts`. Free-form user
 * text can never reach a provider prompt.
 */
export const CONCEPT_B_V1_TEMPLATE = `Premium, inspirational landscape-architecture render for a residential front garden.
Keep the house and the original camera perspective exactly as photographed.
Transform the garden with ambitious, high-quality landscaping.
Style: {style}. Garden layout: {shape}. Budget: {budgetRange}. Terrace: {terraceClause}
Do not add any people, text, or logos. Declared constraints: {constraints}`

/** Prompt version shared by every Lot 2 Phase 0A prompt (v1). */
export const CONCEPT_B_V1_VERSION = 'arqwelia-lot2-v1'
