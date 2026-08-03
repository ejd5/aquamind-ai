/**
 * ARQWELIA Lot 2 Phase 0A — retention config + STRICT local call manifest.
 *
 * NO EXECUTION IN THIS BUILD: this module implements the strict counter and the
 * per-dataset-item retention record. The counter does NOT depend on process
 * memory — it persists a local, NON-versioned JSON manifest in the benchmark
 * output directory and reads/writes it for every decision.
 *
 * Phase 0A retention config (documented, not executed):
 *   provider=openai-gpt-image, model=gpt-image-2, size=1536x1024,
 *   quality=medium, output_format=png, photos=2, concepts=A and B,
 *   maximumCalls=4, maximumBudgetEur=2.
 *
 * Dataset rules (Phase 0A): synthetic or explicitly authorized photos only;
 * no faces, no plates, no house numbers, no addresses, no GPS, no identifying
 * filenames; never commit real photos.
 *
 * The manifest (`phase0a-manifest.json`) lives under the benchmark out dir
 * (gitignored via `benchmark-out/`). It contains the per-item retention record
 * (`datasetItemId`, `origin`, `authorization`, `normalizedSha256`, `noExif`,
 * `date`, `statusA`, `statusB`) plus the ordered call log used for the
 * 4-call cap and the idempotence key.
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ArqweliaProviderError } from './provider-runtime.mjs'

/** Phase 0A retention configuration (single source of truth). */
export const PHASE0A_RETENTION_CONFIG = Object.freeze({
  provider: 'openai-gpt-image',
  model: 'gpt-image-2',
  size: '1536x1024',
  quality: 'medium',
  outputFormat: 'png',
  photos: 2,
  concepts: ['A', 'B'],
  maximumCalls: 4,
  maximumBudgetEur: 2,
})

/** Local manifest filename (NON-versioned, written under the out dir). */
export const PHASE0A_MANIFEST_FILENAME = 'phase0a-manifest.json'

/** Phase 0A dataset rules — synthetic or explicitly authorized photos only. */
export const PHASE0A_DATASET_RULES = Object.freeze([
  'synthetic or explicitly authorized photos only',
  'no faces',
  'no license plates',
  'no house numbers',
  'no addresses',
  'no GPS',
  'no identifying filenames',
  'never commit real photos',
])

/**
 * Idempotence key = datasetItemId + concept + model + promptSha256.
 *
 * @param {{ datasetItemId: string, concept: string, model: string, promptSha256: string }} input
 * @returns {string}
 */
export function phase0aIdempotenceKey({ datasetItemId, concept, model, promptSha256 }) {
  return createHash('sha256')
    .update([String(datasetItemId), String(concept), String(model), String(promptSha256)].join('|'))
    .digest('hex')
}

/** Default (empty) manifest structure. */
export function defaultPhase0aManifest() {
  return {
    phase0a: { ...PHASE0A_RETENTION_CONFIG },
    calls: [],
    items: {},
  }
}

/** Absolute path of the manifest inside the benchmark output directory. */
export function phase0aManifestPath(outDir) {
  return join(outDir, PHASE0A_MANIFEST_FILENAME)
}

/**
 * Loads the manifest from the output directory (or returns the default when
 * missing/corrupt). Read-only — never depends on process memory.
 *
 * @param {string} outDir
 * @returns {Promise<object>}
 */
export async function loadPhase0aManifest(outDir) {
  try {
    const raw = await readFile(phase0aManifestPath(outDir), 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return defaultPhase0aManifest()
    }
    return {
      ...defaultPhase0aManifest(),
      ...parsed,
      calls: Array.isArray(parsed.calls) ? parsed.calls : [],
      items: parsed.items && typeof parsed.items === 'object' && !Array.isArray(parsed.items) ? parsed.items : {},
    }
  } catch {
    return defaultPhase0aManifest()
  }
}

/**
 * Persists the manifest. Writes the file atomically-ish (temp + rename).
 *
 * @param {string} outDir
 * @param {object} manifest
 */
