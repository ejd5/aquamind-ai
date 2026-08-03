/**
 * ARQWELIA Lot 2 Phase 0A — EXECUTION SAFETY.
 *
 * This suite is the MANDATORY full-integration + fail-closed proof for the
 * Phase 0A execution-safety corrections:
 *
 *   1.  full integration: runSmoke → real transport → prepareMultipartBody →
 *       injected fetchImpl mock → parseOpenAiImageEditResponse → PNG written;
 *   2.  canonical transport contract (normalized fields, never a multipart
 *       descriptor, no shape auto-detection);
 *   3.  dry-run never constructs the transport / never reads the key;
 *   4.  third lock absent → transport not constructed;
 *   5-7. after-fetch failures (HTTP 500 / timeout / invalid response) count a
 *       slot in the persisted manifest;
 *   8.  error before any fetch → `cancelled_before_call`, never counted;
 *   9-11. FAIL-CLOSED manifest (absent → create; corrupt → block; write error
 *       → block before fetch);
 *   12. local-lock concurrency: ≥8 parallel reservations → EXACTLY 4 succeed
 *       (reserved occupies capacity — a 5th can never be recorded);
 *   13. duplicate idempotence key refused without explicit retry;
 *   14-16. dataset authorization: ONLY an EXPLICIT `--dataset-kind synthetic`
 *       is accepted, an absent declaration is NEVER recorded as synthetic, and
 *       the authorization basis is NEVER derived from envAuthorized;
 *   17-18. coherent response limits (5 MB < JSON ≤ 48 MB accepted when valid;
 *       JSON > 48 MB rejected; decoded image > 32 MB rejected);
 *   19. ZERO real network: the global `fetch` spy is never invoked — the mock
 *       is passed as `fetchImpl`, never by stubbing the global.
 *   20. no personal data / secrets / paths / photos in reports or the manifest.
 *
 * NO REAL OPENAI CALL IS MADE HERE: every transport uses an injected
 * `fetchImpl` mock and the global `fetch` stays at ZERO across the suite.
 */

import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  ArqweliaProviderError,
  billingFromCaughtError,
} from '../scripts/lib/arqwelia-benchmark/provider'
import {
  assertNoPersonalData,
  buildDefaultArqweliaPrompt,
} from '../scripts/lib/arqwelia-benchmark/prompts/index'
import {
  OPENAI_DEFAULT_BASE_URL,
  OPENAI_MAX_DECODED_IMAGE_BYTES,
  OPENAI_MAX_RESPONSE_BODY_BYTES,
  OPENAI_PHASE0A_DEFAULT_MODEL,
  OPENAI_PHASE0A_DEFAULT_OUTPUT_FORMAT,
  OPENAI_PHASE0A_DEFAULT_QUALITY,
  OPENAI_PHASE0A_DEFAULT_SIZE,
  createOpenAiImageEditTransport,
  openaiImageAdapter,
  sanitizeOpenAiRequestId,
} from '../scripts/lib/arqwelia-benchmark/adapters/openai-image-adapter.mjs'
import {
  PHASE0A_MANIFEST_FILENAME,
  PHASE0A_RETENTION_CONFIG,
  finalizePhase0aCall,
  markPhase0aCallStarted,
  phase0aCountingCalls,
  phase0aManifestPath,
  reservePhase0aCall,
  upsertPhase0aItem,
} from '../scripts/lib/arqwelia-benchmark/phase0a-manifest.mjs'

const CLI = join(process.cwd(), 'scripts/benchmark-arqwelia-smoke.mjs')

function runCli(args: string[], env: Record<string, string | undefined> = {}) {
  return spawnSync('bun', [CLI, ...args], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  })
}

function tmpOut(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

async function validPng(width = 32, height = 32): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 20, g: 180, b: 90 } },
  })
    .png()
    .toBuffer()
}

function baseOptions(overrides: Record<string, unknown> = {}) {
  return {
    providerId: 'openai-gpt-image',
    model: OPENAI_PHASE0A_DEFAULT_MODEL,
    outDir: tmpOut('aqw-exec-'),
    budgetMaxEur: 2,
    realCallAuthorized: true,
    phase0aExecute: true,
    ...overrides,
  }
}

function openLocks() {
  return { authorized: true, budgetMaxEur: 2, phase0aExecute: true }
}

/** One-shot manifest scaffold used by the accounting tests. */
async function scaffoldReservedAttempt(outDir: string) {
  const manifestPath = phase0aManifestPath(outDir)
  const prompt = buildDefaultArqweliaPrompt('A')
  const attempt = await reservePhase0aCall({
    manifestPath,
    datasetItemId: 'item001',
    concept: prompt.concept,
    model: OPENAI_PHASE0A_DEFAULT_MODEL,
    promptSha256: prompt.promptSha256,
  })
  return { manifestPath, attemptId: attempt.attemptId, prompt }
}

let fetchSpy: ReturnType<typeof vi.fn>

