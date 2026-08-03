/**
 * ARQWELIA Lot 2 Phase 0A — final corrections.
 *
 * Coverage (see docs/release/ARQWELIA_LOT2_BENCHMARK.md):
 *   1. Z.AI is BLOCKED for Phase 0A (documentary only, not executable).
 *   2. OpenAI controlled constants (gpt-image-2 primary) + rejection of any
 *      model/size/quality/output_format outside the controlled lists.
 *   3. PURE `parseOpenAiImageEditResponse` (official `data[0].b64_json` shape,
 *      ROOT `b64_json` rejected, base64 + sharp image validation).
 *   4. Configurable endpoint + EU allowlist (`validateOpenAiBaseUrl`,
 *      `resolveOpenAiImagesEditEndpoint`).
 *   5. Circular import broken: adapters import `provider-runtime.mjs`, NEVER
 *      `candidates-registry.mjs` (static check).
 *   6. 8-combination gate matrix — only (true, true, true) may allow a
 *      transport; the other 7 are refused / dry-run.
 *   7. Real-but-not-executed OpenAI transport (`createOpenAiImageEditTransport`)
 *      behind the three locks, exercised ONLY with a local `fetchImpl` mock.
 *   8. 4-call STRICT counter + idempotence persisted in a local manifest.
 *   9. Zero global `fetch` across the whole suite (spy).
 */

import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  arqweliaBenchmarkCandidates,
  arqweliaBenchmarkDocumentaryCandidates,
  getArqweliaBenchmarkCandidate,
} from '../scripts/lib/arqwelia-benchmark/candidates'
import { computeExecuteGate, ensurePhase0AGate } from '../scripts/lib/arqwelia-benchmark/provider'
import { zaiImageAdapter } from '../scripts/lib/arqwelia-benchmark/adapters/zai-image-adapter.mjs'
import {
  OPENAI_ADAPTER_ID,
  OPENAI_IMAGE_EDIT_MODELS,
  OPENAI_PHASE0A_DEFAULT_MODEL,
  OPENAI_PHASE0A_DEFAULT_OUTPUT_FORMAT,
  OPENAI_PHASE0A_DEFAULT_QUALITY,
  OPENAI_PHASE0A_DEFAULT_SIZE,
  createOpenAiImageEditTransport,
  parseOpenAiImageEditResponse,
  prepareMultipartBody,
  resolveOpenAiImagesEditEndpoint,
  validateOpenAiBaseUrl,
} from '../scripts/lib/arqwelia-benchmark/adapters/openai-image-adapter.mjs'
import {
  PHASE0A_MANIFEST_FILENAME,
  PHASE0A_RETENTION_CONFIG,
  checkPhase0aCallAllowed,
  phase0aIdempotenceKey,
  phase0aManifestPath,
  recordPhase0aCall,
  upsertPhase0aItem,
} from '../scripts/lib/arqwelia-benchmark/phase0a-manifest.mjs'

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

let fetchSpy: ReturnType<typeof vi.fn>

