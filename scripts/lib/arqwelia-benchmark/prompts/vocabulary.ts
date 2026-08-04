/**
 * ARQWELIA Lot 2 Phase 0A — closed-vocabulary prompt inputs.
 *
 * Every value that can be injected into a prompt template must come from one of
 * the CLOSED lists below. The PII guard (`pii-guard.ts`) derives its allowed
 * token set from these lists plus the two static concept templates, so a prompt
 * can only ever contain template text + controlled tokens — never free-form
 * user text, names, addresses, contacts, GPS or any other personal data.
 */

export const STYLE_OPTIONS = [
  'photorealistic',
  'soft-architectural-render',
  'editorial-photography',
] as const

export type ArqweliaStyle = (typeof STYLE_OPTIONS)[number]

export const SHAPE_OPTIONS = [
  'rectangular-front',
  'reversed-l-shape',
  'u-shape',
  'island',
  'patio-courtyard',
] as const

export type ArqweliaShape = (typeof SHAPE_OPTIONS)[number]

export const BUDGET_RANGE_OPTIONS = ['budget-friendly', 'mid-range', 'premium'] as const

export type ArqweliaBudgetRange = (typeof BUDGET_RANGE_OPTIONS)[number]

export const CONSTRAINT_OPTIONS = [
  'no-people',
  'no-text',
  'no-logo',
  'preserve-house',
  'preserve-fences',
  'preserve-trees',
  'preserve-perspective',
  'minimal-garden-changes',
  'landscaping-only',
  'keep-terrace',
] as const

export type ArqweliaConstraint = (typeof CONSTRAINT_OPTIONS)[number]

/** Controlled phrasing for the `hasTerrace` flag. No free-form text allowed. */
export const TERRACE_CLAUSE_PRESENT = 'include the existing terrace and keep it usable.'
export const TERRACE_CLAUSE_ABSENT = 'the garden has no terrace.'

/** Controlled fallback used when no extra constraint is declared. */
export const CONSTRAINTS_FALLBACK = 'none beyond the above.'
