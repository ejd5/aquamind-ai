/**
 * ARQWELIA Lot 2 Phase 0A — versioned prompt builder.
 *
 * `buildArqweliaPrompt` turns a Concept (`A`|`B`) plus closed-vocabulary inputs
 * (style, shape, budgetRange, hasTerrace, declaredConstraints) into a single
 * PII-free, versioned prompt string with a stable SHA-256.
 *
 * The prompt can NEVER include name/firstName/email/phone/address/GPS/postal
 * code/publicId/projectToken/free-form user text: every injected token comes
 * from the closed lists in `vocabulary.ts` and the output is re-validated by
 * `assertPromptPiiFree` before it is returned.
 */

import { createHash } from 'node:crypto'
import { CONCEPT_A_V1_TEMPLATE } from './concept-a-v1'
import { CONCEPT_B_V1_TEMPLATE } from './concept-b-v1'
import { assertPromptPiiFree } from './pii-guard'
import {
  BUDGET_RANGE_OPTIONS,
  CONSTRAINT_OPTIONS,
  CONSTRAINTS_FALLBACK,
  SHAPE_OPTIONS,
  STYLE_OPTIONS,
  TERRACE_CLAUSE_ABSENT,
  TERRACE_CLAUSE_PRESENT,
  type ArqweliaBudgetRange,
  type ArqweliaConstraint,
  type ArqweliaShape,
  type ArqweliaStyle,
} from './vocabulary'

export const ARQWELIA_PROMPT_VERSION = 'arqwelia-lot2-v1'

export type ArqweliaConcept = 'A' | 'B'

export interface ArqweliaPromptInput {
  concept: ArqweliaConcept
  style: ArqweliaStyle
  shape: ArqweliaShape
  budgetRange: ArqweliaBudgetRange
  hasTerrace: boolean
  declaredConstraints?: ArqweliaConstraint[]
}

export interface ArqweliaPrompt {
  promptVersion: typeof ARQWELIA_PROMPT_VERSION
  concept: ArqweliaConcept
  prompt: string
  promptSha256: string
}

function assertClosedList<T extends string>(value: T, list: readonly T[], label: string): void {
  if (!list.includes(value)) {
    throw new Error(`Invalid ${label}: "${value}" is not a controlled value`)
  }
}

/**
 * Builds the PII-free, versioned prompt for a concept.
 *
 * @throws when `style`/`shape`/`budgetRange`/`declaredConstraints` are outside
 * the closed lists, or when the interpolated prompt fails the PII guard.
 */
export function buildArqweliaPrompt(input: ArqweliaPromptInput): ArqweliaPrompt {
  if (input.concept !== 'A' && input.concept !== 'B') {
    throw new Error(`Invalid concept: "${String(input.concept)}"`)
  }
  assertClosedList(input.style, STYLE_OPTIONS, 'style')
  assertClosedList(input.shape, SHAPE_OPTIONS, 'shape')
  assertClosedList(input.budgetRange, BUDGET_RANGE_OPTIONS, 'budgetRange')

  const constraints = input.declaredConstraints ?? []
  for (const constraint of constraints) {
    assertClosedList(constraint, CONSTRAINT_OPTIONS, 'declared constraint')
  }

  const template = input.concept === 'A' ? CONCEPT_A_V1_TEMPLATE : CONCEPT_B_V1_TEMPLATE
  const terraceClause = input.hasTerrace ? TERRACE_CLAUSE_PRESENT : TERRACE_CLAUSE_ABSENT
  const constraintText =
    constraints.length > 0 ? constraints.join(', ') : CONSTRAINTS_FALLBACK

  const prompt = template
    .replaceAll('{style}', input.style)
    .replaceAll('{shape}', input.shape)
    .replaceAll('{budgetRange}', input.budgetRange)
    .replaceAll('{terraceClause}', terraceClause)
    .replaceAll('{constraints}', constraintText)

  const promptSha256 = createHash('sha256').update(prompt).digest('hex')

  // Final gate: never return a prompt carrying personal data or free-form text.
  assertPromptPiiFree(prompt)

  return {
    promptVersion: ARQWELIA_PROMPT_VERSION,
    concept: input.concept,
    prompt,
    promptSha256,
  }
}

/** Sensible Phase 0A defaults so the CLI only needs `--concept A|B`. */
const DEFAULT_INPUT: Omit<ArqweliaPromptInput, 'concept' | 'declaredConstraints'> = {
  style: 'photorealistic',
  shape: 'rectangular-front',
  budgetRange: 'mid-range',
  hasTerrace: true,
}

const DEFAULT_CONSTRAINTS: Record<ArqweliaConcept, ArqweliaConstraint[]> = {
  A: [
    'preserve-house',
    'preserve-fences',
    'preserve-trees',
    'preserve-perspective',
    'minimal-garden-changes',
  ],
  B: ['preserve-house', 'preserve-perspective', 'landscaping-only'],
}

/** Builds a prompt with the documented Phase 0A default inputs. */
export function buildDefaultArqweliaPrompt(concept: ArqweliaConcept): ArqweliaPrompt {
  return buildArqweliaPrompt({
    concept,
    ...DEFAULT_INPUT,
    declaredConstraints: DEFAULT_CONSTRAINTS[concept],
  })
}
