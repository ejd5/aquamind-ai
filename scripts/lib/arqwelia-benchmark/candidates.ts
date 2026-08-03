/**
 * ARQWELIA Lot 2 — typed benchmark candidate registry.
 *
 * The candidate definitions (including the mock smoke and the real-provider
 * stubs) live in `candidates-registry.mjs` so the plain-`node` CLI and the
 * typed consumers read the same objects. This module adds the TypeScript
 * contract on top and is what the Vitest suite and the tools typechecker use.
 */

import type { ArqweliaBenchmarkProvider } from './provider'
import {
  arqweliaBenchmarkCandidates as _candidates,
  getArqweliaBenchmarkCandidate as _getCandidate,
} from './candidates-registry.mjs'

export type {
  ArqweliaBenchmarkProvider,
  CandidateState,
  SmokeOptions,
  SmokeResult,
} from './provider'
export {
  ARQWELIA_BENCHMARK_AUTHORIZED,
  ARQWELIA_BENCHMARK_MAX_BUDGET_EUR,
  ARQWELIA_BENCHMARK_PHASE0A_EXECUTE,
  ArqweliaProviderError,
  billingFromCaughtError,
  computeGate,
  ensureNoRealCall,
  ensurePhase0AGate,
  redactSecrets,
  registerArqweliaBenchmarkCandidate,
  billingSnapshot,
  billingSummaryLines,
} from './provider'

/** All registered candidates (nvidia-nim, zai-glm, openai-gpt-image, mock). */
export const arqweliaBenchmarkCandidates: ArqweliaBenchmarkProvider[] = _candidates as ArqweliaBenchmarkProvider[]

/** Look up a candidate by id. Returns `undefined` when unknown. */
export function getArqweliaBenchmarkCandidate(
  id: string,
): ArqweliaBenchmarkProvider | undefined {
  return _getCandidate(id) as ArqweliaBenchmarkProvider | undefined
}
