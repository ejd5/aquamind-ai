/**
 * ARQWELIA Lot 2 Phase 0A — versioned prompts + PII guard entry point.
 */

export {
  CONCEPT_A_V1_TEMPLATE,
  CONCEPT_A_V1_VERSION,
} from './concept-a-v1'
export {
  CONCEPT_B_V1_TEMPLATE,
  CONCEPT_B_V1_VERSION,
} from './concept-b-v1'
export {
  ARQWELIA_PROMPT_VERSION,
  buildArqweliaPrompt,
  buildDefaultArqweliaPrompt,
} from './prompt-builder'
export type {
  ArqweliaPrompt,
  ArqweliaPromptInput,
  ArqweliaConcept,
} from './prompt-builder'
export {
  assertNoPersonalData,
  assertPromptPiiFree,
  scanForPii,
  PiiGuardError,
} from './pii-guard'
export type { PiiIssue, PiiIssueType, PiiScanResult } from './pii-guard'
export {
  BUDGET_RANGE_OPTIONS,
  CONSTRAINT_OPTIONS,
  SHAPE_OPTIONS,
  STYLE_OPTIONS,
  TERRACE_CLAUSE_ABSENT,
  TERRACE_CLAUSE_PRESENT,
} from './vocabulary'
export type {
  ArqweliaBudgetRange,
  ArqweliaConstraint,
  ArqweliaShape,
  ArqweliaStyle,
} from './vocabulary'
