/**
 * ARQWELIA Lot 2 Phase 0A — provider adapters, versioned prompts, PII guard,
 * three-gate block.
 *
 * NO REAL PROVIDER CALLS AND NO NETWORK IN THIS SUITE: a global `fetch` spy is
 * installed for the whole file and asserts it was never invoked; the adapters
 * are exercised only with injected mock transports. The static checks at the
 * bottom prove the adapters never import/call the real SDK.
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  ARQWELIA_BENCHMARK_PHASE0A_EXECUTE,
  ArqweliaProviderError,
  billingFromCaughtError,
  ensureNoRealCall,
  ensurePhase0AGate,
} from '../scripts/lib/arqwelia-benchmark/provider'
import {
  arqweliaBenchmarkCandidates,
  getArqweliaBenchmarkCandidate,
} from '../scripts/lib/arqwelia-benchmark/candidates'
import {
  ARQWELIA_PROMPT_VERSION,
  CONCEPT_A_V1_TEMPLATE,
  CONCEPT_B_V1_TEMPLATE,
  PiiGuardError,
  assertNoPersonalData,
  assertPromptPiiFree,
  buildArqweliaPrompt,
  buildDefaultArqweliaPrompt,
  scanForPii,
} from '../scripts/lib/arqwelia-benchmark/prompts/index'
import { zaiImageAdapter } from '../scripts/lib/arqwelia-benchmark/adapters/zai-image-adapter.mjs'
import { openaiImageAdapter } from '../scripts/lib/arqwelia-benchmark/adapters/openai-image-adapter.mjs'

const CLI = join(process.cwd(), 'scripts/benchmark-arqwelia-smoke.mjs')
const TEST_FILE = join(process.cwd(), 'tests/arqwelia-lot2-phase0a-adapters.test.ts')

function runCli(args: string[], env: Record<string, string | undefined> = {}) {
  return spawnSync('bun', [CLI, ...args], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  })
}

function tmpOut(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

async function validPng(width = 24, height = 24): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 200, b: 50 } },
  })
    .png()
    .toBuffer()
}

function gateOpenOptions(overrides: Record<string, unknown> = {}) {
  return {
    providerId: 'zai-glm',
    model: 'tbd',
    outDir: tmpOut('aqw-phase0a-gate-'),
    budgetMaxEur: 5,
    realCallAuthorized: true,
    phase0aExecute: true,
    ...overrides,
  }
}

let fetchSpy: ReturnType<typeof vi.fn>

beforeAll(() => {
  fetchSpy = vi.fn((..._args: unknown[]) => {
    throw new Error('NETWORK CALL DETECTED IN PHASE 0A TESTS')
  })
  vi.stubGlobal('fetch', fetchSpy)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('ARQWELIA Lot 2 Phase 0A — versioned prompts', () => {
  it('concept A prompt is versioned and deterministic', () => {
    const a1 = buildDefaultArqweliaPrompt('A')
    const a2 = buildDefaultArqweliaPrompt('A')
    expect(a1.promptVersion).toBe(ARQWELIA_PROMPT_VERSION)
    expect(a1.concept).toBe('A')
    expect(a1.prompt.length).toBeGreaterThan(0)
    expect(a1.promptSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(a2.promptSha256).toBe(a1.promptSha256)
  })

  it('concept B prompt is versioned, deterministic, and DIFFERENT from A', () => {
    const b1 = buildDefaultArqweliaPrompt('B')
    const b2 = buildDefaultArqweliaPrompt('B')
    const a = buildDefaultArqweliaPrompt('A')
    expect(b1.promptVersion).toBe(ARQWELIA_PROMPT_VERSION)
    expect(b1.concept).toBe('B')
    expect(b1.prompt).not.toBe(a.prompt)
    expect(b1.promptSha256).not.toBe(a.promptSha256)
    expect(b2.promptSha256).toBe(b1.promptSha256)
  })

  it('static templates are exported and PII-clean', () => {
    expect(CONCEPT_A_V1_TEMPLATE).toMatch(/Preserve the house/)
    expect(CONCEPT_B_V1_TEMPLATE).toMatch(/premium/i)
    expect(scanForPii(CONCEPT_A_V1_TEMPLATE).clean).toBe(true)
    expect(scanForPii(CONCEPT_B_V1_TEMPLATE).clean).toBe(true)
  })

  it('the raw prompt text is never equal to its sha256', () => {
    const built = buildDefaultArqweliaPrompt('A')
    expect(built.prompt).not.toContain(built.promptSha256)
    expect(built.prompt.length).not.toBe(64)
  })

  it('the built prompt contains only closed-vocabulary tokens (controlled values)', () => {
    const custom = buildArqweliaPrompt({
      concept: 'B',
      style: 'editorial-photography',
      shape: 'patio-courtyard',
      budgetRange: 'premium',
      hasTerrace: false,
      declaredConstraints: ['no-people', 'keep-terrace'],
    })
    expect(custom.prompt).toContain('editorial-photography')
    expect(custom.prompt).toContain('patio-courtyard')
    expect(custom.prompt).toContain('no-people')
    expect(scanForPii(custom.prompt).clean).toBe(true)
  })

  it('builder REJECTS non-controlled style / shape / budget / constraint values', () => {
    expect(() =>
      buildArqweliaPrompt({
        concept: 'A',
        style: 'my-free-style' as never,
        shape: 'rectangular-front',
        budgetRange: 'mid-range',
        hasTerrace: true,
      }),
    ).toThrow(/controlled/)
    expect(() =>
      buildArqweliaPrompt({
        concept: 'A',
        style: 'photorealistic',
        shape: 'freeform-shape' as never,
        budgetRange: 'mid-range',
        hasTerrace: true,
      }),
    ).toThrow(/controlled/)
    expect(() =>
      buildArqweliaPrompt({
        concept: 'A',
        style: 'photorealistic',
        shape: 'island',
        budgetRange: 'cheapest-possible' as never,
        hasTerrace: true,
      }),
    ).toThrow(/controlled/)
    expect(() =>
      buildArqweliaPrompt({
        concept: 'A',
        style: 'photorealistic',
        shape: 'island',
        budgetRange: 'mid-range',
        hasTerrace: true,
        declaredConstraints: ['reorganize my garden' as never],
      }),
    ).toThrow(/controlled/)
  })
})

describe('ARQWELIA Lot 2 Phase 0A — PII guard', () => {
  it('refuses an email', () => {
    expect(() => assertPromptPiiFree('send results to team@example.com please')).toThrow(PiiGuardError)
    expect(scanForPii('team@example.com').issues.some((issue) => issue.type === 'email')).toBe(true)
  })

  it('refuses a phone number', () => {
    expect(() => assertPromptPiiFree('Call 202-555-0100 for a quote')).toThrow(PiiGuardError)
    expect(scanForPii('202-555-0100').issues.some((issue) => issue.type === 'phone')).toBe(true)
  })

  it('refuses a street address', () => {
    expect(() => assertPromptPiiFree('Reimagine 12 Main Street only')).toThrow(PiiGuardError)
    expect(scanForPii('12 Main Street').issues.some((issue) => issue.type === 'address')).toBe(true)
  })

  it('refuses GPS coordinates', () => {
    expect(() => assertPromptPiiFree('Focus on 48.8584, 2.2945')).toThrow(PiiGuardError)
    expect(scanForPii('48.8584, 2.2945').issues.some((issue) => issue.type === 'gps')).toBe(true)
  })

  it('refuses a postal code', () => {
    expect(() => assertPromptPiiFree('Near postcode 90210')).toThrow(PiiGuardError)
    expect(scanForPii('90210').issues.some((issue) => issue.type === 'postalCode')).toBe(true)
  })

  it('refuses free-form (non-controlled) user text', () => {
    expect(() => assertPromptPiiFree('reimagine my front garden with a castle')).toThrow(PiiGuardError)
    expect(scanForPii('reimagine my front garden with a castle').issues).toContainEqual(
      expect.objectContaining({ type: 'uncontrolled-text' }),
    )
    expect(scanForPii('John Smith wants a pool').issues).toContainEqual(
      expect.objectContaining({ type: 'uncontrolled-text' }),
    )
  })

  it('ALLOWS only controlled prompt values', () => {
    expect(() => assertPromptPiiFree(buildDefaultArqweliaPrompt('A').prompt)).not.toThrow()
    expect(() => assertPromptPiiFree(buildDefaultArqweliaPrompt('B').prompt)).not.toThrow()
    expect(scanForPii(buildDefaultArqweliaPrompt('A').prompt).clean).toBe(true)
  })

  it('assertNoPersonalData refuses personal-data keys and PII values', () => {
    expect(() => assertNoPersonalData({ firstName: 'John', email: 'j@x.com' })).toThrow(PiiGuardError)
    expect(() => assertNoPersonalData({ address: '12 Main Street' })).toThrow(PiiGuardError)
    expect(() => assertNoPersonalData({ file: '/Users/someone/photo.jpg' })).toThrow(PiiGuardError)
    expect(() => assertNoPersonalData({ key: 'sk-live-aaaa' })).toThrow(PiiGuardError)
    expect(() => assertNoPersonalData({ promptA: 'free text' })).toThrow(PiiGuardError)
  })

  it('assertNoPersonalData does NOT flag hash-like or benign report fields', () => {
    expect(() =>
      assertNoPersonalData({
        sha: 'a'.repeat(64),
        datasetItemId: 'item001',
        description: 'Benchmark candidate (model gpt-image-1)',
      }),
    ).not.toThrow()
  })
})

describe('ARQWELIA Lot 2 Phase 0A — request building (no SDK, no network)', () => {
  it('zai prepareRequest builds { model, prompt, image, size }', async () => {
    const buffer = await validPng()
    const prompt = buildDefaultArqweliaPrompt('A').prompt
    const body = zaiImageAdapter.prepareRequest({
      normalizedImageBuffer: buffer,
      builtPrompt: prompt,
      model: 'tbd',
      size: '1024x1024',
    })
    expect(body.model).toBe('tbd')
    expect(body.prompt).toBe(prompt)
    expect(body.image.startsWith('data:image/jpeg;base64,')).toBe(true)
    expect(body.size).toBe('1024x1024')
    expect(Object.keys(body).sort()).toEqual(['image', 'model', 'prompt', 'size'])
  })

  it('zai prepareRequest prefers the normalized data URL when both are given', () => {
    const body = zaiImageAdapter.prepareRequest({
      normalizedImageDataUrl: 'data:image/jpeg;base64,QUJD',
      normalizedImageBuffer: Buffer.from('raw'),
      builtPrompt: 'prompt',
      model: 'tbd',
    })
    expect(body.image).toBe('data:image/jpeg;base64,QUJD')
    expect(body.prompt).toBe('prompt')
  })

  it('openai prepareMultipartBody builds the official multipart descriptor', async () => {
    const buffer = await validPng()
    const prompt = buildDefaultArqweliaPrompt('A').prompt
    const multipart = openaiImageAdapter.prepareMultipartBody({
      normalizedImageBuffer: buffer,
      builtPrompt: prompt,
      model: 'gpt-image-1',
      size: '1024x1024',
    })
    expect(multipart.method).toBe('POST')
    expect(multipart.endpoint).toContain('/images/edits')
    expect(multipart.contentType).toBe('multipart/form-data')
    const names = multipart.parts.map((part: { name: string }) => part.name)
    expect(names).toEqual(['image', 'model', 'prompt', 'size'])
    const imagePart = multipart.parts[0] as { name: string; filename: string; contentType: string; value: Buffer }
    expect(imagePart.filename).toBe('image.jpg')
    expect(imagePart.contentType).toBe('image/jpeg')
    expect(imagePart.value.equals(buffer)).toBe(true)
    const modelPart = multipart.parts.find((part: { name: string }) => part.name === 'model') as {
      value: string
    }
    const promptPart = multipart.parts.find((part: { name: string }) => part.name === 'prompt') as {
      value: string
    }
    expect(modelPart.value).toBe('gpt-image-1')
    expect(promptPart.value).toBe(prompt)

    const form = multipart.toFormData()
    expect(form).toBeInstanceOf(FormData)
    expect(form.has('image')).toBe(true)
    expect(form.has('prompt')).toBe(true)
    expect(form.has('model')).toBe(true)
  })

  it('openai multipart omits size when not requested', async () => {
    const buffer = await validPng()
    const multipart = openaiImageAdapter.prepareMultipartBody({
      normalizedImageBuffer: buffer,
      builtPrompt: 'prompt',
      model: 'gpt-image-1',
    })
    expect(multipart.parts.map((part: { name: string }) => part.name)).toEqual(['image', 'model', 'prompt'])
  })
})

describe('ARQWELIA Lot 2 Phase 0A — adapters receive ONLY normalized fields', () => {
  it('refuses an imagePath on the adapter boundary', async () => {
    const prompt = buildDefaultArqweliaPrompt('A').prompt
    await expect(
      zaiImageAdapter.runSmoke({
        ...gateOpenOptions({ builtPrompt: prompt, transport: async () => ({ data: [{ base64: '' }] }) }),
        imagePath: '/tmp/private-garden.jpg',
      }),
    ).rejects.toThrow(/normalized/)
    await expect(
      openaiImageAdapter.runSmoke({
        ...gateOpenOptions({ providerId: 'openai-gpt-image', model: 'gpt-image-1', builtPrompt: prompt, transport: async () => ({ b64_json: '' }) }),
        imagePath: '/tmp/private-garden.jpg',
      }),
    ).rejects.toThrow(/normalized/)
  })

  it('refuses a run without a built prompt (no free prompt can be injected)', async () => {
    await expect(
      zaiImageAdapter.runSmoke({ ...gateOpenOptions(), transport: async () => ({ data: [{ base64: '' }] }) }),
    ).rejects.toThrow(/no built prompt/)
  })

  it('refuses a PII-tainted built prompt with not_called billing (before any call)', async () => {
    const err = await zaiImageAdapter
      .runSmoke({
        ...gateOpenOptions({ builtPrompt: 'reimagine my garden for john.doe@example.com' }),
        transport: async () => ({ data: [{ base64: 'AA==' }] }),
      })
      .catch((error: unknown) => error)
    expect(err).toBeInstanceOf(ArqweliaProviderError)
    expect(err instanceof ArqweliaProviderError ? err.billing : null).toMatchObject({
      externalCalls: 0,
      actualCostEur: 0,
      billingStatus: 'not_called',
    })
    expect(String(err instanceof Error ? err.message : err)).not.toContain('john.doe@example.com')
  })

  it('the request body uses the BUILT prompt and never CLI free text', async () => {
    const buffer = await validPng()
    const builtPrompt = buildDefaultArqweliaPrompt('A').prompt
    const freeText = 'A concept prompt typed by an operator' // must NEVER reach a provider
    const seenBodies: unknown[] = []
    const transport = async (body: unknown) => {
      seenBodies.push(body)
      return { data: [{ base64: buffer.toString('base64') }] }
    }
    const result = await zaiImageAdapter.runSmoke({
      ...gateOpenOptions({ builtPrompt, transport }),
      normalizedImageBuffer: buffer,
      sanitizedPrompt: freeText,
    })
    expect(result.ok).toBe(true)
    expect(seenBodies).toHaveLength(1)
    const body = seenBodies[0] as { prompt: string; image: string }
    expect(body.prompt).toBe(builtPrompt)
    expect(body.prompt).not.toBe(freeText)
    expect(body.prompt).not.toContain(freeText)
    expect(body.image.startsWith('data:image/jpeg;base64,')).toBe(true)
    expect(body.image).not.toContain('/tmp/')
  })
})

describe('ARQWELIA Lot 2 Phase 0A — mock transport, conservative billing', () => {
  it('zai: mock transport base64 PNG is decoded and written to the output dir', async () => {
    const png = await validPng(32, 16)
    const prompt = buildDefaultArqweliaPrompt('A').prompt
    const out = tmpOut('aqw-phase0a-zai-png-')
    const result = await zaiImageAdapter.runSmoke({
      ...gateOpenOptions({ builtPrompt: prompt, outDir: out }),
      normalizedImageBuffer: png,
      transport: async () => ({ data: [{ base64: png.toString('base64') }] }),
    })
    expect(result.ok).toBe(true)
    expect(result.externalCalls).toBe(1)
    expect(result.actualCostEur).toBeNull()
    expect(result.billingStatus).toBe('unknown')
    expect(result.officialPricingSource).toBeNull()
    expect(result.outputPath).toBeDefined()
    const written = readFileSync(result.outputPath!)
    expect(written.equals(png)).toBe(true)
    expect(written.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  })

  it('openai: mock transport b64_json PNG is decoded and written', async () => {
    const png = await validPng(48, 24)
    const prompt = buildDefaultArqweliaPrompt('B').prompt
    const out = tmpOut('aqw-phase0a-oai-png-')
    const result = await openaiImageAdapter.runSmoke({
      ...gateOpenOptions({ providerId: 'openai-gpt-image', model: 'gpt-image-1', builtPrompt: prompt, outDir: out }),
      normalizedImageBuffer: png,
      transport: async () => ({ b64_json: png.toString('base64') }),
    })
    expect(result.ok).toBe(true)
    expect(result.externalCalls).toBe(1)
    expect(result.actualCostEur).toBeNull()
    expect(result.billingStatus).toBe('unknown')
    const written = readFileSync(result.outputPath!)
    expect(written.equals(png)).toBe(true)
  })

  it('a would-be real call is always conservatively billed (unknown / 1 / null)', async () => {
    const png = await validPng()
    const prompt = buildDefaultArqweliaPrompt('A').prompt
    const out = tmpOut('aqw-phase0a-conservative-')
    const result = await zaiImageAdapter.runSmoke({
      ...gateOpenOptions({ builtPrompt: prompt, outDir: out }),
      normalizedImageBuffer: png,
      transport: async () => ({ data: [{ base64: png.toString('base64') }] }),
    })
    expect(result.billingStatus).toBe('unknown')
    expect(result.externalCalls).toBe(1)
    expect(result.actualCostEur).toBeNull()
    const snap = billingFromCaughtError(new Error('generic')) // conservative default
    expect(snap).toMatchObject({ billingStatus: 'unknown', externalCalls: 1, actualCostEur: null })
  })

  it('provider transport errors are sanitized (no secret, no local path)', async () => {
    const prompt = buildDefaultArqweliaPrompt('A').prompt
    const out = tmpOut('aqw-phase0a-sanitize-')
    const transport = async () => {
      throw new Error(`internal sk-fake-456 failure at /Users/someone/secret`)
    }
    const zaiError = await zaiImageAdapter
      .runSmoke({ ...gateOpenOptions({ builtPrompt: prompt, outDir: out }), transport })
      .catch((error: unknown) => error)
    expect(zaiError).toBeInstanceOf(ArqweliaProviderError)
    expect(String(zaiError instanceof Error ? zaiError.message : zaiError)).not.toContain('sk-fake-456')
    expect(String(zaiError instanceof Error ? zaiError.message : zaiError)).not.toContain('/Users/')

    const oaiError = await openaiImageAdapter
      .runSmoke({
        ...gateOpenOptions({ providerId: 'openai-gpt-image', model: 'gpt-image-1', builtPrompt: prompt, outDir: out }),
        transport: async () => {
          throw new Error(`secret sk-fake-999 leaked`)
        },
      })
      .catch((error: unknown) => error)
    expect(oaiError).toBeInstanceOf(ArqweliaProviderError)
    expect(String(oaiError instanceof Error ? oaiError.message : oaiError)).not.toContain('sk-fake-999')
  })
})

describe('ARQWELIA Lot 2 Phase 0A — THREE-GATE block (real call impossible)', () => {
  it('ensurePhase0AGate requires all three gates', () => {
    expect(() => ensurePhase0AGate({ realCallAuthorized: false, budgetMaxEur: 5, phase0aExecute: true })).toThrow(/authorization/)
    expect(() => ensurePhase0AGate({ realCallAuthorized: true, budgetMaxEur: 0, phase0aExecute: true })).toThrow(/budget/)
    expect(() => ensurePhase0AGate({ realCallAuthorized: true, budgetMaxEur: 5, phase0aExecute: false })).toThrow(/Phase 0A/)
    expect(() => ensurePhase0AGate({ realCallAuthorized: true, budgetMaxEur: 5, phase0aExecute: true })).not.toThrow()
  })

  const missing = async (adapter: typeof zaiImageAdapter, opts: Record<string, unknown>) => {
    const prompt = buildDefaultArqweliaPrompt('A').prompt
    return adapter
      .runSmoke({
        ...gateOpenOptions({ builtPrompt: prompt }),
        ...opts,
        transport: async () => ({ data: [{ base64: '' }] }),
      })
      .catch((error: unknown) => error)
  }

  it('zai refuses when authorization is missing', async () => {
    const err = await missing(zaiImageAdapter, { realCallAuthorized: false, phase0aExecute: true, budgetMaxEur: 5 })
    expect(String(err instanceof Error ? err.message : err)).toMatch(/authorization/)
  })

  it('zai refuses when budget is missing', async () => {
    const err = await missing(zaiImageAdapter, { realCallAuthorized: true, phase0aExecute: true, budgetMaxEur: 0 })
    expect(String(err instanceof Error ? err.message : err)).toMatch(/budget/)
  })

  it('zai refuses when the Phase 0A execution gate is missing', async () => {
    const err = await missing(zaiImageAdapter, { realCallAuthorized: true, phase0aExecute: false, budgetMaxEur: 5 })
    expect(String(err instanceof Error ? err.message : err)).toMatch(/Phase 0A|NOT IMPLEMENTED/)
  })

  it('openai refuses for each missing gate too', async () => {
    const prompt = buildDefaultArqweliaPrompt('A').prompt
    const base = { ...gateOpenOptions({ providerId: 'openai-gpt-image', model: 'gpt-image-1', builtPrompt: prompt }) }
    const cases = [
      { realCallAuthorized: false, phase0aExecute: true, budgetMaxEur: 5, expect: /authorization/ },
      { realCallAuthorized: true, phase0aExecute: true, budgetMaxEur: 0, expect: /budget/ },
      { realCallAuthorized: true, phase0aExecute: false, budgetMaxEur: 5, expect: /Phase 0A|NOT IMPLEMENTED/ },
    ]
    for (const testCase of cases) {
      const err = await openaiImageAdapter
        .runSmoke({
          ...base,
          ...testCase,
          transport: async () => ({ b64_json: '' }),
        })
        .catch((error: unknown) => error)
      expect(String(err instanceof Error ? err.message : err)).toMatch(testCase.expect)
    }
  })

  it('with all three gates set, an injected mock transport runs (still no network)', async () => {
    const png = await validPng()
    const prompt = buildDefaultArqweliaPrompt('A').prompt
    const out = tmpOut('aqw-phase0a-allgates-')
    const transport = vi.fn(async () => ({ data: [{ base64: png.toString('base64') }] }))
    const result = await zaiImageAdapter.runSmoke({
      ...gateOpenOptions({ builtPrompt: prompt, outDir: out }),
      normalizedImageBuffer: png,
      transport,
    })
    expect(result.ok).toBe(true)
    expect(transport).toHaveBeenCalledTimes(1)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('with all three gates set but NO injected transport the adapter still refuses', async () => {
    const prompt = buildDefaultArqweliaPrompt('A').prompt
    const err = await zaiImageAdapter
      .runSmoke({ ...gateOpenOptions({ builtPrompt: prompt }), normalizedImageBuffer: await validPng() })
      .catch((error: unknown) => error)
    expect(String(err instanceof Error ? err.message : err)).toMatch(/NOT IMPLEMENTED|Phase 0A/)
  })

  it('CLI: all three env gates open still cannot make a real call (default transport NOT IMPLEMENTED)', async () => {
    const srcDir = tmpOut('aqw-phase0a-cli-img-')
    const imagePath = join(srcDir, 'source.jpg')
    const jpeg = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 40, g: 120, b: 200 } },
    })
      .jpeg()
      .toBuffer()
    const { writeFileSync } = await import('node:fs')
    writeFileSync(imagePath, jpeg)
    const out = tmpOut('aqw-phase0a-cli-')
    const result = runCli(['--provider', 'zai-glm', '--image', imagePath, '--out', out, '--concept', 'A'], {
      ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '10',
      ARQWELIA_BENCHMARK_PHASE0A_EXECUTE: 'true',
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('phase0aExecute=true')
    expect(result.stdout).toContain('result=not-implemented (awaiting Gate)')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')
    expect(result.stdout).not.toContain('DRY RUN — NO EXTERNAL CALL')
  })

  it('CLI: dry run when any gate is closed prints DRY RUN and zero calls', () => {
    const out = tmpOut('aqw-phase0a-cli-dry-')
    const result = runCli(['--provider', 'zai-glm', '--out', out, '--concept', 'A'])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('DRY RUN — NO EXTERNAL CALL')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')
    expect(result.stdout).toContain('phase0aExecute=false')
  })
})

describe('ARQWELIA Lot 2 Phase 0A — report hygiene and candidate states', () => {
  it('CLI zai dry-run report is PII-free, path-free, secret-free, and passes assertNoPersonalData', () => {
    const out = tmpOut('aqw-phase0a-report-')
    const result = runCli(['--provider', 'zai-glm', '--out', out, '--concept', 'A', '--dataset-id', 'item001'])
    expect(result.status).toBe(0)
    const jsons = readdirSync(out).filter((file) => file.endsWith('.json'))
    const report = JSON.parse(readFileSync(join(out, jsons[0]), 'utf8'))
    const raw = JSON.stringify(report)
    expect(report.prompt.concept).toBe('A')
    expect(report.prompt.version).toBe('arqwelia-lot2-v1')
    expect(report.prompt.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(report).not.toHaveProperty('promptA')
    expect(report).not.toHaveProperty('imagePath')
    expect(raw).not.toContain(process.env.HOME ?? '/Users/')
    expect(raw).not.toMatch(/sk-|nvapi-|whsec_/)
    expect(() => assertNoPersonalData(report)).not.toThrow()
  })

  it('candidate states and models are documented', () => {
    const nvidia = getArqweliaBenchmarkCandidate('nvidia-nim')!
    const zai = getArqweliaBenchmarkCandidate('zai-glm')!
    const openai = getArqweliaBenchmarkCandidate('openai-gpt-image')!
    const mock = getArqweliaBenchmarkCandidate('mock')!
    expect(nvidia.state).toBe('blocked_missing_capability')
    expect(nvidia.supportsImageEditing).toBe(false)
    expect(zai.state).toBe('ready_for_authorized_smoke')
    expect(zai.model).toBe('tbd') // model string NOT verified from the SDK
    expect(zai.supportsImageEditing).toBe(true)
    expect(openai.state).toBe('ready_for_authorized_smoke')
    expect(openai.model).toBe('gpt-image-1')
    expect(openai.supportsImageEditing).toBe(true)
    expect(mock.state).toBe('ready_for_authorized_smoke')
    for (const candidate of arqweliaBenchmarkCandidates) {
      expect(candidate.estimateOfficialCost()).toMatchObject({ known: false })
      expect(candidate.estimateOfficialCost().note).toContain('UNKNOWN — TO BE MEASURED IN LOT 0')
    }
  })

  it('zai model is tbd: the SDK exposes no provable default edit model', () => {
    expect(ARQWELIA_BENCHMARK_PHASE0A_EXECUTE).toBe(false) // default env posture
    expect(zaiImageAdapter.model).toBe('tbd')
    expect(zaiImageAdapter.validateConfiguration().ok).toBe(false) // no config in test env
  })
})

describe('ARQWELIA Lot 2 Phase 0A — no network in tests', () => {
  it('the global fetch spy was never invoked across the whole suite', () => {
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('the zai adapter never imports or calls the real SDK and never calls fetch', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/lib/arqwelia-benchmark/adapters/zai-image-adapter.mjs'), 'utf8')
    expect(source).not.toMatch(/from\s+['"]z-ai-web-dev-sdk/)
    expect(source).not.toMatch(/require\s*\(\s*['"]z-ai-web-dev-sdk/)
    expect(source).not.toMatch(/fetch\s*\(/)
  })

  it('the openai adapter never calls fetch and has no hard-coded region/pricing', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/lib/arqwelia-benchmark/adapters/openai-image-adapter.mjs'), 'utf8')
    expect(source).not.toMatch(/fetch\s*\(/)
    expect(source).toMatch(/retention|region/i)
    expect(source).not.toMatch(/eu-central|us-east|data-residency-has-this/)
  })

  it('this test file never calls fetch and never imports the real SDK', () => {
    const source = readFileSync(TEST_FILE, 'utf8')
    const marker = 'f' + 'etch' + '('
    expect(source).not.toContain(marker)
    expect(source).not.toMatch(/from\s+['"]z-ai-web-dev-sdk/)
  })

  it('ensureNoRealCall still guards the pre-existing two-gate contract', () => {
    expect(() => ensureNoRealCall({ realCallAuthorized: false, budgetMaxEur: 5 })).toThrow(/authorization/)
    expect(() => ensureNoRealCall({ realCallAuthorized: true, budgetMaxEur: 0 })).toThrow(/budget/)
    expect(() => ensureNoRealCall({ realCallAuthorized: true, budgetMaxEur: 1 })).not.toThrow()
  })
})