beforeAll(() => {
  fetchSpy = vi.fn((..._args: unknown[]) => {
    throw new Error('NETWORK CALL DETECTED IN EXECUTION-SAFETY TESTS')
  })
  vi.stubGlobal('fetch', fetchSpy)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('Phase 0A execution safety — full integration (runSmoke → transport → mock fetch → image)', () => {
  it('REALLY runs openaiImageAdapter.runSmoke with the real transport and an injected fetch mock', async () => {
    const png = await validPng(120, 80)
    const prompt = buildDefaultArqweliaPrompt('A').prompt
    const out = tmpOut('aqw-exec-int-')
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-request-id': 'req_exec_test_1' },
      })
    })
    const transport = createOpenAiImageEditTransport({
      apiKey: 'sk-fake',
      baseUrl: 'https://api.openai.com/v1',
      fetchImpl: fetchMock,
      locks: openLocks(),
    })
    const result = await openaiImageAdapter.runSmoke({
      ...baseOptions({ builtPrompt: prompt, outDir: out }),
      normalizedImageBuffer: png,
      transport,
    })
    expect(result.ok).toBe(true)
    expect(result.externalCalls).toBe(1)
    expect(result.actualCostEur).toBeNull()
    expect(result.billingStatus).toBe('unknown')
    expect(result.outputWidth).toBe(120)
    expect(result.outputHeight).toBe(80)
    expect(result.requestId).toBe('req_exec_test_1')
    expect(typeof result.externalCallStarted).toBe('number')
    expect(typeof result.responseReceived).toBe('number')
    const written = readFileSync(result.outputPath!)
    expect(written.equals(png)).toBe(true)

    // The mock fetch received the CORRECT endpoint / headers / multipart body.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.openai.com/v1/images/edits')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer sk-fake')
    expect(init.body).toBeInstanceOf(FormData)
    const form = init.body as FormData
    expect(form.has('image')).toBe(true)
    const imagePart = form.get('image') as File
    const imageBytes = new Uint8Array(await imagePart.arrayBuffer())
    expect(Buffer.from(imageBytes).equals(png)).toBe(true)
    expect(form.get('prompt')).toBe(prompt)
    expect(form.get('model')).toBe('gpt-image-2')
    expect(form.get('size')).toBe('1536x1024')
    expect(form.get('quality')).toBe('medium')
    expect(form.get('output_format')).toBe('png')
    // The body is the FormData, NOT the multipart descriptor.
    expect((init.body as unknown as { parts?: unknown }).parts).toBeUndefined()
    expect((init.body as unknown as { toFormData?: unknown }).toFormData).toBeUndefined()
    // No imagePath property and no raw non-normalized photo reach the wire.
    expect(Object.prototype.hasOwnProperty.call(form, 'imagePath')).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('Phase 0A execution safety — canonical transport contract', () => {
  it('runSmoke forwards normalized fields, never a pre-computed multipart descriptor', async () => {
    const png = await validPng(32, 32)
    const prompt = buildDefaultArqweliaPrompt('B').prompt
    let received: unknown
    const transport = async (request: unknown) => {
      received = request
      return { buffer: png, width: 32, height: 32, mimeType: 'image/png' }
    }
    const result = await openaiImageAdapter.runSmoke({
      ...baseOptions({ builtPrompt: prompt }),
      normalizedImageBuffer: png,
      size: OPENAI_PHASE0A_DEFAULT_SIZE,
      quality: OPENAI_PHASE0A_DEFAULT_QUALITY,
      outputFormat: OPENAI_PHASE0A_DEFAULT_OUTPUT_FORMAT,
      transport,
    })
    expect(result.ok).toBe(true)
    const req = received as Record<string, unknown>
    expect(req.normalizedImageBuffer).toBe(png)
    expect(req.builtPrompt).toBe(prompt)
    expect(req.model).toBe(OPENAI_PHASE0A_DEFAULT_MODEL)
    expect(req.size).toBe(OPENAI_PHASE0A_DEFAULT_SIZE)
    expect(req.quality).toBe(OPENAI_PHASE0A_DEFAULT_QUALITY)
    expect(req.outputFormat).toBe(OPENAI_PHASE0A_DEFAULT_OUTPUT_FORMAT)
    expect(req.parts).toBeUndefined()
    expect(req.toFormData).toBeUndefined()
    expect(req.method).toBeUndefined()
    expect(req.endpoint).toBeUndefined()
  })

  it('runSmoke rejects a transport result that is not the canonical parsed shape (no auto-detection)', async () => {
    const png = await validPng()
    const prompt = buildDefaultArqweliaPrompt('A').prompt
    const err = await openaiImageAdapter
      .runSmoke({
        ...baseOptions({ builtPrompt: prompt }),
        normalizedImageBuffer: png,
        transport: async () => ({ data: [{ b64_json: png.toString('base64') }] }), // OLD non-canonical shape
      })
      .catch((error: unknown) => error)
    expect(err).toBeInstanceOf(ArqweliaProviderError)
    expect(String(err instanceof Error ? err.message : err)).toMatch(/invalid result/)
    const billing = billingFromCaughtError(err)
    expect(billing).toMatchObject({ externalCalls: 1, billingStatus: 'unknown' })
  })
})

describe('Phase 0A execution safety — transport is NEVER constructed in a dry run', () => {
  it('CLI dry-run with OPENAI_API_KEY present: no key read, no transport, no network, not_called/0/0', async () => {
    const srcDir = tmpOut('aqw-exec-dry-src-')
    const imagePath = join(srcDir, 'source.jpg')
    const jpeg = await sharp({
      create: { width: 320, height: 240, channels: 3, background: { r: 90, g: 40, b: 160 } },
    })
      .jpeg()
      .toBuffer()
    writeFileSync(imagePath, jpeg)
    const out = tmpOut('aqw-exec-dry-')
    const result = runCli(
      ['--provider', 'openai-gpt-image', '--image', imagePath, '--out', out, '--concept', 'A', '--dataset-id', 'item001', '--dataset-kind', 'synthetic'],
      { OPENAI_API_KEY: 'sk-fake-never-read' },
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('mode=dry-run')
    expect(result.stdout).toContain('DRY RUN — NO EXTERNAL CALL')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')
    // The manifest has NO reserved/in_flight attempts → no transport path was
    // entered, no network happened, and no report claims a requestId.
    const manifest = JSON.parse(readFileSync(join(out, PHASE0A_MANIFEST_FILENAME), 'utf8'))
    expect(manifest.calls).toEqual([])
    const reportJson = readdirSync(out).filter((file) => file.endsWith('.json') && !file.startsWith('phase0a-manifest'))
    expect(reportJson.length).toBeGreaterThan(0)
    const report = JSON.parse(readFileSync(join(out, reportJson[reportJson.length - 1]), 'utf8'))
    const r = report.result as { externalCalls: number; billingStatus: string; requestId: unknown }
    expect(r.externalCalls).toBe(0)
    expect(r.billingStatus).toBe('not_called')
    expect(r.requestId).toBeNull()
    expect(report.paidCostEur).toBe(0)
    // No output PNG is produced for the openai provider in a dry run.
    expect(readdirSync(out).filter((file) => file.endsWith('.png'))).toHaveLength(0)
    expect(result.stdout).not.toContain('sk-fake-never-read')
  })

  it('createOpenAiImageEditTransport refuses to construct when the third lock (phase0aExecute) is absent', () => {
    expect(() =>
      createOpenAiImageEditTransport({
        apiKey: 'sk-fake',
        baseUrl: 'https://api.openai.com/v1',
        fetchImpl: async () => {
          throw new Error('MUST NOT BE CALLED')
        },
        locks: { authorized: true, budgetMaxEur: 2, phase0aExecute: false },
      }),
    ).toThrow(/Phase 0A/)
    expect(() =>
      createOpenAiImageEditTransport({
        apiKey: 'sk-fake',
        baseUrl: 'https://api.openai.com/v1',
        fetchImpl: async () => {
          throw new Error('MUST NOT BE CALLED')
        },
        locks: { authorized: false, budgetMaxEur: 2, phase0aExecute: true },
      }),
    ).toThrow(/authorization/)
  })
})

describe('Phase 0A execution safety — after-fetch failures consume a slot', () => {
  async function runAfterFetchFailure(
    fetchMock: (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>,
  ) {
    const png = await validPng()
    const out = tmpOut('aqw-exec-fail-')
    const { manifestPath, attemptId, prompt } = await scaffoldReservedAttempt(out)
    await markPhase0aCallStarted({ manifestPath, attemptId })
    const transport = createOpenAiImageEditTransport({
      apiKey: 'sk-fake',
      baseUrl: 'https://api.openai.com/v1',
      fetchImpl: fetchMock,
      locks: openLocks(),
    })
    const error = await openaiImageAdapter
      .runSmoke({
        ...baseOptions({ builtPrompt: prompt.prompt, outDir: out }),
        normalizedImageBuffer: png,
        transport,
      })
      .catch((e: unknown) => e)
    const billing = billingFromCaughtError(error)
    expect(billing.externalCalls).toBe(1)
    expect(billing.billingStatus).toBe('unknown')
    await finalizePhase0aCall({ manifestPath, attemptId, outcome: 'failed' })
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const attempt = manifest.calls.find((c: { attemptId: string }) => c.attemptId === attemptId)
    expect(attempt.status).toBe('failed')
    expect(attempt.externalCalls).toBe(1)
    expect(attempt.billingStatus).toBe('unknown')
    expect(phase0aCountingCalls(manifest)).toHaveLength(1)
    return { manifestPath, error }
  }

  it('HTTP 500 after fetch → attempt counted (failed)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: 'boom' }), { status: 500 }))
    const { error } = await runAfterFetchFailure(fetchMock)
    expect(String(error instanceof Error ? error.message : error)).toMatch(/HTTP 500/)
  })

  it('timeout after fetch → attempt counted (failed)', async () => {
    const fetchMock = vi.fn(async (): Promise<Response> => {
      const [, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as unknown as [
        string,
        RequestInit,
      ]
      await new Promise<void>((_resolve, reject) => {
        const signal = init.signal as AbortSignal
        if (signal.aborted) reject(signal.reason ?? new Error('aborted'))
        signal.addEventListener('abort', () => reject(signal.reason ?? new Error('aborted')), { once: true })
      })
      throw new Error('unreachable — the abort signal always rejects first')
    })
    const transport = createOpenAiImageEditTransport({
      apiKey: 'sk-fake',
      baseUrl: 'https://api.openai.com/v1',
      fetchImpl: fetchMock,
      timeoutMs: 60,
      locks: openLocks(),
    })
    const png = await validPng()
    const out = tmpOut('aqw-exec-timeout-')
    const { manifestPath, attemptId, prompt } = await scaffoldReservedAttempt(out)
    await markPhase0aCallStarted({ manifestPath, attemptId })
    const error = await openaiImageAdapter
      .runSmoke({ ...baseOptions({ builtPrompt: prompt.prompt, outDir: out }), normalizedImageBuffer: png, transport })
      .catch((e: unknown) => e)
    const billing = billingFromCaughtError(error)
    expect(billing.externalCalls).toBe(1)
    await finalizePhase0aCall({ manifestPath, attemptId, outcome: 'failed' })
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const attempt = manifest.calls.find((c: { attemptId: string }) => c.attemptId === attemptId)
    expect(attempt.status).toBe('failed')
    expect(attempt.externalCalls).toBe(1)
    expect(phase0aCountingCalls(manifest)).toHaveLength(1)
  })

  it('invalid response after fetch → attempt counted (failed)', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ b64_json: '%%%not-base64%%%' }] }), { status: 200 }),
    )
    const { error } = await runAfterFetchFailure(fetchMock)
    expect(String(error instanceof Error ? error.message : error)).toMatch(/invalid base64/)
  })

  it('error BEFORE any fetch → cancelled_before_call, never counted as a call', async () => {
    const out = tmpOut('aqw-exec-before-')
    const { manifestPath, attemptId, prompt } = await scaffoldReservedAttempt(out)
    await markPhase0aCallStarted({ manifestPath, attemptId })
    // Default (NOT IMPLEMENTED) transport — an error thrown before any fetch.
    const error = await openaiImageAdapter
      .runSmoke({
        ...baseOptions({ builtPrompt: prompt.prompt, outDir: out }),
        normalizedImageBuffer: await validPng(),
      })
      .catch((e: unknown) => e)
    expect(String(error instanceof Error ? error.message : error)).toMatch(/NOT IMPLEMENTED/)
    const billing = billingFromCaughtError(error)
    expect(billing.externalCalls).toBe(0)
    expect(billing.billingStatus).toBe('not_called')
    await finalizePhase0aCall({ manifestPath, attemptId, outcome: 'cancelled_before_call' })
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const attempt = manifest.calls.find((c: { attemptId: string }) => c.attemptId === attemptId)
    expect(attempt.status).toBe('cancelled_before_call')
    expect(attempt.externalCalls).toBe(0)
    expect(attempt.billingStatus).toBe('not_called')
    expect(phase0aCountingCalls(manifest)).toHaveLength(0)
  })
})

