/**
 * ARQWELIA Lot 2 Phase 0A — Z.ai GLM adapter status (DOCUMENTARY ONLY).
 *
 * id: `zai-glm` — BLOCKED for Phase 0A.
 *
 * WHY BLOCKED (verified during Phase 0A provisioning):
 *   - The installed `z-ai-web-dev-sdk` (`^0.0.18`) DOES expose an
 *     `images.generations.edit` method (`createImageEdit`) — the SDK method was
 *     detected. The SDK forwards `{ ...body }` unchanged and converts any
 *     `item.url` in `result.data` into `{ base64, format: "png" }`.
 *   - BUT official Z.AI documentation only documents
 *     `POST /api/paas/v4/images/generations` (text-to-image) with
 *     `{ model, prompt, quality, size, user_id }` and a response
 *     `data[0].url` (NOT base64). **No photo-input image-edit contract is
 *     verified.**
 *   - => "SDK method detected but no current official API/model contract
 *     proving photo-to-photo editing."
 *
 * This file is a DOCUMENTARY artifact ONLY. It exposes NO executable candidate:
 * there is no `runSmoke`, no fake `{ model, prompt, image, size }` request
 * contract, and it is NOT listed in the executable
 * `arqweliaBenchmarkCandidates` (see `candidates-registry.mjs`). Importing it
 * can never produce a runnable candidate.
 *
 * Z.AI may be re-enabled later ONLY when official docs specify:
 *   - the exact endpoint,
 *   - the exact model,
 *   - the input image contract,
 *   - the output format,
 *   - the price,
 *   - the data policy.
 *
 * SAFETY: this module never imports or calls the real SDK, never calls fetch,
 * and never performs a network call.
 */

/** Candidate id (`zai-glm`). */
export const ZAI_ADAPTER_ID = 'zai-glm'

/** Model stays `tbd` — no official model string proves photo-to-photo editing. */
export const ZAI_MODEL = 'tbd'

/** Official Z.AI endpoint documented for image generation (text-to-image). */
export const ZAI_DOCUMENTED_ENDPOINT = 'POST /api/paas/v4/images/generations'

/** Official response shape per Z.AI docs: `data[0].url` (NOT base64). */
export const ZAI_DOCUMENTED_RESPONSE = 'data[0].url (NOT base64)'

/** The exact Phase 0A block reason (quote). */
export const ZAI_BLOCK_REASON =
  'SDK method detected but no current official API/model contract proving photo-to-photo editing.'

/** Conditions that MUST be met (official docs) before Z.AI can be re-enabled. */
export const ZAI_REENABLE_REQUIREMENTS = [
  'endpoint specified in official docs',
  'exact model specified',
  'input image contract specified',
  'output format specified',
  'price specified',
  'data policy specified',
]

/**
 * DOCUMENTARY adapter object. Never executable: `supportsImageEditing` is
 * `false`, `state` is `blocked_missing_capability`, and there is NO `runSmoke`.
 * It is exposed so tests and the report can prove the blocked status, and it is
 * registered in `arqweliaBenchmarkDocumentaryCandidates` only.
 */
export const zaiImageAdapter = {
  id: ZAI_ADAPTER_ID,
  model: ZAI_MODEL,
  supportsImageEditing: false,
  dryRunSafe: false,
  state: 'blocked_missing_capability',
  documentaryOnly: true,
  blockReason: ZAI_BLOCK_REASON,
  dryRunDescription:
    'Z.ai GLM candidate — BLOCKED for Phase 0A (documentary only). ' +
    `${ZAI_BLOCK_REASON} Official Z.AI docs only document ${ZAI_DOCUMENTED_ENDPOINT} ` +
    `with {model, prompt, quality, size, user_id} and a response ${ZAI_DOCUMENTED_RESPONSE}. ` +
    'No runnable transport.',
  validateConfiguration() {
    return { ok: false, reason: 'Z.ai is blocked for Phase 0A (documentary only, no runnable transport)' }
  },
  estimateOfficialCost() {
    return { known: false, note: 'UNKNOWN — BLOCKED FOR PHASE 0A' }
  },
}
