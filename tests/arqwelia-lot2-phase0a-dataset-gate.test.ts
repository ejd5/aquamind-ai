/**
 * ARQWELIA Lot 2 Phase 0A — EXPLICIT DATASET ID GATE.
 *
 * This suite proves the explicit-dataset-id correction end to end:
 *
 *   A. three gates open + fake key + image + --dataset-kind synthetic but
 *      WITHOUT --dataset-id → refusal BEFORE upsert: no manifest item, no
 *      reservation, no transport, no fetch; externalCalls=0 / not_called.
 *   B. three gates open + --dataset-id + image + --dataset-kind synthetic but
 *      WITHOUT OPENAI_API_KEY → refusal BEFORE upsert and reserve: no manifest
 *      item, no call, not_called. A missing key is NEVER turned into a
 *      reserved / cancelled_before_call attempt.
 *   C. dry-run with an image but no --dataset-id → `reportDatasetItemId` may be
 *      the truncated hash (technical report id only); NO manifest item and NO
 *      reservation is written.
 *   D. execution (dry-run manifest + reserve + idempotence) uses EXACTLY the
 *      CLI `--dataset-id` value — never the truncated-hash fallback.
 *   STATIC. the execution control depends on `explicitDatasetItemId`
 *      (`args.datasetId`), NOT `reportDatasetItemId`; upsert/reserve pass
 *      `explicitDatasetItemId`, and `reportDatasetItemId` is used only for the
 *      report.
 *
 * NO REAL OPENAI CALL IS MADE HERE: the global `fetch` spy is never invoked.
 * All execution-path CLI runs pass an EXPLICIT empty OPENAI_API_KEY (and the
 * allowlisted default base URL) so a parent-environment key can never leak into
 * a child process, and every refusal happens strictly BEFORE any transport /
 * network code path.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { normalizeImageForAi } from '../src/lib/images/secure-image'
import { buildDefaultArqweliaPrompt } from '../scripts/lib/arqwelia-benchmark/prompts/index'
import {
  OPENAI_PHASE0A_DEFAULT_MODEL,
} from '../scripts/lib/arqwelia-benchmark/adapters/openai-image-adapter.mjs'
import {
  PHASE0A_MANIFEST_FILENAME,
  phase0aIdempotenceKey,
  phase0aManifestPath,
  reservePhase0aCall,
} from '../scripts/lib/arqwelia-benchmark/phase0a-manifest.mjs'

const CLI = join(process.cwd(), 'scripts/benchmark-arqwelia-smoke.mjs')
// Default child env: NO authorization locks (dry run) and an explicitly empty
// key so a parent-environment key can never leak into a child process.
const SAFE_ENV = {
  OPENAI_API_KEY: '',
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
}
const OPEN_LOCKS_ENV = {
  ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
  ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '2',
  ARQWELIA_BENCHMARK_PHASE0A_EXECUTE: 'true',
}

function runCli(args: string[], env: Record<string, string | undefined> = {}) {
  return spawnSync('bun', [CLI, ...args], {
    env: { ...process.env, ...SAFE_ENV, ...env },
    encoding: 'utf8',
  })
}

function tmpOut(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

function latestReportJson(out: string): { path: string; data: any } {
  const files = readdirSync(out).filter((file) => file.endsWith('.json') && !file.startsWith('phase0a-manifest'))
  const path = join(out, files[files.length - 1])
  return { path, data: JSON.parse(readFileSync(path, 'utf8')) }
}

async function writeSourceJpeg(out: string): Promise<string> {
  mkdirSync(out, { recursive: true })
  const imagePath = join(out, 'source.jpg')
  const jpeg = await sharp({
    create: { width: 320, height: 240, channels: 3, background: { r: 40, g: 120, b: 200 } },
  })
    .jpeg()
    .toBuffer()
  writeFileSync(imagePath, jpeg)
  return imagePath
}

let fetchSpy: ReturnType<typeof vi.fn>

beforeAll(() => {
  fetchSpy = vi.fn((..._args: unknown[]) => {
    throw new Error('NETWORK CALL DETECTED IN DATASET-GATE TESTS')
  })
  vi.stubGlobal('fetch', fetchSpy)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('Phase 0A explicit dataset-id gate — execution prerequisites BEFORE any manifest mutation', () => {
  it('A. three gates open + fake key + image + synthetic but WITHOUT --dataset-id → refusal BEFORE upsert (no item/reservation/transport/fetch)', async () => {
    const src = tmpOut('aqw-gate-a-src-')
    const imagePath = await writeSourceJpeg(src)
    const out = tmpOut('aqw-gate-a-')
    const result = runCli(
      ['--provider', 'openai-gpt-image', '--image', imagePath, '--out', out, '--concept', 'A', '--dataset-kind', 'synthetic'],
      { ...OPEN_LOCKS_ENV, OPENAI_API_KEY: 'sk-fake-gate-a' },
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('--dataset-id <controlled> is required when executeAuthorized')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')

    // Refusal BEFORE upsert: the manifest must not even exist, and no
    // reservation may be recorded.
    const manifestPath = join(out, PHASE0A_MANIFEST_FILENAME)
    expect(existsSync(manifestPath)).toBe(false)

    const report = latestReportJson(out).data
    // In execution the report NEVER falls back to a truncated hash — a
    // normalized image can never satisfy --dataset-id.
    expect(report.image.datasetItemId).toBeNull()
    expect(report.result.externalCalls).toBe(0)
    expect(report.result.actualCostEur).toBe(0)
    expect(report.result.billingStatus).toBe('not_called')
    expect(report.result.requestId).toBeNull()
    expect(report.realProviderCalls).toBe(0)
    expect(report.paidCostEur).toBe(0)
    // No secret ever reaches stdout.
    expect(result.stdout).not.toContain('sk-fake-gate-a')
  })

  it('B. three gates open + --dataset-id + image + synthetic but WITHOUT OPENAI_API_KEY → refusal BEFORE upsert and reserve (no item, no call)', async () => {
    const src = tmpOut('aqw-gate-b-src-')
    const imagePath = await writeSourceJpeg(src)
    const out = tmpOut('aqw-gate-b-')
    const result = runCli(
      ['--provider', 'openai-gpt-image', '--image', imagePath, '--out', out, '--concept', 'A', '--dataset-id', 'item001', '--dataset-kind', 'synthetic'],
      OPEN_LOCKS_ENV,
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('OPENAI_API_KEY is required when executeAuthorized')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')

    // Refusal BEFORE upsert AND reserve: the manifest must not even exist, and
    // no reserved / in_flight / cancelled_before_call attempt may be recorded.
    const manifestPath = join(out, PHASE0A_MANIFEST_FILENAME)
    expect(existsSync(manifestPath)).toBe(false)

    const report = latestReportJson(out).data
    // The explicit id is still reported, but with ZERO calls and no request id.
    expect(report.image.datasetItemId).toBe('item001')
    expect(report.result.externalCalls).toBe(0)
    expect(report.result.actualCostEur).toBe(0)
    expect(report.result.billingStatus).toBe('not_called')
    expect(report.result.requestId).toBeNull()
    expect(report.realProviderCalls).toBe(0)
    expect(report.paidCostEur).toBe(0)
  })
})

describe('Phase 0A explicit dataset-id gate — dry-run technical report id vs manifest', () => {
  it('C. dry-run with an image but NO --dataset-id → report id may be the truncated hash; NO manifest item, NO reservation', async () => {
    const src = tmpOut('aqw-gate-c-src-')
    const imagePath = await writeSourceJpeg(src)
    const out = tmpOut('aqw-gate-c-')
    const result = runCli(
      ['--provider', 'openai-gpt-image', '--image', imagePath, '--out', out, '--concept', 'A', '--dataset-kind', 'synthetic'],
      {},
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('DRY RUN — NO EXTERNAL CALL')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')

    // Recompute the EXACT truncated hash the CLI would derive from the same
    // normalization pipeline.
    const sourceBuffer = readFileSync(imagePath)
    const normalized = await normalizeImageForAi(`data:image/jpeg;base64,${sourceBuffer.toString('base64')}`)
    const expectedHash = normalized.sha256.slice(0, 16)

    const report = latestReportJson(out).data
    expect(report.dryRun).toBe(true)
    // The truncated hash may appear ONLY as a technical report id in a dry run.
    expect(report.image.datasetItemId).toBe(expectedHash)
    expect(report.image.datasetItemId).not.toBeNull()

    // It is NEVER written into the manifest as an authorized datasetItemId —
    // no item and no reservation may exist.
    const manifestPath = join(out, PHASE0A_MANIFEST_FILENAME)
    expect(existsSync(manifestPath)).toBe(false)
  })

  it('D. dry-run with explicit --dataset-id → manifest item id is EXACTLY the CLI value, never the hash fallback', async () => {
    const src = tmpOut('aqw-gate-d-src-')
    const imagePath = await writeSourceJpeg(src)
    const out = tmpOut('aqw-gate-d-')
    const result = runCli(
      ['--provider', 'openai-gpt-image', '--image', imagePath, '--out', out, '--concept', 'A', '--dataset-id', 'item001', '--dataset-kind', 'synthetic'],
      {},
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('DRY RUN — NO EXTERNAL CALL')

    const manifest = JSON.parse(readFileSync(join(out, PHASE0A_MANIFEST_FILENAME), 'utf8'))
    expect(Object.keys(manifest.items)).toEqual(['item001'])
    expect(manifest.items.item001.datasetItemId).toBe('item001')
    expect(manifest.items.item001.datasetKind).toBe('synthetic')
    expect(manifest.items.item001.authorizationBasis).toBe('synthetic')
    // No reservation may be recorded in a dry run.
    expect(manifest.calls).toEqual([])

    const report = latestReportJson(out).data
    expect(report.image.datasetItemId).toBe('item001')
    expect(report.image.datasetItemId).not.toMatch(/^[a-f0-9]{16}$/)
  })

  it('D2. reserve idempotence uses EXACTLY the explicit dataset-item id (never the hash fallback)', async () => {
    const out = tmpOut('aqw-gate-d2-')
    const manifestPath = phase0aManifestPath(out)
    const prompt = buildDefaultArqweliaPrompt('A')
    const { attemptId } = await reservePhase0aCall({
      manifestPath,
      datasetItemId: 'item001',
      concept: prompt.concept,
      model: OPENAI_PHASE0A_DEFAULT_MODEL,
      promptSha256: prompt.promptSha256,
    })
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    expect(manifest.calls).toHaveLength(1)
    expect(manifest.calls[0].attemptId).toBe(attemptId)
    expect(manifest.calls[0].datasetItemId).toBe('item001')
    expect(manifest.calls[0].idempotenceKey).toBe(
      phase0aIdempotenceKey({
        datasetItemId: 'item001',
        concept: prompt.concept,
        model: OPENAI_PHASE0A_DEFAULT_MODEL,
        promptSha256: prompt.promptSha256,
      }),
    )
    // A truncated-hash id can never substitute for the explicit id: it would
    // produce a different idempotence key, so it can never collide with or
    // unlock the explicit-id call.
    const hashFallbackKey = phase0aIdempotenceKey({
      datasetItemId: 'a'.repeat(16),
      concept: prompt.concept,
      model: OPENAI_PHASE0A_DEFAULT_MODEL,
      promptSha256: prompt.promptSha256,
    })
    expect(manifest.calls[0].idempotenceKey).not.toBe(hashFallbackKey)
    // Idempotence is honored for the explicit id: a duplicate is refused.
    await expect(
      reservePhase0aCall({
        manifestPath,
        datasetItemId: 'item001',
        concept: prompt.concept,
        model: OPENAI_PHASE0A_DEFAULT_MODEL,
        promptSha256: prompt.promptSha256,
      }),
    ).rejects.toThrow(/duplicate/)
  })
})

describe('Phase 0A explicit dataset-id gate — STATIC proof of the execution control', () => {
  it('STATIC: execution depends on explicitDatasetItemId (args.datasetId), NOT reportDatasetItemId', () => {
    const source = readFileSync(CLI, 'utf8')
    // The split: explicit id comes ONLY from args.datasetId; the report id may
    // fall back to the hash ONLY in a dry run.
    expect(source).toContain('const explicitDatasetItemId = args.datasetId')
    expect(source).toContain('const reportDatasetItemId = explicitDatasetItemId ?? (dryRun && normalized ? normalized.sha256.slice(0, 16) : null)')

    const count = (needle: string): number => source.split(needle).length - 1
    // upsert + reserve are the ONLY manifest-mutating call sites and BOTH must
    // pass the explicit id.
    expect(count('datasetItemId: explicitDatasetItemId')).toBe(2)
    // The report is the ONLY place that uses reportDatasetItemId as the dataset
    // item id — it can never reach upsert / reserve / idempotence / execution.
    expect(count('datasetItemId: reportDatasetItemId')).toBe(1)
  })
})

describe('Phase 0A explicit dataset-id gate — zero real network', () => {
  it('the global fetch spy was NEVER invoked across the whole suite', () => {
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