describe('Phase 0A execution safety — FAIL-CLOSED manifest', () => {
  it('manifest ABSENT → creation allowed (reserved attempt is persisted)', async () => {
    const out = tmpOut('aqw-exec-absent-')
    const manifestPath = phase0aManifestPath(out)
    const { attemptId, prompt } = await scaffoldReservedAttempt(out)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    expect(manifest.calls).toHaveLength(1)
    expect(manifest.calls[0].status).toBe('reserved')
    expect(manifest.calls[0].attemptId).toBe(attemptId)
    expect(manifest.calls[0].idempotenceKey).toMatch(/^[a-f0-9]{64}$/)
  })

  it('COMPLETELY NONEXISTENT nested out path → dir auto-created, lock acquired, manifest created+valid, lock removed', async () => {
    // A brand-new nested path with NONE of the folders pre-created: the lock's
    // parent must be created before open(lockPath, 'wx') so the very first
    // reservation works. A random base guarantees the path is genuinely new.
    const manifestPath = join(
      tmpdir(),
      `aqw-new-parent-${randomBytes(6).toString('hex')}`,
      'new-benchmark-out',
      PHASE0A_MANIFEST_FILENAME,
    )
    expect(existsSync(dirname(manifestPath))).toBe(false)
    const attempt = await reservePhase0aCall({
      manifestPath,
      datasetItemId: 'item001',
      concept: 'A',
      model: OPENAI_PHASE0A_DEFAULT_MODEL,
      promptSha256: 'a'.repeat(64),
    })
    expect(attempt).toBeDefined()
    expect(existsSync(dirname(manifestPath))).toBe(true)
    // Lock file is created during the reservation and removed at the end.
    const lockPath = join(dirname(manifestPath), 'phase0a-manifest.lock')
    expect(existsSync(lockPath)).toBe(false)
    // Manifest is created and valid JSON with exactly one reserved attempt.
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    expect(manifest.calls).toHaveLength(1)
    expect(manifest.calls[0].status).toBe('reserved')
    expect(manifest.calls[0].attemptId).toBe(attempt.attemptId)
  })

  it('manifest CORRUPT → blocking error (no silent empty manifest, no transport)', async () => {
    const out = tmpOut('aqw-exec-corrupt-')
    const manifestPath = phase0aManifestPath(out)
    mkdirSync(out, { recursive: true })
    writeFileSync(manifestPath, '{ not valid json !!!', 'utf8')
    await expect(
      reservePhase0aCall({
        manifestPath,
        datasetItemId: 'item001',
        concept: 'A',
        model: OPENAI_PHASE0A_DEFAULT_MODEL,
        promptSha256: 'a'.repeat(64),
      }),
    ).rejects.toThrow(/corrupted|refusing/)
    const err = await reservePhase0aCall({
      manifestPath,
      datasetItemId: 'item001',
      concept: 'A',
      model: OPENAI_PHASE0A_DEFAULT_MODEL,
      promptSha256: 'a'.repeat(64),
    }).catch((e: unknown) => e)
    const billing = billingFromCaughtError(err)
    expect(billing).toMatchObject({ externalCalls: 0, billingStatus: 'not_called' })
  })

  it('CLI: a corrupt manifest in executeAuthorized FAILS CLOSED (exit != 0, no report written)', async () => {
    const srcDir = tmpOut('aqw-exec-corrupt-src-')
    const imagePath = join(srcDir, 'source.jpg')
    const jpeg = await sharp({
      create: { width: 200, height: 160, channels: 3, background: { r: 9, g: 90, b: 30 } },
    })
      .jpeg()
      .toBuffer()
    writeFileSync(imagePath, jpeg)
    const out = tmpOut('aqw-exec-corrupt-out-')
    writeFileSync(join(out, PHASE0A_MANIFEST_FILENAME), '{corrupt', 'utf8')
    const result = runCli(
      ['--provider', 'openai-gpt-image', '--image', imagePath, '--out', out, '--concept', 'A', '--dataset-id', 'item001', '--dataset-kind', 'synthetic'],
      {
        ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
        ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '2',
        ARQWELIA_BENCHMARK_PHASE0A_EXECUTE: 'true',
      },
    )
    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/refusing/i)
  })

  it('write error → blocking BEFORE any transport (reserve rejects)', async () => {
    const out = tmpOut('aqw-exec-writeerr-')
    mkdirSync(out, { recursive: true })
    const manifestPath = phase0aManifestPath(out)
    chmodSync(out, 0o500) // no write permission
    try {
      await expect(
        reservePhase0aCall({
          manifestPath,
          datasetItemId: 'item001',
          concept: 'A',
          model: OPENAI_PHASE0A_DEFAULT_MODEL,
          promptSha256: 'a'.repeat(64),
        }),
      ).rejects.toThrow(ArqweliaProviderError)
    } finally {
      chmodSync(out, 0o700)
    }
  })
})