beforeAll(() => {
  fetchSpy = vi.fn((..._args: unknown[]) => {
    throw new Error('NETWORK CALL DETECTED IN PHASE 0A CORRECTION TESTS')
  })
  vi.stubGlobal('fetch', fetchSpy)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('Phase 0A correction #1 — Z.AI blocked (documentary only)', () => {
  it('zai-glm is NOT in the executable candidates list', () => {
    expect(arqweliaBenchmarkCandidates.map((candidate) => candidate.id)).not.toContain('zai-glm')
    expect(getArqweliaBenchmarkCandidate('zai-glm')).toBeUndefined()
  })

  it('zai-glm exists ONLY as a documentary candidate with blocked state and no runSmoke', () => {
    const doc = arqweliaBenchmarkDocumentaryCandidates.find((candidate) => candidate.id === 'zai-glm')
    expect(doc).toBeDefined()
    expect(doc!.state).toBe('blocked_missing_capability')
    expect(doc!.supportsImageEditing).toBe(false)
    expect(doc!.runSmoke).toBeUndefined()
  })

  it('the zai adapter is documentary-only and carries the official block reason quote', () => {
    expect(zaiImageAdapter.state).toBe('blocked_missing_capability')
    expect(zaiImageAdapter.supportsImageEditing).toBe(false)
    expect(zaiImageAdapter.runSmoke).toBeUndefined()
    expect(zaiImageAdapter.documentaryOnly).toBe(true)
    expect(zaiImageAdapter.blockReason).toContain(
      'no current official API/model contract proving photo-to-photo editing',
    )
    expect(zaiImageAdapter.validateConfiguration().ok).toBe(false)
  })
})

describe('Phase 0A correction #2 — OpenAI controlled constants', () => {
  it('gpt-image-2 is the Phase 0A default model', () => {
    expect(OPENAI_PHASE0A_DEFAULT_MODEL).toBe('gpt-image-2')
    expect(OPENAI_IMAGE_EDIT_MODELS).toEqual(['gpt-image-2', 'gpt-image-1'])
    expect(getArqweliaBenchmarkCandidate(OPENAI_ADAPTER_ID)!.model).toBe('gpt-image-2')
    expect(OPENAI_PHASE0A_DEFAULT_SIZE).toBe('1536x1024')
    expect(OPENAI_PHASE0A_DEFAULT_QUALITY).toBe('medium')
    expect(OPENAI_PHASE0A_DEFAULT_OUTPUT_FORMAT).toBe('png')
  })

  it('rejects an unknown model / size / quality / output_format', async () => {
    const buffer = await validPng()
    const prompt = 'PII-free prompt'
    expect(() => prepareMultipartBody({ normalizedImageBuffer: buffer, builtPrompt: prompt, model: 'gpt-image-3' })).toThrow(/unsupported model/)
    expect(() => prepareMultipartBody({ normalizedImageBuffer: buffer, builtPrompt: prompt, size: '999x999' })).toThrow(/unsupported size/)
    expect(() => prepareMultipartBody({ normalizedImageBuffer: buffer, builtPrompt: prompt, quality: 'ultra' })).toThrow(/unsupported quality/)
    expect(() => prepareMultipartBody({ normalizedImageBuffer: buffer, builtPrompt: prompt, outputFormat: 'gif' })).toThrow(/unsupported output_format/)
  })

  it('does NOT send input_fidelity (gpt-image-2 uses high fidelity automatically)', async () => {
    const buffer = await validPng()
    const multipart = prepareMultipartBody({ normalizedImageBuffer: buffer, builtPrompt: 'PII-free prompt', model: 'gpt-image-2' })
    expect(multipart.inputFidelity).toBeNull()
    expect(multipart.parts.map((part: { name: string }) => part.name)).not.toContain('input_fidelity')
  })
})

describe('Phase 0A correction #3 — parseOpenAiImageEditResponse (PURE)', () => {
  it('accepts the official { data: [{ b64_json }] } shape and returns sanitized image info', async () => {
    const png = await validPng(40, 24)
    const parsed = await parseOpenAiImageEditResponse({ data: [{ b64_json: png.toString('base64') }] })
    expect(parsed.buffer.equals(png)).toBe(true)
    expect(parsed.width).toBe(40)
    expect(parsed.height).toBe(24)
    expect(parsed.mimeType).toBe('image/png')
    expect(parsed.buffer.length).toBeGreaterThan(0)
  })

  it('accepts a JPEG payload with image/jpeg mime', async () => {
    const jpeg = await sharp({ create: { width: 16, height: 16, channels: 3, background: { r: 1, g: 2, b: 3 } } }).jpeg().toBuffer()
    const parsed = await parseOpenAiImageEditResponse({ data: [{ b64_json: jpeg.toString('base64') }] })
    expect(parsed.mimeType).toBe('image/jpeg')
    expect(parsed.width).toBe(16)
  })

  it('REJECTS the ROOT-level b64_json shape (the old incorrect shape)', async () => {
    const png = await validPng()
    await expect(parseOpenAiImageEditResponse({ b64_json: png.toString('base64') })).rejects.toThrow(/b64_json at the ROOT/)
  })

  it('REJECTS an empty data array', async () => {
    await expect(parseOpenAiImageEditResponse({ data: [] })).rejects.toThrow(/non-empty array/)
    await expect(parseOpenAiImageEditResponse({ data: [{}] })).rejects.toThrow(/b64_json/)
  })

  it('REJECTS invalid base64', async () => {
    await expect(parseOpenAiImageEditResponse({ data: [{ b64_json: '%%%not-base64%%%' }] })).rejects.toThrow(/invalid base64/)
  })

  it('REJECTS valid base64 that is NOT an image (HTML/JSON/text)', async () => {
    const html = Buffer.from('<html><body>not an image</body></html>').toString('base64')
    await expect(parseOpenAiImageEditResponse({ data: [{ b64_json: html }] })).rejects.toThrow(/not an image/)
    const text = Buffer.from('hello world this is just text').toString('base64')
    await expect(parseOpenAiImageEditResponse({ data: [{ b64_json: text }] })).rejects.toThrow(/not an image/)
  })

  it('REJECTS arbitrary JSON and non-object inputs', async () => {
    await expect(parseOpenAiImageEditResponse({ foo: 'bar' })).rejects.toThrow(/data/)
    await expect(parseOpenAiImageEditResponse('string')).rejects.toThrow(/not a JSON object/)
    await expect(parseOpenAiImageEditResponse(null)).rejects.toThrow(/not a JSON object/)
    await expect(parseOpenAiImageEditResponse([1, 2])).rejects.toThrow(/not a JSON object/)
  })

  it('error messages NEVER contain the raw response body or the base64 payload', async () => {
    const png = await validPng()
    const b64 = png.toString('base64')
    const cases = [
      { b64_json: b64 }, // root shape
      { data: [] },
      { data: [{ b64_json: '%%%not-base64%%%' }] },
      { data: [{ b64_json: Buffer.from('<html>not an image</html>').toString('base64') }] },
    ]
    for (const response of cases) {
      const error = await parseOpenAiImageEditResponse(response as never).catch((e: unknown) => e)
      const message = String(error instanceof Error ? error.message : error)
      expect(message).not.toContain(b64)
      expect(message).not.toContain('not an image</html>')
      expect(message).not.toContain('%%%')
    }
  })
})

describe('Phase 0A correction #4 — configurable endpoint + EU allowlist', () => {
  it('resolves api.openai.com and eu.api.openai.com endpoints', () => {
    expect(resolveOpenAiImagesEditEndpoint('https://api.openai.com/v1')).toBe('https://api.openai.com/v1/images/edits')
    expect(resolveOpenAiImagesEditEndpoint('https://eu.api.openai.com/v1')).toBe('https://eu.api.openai.com/v1/images/edits')
    expect(resolveOpenAiImagesEditEndpoint('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1/images/edits')
  })

  it('REJECTS non-HTTPS, localhost, private IP, query, fragment, userinfo, other host', () => {
    const rejected = [
      'http://api.openai.com/v1',
      'ftp://api.openai.com/v1',
      'https://localhost:8080/v1',
      'https://127.0.0.1/v1',
      'https://192.168.1.5/v1',
      'https://10.0.0.2/v1',
      'https://api.openai.com/v1?foo=bar',
      'https://api.openai.com/v1#frag',
      'https://user:pass@api.openai.com/v1',
      'https://other.example.com/v1',
      'https://api.openai.com', // missing /v1 path
      'not-a-url',
    ]
    for (const url of rejected) {
      expect(() => validateOpenAiBaseUrl(url)).toThrow()
    }
  })

  it('rejects a base URL that is not in the allowlist even when HTTPS', () => {
    expect(() => validateOpenAiBaseUrl('https://api.openai.com/v2')).toThrow()
  })
})

describe('Phase 0A correction #5 — circular import broken (static)', () => {
  it('NEITHER adapter imports candidates-registry.mjs (the registry → adapter → registry cycle is gone)', () => {
    const adapterFiles = [
      join(process.cwd(), 'scripts/lib/arqwelia-benchmark/adapters/openai-image-adapter.mjs'),
      join(process.cwd(), 'scripts/lib/arqwelia-benchmark/adapters/zai-image-adapter.mjs'),
    ]
    for (const file of adapterFiles) {
      const source = readFileSync(file, 'utf8')
      expect(source).not.toMatch(/from\s+['"]\.\.\/candidates-registry\.mjs['"]/)
    }
  })

  it('the runtime-using openai adapter imports provider-runtime.mjs (never the registry)', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/lib/arqwelia-benchmark/adapters/openai-image-adapter.mjs'), 'utf8')
    expect(source).toMatch(/from\s+['"]\.\.\/provider-runtime\.mjs['"]/)
    // The documentary zai adapter has ZERO runtime coupling — it does not even
    // import provider-runtime, which is strictly stronger than the rule.
    const zai = readFileSync(join(process.cwd(), 'scripts/lib/arqwelia-benchmark/adapters/zai-image-adapter.mjs'), 'utf8')
    expect(zai).not.toMatch(/from\s+['"]\.\.\/provider-runtime\.mjs['"]/)
  })

  it('provider.ts re-exports from provider-runtime.mjs, not from candidates-registry.mjs', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/lib/arqwelia-benchmark/provider.ts'), 'utf8')
    expect(source).toMatch(/from\s+['"]\.\/provider-runtime\.mjs['"]/)
    expect(source).not.toMatch(/from\s+['"]\.\/candidates-registry\.mjs['"]/)
  })
})

describe('Phase 0A correction #6 — 8-combination gate matrix', () => {
  const combos = [
    [false, false, false],
    [false, false, true],
    [false, true, false],
    [false, true, true],
    [true, false, false],
    [true, false, true],
    [true, true, false],
    [true, true, true],
  ] as const

  it('computeExecuteGate: only (true, true, true) may allow; all other 7 are dry-run', () => {
    for (const [authorized, budget, phase0a] of combos) {
      const gate = computeExecuteGate({ realCallAuthorized: authorized && budget, phase0aExecute: phase0a })
      const expectedAllowed = authorized && budget && phase0a
      expect(gate.executeAuthorized).toBe(expectedAllowed)
      expect(gate.dryRun).toBe(!expectedAllowed)
    }
  })

  it('ensurePhase0AGate: only (true, true, true) does not throw', () => {
    for (const [authorized, budget, phase0a] of combos) {
      const expectedAllowed = authorized && budget && phase0a
      if (expectedAllowed) {
        expect(() =>
          ensurePhase0AGate({ realCallAuthorized: authorized && budget, budgetMaxEur: budget ? 1 : 0, phase0aExecute: phase0a }),
        ).not.toThrow()
      } else {
        expect(() =>
          ensurePhase0AGate({ realCallAuthorized: authorized && budget, budgetMaxEur: budget ? 1 : 0, phase0aExecute: phase0a }),
        ).toThrow()
      }
    }
  })

  it('createOpenAiImageEditTransport: constructible ONLY when all three locks are active', () => {
    for (const [authorized, budget, phase0a] of combos) {
      const expectedAllowed = authorized && budget && phase0a
      const attempt = () =>
        createOpenAiImageEditTransport({
          apiKey: 'sk-fake-transport-locks',
          baseUrl: 'https://api.openai.com/v1',
          fetchImpl: async () => {
            throw new Error('MUST NOT BE CALLED')
          },
          locks: { authorized, budgetMaxEur: budget ? 1 : 0, phase0aExecute: phase0a },
        })
      if (expectedAllowed) {
        const transport = attempt()
        expect(typeof transport).toBe('function')
      } else {
        expect(attempt).toThrow()
      }
    }
  })
})

describe('Phase 0A correction #8 — official cost + budget', () => {
  it('openai estimateOfficialCost documents official gpt-image-2 pricing without EUR conversion', () => {
    const cost = getArqweliaBenchmarkCandidate('openai-gpt-image')!.estimateOfficialCost()
    expect(cost.known).toBe(true)
    expect(cost.officialPricingSource).toBe('https://openai.com/api/pricing/')
    expect(cost.costPerImageEur).toBeNull() // no invented USD→EUR rate
    expect(cost.note).toMatch(/0\.005/)
    expect(cost.note).toMatch(/0\.041/)
    expect(cost.note).toMatch(/0\.165/)
    expect(cost.note).toMatch(/NO USD→EUR conversion/)
  })

  it('the Phase 0A retention config caps calls at 4 and budget at 2 EUR', () => {
    expect(PHASE0A_RETENTION_CONFIG.provider).toBe('openai-gpt-image')
    expect(PHASE0A_RETENTION_CONFIG.model).toBe('gpt-image-2')
    expect(PHASE0A_RETENTION_CONFIG.size).toBe('1536x1024')
    expect(PHASE0A_RETENTION_CONFIG.quality).toBe('medium')
    expect(PHASE0A_RETENTION_CONFIG.outputFormat).toBe('png')
    expect(PHASE0A_RETENTION_CONFIG.photos).toBe(2)
    expect(PHASE0A_RETENTION_CONFIG.concepts).toEqual(['A', 'B'])
    expect(PHASE0A_RETENTION_CONFIG.maximumCalls).toBe(4)
    expect(PHASE0A_RETENTION_CONFIG.maximumBudgetEur).toBe(2)
  })
})

describe('Phase 0A correction #9 — 4-call strict counter + idempotence (persisted manifest)', () => {
  const model = 'gpt-image-2'

  it('refuses a 5th call and refuses duplicates without an explicit retry', async () => {
    const out = tmpOut('aqw-phase0a-counter-')
    const promptSha256 = 'a'.repeat(64)
    const model = 'gpt-image-2'

    // Record two calls first, then check idempotence BEFORE reaching the cap.
    await recordPhase0aCall({ outDir: out, datasetItemId: 'item01', concept: 'A', model, promptSha256 })
    await recordPhase0aCall({ outDir: out, datasetItemId: 'item01', concept: 'B', model, promptSha256 })

    // Duplicate refused without retry.
    await expect(
      checkPhase0aCallAllowed({ outDir: out, datasetItemId: 'item01', concept: 'A', model, promptSha256 }),
    ).rejects.toThrow(/duplicate/)

    // Duplicate allowed with an explicit retry option.
    await expect(
      checkPhase0aCallAllowed({ outDir: out, datasetItemId: 'item01', concept: 'A', model, promptSha256, retry: true }),
    ).resolves.toMatchObject({ allowed: true })

    // Fill the remaining 2 slots (4 total = 2 photos × 2 concepts).
    await recordPhase0aCall({ outDir: out, datasetItemId: 'item02', concept: 'A', model, promptSha256 })
    await recordPhase0aCall({ outDir: out, datasetItemId: 'item02', concept: 'B', model, promptSha256 })

    // The manifest is persisted (not just in process memory).
    const manifestJson = readFileSync(join(out, PHASE0A_MANIFEST_FILENAME), 'utf8')
    expect(manifestJson).toContain(`"calls"`)
    const manifest = JSON.parse(manifestJson)
    expect(manifest.calls).toHaveLength(4)
    expect(phase0aManifestPath(out)).toBe(join(out, PHASE0A_MANIFEST_FILENAME))

    // 5th call refused (cap = 4).
    await expect(
      checkPhase0aCallAllowed({ outDir: out, datasetItemId: 'item03', concept: 'A', model, promptSha256 }),
    ).rejects.toThrow(/maximum of 4 calls reached/)

    // Idempotence key is derived from datasetItemId + concept + model + promptSha256.
    expect(phase0aIdempotenceKey({ datasetItemId: 'item01', concept: 'A', model, promptSha256 })).toMatch(/^[a-f0-9]{64}$/)
  })

  it('upsertPhase0aItem records the retention fields (origin, authorization, sha256, noExif, date, statusA/B)', async () => {
    const out = tmpOut('aqw-phase0a-item-')
    const record = await upsertPhase0aItem({
      outDir: out,
      datasetItemId: 'item01',
      origin: 'local',
      authorization: false,
      normalizedSha256: 'b'.repeat(64),
      noExif: true,
      statusA: 'pending',
      statusB: 'pending',
    })
    expect(record).toMatchObject({
      datasetItemId: 'item01',
      origin: 'local',
      authorization: false,
      normalizedSha256: 'b'.repeat(64),
      noExif: true,
      statusA: 'pending',
      statusB: 'pending',
    })
    expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    const manifest = JSON.parse(readFileSync(join(out, PHASE0A_MANIFEST_FILENAME), 'utf8'))
    expect(manifest.items.item01).toMatchObject({ datasetItemId: 'item01', noExif: true })
  })
})

describe('Phase 0A correction #7 — REAL-but-not-executed transport (local fetch mock only)', () => {
  const apiKey = 'sk-secret-transport-key-123'

  function makeFetchMock(body: unknown, status = 200, headers: Record<string, string> = {}) {
    return vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...headers },
      }),
    )
  }

  function openLocks() {
    return { authorized: true, budgetMaxEur: 1, phase0aExecute: true }
  }

  it('a local fetch mock returning the official shape is parsed by the transport', async () => {
    const png = await validPng(50, 30)
    const fetchMock = makeFetchMock({ data: [{ b64_json: png.toString('base64') }] }, 200, { 'x-request-id': 'req_corr_1' })
    const transport = createOpenAiImageEditTransport({
      apiKey,
      baseUrl: 'https://api.openai.com/v1',
      fetchImpl: fetchMock,
      locks: openLocks(),
    })
    const out = await transport({ normalizedImageBuffer: png, builtPrompt: 'PII-free prompt' })
    expect(out.buffer.equals(png)).toBe(true)
    expect(out.width).toBe(50)
    expect(out.height).toBe(30)
    expect(out.mimeType).toBe('image/png')

    // Correct endpoint, multipart body, Authorization header, no manual boundary.
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.openai.com/v1/images/edits')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer ${apiKey}`)
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.body!.toString()).not.toContain('boundary=')
  })

  it('the transport REJECTS a root-shape response through the official parser', async () => {
    const png = await validPng()
    const fetchMock = makeFetchMock({ b64_json: png.toString('base64') })
    const transport = createOpenAiImageEditTransport({
      apiKey,
      baseUrl: 'https://api.openai.com/v1',
      fetchImpl: fetchMock,
      locks: openLocks(),
    })
    await expect(transport({ normalizedImageBuffer: png, builtPrompt: 'PII-free prompt' })).rejects.toThrow(/b64_json at the ROOT/)
  })

  it('the transport NEVER logs the Authorization header, the full prompt, or the source photo', async () => {
    const png = await validPng()
    const prompt = 'SUPER SECRET PROMPT THAT MUST NEVER BE LOGGED'
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const fetchMock = makeFetchMock({ b64_json: png.toString('base64') })
      const transport = createOpenAiImageEditTransport({
        apiKey,
        baseUrl: 'https://api.openai.com/v1',
        fetchImpl: fetchMock,
        locks: openLocks(),
      })
      await transport({ normalizedImageBuffer: png, builtPrompt: prompt }).catch(() => undefined)
      for (const spy of [logSpy, errorSpy]) {
        for (const call of spy.mock.calls) {
          const text = call.join(' ')
          expect(text).not.toContain(apiKey)
          expect(text).not.toContain(prompt)
          expect(text).not.toContain(png.toString('base64'))
        }
      }
    } finally {
      logSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('the transport error does not expose the Authorization header or the prompt', async () => {
    const png = await validPng()
    const prompt = 'PROMPT THAT MUST NOT LEAK'
    const transport = createOpenAiImageEditTransport({
      apiKey,
      baseUrl: 'https://api.openai.com/v1',
      fetchImpl: makeFetchMock({ error: 'boom' }, 500),
      locks: openLocks(),
    })
    const error = await transport({ normalizedImageBuffer: png, builtPrompt: prompt }).catch((e: unknown) => e)
    const message = String(error instanceof Error ? error.message : error)
    expect(message).not.toContain(apiKey)
    expect(message).not.toContain(prompt)
    expect(message).toMatch(/HTTP 500/)
  })
})

describe('Phase 0A correction — no network across the suite', () => {
  it('the global fetch spy was never invoked anywhere in this suite', () => {
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
