/**
 * ARQWELIA Lot 2 Phase 0A — retention config + STRICT local call manifest.
 *
 * DRY-RUN SAFE BY DEFAULT: this module implements the strict counter and the
 * per-dataset-item retention record. The counter does NOT depend on process
 * memory — it persists a local, NON-versioned JSON manifest in the benchmark
 * output directory and reads/writes it for every decision. A real execution
 * becomes technically possible ONLY when the owner arms every gate (see
 * docs/release/ARQWELIA_LOT2_BENCHMARK.md); the default is a dry run.
 *
 * Phase 0A retention config (documented owner-approved config):
 *   provider=openai-gpt-image, model=gpt-image-2, size=1536x1024,
 *   quality=medium, output_format=png, photos=2, concepts=A and B,
 *   maximumCalls=4, maximumBudgetEur=PHASE0A_OWNER_BUDGET_CAP_EUR (2).
 *
 * Dataset rules (Phase 0A): PHASE 0A DATASET MODE: SYNTHETIC ONLY — only
 * synthetic images created for the benchmark; no real homes, no user photos,
 * no people, no faces, no plates, no house numbers, no addresses, no GPS
 * coordinates, no identifying filenames; never commit real photos. The dataset
 * authorization basis is `synthetic` and is NEVER derived from
 * ARQWELIA_BENCHMARK_AUTHORIZED (that env flag concerns SPEND authorization,
 * not photo authorization).
 *
 * EXECUTION-SAFETY CONTRACT:
 *   - Atomic reservation: reserve → markStarted → call → finalize.
 *   - `reservePhase0aCall` records a `reserved` attempt BEFORE any transport —
 *     `reserved` provisionally occupies one of the call slots (it counts);
 *   - `markPhase0aCallStarted` flips it to `in_flight` immediately before the
 *     real fetch invocation (external call started or about to start);
 *   - `finalizePhase0aCall` records `succeeded` / `failed` / `unknown` (all
 *     definitively consume a slot) or `cancelled_before_call` (capacity
 *     released — the ONLY outcome that frees a slot).
 *   - Every read-modify-write is protected by a local lock file
 *     (`phase0a-manifest.lock`, created with `open(lockPath, 'wx')`). The lock
 *     is released in a `finally`; we never delete a lock owned by another
 *     process and we refuse on doubt (inode check before unlink).
 *   - FAIL-CLOSED manifest: absent → creation allowed; present+valid → normal
 *     read; present+corrupt → blocking error; permission/read/write error →
 *     blocking error. A caller in executeAuthorized must never ignore a
 *     manifest error and must never launch a transport when a manifest
 *     operation failed.
 */

import { createHash, randomBytes } from 'node:crypto'
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  ArqweliaProviderError,
  PHASE0A_OWNER_BUDGET_CAP_EUR,
} from './provider-runtime.mjs'

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
  maximumBudgetEur: PHASE0A_OWNER_BUDGET_CAP_EUR,
})

/** Local manifest filename (NON-versioned, written under the out dir). */
export const PHASE0A_MANIFEST_FILENAME = 'phase0a-manifest.json'

/** Local lock filename guarding every manifest read-modify-write. */
export const PHASE0A_MANIFEST_LOCK_FILENAME = 'phase0a-manifest.lock'

/**
 * Phase 0A dataset rules — PHASE 0A DATASET MODE: SYNTHETIC ONLY. Only
 * synthetic images created for the benchmark may be used: no real homes, no
 * user photos, no people, no faces, no plates, no house numbers, no addresses,
 * no GPS coordinates, no identifying filenames; never commit real photos.
 */
export const PHASE0A_DATASET_RULES = Object.freeze([
  'PHASE 0A DATASET MODE: SYNTHETIC ONLY',
  'only synthetic images created for the benchmark',
  'no real homes',
  'no user photos',
  'no people',
  'no faces',
  'no license plates',
  'no house numbers',
  'no addresses',
  'no GPS coordinates',
  'no identifying filenames',
  'never commit real photos',
])

/** Max wait for the local manifest lock before refusing on doubt (ms). */
export const PHASE0A_MANIFEST_LOCK_MAX_WAIT_MS = 10_000

/** Lock poll interval (ms). */
const LOCK_POLL_MS = 20

/** Billing payload for errors that never reached a network call. */
const NOT_CALLED = { externalCalls: 0, actualCostEur: 0, billingStatus: 'not_called' }

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

/** Absolute path of the lock file guarding a manifest. */
export function phase0aManifestLockPath(manifestPath) {
  return join(dirname(manifestPath), PHASE0A_MANIFEST_LOCK_FILENAME)
}