describe('Phase 0A execution safety — local lock + concurrency', () => {
  it('8 concurrent reservations → EXACTLY 4 succeed, the other 4 refuse, final manifest holds exactly four reserved attempts and valid JSON', async () => {
    const out = tmpOut('aqw-exec-concurrency-')
    const manifestPath = phase0aManifestPath(out)
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        reservePhase0aCall({
          manifestPath,
          datasetItemId: `item${i}`,
          concept: i % 2 === 0 ? 'A' : 'B',
          model: OPENAI_PHASE0A_DEFAULT_MODEL,
          promptSha256: `${i}`.repeat(64),
        }),
      ),
    )
    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    // `reserved` PROVISIONALLY occupies a slot and counts toward the 4-call cap,
    // so 8 concurrent reservations must yield EXACTLY 4 successes (never 1-4).
    expect(fulfilled.length).toBe(PHASE0A_RETENTION_CONFIG.maximumCalls)
    expect(rejected.length).toBe(8 - PHASE0A_RETENTION_CONFIG.maximumCalls)
    const raw = readFileSync(manifestPath, 'utf8')
    expect(() => JSON.parse(raw)).not.toThrow()
    const manifest = JSON.parse(raw)
    expect(manifest.calls.length).toBe(4)
    expect(manifest.calls.every((c: { status: string }) => c.status === 'reserved')).toBe(true)
  })

  it('duplicate idempotence key → refused without explicit retry', async () => {
    const out = tmpOut('aqw-exec-dupe-')
    const manifestPath = phase0aManifestPath(out)
    await reservePhase0aCall({
      manifestPath,
      datasetItemId: 'item001',
      concept: 'A',
      model: OPENAI_PHASE0A_DEFAULT_MODEL,
      promptSha256: 'a'.repeat(64),
    })
    await expect(
      reservePhase0aCall({
        manifestPath,
        datasetItemId: 'item001',
        concept: 'A',
        model: OPENAI_PHASE0A_DEFAULT_MODEL,
        promptSha256: 'a'.repeat(64),
      }),
    ).rejects.toThrow(/duplicate/)
    await expect(
      reservePhase0aCall({
        manifestPath,
        datasetItemId: 'item001',
        concept: 'A',
        model: OPENAI_PHASE0A_DEFAULT_MODEL,
        promptSha256: 'a'.repeat(64),
        retry: true,
      }),
    ).resolves.toMatchObject({})
  })
})

