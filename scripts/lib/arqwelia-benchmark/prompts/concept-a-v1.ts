/**
 * ARQWELIA Lot 2 Phase 0A — Concept A prompt TEMPLATE (versioned, static).
 *
 * Concept A: realistic, sober; preserves the house, the fences, the existing
 * trees and the original perspective; only minimal garden changes; no people,
 * no text, no logos.
 *
 * This is a STATIC template string. `buildArqweliaPrompt` interpolates only
 * the closed-vocabulary tokens `{style}`, `{shape}`, `{budgetRange}`,
 * `{terraceClause}` and `{constraints}` from `vocabulary.ts`. Free-form user
 * text can never reach a provider prompt.
 */
export const CONCEPT_A_V1_TEMPLATE = `Realistic, sober landscape-architecture concept for a residential front garden.
Preserve the house, the fences, the existing trees, and the original camera perspective exactly.
Make only minimal changes to the garden. Keep the scene uncluttered.
Style: {style}. Garden layout: {shape}. Budget: {budgetRange}. Terrace: {terraceClause}
Do not add any people, text, or logos. Declared constraints: {constraints}`

/** Prompt version shared by every Lot 2 Phase 0A prompt (v1). */
export const CONCEPT_A_V1_VERSION = 'arqwelia-lot2-v1'