export async function savePhase0aManifest(outDir, manifest) {
  await mkdir(outDir, { recursive: true })
  const path = phase0aManifestPath(outDir)
  const tmp = `${path}.${process.pid}.tmp`
  await writeFile(tmp, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  const { rename } = await import('node:fs/promises')
  await rename(tmp, path)
}

/**
 * STRICT counter + idempotence check, persisted in the manifest.
 *
 * Refuses (throws `ArqweliaProviderError`, billing `not_called`):
 *   - a 5th call (manifest already has `maximumCalls`=4 records),
 *   - a duplicate (`datasetItemId + concept + model + promptSha256`) unless
 *     `retry` is explicitly `true`.
 *
 * @param {{ outDir: string, datasetItemId: string, concept: string, model: string, promptSha256: string, retry?: boolean }} opts
 * @returns {Promise<{ allowed: true, idempotenceKey: string, calls: number }>}
 */
export async function checkPhase0aCallAllowed({
  outDir,
  datasetItemId,
  concept,
  model,
  promptSha256,
  retry = false,
}) {
  if (datasetItemId == null || datasetItemId === '') {
    throw new ArqweliaProviderError('Phase 0A call refused: no datasetItemId (controlled dataset id required)', {
      externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called',
    })
  }
  if (concept !== 'A' && concept !== 'B') {
    throw new ArqweliaProviderError('Phase 0A call refused: invalid concept (must be A or B)', {
      externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called',
    })
  }
  const manifest = await loadPhase0aManifest(outDir)
  if (manifest.calls.length >= PHASE0A_RETENTION_CONFIG.maximumCalls) {
    throw new ArqweliaProviderError(
      `Phase 0A call refused: maximum of ${PHASE0A_RETENTION_CONFIG.maximumCalls} calls reached`,
      { externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called' },
    )
  }
  const idempotenceKey = phase0aIdempotenceKey({ datasetItemId, concept, model, promptSha256 })
  const duplicate = manifest.calls.find((call) => call && call.idempotenceKey === idempotenceKey)
  if (duplicate && !retry) {
    throw new ArqweliaProviderError(
      'Phase 0A call refused: duplicate (same datasetItemId+concept+model+promptSha256) requires an explicit retry option',
      { externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called' },
    )
  }
  return { allowed: true, idempotenceKey, calls: manifest.calls.length }
}

/**
 * Records a Phase 0A call in the persisted manifest (one call per
 * photo+concept). Uses the same STRICT counter + idempotence rules.
 *
 * @param {{ outDir: string, datasetItemId: string, concept: string, model: string, promptSha256: string, status?: string }} opts
 * @returns {Promise<{ idempotenceKey: string, calls: number }>}
 */
export async function recordPhase0aCall({ outDir, datasetItemId, concept, model, promptSha256, status = 'executed' }) {
  const { idempotenceKey } = await checkPhase0aCallAllowed({
    outDir,
    datasetItemId,
    concept,
    model,
    promptSha256,
    retry: false,
  })
  const manifest = await loadPhase0aManifest(outDir)
  manifest.calls.push({
    idempotenceKey,
    datasetItemId,
    concept,
    model,
    promptSha256,
    status,
    timestamp: new Date().toISOString(),
  })
  await savePhase0aManifest(outDir, manifest)
  return { idempotenceKey, calls: manifest.calls.length }
}

/**
 * Upserts the per-dataset-item retention record into the manifest. Contains:
 * `datasetItemId`, `origin`, `authorization`, `normalizedSha256`, `noExif`,
 * `date`, `statusA`, `statusB`.
 *
 * @param {{ outDir: string, datasetItemId: string, origin: string, authorization: boolean, normalizedSha256: string, noExif?: boolean, statusA?: string, statusB?: string }} opts
 * @returns {Promise<object>}
 */
export async function upsertPhase0aItem({
  outDir,
  datasetItemId,
  origin,
  authorization,
  normalizedSha256,
  noExif = true,
  statusA = 'pending',
  statusB = 'pending',
}) {
  const manifest = await loadPhase0aManifest(outDir)
  const record = {
    datasetItemId,
    origin,
    authorization: authorization === true,
    normalizedSha256,
    noExif: noExif === true,
    date: new Date().toISOString(),
    statusA,
    statusB,
  }
  manifest.items[String(datasetItemId)] = record
  await savePhase0aManifest(outDir, manifest)
  return record
}