/**
 * The attempts that occupy one of the Phase 0A call slots:
 *   - `reserved`                → capacity provisionally occupied (COUNTS),
 *   - `in_flight`               → external call started or about to start,
 *   - `succeeded`/`failed`/`unknown` → capacity definitively consumed,
 *   - `cancelled_before_call`   → capacity released (never made a call).
 *
 * `reserved` therefore DOES count: it blocks a slot until the attempt is
 * finalized. `cancelled_before_call` is the ONLY status that frees a slot.
 *
 * @param {object} manifest
 * @returns {object[]}
 */
export function phase0aCountingCalls(manifest) {
  const calls = manifest && Array.isArray(manifest.calls) ? manifest.calls : []
  return calls.filter((call) => call && call.status !== 'cancelled_before_call')
}

/**
 * FAIL-CLOSED manifest loader.
 *
 * Rules:
 *   - manifest ABSENT            → default (creation allowed),
 *   - manifest present + VALID   → normal read (shape-normalized),
 *   - manifest present + CORRUPT → blocking `ArqweliaProviderError`,
 *   - permission / read error    → blocking `ArqweliaProviderError`.
 *
 * NEVER silently returns an empty manifest when a read failed.
 *
 * @param {string} manifestPath
 * @returns {Promise<object>}
 */
async function loadManifestAt(manifestPath) {
  let raw
  try {
    raw = await readFile(manifestPath, 'utf8')
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return defaultPhase0aManifest()
    }
    throw new ArqweliaProviderError('Phase 0A manifest could not be read — refusing to proceed', NOT_CALLED)
  }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ArqweliaProviderError('Phase 0A manifest is corrupted — refusing to proceed', NOT_CALLED)
  }
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ArqweliaProviderError('Phase 0A manifest is corrupted — refusing to proceed', NOT_CALLED)
  }
  return {
    ...defaultPhase0aManifest(),
    ...parsed,
    calls: Array.isArray(parsed.calls) ? parsed.calls : [],
    items: parsed.items && typeof parsed.items === 'object' && !Array.isArray(parsed.items) ? parsed.items : {},
  }
}

/**
 * FAIL-CLOSED manifest writer: atomic-ish write (temp file + rename). A write
 * error propagates as a blocking error — callers in executeAuthorized must
 * never ignore it and must never launch a transport when it happened.
 *
 * @param {string} manifestPath
 * @param {object} manifest
 */