describe('Phase 0A execution safety — dataset authorization (synthetic only)', () => {
  it('dataset-kind ABSENT → refused in execution BEFORE any manifest item, no transport, not_called/0/0', async () => {
    const srcDir = tmpOut('aqw-exec-dsabs-src-')
    const imagePath = join(srcDir, 'source.jpg')
    const jpeg = await sharp({
      create: { width: 160, height: 120, channels: 3, background: { r: 3, g: 60, b: 120 } },
    })
      .jpeg()
      .toBuffer()
    writeFileSync(imagePath, jpeg)
    const out = tmpOut('aqw-exec-dsabs-')
    const result = runCli(
      ['--provider', 'openai-gpt-image', '--image', imagePath, '--out', out, '--concept', 'A', '--dataset-id', 'item001'],
      {
        ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
        ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '2',
        ARQWELIA_BENCHMARK_PHASE0A_EXECUTE: 'true',
      },
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('--dataset-kind must be "synthetic"')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')
    // The refusal happens BEFORE upsert/reserve: NO manifest item may exist and
    // no reserved/in_flight attempt may be recorded.
    const manifestPath = join(out, PHASE0A_MANIFEST_FILENAME)
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      expect(manifest.calls).toEqual([])
      expect(Object.keys(manifest.items)).toEqual([])
    }
    // The report never records a synthetic datasetKind when the flag is absent.
    const report = JSON.parse(
      readFileSync(
        join(out, readdirSync(out).filter((f) => f.endsWith('.json') && !f.startsWith('phase0a-manifest')).pop()!),
        'utf8',
      ),
    )
    expect(report.image.datasetKind).toBeNull()
  })

  it('dataset-kind non-synthetic (authorized/user/home/real) → REJECTED during Phase 0A', () => {
    for (const kind of ['authorized', 'user', 'home', 'real']) {
      const result = runCli(['--provider', 'openai-gpt-image', '--dataset-kind', kind, '--out', tmpOut('aqw-exec-dsrej-')])
      expect(result.status).toBe(2)
      expect(result.stderr).toMatch(/Invalid --dataset-kind/)
    }
  })

  it('authorizationBasis is NEVER derived from ARQWELIA_BENCHMARK_AUTHORIZED', async () => {
    const srcDir = tmpOut('aqw-exec-authbasis-src-')
    const imagePath = join(srcDir, 'source.jpg')
    const jpeg = await sharp({
      create: { width: 240, height: 180, channels: 3, background: { r: 12, g: 40, b: 90 } },
    })
      .jpeg()
      .toBuffer()
    writeFileSync(imagePath, jpeg)
    const out = tmpOut('aqw-exec-authbasis-')
    const result = runCli(
      ['--provider', 'openai-gpt-image', '--image', imagePath, '--out', out, '--concept', 'A', '--dataset-id', 'item001', '--dataset-kind', 'synthetic'],
      { ARQWELIA_BENCHMARK_AUTHORIZED: 'true' }, // spend authorization only — NO photo authorization
    )
    expect(result.status).toBe(0)
    const manifest = JSON.parse(readFileSync(join(out, PHASE0A_MANIFEST_FILENAME), 'utf8'))
    const record = manifest.items.item001
    expect(record.datasetKind).toBe('synthetic')
    expect(record.authorizationBasis).toBe('synthetic')
    expect(record).not.toHaveProperty('authorization')
    expect(record).not.toHaveProperty('origin')
    expect(record.noExif).toBe(true)
    expect(record.noFacesDeclared).toBe(true)
    expect(record.noPlatesDeclared).toBe(true)
    expect(record.noHouseNumberDeclared).toBe(true)
    expect(record.noAddressDeclared).toBe(true)
    expect(record.noGps).toBe(true)
    expect(manifest.calls).toEqual([])
  })

  it('upsertPhase0aItem records the synthetic dataset basis regardless of env spend authorization', async () => {
    const out = tmpOut('aqw-exec-authbasis-unit-')
    const record = await upsertPhase0aItem({
      outDir: out,
      datasetItemId: 'item001',
      datasetKind: 'synthetic',
      authorizationBasis: 'synthetic',
      normalizedSha256: 'a'.repeat(64),
    })
    expect(record.authorizationBasis).toBe('synthetic')
    expect(record.datasetKind).toBe('synthetic')
    expect(record).not.toHaveProperty('authorization')
  })

  it('DRY-RUN without --dataset-kind → NO false synthetic declaration (report datasetKind=null, no manifest item)', async () => {
    const srcDir = tmpOut('aqw-exec-drydsk-src-')
    const imagePath = join(srcDir, 'source.jpg')
    const jpeg = await sharp({
      create: { width: 200, height: 140, channels: 3, background: { r: 200, g: 30, b: 60 } },
    })
      .jpeg()
      .toBuffer()
    writeFileSync(imagePath, jpeg)
    const out = tmpOut('aqw-exec-drydsk-')
    const result = runCli(
      ['--provider', 'openai-gpt-image', '--image', imagePath, '--out', out, '--concept', 'A', '--dataset-id', 'item001'],
      {}, // no spend authorization, no budget → dry run
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('DRY RUN — NO EXTERNAL CALL')
    // No manifest item and no reserved attempt may be written while the explicit
    // synthetic declaration is missing.
    const manifestPath = join(out, PHASE0A_MANIFEST_FILENAME)
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      expect(Object.keys(manifest.items)).toEqual([])
      expect(manifest.calls).toEqual([])
    }
    const report = JSON.parse(
      readFileSync(
        join(out, readdirSync(out).filter((f) => f.endsWith('.json') && !f.startsWith('phase0a-manifest')).pop()!),
        'utf8',
      ),
    )
    expect(report.image.datasetKind).toBeNull()
    expect(report.image).not.toHaveProperty('authorizationBasis')
  })

  it('envAuthorized=true WITHOUT --dataset-kind → NEVER writes authorizationBasis="synthetic"', async () => {
    const srcDir = tmpOut('aqw-exec-authbasis-dsk-src-')
    const imagePath = join(srcDir, 'source.jpg')
    const jpeg = await sharp({
      create: { width: 210, height: 150, channels: 3, background: { r: 60, g: 20, b: 130 } },
    })
      .jpeg()
      .toBuffer()
    writeFileSync(imagePath, jpeg)
    const out = tmpOut('aqw-exec-authbasis-dsk-')
    const result = runCli(
      ['--provider', 'openai-gpt-image', '--image', imagePath, '--out', out, '--concept', 'A', '--dataset-id', 'item001'],
      { ARQWELIA_BENCHMARK_AUTHORIZED: 'true' }, // spend authorization WITHOUT dataset-kind
    )
    expect(result.status).toBe(0)
    const manifestPath = join(out, PHASE0A_MANIFEST_FILENAME)
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      expect(Object.keys(manifest.items)).toEqual([])
      expect(manifest.calls).toEqual([])
    }
    const report = JSON.parse(
      readFileSync(
        join(out, readdirSync(out).filter((f) => f.endsWith('.json') && !f.startsWith('phase0a-manifest')).pop()!),
        'utf8',
      ),
    )
    expect(report.image.datasetKind).toBeNull()
    expect(JSON.stringify(report)).not.toContain('authorizationBasis')
  })

  it('EXECUTION with explicit --dataset-kind synthetic → item + reserved attempt recorded correctly', async () => {
    const srcDir = tmpOut('aqw-exec-syn-src-')
    const imagePath = join(srcDir, 'source.jpg')
    const jpeg = await sharp({
      create: { width: 220, height: 160, channels: 3, background: { r: 20, g: 160, b: 90 } },
    })
      .jpeg()
      .toBuffer()
    writeFileSync(imagePath, jpeg)
    const out = tmpOut('aqw-exec-syn-')
    const result = runCli(
      ['--provider', 'openai-gpt-image', '--image', imagePath, '--out', out, '--concept', 'A', '--dataset-id', 'item001', '--dataset-kind', 'synthetic'],
      {
        ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
        ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '2',
        ARQWELIA_BENCHMARK_PHASE0A_EXECUTE: 'true',
      },
    )
    expect(result.status).toBe(0)
    // The retention item is written with the EXPLICIT synthetic basis.
    const manifest = JSON.parse(readFileSync(join(out, PHASE0A_MANIFEST_FILENAME), 'utf8'))
    const record = manifest.items.item001
    expect(record.datasetKind).toBe('synthetic')
    expect(record.authorizationBasis).toBe('synthetic')
    // No transport is injected in this build, so the attempt is cancelled before
    // any network — but the reservation itself was recorded (capacity occupied).
    expect(manifest.calls).toHaveLength(1)
    expect(manifest.calls[0].datasetItemId).toBe('item001')
    expect(manifest.calls[0].status).toBe('cancelled_before_call')
    expect(manifest.calls[0].externalCalls).toBe(0)
    expect(manifest.calls[0].billingStatus).toBe('not_called')
  })
})