async function saveManifestAt(manifestPath, manifest) {
  await mkdir(dirname(manifestPath), { recursive: true })
  const tmp = `${manifestPath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
  await writeFile(tmp, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  await rename(tmp, manifestPath)
}

/** Milliseconds sleep helper for the lock poll loop. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Acquires the local manifest lock with `open(lockPath, 'wx')` — atomically
 * fails with EEXIST if another process owns it, so we NEVER overwrite or steal
 * someone else's lock. Polls until the max wait timeout, then REFUSES ON DOUBT.
 *
 * @param {string} lockPath
 * @returns {Promise<import('node:fs/promises').FileHandle>}
 */
async function acquireManifestLock(lockPath) {
  // Ensure the lock's parent directory exists BEFORE `open(lockPath, 'wx')` so
  // a brand-new nested output path works on the very first run. Recursive mkdir
  // on an existing directory is a no-op; a permission error propagates
  // fail-closed (a blocking ArqweliaProviderError, never a silent success).
  try {
    await mkdir(dirname(lockPath), { recursive: true })
  } catch {
    throw new ArqweliaProviderError(
      'Phase 0A manifest lock parent directory could not be created — refusing to proceed',
      NOT_CALLED,
    )
  }
  const deadline = Date.now() + PHASE0A_MANIFEST_LOCK_MAX_WAIT_MS
  for (;;) {
    let handle = null
    try {
      handle = await open(lockPath, 'wx')
      await handle.writeFile(JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }))
      return handle
    } catch (error) {
      if (handle) {
        try {
          await handle.close()
        } catch {
          // ignore — the open failed
        }
      }
      if (error && error.code === 'EEXIST') {
        if (Date.now() >= deadline) {
          throw new ArqweliaProviderError(
            'Phase 0A manifest lock wait timed out — refusing to proceed on doubt',
            NOT_CALLED,
          )
        }
        await sleep(LOCK_POLL_MS)
        continue
      }
      throw new ArqweliaProviderError('Phase 0A manifest lock could not be acquired', NOT_CALLED)
    }
  }
}

/**
 * Releases the lock ONLY when the file at `lockPath` is still the exact inode
 * we created with `open(lockPath, 'wx')`. If the path was replaced by another
 * process we NEVER unlink it (refuse on doubt) — we just close our handle.
 *
 * @param {string} lockPath
 * @param {import('node:fs/promises').FileHandle} handle
 */
async function releaseManifestLock(lockPath, handle) {
  let owned = false
  try {
    const handleStat = await handle.stat()
    try {
      const pathStat = await stat(lockPath)
      owned = pathStat.dev === handleStat.dev && pathStat.ino === handleStat.ino
    } catch {
      owned = false // path already gone — nothing of ours to remove
    }
  } catch {
    owned = false
  }
  try {
    await handle.close()
  } catch {
    // ignore
  }
  if (owned) {
    try {
      await unlink(lockPath)
    } catch {
      // ignore — best-effort cleanup of OUR lock only
    }
  }
}

/**
 * Runs `fn` while holding the local manifest lock; releases it in a `finally`.
 *
 * @param {string} manifestPath
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
async function withManifestLock(manifestPath, fn) {
  const lockPath = phase0aManifestLockPath(manifestPath)
  const handle = await acquireManifestLock(lockPath)
  try {
    return await fn()
  } finally {
    await releaseManifestLock(lockPath, handle)
  }
}

/**
 * Loads the manifest from the output directory (FAIL-CLOSED: corrupt / read /
 * permission errors throw a blocking `ArqweliaProviderError`; only an ABSENT
 * manifest returns the default).
 *
 * @param {string} outDir
 * @returns {Promise<object>}
 */
export async function loadPhase0aManifest(outDir) {
  return loadManifestAt(phase0aManifestPath(outDir))
}

/**
 * Persists the manifest (atomic-ish temp + rename; write errors propagate).
 *
 * @param {string} outDir
 * @param {object} manifest
 */
export async function savePhase0aManifest(outDir, manifest) {
  await saveManifestAt(phase0aManifestPath(outDir), manifest)
}

/**
 * Phase 0A STRICT reservation — the ONLY entry point that checks the 4-call
 * limit and the idempotence key, and it happens BEFORE any transport is built
 * or any network is touched.
 *
 * Creates a `reserved` attempt. A `reserved` attempt provisionally occupies one
 * of the 4 slots (it counts toward the cap) until it is finalized;
 * `cancelled_before_call` is the ONLY outcome that releases the slot.
 *
 * Refuses (throws `ArqweliaProviderError`, billing `not_called`):
 *   - a 5th counting call (4 counting attempts already in the manifest),
 *   - a duplicate idempotence key unless `retry` is explicitly `true`,
 *   - a corrupt / unreadable manifest (fail-closed).
 *
 * @param {{ manifestPath: string, datasetItemId: string, concept: string, model: string, promptSha256: string, retry?: boolean }} opts
 * @returns {Promise<{ attemptId: string, idempotenceKey: string, calls: number }>}
 */
export async function reservePhase0aCall({
  manifestPath,
  datasetItemId,
  concept,
  model,
  promptSha256,
  retry = false,
}) {
  if (datasetItemId == null || datasetItemId === '') {
    throw new ArqweliaProviderError('Phase 0A call refused: no datasetItemId (controlled dataset id required)', NOT_CALLED)
  }
  if (concept !== 'A' && concept !== 'B') {
    throw new ArqweliaProviderError('Phase 0A call refused: invalid concept (must be A or B)', NOT_CALLED)
  }
  return withManifestLock(manifestPath, async () => {
    const manifest = await loadManifestAt(manifestPath)
    const counting = phase0aCountingCalls(manifest)
    if (counting.length >= PHASE0A_RETENTION_CONFIG.maximumCalls) {
      throw new ArqweliaProviderError(
        `Phase 0A call refused: maximum of ${PHASE0A_RETENTION_CONFIG.maximumCalls} calls reached`,
        NOT_CALLED,
      )
    }
    const idempotenceKey = phase0aIdempotenceKey({ datasetItemId, concept, model, promptSha256 })
    const duplicate = (manifest.calls || []).find((call) => call && call.idempotenceKey === idempotenceKey)
    if (duplicate && !retry) {
      throw new ArqweliaProviderError(
        'Phase 0A call refused: duplicate (same datasetItemId+concept+model+promptSha256) requires an explicit retry option',
        NOT_CALLED,
      )
    }
    const attemptId = randomBytes(12).toString('hex')
    manifest.calls.push({
      attemptId,
      idempotenceKey,
      datasetItemId,
      concept,
      model,
      promptSha256,
      status: 'reserved',
      reservedAt: new Date().toISOString(),
    })
    await saveManifestAt(manifestPath, manifest)
    return { attemptId, idempotenceKey, calls: counting.length }
  })
}

/**
 * Marks a reserved attempt `in_flight` immediately before the real fetch
 * invocation. From this point the attempt is definitively counted toward the
 * 4-call limit.
 *
 * @param {{ manifestPath: string, attemptId: string }} opts
 * @returns {Promise<object>}
 */
export async function markPhase0aCallStarted({ manifestPath, attemptId }) {
  return withManifestLock(manifestPath, async () => {
    const manifest = await loadManifestAt(manifestPath)
    const attempt = (manifest.calls || []).find((call) => call && call.attemptId === attemptId)
    if (!attempt) {
      throw new ArqweliaProviderError('Phase 0A call refused: unknown attemptId — refusing to proceed', NOT_CALLED)
    }
    attempt.status = 'in_flight'
    attempt.startedAt = new Date().toISOString()
    await saveManifestAt(manifestPath, manifest)
    return attempt
  })
}

/**
 * Sanitizes a request id for the manifest: only a short safe token survives.
 * It can never contain a key / Authorization header / prompt / photo / path.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
function sanitizeManifestRequestId(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.length > 200) return null
  if (!/^[A-Za-z0-9_\-:.]+$/.test(trimmed)) return null
  return trimmed
}

/**
 * Finalizes an attempt after the result. Billing fields are derived from the
 * outcome (single source of truth):
 *
 *   succeeded             → status='succeeded',            externalCalls=1, actualCostEur=null, billingStatus='unknown'
 *   failed                → status='failed',               externalCalls=1, actualCostEur=null, billingStatus='unknown'
 *   unknown               → status='unknown',              externalCalls=1, actualCostEur=null, billingStatus='unknown'
 *   cancelled_before_call → status='cancelled_before_call', externalCalls=0, actualCostEur=null, billingStatus='not_called'
 *
 * A failed call AFTER fetch (HTTP error / timeout / parse error / invalid
 * response / image-write failure) definitively consumes one of the four slots.
 * An error before any fetch (`cancelled_before_call`) releases the slot and
 * never reports a paid call.
 *
 * @param {{ manifestPath: string, attemptId: string, outcome: 'succeeded'|'failed'|'unknown'|'cancelled_before_call', requestId?: unknown }} opts
 * @returns {Promise<object>}
 */
export async function finalizePhase0aCall({ manifestPath, attemptId, outcome, requestId = null }) {
  const normalizedOutcome = ['succeeded', 'failed', 'unknown', 'cancelled_before_call'].includes(outcome)
    ? outcome
    : 'unknown'
  const billingByOutcome = {
    succeeded: { status: 'succeeded', externalCalls: 1, actualCostEur: null, billingStatus: 'unknown' },
    failed: { status: 'failed', externalCalls: 1, actualCostEur: null, billingStatus: 'unknown' },
    unknown: { status: 'unknown', externalCalls: 1, actualCostEur: null, billingStatus: 'unknown' },
    cancelled_before_call: {
      status: 'cancelled_before_call',
      externalCalls: 0,
      actualCostEur: null,
      billingStatus: 'not_called',
    },
  }
  const fields = billingByOutcome[normalizedOutcome]
  return withManifestLock(manifestPath, async () => {
    const manifest = await loadManifestAt(manifestPath)
    const attempt = (manifest.calls || []).find((call) => call && call.attemptId === attemptId)
    if (!attempt) {
      throw new ArqweliaProviderError('Phase 0A call refused: unknown attemptId — refusing to proceed', NOT_CALLED)
    }
    attempt.status = fields.status
    attempt.externalCalls = fields.externalCalls
    attempt.actualCostEur = fields.actualCostEur
    attempt.billingStatus = fields.billingStatus
    attempt.requestId = sanitizeManifestRequestId(requestId)
    attempt.completedAt = new Date().toISOString()
    await saveManifestAt(manifestPath, manifest)
    return attempt
  })
}

/**
 * STRICT counter + idempotence check, persisted in the manifest. Kept for
 * backward compatibility — the execute path now uses
 * `reservePhase0aCall` / `markPhase0aCallStarted` / `finalizePhase0aCall`.
 *
 * Refuses (throws `ArqweliaProviderError`, billing `not_called`):
 *   - a 5th counting call (manifest already has 4 counting records),
 *   - a duplicate idempotence key unless `retry` is explicitly `true`.
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
  const manifestPath = phase0aManifestPath(outDir)
  return withManifestLock(manifestPath, async () => {
    if (datasetItemId == null || datasetItemId === '') {
      throw new ArqweliaProviderError('Phase 0A call refused: no datasetItemId (controlled dataset id required)', NOT_CALLED)
    }
    if (concept !== 'A' && concept !== 'B') {
      throw new ArqweliaProviderError('Phase 0A call refused: invalid concept (must be A or B)', NOT_CALLED)
    }
    const manifest = await loadManifestAt(manifestPath)
    const counting = phase0aCountingCalls(manifest)
    if (counting.length >= PHASE0A_RETENTION_CONFIG.maximumCalls) {
      throw new ArqweliaProviderError(
        `Phase 0A call refused: maximum of ${PHASE0A_RETENTION_CONFIG.maximumCalls} calls reached`,
        NOT_CALLED,
      )
    }
    const idempotenceKey = phase0aIdempotenceKey({ datasetItemId, concept, model, promptSha256 })
    const duplicate = (manifest.calls || []).find((call) => call && call.idempotenceKey === idempotenceKey)
    if (duplicate && !retry) {
      throw new ArqweliaProviderError(
        'Phase 0A call refused: duplicate (same datasetItemId+concept+model+promptSha256) requires an explicit retry option',
        NOT_CALLED,
      )
    }
    return { allowed: true, idempotenceKey, calls: counting.length }
  })
}

/**
 * Records a Phase 0A call in the persisted manifest (one call per
 * photo+concept). Kept for backward compatibility — it is now implemented on
 * top of the atomic reserve → markStarted → finalize lifecycle.
 *
 * @param {{ outDir: string, datasetItemId: string, concept: string, model: string, promptSha256: string, status?: string }} opts
 * @returns {Promise<{ idempotenceKey: string, calls: number }>}
 */
export async function recordPhase0aCall({ outDir, datasetItemId, concept, model, promptSha256, status = 'succeeded' }) {
  const manifestPath = phase0aManifestPath(outDir)
  const idempotenceKey = phase0aIdempotenceKey({ datasetItemId, concept, model, promptSha256 })
  const { attemptId } = await reservePhase0aCall({
    manifestPath,
    datasetItemId,
    concept,
    model,
    promptSha256,
    retry: false,
  })
  await markPhase0aCallStarted({ manifestPath, attemptId })
  const outcome = status === 'executed' ? 'succeeded' : ['succeeded', 'failed', 'unknown', 'cancelled_before_call'].includes(status) ? status : 'succeeded'
  await finalizePhase0aCall({ manifestPath, attemptId, outcome })
  const manifest = await loadPhase0aManifest(outDir)
  return { idempotenceKey, calls: phase0aCountingCalls(manifest).length }
}

/**
 * Upserts the per-dataset-item retention record into the manifest. The dataset
 * authorization basis is EXPLICIT (`datasetKind` + `authorizationBasis`) and is
 * NEVER derived from ARQWELIA_BENCHMARK_AUTHORIZED (spend authorization).
 *
 * @param {{ outDir: string, datasetItemId: string, datasetKind: string, authorizationBasis: string, normalizedSha256: string, noExif?: boolean, noFacesDeclared?: boolean, noPlatesDeclared?: boolean, noHouseNumberDeclared?: boolean, noAddressDeclared?: boolean, noGps?: boolean, statusA?: string, statusB?: string }} opts
 * @returns {Promise<object>}
 */
export async function upsertPhase0aItem({
  outDir,
  datasetItemId,
  datasetKind,
  authorizationBasis,
  normalizedSha256,
  noExif = true,
  noFacesDeclared = true,
  noPlatesDeclared = true,
  noHouseNumberDeclared = true,
  noAddressDeclared = true,
  noGps = true,
  statusA = 'pending',
  statusB = 'pending',
}) {
  const manifestPath = phase0aManifestPath(outDir)
  return withManifestLock(manifestPath, async () => {
    const manifest = await loadManifestAt(manifestPath)
    const record = {
      datasetItemId,
      datasetKind,
      authorizationBasis,
      normalizedSha256,
      noExif: noExif === true,
      noFacesDeclared: noFacesDeclared === true,
      noPlatesDeclared: noPlatesDeclared === true,
      noHouseNumberDeclared: noHouseNumberDeclared === true,
      noAddressDeclared: noAddressDeclared === true,
      noGps: noGps === true,
      date: new Date().toISOString(),
      statusA,
      statusB,
    }
    manifest.items[String(datasetItemId)] = record
    await saveManifestAt(manifestPath, manifest)
    return record
  })
}