describe('Phase 0A execution safety — coherent response limits', () => {
  it('response JSON between 5MB and 48MB with a valid image → accepted', async () => {
    const W = 1280
    const H = 1280
    const raw = randomBytes(W * H * 4)
    const png = await sharp(raw, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer()
    const b64 = png.toString('base64')
    const body = JSON.stringify({ data: [{ b64_json: b64 }] })
    expect(body.length).toBeGreaterThan(5 * 1024 * 1024) // > 5 MB
    expect(body.length).toBeLessThan(OPENAI_MAX_RESPONSE_BODY_BYTES) // < 48 MB
    expect(png.length).toBeLessThan(OPENAI_MAX_DECODED_IMAGE_BYTES) // < 32 MB decoded
    const transport = createOpenAiImageEditTransport({
      apiKey: 'sk-fake',
      baseUrl: 'https://api.openai.com/v1',
      fetchImpl: vi.fn(async () => new Response(body, { status: 200 })),
      locks: openLocks(),
    })
    const parsed = await transport({ normalizedImageBuffer: await validPng(), builtPrompt: 'PII-free prompt' })
    expect(parsed.width).toBe(W)
    expect(parsed.height).toBe(H)
    expect(parsed.buffer.equals(png)).toBe(true)
  })

  it('response JSON > 48MB → rejected by the body limit (no parse, no image)', async () => {
    const big = JSON.stringify({ data: [{ b64_json: 'A'.repeat(49 * 1024 * 1024) }] })
    const transport = createOpenAiImageEditTransport({
      apiKey: 'sk-fake',
      baseUrl: 'https://api.openai.com/v1',
      fetchImpl: vi.fn(async () => new Response(big, { status: 200 })),
      locks: openLocks(),
    })
    const error = await transport({ normalizedImageBuffer: await validPng(), builtPrompt: 'PII-free prompt' }).catch(
      (e: unknown) => e,
    )
    expect(String(error instanceof Error ? error.message : error)).toMatch(/max size/)
    const billing = billingFromCaughtError(error)
    expect(billing).toMatchObject({ externalCalls: 1, billingStatus: 'unknown' })
  })

  it('decoded image > 32MB → rejected by the decoded-size guard', async () => {
    const big = randomBytes(OPENAI_MAX_DECODED_IMAGE_BYTES + 1024 * 1024)
    const b64 = big.toString('base64')
    const body = JSON.stringify({ data: [{ b64_json: b64 }] })
    expect(body.length).toBeLessThan(OPENAI_MAX_RESPONSE_BODY_BYTES) // body fits; decoded image too large
    const transport = createOpenAiImageEditTransport({
      apiKey: 'sk-fake',
      baseUrl: 'https://api.openai.com/v1',
      fetchImpl: vi.fn(async () => new Response(body, { status: 200 })),
      locks: openLocks(),
    })
    const error = await transport({ normalizedImageBuffer: await validPng(), builtPrompt: 'PII-free prompt' }).catch(
      (e: unknown) => e,
    )
    expect(String(error instanceof Error ? error.message : error)).toMatch(/decoded payload too large/)
    expect(String(error instanceof Error ? error.message : error)).not.toContain(b64)
  })
})

describe('Phase 0A execution safety — no real network + no personal data', () => {
  it('the global fetch spy was NEVER invoked across the whole suite (mock passed as fetchImpl only)', () => {
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sanitizeOpenAiRequestId drops anything that could carry key/prompt/photo/path', () => {
    expect(sanitizeOpenAiRequestId('req_abc123')).toBe('req_abc123')
    expect(sanitizeOpenAiRequestId('req-1:2')).toBe('req-1:2')
    expect(sanitizeOpenAiRequestId('sk-fake at /Users/x /tmp/photo.jpg')).toBeNull()
    expect(sanitizeOpenAiRequestId('Bearer sk-fake')).toBeNull()
    expect(sanitizeOpenAiRequestId('a'.repeat(300))).toBeNull()
    expect(sanitizeOpenAiRequestId(123 as unknown as string)).toBeNull()
    expect(sanitizeOpenAiRequestId(null)).toBeNull()
  })

  it('no personal data / secrets / paths / photos in reports or the manifest', async () => {
    const png = await validPng(16, 16)
    const prompt = buildDefaultArqweliaPrompt('A')
    const out = tmpOut('aqw-exec-report-')
    const { manifestPath, attemptId } = await scaffoldReservedAttempt(out)
    await markPhase0aCallStarted({ manifestPath, attemptId })
    await finalizePhase0aCall({ manifestPath, attemptId, outcome: 'succeeded', requestId: 'req_safe_1' })

    const manifestRaw = readFileSync(manifestPath, 'utf8')
    expect(manifestRaw).not.toMatch(/sk-|nvapi-|whsec_/)
    expect(manifestRaw).not.toContain('/Users/')
    expect(manifestRaw).not.toContain(process.env.HOME ?? '/Users/')
    expect(manifestRaw).not.toContain('PII-free')
    const manifest = JSON.parse(manifestRaw)
    expect(manifest.calls[0].requestId).toBe('req_safe_1')
    expect(() => assertNoPersonalData(manifest)).not.toThrow()

    // Full-integration result → sanitized report shape passes assertNoPersonalData.
    const transport = createOpenAiImageEditTransport({
      apiKey: 'sk-fake',
      baseUrl: 'https://api.openai.com/v1',
      fetchImpl: vi.fn(async () =>
        new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }), {
          status: 200,
          headers: { 'x-request-id': 'req_report_1' },
        }),
      ),
      locks: openLocks(),
    })
    const result = await openaiImageAdapter.runSmoke({
      ...baseOptions({ builtPrompt: prompt.prompt, outDir: out }),
      normalizedImageBuffer: png,
      transport,
    })
    const sanitizedReport = {
      providerId: result.providerId,
      model: result.model,
      ok: result.ok,
      externalCalls: result.externalCalls,
      actualCostEur: result.actualCostEur,
      billingStatus: result.billingStatus,
      officialPricingSource: result.officialPricingSource,
      durationMs: result.durationMs,
      outputWidth: result.outputWidth,
      outputHeight: result.outputHeight,
      outputFileName: result.outputPath ? basename(result.outputPath) : null,
      requestId: result.requestId,
      error: null,
    }
    const raw = JSON.stringify(sanitizedReport)
    expect(raw).not.toContain('sk-fake')
    expect(raw).not.toContain('/Users/')
    expect(raw).not.toMatch(/sk-|nvapi-|whsec_/)
    expect(() => assertNoPersonalData(sanitizedReport)).not.toThrow()
  })
})
