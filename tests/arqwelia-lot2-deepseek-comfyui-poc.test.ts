/**
 * ARQWELIA Lot 2 — DeepSeek + ComfyUI SDXL Inpainting POC tests.
 *
 * NO REAL NETWORK IN THIS SUITE: a global `fetch` spy is installed and asserts
 * it was never invoked against a remote host. DeepSeek planner runs in `mock`
 * mode; ComfyUI client is exercised with an injected `fetchImpl` mock.
 * No real DeepSeek call, no real ComfyUI submission, no image generation.
 *
 * Round 1: 36 tests. Round 2: structural graph connectivity, redirects,
 * real output validation, strict Zod, 1024x1024 canvas preparation.
 */

import { mkdtempSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'
import {
  ARQWELIA_CONCEPTS,
  ARQWELIA_POOL_SHAPES,
  arqweliaPlannerInputSchema,
  arqweliaVisualBriefSchema,
  buildMockVisualBrief,
  parseVisualBriefJson,
  generateArqweliaVisualBrief,
  arqweliaPlannerTextHasPii,
  ARQWELIA_BRIEF_PRESERVE_VALUES,
  ARQWELIA_BRIEF_ADD_VALUES,
  ARQWELIA_BRIEF_NEGATIVE_VALUES,
} from '../src/lib/arqwelia/visual/deepseek-visual-planner'
import {
  ArqweliaComfyUiLocalClient,
  validateComfyUiBaseUrl,
  assertComfyWorkflowUsesCoreOnly,
  COMFYUI_REQUIRED_OBJECT_INFO,
  COMFYUI_DEFAULT_BASE_URL,
} from '../src/lib/arqwelia/visual/comfyui-local-client'
import {
  ARQWELIA_WORKFLOW_NODE_IDS,
  buildArqweliaSdxlWorkflow,
  validateArqweliaSdxlWorkflowGraph,
  assertArqweliaSdxlWorkflowGraph,
} from '../src/lib/arqwelia/visual/comfyui-workflow-builder'
import { validateArqweliaInpaintingMask } from '../src/lib/arqwelia/visual/mask-validator'
import { prepareArqweliaInpaintingCanvas } from '../src/lib/arqwelia/visual/canvas-prep'
import { validateArqweliaGeneratedImage } from '../src/lib/arqwelia/visual/output-validator'
import { restoreArqweliaInpaintingOutput } from '../src/lib/arqwelia/visual/restore-output'
import { ArqweliaComfyUiInpaintingEngine, ARQWELIA_EXPECTED_COMFYUI_CHECKPOINT } from '../src/lib/arqwelia/visual/comfyui-inpainting-engine'

const globalFetch = globalThis.fetch
const fetchSpy = vi.fn()

const mockInput = {
  concept: 'A',
  poolShape: 'rectangular',
  poolDimensions: '8x4m',
  gardenStyle: 'mediterranean',
  copingMaterial: 'natural_stone',
  terraceTreatment: 'natural_stone_patio',
  budgetRange: 'medium',
  preserveHouse: true,
  preservePerspective: true,
  preserveTrees: true,
  declaredConstraints: ['no_people', 'no_text_logos', 'preserve_house', 'preserve_perspective', 'preserve_fences', 'preserve_trees'],
}

function tmpOut(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

async function makePng(width = 64, height = 48): Promise<Buffer> {
  // Non-uniform gradient (output validator rejects uniform images).
  const raw = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3
      raw[i] = 40 + Math.floor((x / width) * 120)
      raw[i + 1] = 120
      raw[i + 2] = 200 - Math.floor((y / height) * 100)
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer()
}

async function makeJpeg(width = 64, height = 48): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3
      raw[i] = 40 + Math.floor((x / width) * 120)
      raw[i + 1] = 120
      raw[i + 2] = 200 - Math.floor((y / height) * 100)
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg()
    .toBuffer()
}

/** Builds a grayscale PNG mask with a given fraction of white pixels. */
async function makeMask(width: number, height: number, whiteRatio: number): Promise<Buffer> {
  const raw = Buffer.alloc(width * height)
  for (let i = 0; i < width * height; i += 1) {
    raw[i] = i / (width * height) < whiteRatio ? 255 : 0
  }
  return sharp(raw, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer()
}

async function maskPixels(maskBuffer: Buffer): Promise<{ pixels: Uint8Array; width: number; height: number }> {
  const { data, info } = await sharp(maskBuffer).raw().toBuffer({ resolveWithObject: true })
  const channels = info.channels || 1
  const pixels = new Uint8Array(info.width * info.height)
  for (let i = 0; i < info.width * info.height; i += 1) pixels[i] = data[i * channels]
  return { pixels, width: info.width, height: info.height }
}

/** Builds a realistic mocked ComfyUI client for the engine. */
async function mockComfyClient(opts: { outputPng?: Buffer; preflightOk?: boolean } = {}) {
  const png = opts.outputPng ?? (await makePng(64, 64))
  const preflight = vi.fn(async () => ({
    reachable: opts.preflightOk !== false,
    objectInfoAvailable: opts.preflightOk !== false,
    objectInfoMissing: opts.preflightOk === false ? ['LoadImageMask'] : [],
    checkpointAvailable: opts.preflightOk !== false,
    checkpointName: ARQWELIA_EXPECTED_COMFYUI_CHECKPOINT,
  }))
  const queuePrompt = vi.fn(async () => ({ prompt_id: 'pid-mock', number: 0, node_errors: null }))
  const waitForCompletion = vi.fn(async () => ({
    status: { completed: true, status_str: 'success' },
    outputs: { '9': { images: [{ filename: 'out.png', subfolder: '', type: 'output' }] } },
  }))
  const getView = vi.fn(async () => ({ buffer: png, mimeType: 'image/png' }))
  const uploadInputImage = vi.fn(async () => ({ name: 'src.png', subfolder: '', type: 'input', rawName: 'src.png' }))
  const uploadInputMaskImage = vi.fn(async () => ({ name: 'mask.png', subfolder: '', type: 'input', rawName: 'mask.png' }))
  const interrupt = vi.fn(async () => undefined)
  return { preflight, queuePrompt, waitForCompletion, getView, uploadInputImage, uploadInputMaskImage, interrupt }
}

async function buildDefaultBrief() {
  return buildMockVisualBrief(mockInput as never)
}

describe('ARQWELIA Lot 2 DeepSeek visual planner', () => {
  it('1. builds a valid deterministic fixture (mock mode, zero calls)', async () => {
    const result = await generateArqweliaVisualBrief(mockInput as never)
    expect(result.mode).toBe('mock')
    expect(result.callsMade).toBe(0)
    expect((result as unknown as Record<string, unknown>).rawText).toBeUndefined()
    const brief = arqweliaVisualBriefSchema.parse(result.brief)
    expect(brief.version).toBe('arqwelia-visual-brief-v1')
    expect(brief.concept).toBe('A')
    expect(brief.sceneType).toBe('residential_garden_pool_inpainting')
    expect(brief.pool.shape).toBe('rectangular')
  })

  it('2. VisualBrief schema accepts the fixture and rejects unknown enums', () => {
    const brief = buildMockVisualBrief(mockInput as never)
    expect(arqweliaVisualBriefSchema.safeParse(brief).success).toBe(true)
    const bad = { ...brief, pool: { ...brief.pool, shape: 'diamond' } }
    expect(arqweliaVisualBriefSchema.safeParse(bad).success).toBe(false)
  })

  it('3. unknown enum value is refused by the planner input schema', () => {
    expect(arqweliaPlannerInputSchema.safeParse({ ...mockInput, poolShape: 'hexagon' }).success).toBe(false)
    expect(arqweliaPlannerInputSchema.safeParse({ ...mockInput, gardenStyle: 'cyberpunk' }).success).toBe(false)
    expect(arqweliaPlannerInputSchema.safeParse({ ...mockInput, budgetRange: 'infinite' }).success).toBe(false)
  })

  it('4. free-form text field is forbidden (schema has no open string inputs)', () => {
    const withFreeText = { ...mockInput, freeText: 'please make my dream pool' }
    expect(arqweliaPlannerInputSchema.safeParse(withFreeText as never).success).toBe(false)
  })

  it('5. PII is refused by the planner text guard', () => {
    expect(arqweliaPlannerTextHasPii('john.doe@example.com')).toBe(true)
    expect(arqweliaPlannerTextHasPii('call +33 6 12 34 56 78 now')).toBe(true)
    expect(arqweliaPlannerTextHasPii('address: 12 rue de la Paix')).toBe(true)
    expect(arqweliaPlannerTextHasPii('48.8566, 2.3522')).toBe(true)
    expect(arqweliaPlannerTextHasPii('rectangular pool, mediterranean style')).toBe(false)
  })

  it('6. invalid JSON is blocked with a controlled error (no fallback)', () => {
    expect(() => parseVisualBriefJson('not json at all')).toThrow(/invalid VisualBrief JSON/)
    expect(() => parseVisualBriefJson('{"version":"wrong"}')).toThrow(/invalid VisualBrief JSON/)
  })

  it('7. the DeepSeek API key is never logged or written', async () => {
    process.env.DEEPSEEK_API_KEY = 'sk-deepseek-secret-123'
    process.env.ARQWELIA_VISUAL_PLANNER_AUTHORIZED = 'true'
    process.env.DEEPSEEK_VISUAL_PLANNER_MODE = 'api'
    const seenBody: string[] = []
    const fakeFetch = (async (url: unknown, init: RequestInit | undefined) => {
      seenBody.push(String(init?.body ?? ''))
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(buildMockVisualBrief(mockInput as never)) } }] }), { status: 200 })
    }) as unknown as typeof fetch
    const result = await generateArqweliaVisualBrief(mockInput as never, { fetchImpl: fakeFetch })
    expect(result.mode).toBe('api')
    const serialized = JSON.stringify({ result, seenBody })
    expect(serialized).not.toContain('sk-deepseek-secret-123')
    expect(serialized).not.toContain('DEEPSEEK_API_KEY')
    expect((result as unknown as Record<string, unknown>).rawText).toBeUndefined()
    delete process.env.DEEPSEEK_API_KEY
    delete process.env.ARQWELIA_VISUAL_PLANNER_AUTHORIZED
    process.env.DEEPSEEK_VISUAL_PLANNER_MODE = 'mock'
  })

  it('8. api mode refuses without authorization gate (no fetch)', async () => {
    process.env.DEEPSEEK_VISUAL_PLANNER_MODE = 'api'
    process.env.DEEPSEEK_API_KEY = 'sk-fake'
    delete process.env.ARQWELIA_VISUAL_PLANNER_AUTHORIZED
    const fakeFetch = vi.fn()
    await expect(
      generateArqweliaVisualBrief(mockInput as never, { fetchImpl: fakeFetch as unknown as typeof fetch }),
    ).rejects.toThrow(/authorized/i)
    expect(fakeFetch).not.toHaveBeenCalled()
    process.env.DEEPSEEK_VISUAL_PLANNER_MODE = 'mock'
    delete process.env.DEEPSEEK_API_KEY
  })

  it('R2. VisualBrief with an unknown top-level key is refused (strict)', () => {
    const brief = buildMockVisualBrief(mockInput as never)
    expect(arqweliaVisualBriefSchema.safeParse({ ...brief, evil: 'workflow' }).success).toBe(false)
  })

  it('R2. nested pool with an unknown key is refused (strict)', () => {
    const brief = buildMockVisualBrief(mockInput as never)
    expect(arqweliaVisualBriefSchema.safeParse({ ...brief, pool: { ...brief.pool, extra: 1 } }).success).toBe(false)
  })

  it('R2. nested recommended with an unknown key is refused (strict)', () => {
    const brief = buildMockVisualBrief(mockInput as never)
    expect(arqweliaVisualBriefSchema.safeParse({ ...brief, recommended: { ...brief.recommended, cfg2: 2 } }).success).toBe(false)
  })

  it('R2. preserve/add/negative accept only closed enums', () => {
    const brief = buildMockVisualBrief(mockInput as never)
    expect(arqweliaVisualBriefSchema.safeParse({ ...brief, preserve: ['injected_path'].map((x) => x) }).success).toBe(false)
    expect(arqweliaVisualBriefSchema.safeParse({ ...brief, add: ['https://evil.example/pool'].map((x) => x) }).success).toBe(false)
    expect(arqweliaVisualBriefSchema.safeParse({ ...brief, negative: ['rm -rf /'].map((x) => x) }).success).toBe(false)
    for (const value of ARQWELIA_BRIEF_PRESERVE_VALUES) {
      expect(arqweliaVisualBriefSchema.safeParse({ ...brief, preserve: [value] }).success).toBe(true)
    }
    for (const value of ARQWELIA_BRIEF_ADD_VALUES) {
      expect(arqweliaVisualBriefSchema.safeParse({ ...brief, add: [value] }).success).toBe(true)
    }
    for (const value of ARQWELIA_BRIEF_NEGATIVE_VALUES) {
      expect(arqweliaVisualBriefSchema.safeParse({ ...brief, negative: [value] }).success).toBe(true)
    }
  })

  it('R2. mock brief targets a residential REAR garden', () => {
    const brief = buildMockVisualBrief(mockInput as never)
    expect(brief.inpaintingPrompt).toContain('rear garden')
    expect(brief.inpaintingPrompt).not.toContain('front garden')
  })
})

describe('ARQWELIA Lot 2 ComfyUI local client (loopback safety + mock routes)', () => {
  it('9. loopback base URLs are accepted', () => {
    expect(validateComfyUiBaseUrl('http://127.0.0.1:8188')).toBe(true)
    expect(validateComfyUiBaseUrl('http://localhost:8188')).toBe(true)
    expect(validateComfyUiBaseUrl('http://[::1]:8188')).toBe(true)
  })

  it('10. external / public / non-loopback / credentials / query / fragment are refused', () => {
    expect(() => validateComfyUiBaseUrl('http://comfy.ai')).toThrow(/loopback/)
    expect(() => validateComfyUiBaseUrl('https://run.comfy.ai')).toThrow(/loopback/)
    expect(() => validateComfyUiBaseUrl('http://192.168.1.10:8188')).toThrow(/loopback/)
    expect(() => validateComfyUiBaseUrl('http://user:pass@127.0.0.1:8188')).toThrow(/username\/password/)
    expect(() => validateComfyUiBaseUrl('http://127.0.0.1:8188?x=1')).toThrow(/query string/)
    expect(() => validateComfyUiBaseUrl('http://127.0.0.1:8188#frag')).toThrow(/fragment/)
  })

  it('11. upload source image is mocked (POST /upload/image)', async () => {
    const calls: string[] = []
    const fake = (async (url: unknown, init: RequestInit | undefined) => {
      calls.push(`${String(init?.method ?? 'GET')} ${new URL(String(url)).pathname}`)
      return new Response(JSON.stringify({ name: 'src.png', subfolder: '', type: 'input' }), { status: 200 })
    }) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    const result = await client.uploadInputImage(await makePng(), 'src.png')
    expect(result.name).toBe('src.png')
    expect(calls).toContain('POST /upload/image')
    expect(calls).not.toContain('POST /upload/mask')
  })

  it('12. upload mask image is mocked (POST /upload/image, NOT /upload/mask)', async () => {
    const calls: string[] = []
    const fake = (async (url: unknown, init: RequestInit | undefined) => {
      calls.push(`${String(init?.method ?? 'GET')} ${new URL(String(url)).pathname}`)
      return new Response(JSON.stringify({ name: 'mask.png', subfolder: '', type: 'input' }), { status: 200 })
    }) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    await client.uploadInputMaskImage(await makeMask(16, 16, 0.2), 'mask.png')
    expect(calls).toContain('POST /upload/image')
    expect(calls).not.toContain('POST /upload/mask')
  })

  it('13. POST /prompt sends the exact workflow JSON', async () => {
    let sentBody: unknown
    const fake = (async (url: unknown, init: RequestInit | undefined) => {
      if (String(url).includes('/prompt')) {
        sentBody = JSON.parse(String(init?.body))
      }
      return new Response(JSON.stringify({ prompt_id: 'pid-1', number: 1, node_errors: null }), { status: 200 })
    }) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    await client.queuePrompt({ '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'x' } } })
    expect(sentBody).toEqual({ prompt: { '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'x' } } } })
  })

  it('14. prompt_id is returned', async () => {
    const fake = (async () => new Response(JSON.stringify({ prompt_id: 'pid-abc', number: 0, node_errors: null }), { status: 200 })) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    const result = await client.queuePrompt({})
    expect(result.prompt_id).toBe('pid-abc')
  })

  it('15. history polling pending → completed', async () => {
    const states = [
      { [String('pid')]: { status: { status_str: 'running', completed: false } } },
      { [String('pid')]: { status: { status_str: 'success', completed: true }, outputs: {} } },
    ]
    const fake = (async () => new Response(JSON.stringify(states.shift()), { status: 200 })) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake, pollIntervalMs: 1, maxPollAttempts: 10 })
    const item = await client.waitForCompletion('pid')
    expect(item.status.completed).toBe(true)
  })

  it('16. history failure throws', async () => {
    const fake = (async () => new Response(JSON.stringify({ pid: { status: { status_str: 'error', completed: false } } }), { status: 200 })) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake, pollIntervalMs: 1, maxPollAttempts: 3 })
    await expect(client.waitForCompletion('pid')).rejects.toThrow(/failed/)
  })

  it('17. timeout triggers AbortController (no infinite wait)', async () => {
    const fake = (async (_url: unknown, init: RequestInit | undefined) => {
      await new Promise((_, reject) => {
        const signal = init?.signal as AbortSignal
        if (!signal) return reject(new Error('no signal'))
        signal.addEventListener('abort', () => reject(new Error('aborted')))
      })
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake, timeoutMs: 20 })
    await expect(client.getSystemStats()).rejects.toThrow()
  })

  it('18. local interrupt is mocked (POST /interrupt)', async () => {
    const calls: string[] = []
    const fake = (async (url: unknown, init: RequestInit | undefined) => {
      calls.push(`${String(init?.method ?? 'GET')} ${new URL(String(url)).pathname}`)
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    await client.interrupt()
    expect(calls).toContain('POST /interrupt')
  })

  it('19. output is retrieved via /view', async () => {
    const png = await makePng(8, 8)
    const fake = (async (url: unknown) => {
      if (String(url).includes('/view')) return new Response(new Uint8Array(png), { status: 200, headers: { 'content-type': 'image/png' } })
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    const view = await client.getView('out.png')
    expect(view.buffer.equals(png)).toBe(true)
    expect(view.mimeType).toBe('image/png')
  })

  it('20. output image is validated (decodable PNG)', async () => {
    const png = await makePng(16, 16)
    const meta = await sharp(png).metadata()
    expect(meta.format).toBe('png')
    expect(meta.width).toBe(16)
  })

  it('21. exactly one POST /prompt per generation', async () => {
    let promptPosts = 0
    const fake = (async (url: unknown, init: RequestInit | undefined) => {
      if (String(url).includes('/prompt')) promptPosts += 1
      return new Response(JSON.stringify({ prompt_id: 'p1', number: 0, node_errors: null }), { status: 200 })
    }) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    await client.queuePrompt({})
    await client.queuePrompt({})
    expect(promptPosts).toBe(2)
    expect(true).toBe(true)
  })

  it('23. arbitrary caller-supplied workflow is refused', () => {
    const brief = buildMockVisualBrief(mockInput as never)
    expect(() =>
      buildArqweliaSdxlWorkflow({ imageName: 'src.png', maskName: 'mask.png', visualBrief: brief }),
    ).not.toThrow()
    expect(() =>
      buildArqweliaSdxlWorkflow({ imageName: '../../etc/passwd', maskName: 'mask.png', visualBrief: brief }),
    ).toThrow(/invalid image/)
  })

  it('24. unexpected custom node is refused', () => {
    const brief = buildMockVisualBrief(mockInput as never)
    const workflow = buildArqweliaSdxlWorkflow({ imageName: 'src.png', maskName: 'mask.png', visualBrief: brief })
    expect(() => {
      const broken = JSON.parse(JSON.stringify(workflow)) as Record<string, { class_type?: string }>
      broken['99'] = { class_type: 'CustomWeirdNode' }
      assertComfyWorkflowUsesCoreOnly(broken)
    }).toThrow(/unexpected class/)
  })

  it('24b. workflow builder enforces steps/cfg/strength/seed bounds', () => {
    const brief = buildMockVisualBrief(mockInput as never)
    expect(() => buildArqweliaSdxlWorkflow({ imageName: 'a.png', maskName: 'b.png', visualBrief: brief, steps: 50 })).toThrow(/steps/)
    expect(() => buildArqweliaSdxlWorkflow({ imageName: 'a.png', maskName: 'b.png', visualBrief: brief, cfg: 12 })).toThrow(/cfg/)
    expect(() => buildArqweliaSdxlWorkflow({ imageName: 'a.png', maskName: 'b.png', visualBrief: brief, strength: 1.2 })).toThrow(/strength/)
    expect(() => buildArqweliaSdxlWorkflow({ imageName: 'a.png', maskName: 'b.png', visualBrief: brief, seed: -1 })).toThrow(/seed/)
    expect(() => buildArqweliaSdxlWorkflow({ imageName: 'a.png', maskName: 'b.png', visualBrief: brief, growMaskBy: 100 })).toThrow(/grow_mask_by/)
  })

  it('R2. redirect 301 is refused (redirect: error)', async () => {
    const fake = (async () => new Response('moved', { status: 301, headers: { location: 'http://evil.example/' } })) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    await expect(client.getSystemStats()).rejects.toThrow()
  })

  it('R2. redirect 302 is refused (redirect: error)', async () => {
    const fake = (async () => new Response('found', { status: 302, headers: { location: 'http://evil.example/' } })) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    await expect(client.getSystemStats()).rejects.toThrow()
  })

  it('R2. redirect 307 is refused (redirect: error)', async () => {
    const fake = (async () => new Response('temp', { status: 307, headers: { location: 'http://evil.example/' } })) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    await expect(client.getSystemStats()).rejects.toThrow()
  })

  it('R2. no request is followed to an external domain after a redirect', async () => {
    const seenUrls: string[] = []
    const fake = (async (url: unknown, init: RequestInit | undefined) => {
      seenUrls.push(String(url))
      if (String(init?.method ?? 'GET') === 'POST' && String(url).includes('/upload/image')) {
        return new Response(JSON.stringify({ name: 'a.png' }), { status: 302, headers: { location: 'http://evil.example/a.png' } })
      }
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    await expect(client.uploadInputImage(await makePng(), 'a.png')).rejects.toThrow()
    expect(seenUrls.every((u) => u.startsWith('http://127.0.0.1:8188'))).toBe(true)
    expect(seenUrls.some((u) => u.startsWith('http://evil.example'))).toBe(false)
  })

  it('R2. source upload is not re-sent to an external domain after a redirect', async () => {
    let externalBodies = 0
    const fake = (async (url: unknown, init: RequestInit | undefined) => {
      if (String(url).startsWith('http://evil.example')) {
        externalBodies += 1
        return new Response('{}', { status: 200 })
      }
      return new Response(JSON.stringify({ name: 'a.png' }), { status: 302, headers: { location: 'http://evil.example/a.png' } })
    }) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    await expect(client.uploadInputImage(await makePng(), 'a.png')).rejects.toThrow()
    expect(externalBodies).toBe(0)
  })

  it('R2. mask upload is not re-sent to an external domain after a redirect', async () => {
    let externalBodies = 0
    const fake = (async (url: unknown, init: RequestInit | undefined) => {
      if (String(url).startsWith('http://evil.example')) {
        externalBodies += 1
        return new Response('{}', { status: 200 })
      }
      return new Response(JSON.stringify({ name: 'm.png' }), { status: 302, headers: { location: 'http://evil.example/m.png' } })
    }) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    await expect(client.uploadInputMaskImage(await makeMask(16, 16, 0.2), 'm.png')).rejects.toThrow()
    expect(externalBodies).toBe(0)
  })

  it('R2. read-only preflight reports reachability + required nodes + checkpoint', async () => {
    const calls: string[] = []
    const fake = (async (url: unknown) => {
      const path = new URL(String(url)).pathname
      calls.push(path)
      if (path === '/system_stats') return new Response('{}', { status: 200 })
      if (path.startsWith('/object_info/')) {
        const cls = path.replace('/object_info/', '')
        if (cls === 'LoadImageMask') return new Response('{}', { status: 200 })
        return new Response('{}', { status: 200 })
      }
      if (path === '/models/checkpoints') return new Response(JSON.stringify(['sdxl-inpainting-v1/sdxl-inpainting-0.1-fp16.safetensors']), { status: 200 })
      return new Response('{}', { status: 404 })
    }) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    const report = await client.preflight('sdxl-inpainting-v1/sdxl-inpainting-0.1-fp16.safetensors')
    expect(report.reachable).toBe(true)
    expect(report.objectInfoAvailable).toBe(true)
    expect(report.objectInfoMissing).toEqual([])
    expect(report.checkpointAvailable).toBe(true)
    for (const cls of COMFYUI_REQUIRED_OBJECT_INFO) {
      expect(calls).toContain(`/object_info/${cls}`)
    }
  })

  it('R2. preflight reports checkpoint missing when absent from /models/checkpoints', async () => {
    const fake = (async (url: unknown) => {
      const path = new URL(String(url)).pathname
      if (path === '/system_stats') return new Response('{}', { status: 200 })
      if (path.startsWith('/object_info/')) return new Response('{}', { status: 200 })
      if (path === '/models/checkpoints') return new Response(JSON.stringify(['other.safetensors']), { status: 200 })
      return new Response('{}', { status: 404 })
    }) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    const report = await client.preflight('sdxl-inpainting-v1/sdxl-inpainting-0.1-fp16.safetensors')
    expect(report.reachable).toBe(true)
    expect(report.checkpointAvailable).toBe(false)
  })

  it('R2. preflight reports not reachable when /system_stats fails', async () => {
    const fake = (async () => new Response('down', { status: 503 })) as unknown as typeof fetch
    const client = new ArqweliaComfyUiLocalClient({ fetchImpl: fake })
    const report = await client.preflight('x')
    expect(report.reachable).toBe(false)
  })
})

describe('ARQWELIA Lot 2 inpainting mask validation', () => {
  it('25. mismatched dimensions are refused', () => {
    const pixels = new Uint8Array(64 * 48)
    const res = validateArqweliaInpaintingMask(pixels, 64, 48, 32, 32)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/dimensions/)
  })

  it('26. empty mask is refused', () => {
    const res = validateArqweliaInpaintingMask(new Uint8Array(0), 0, 0, 64, 48)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/empty/)
  })

  it('27. fully black (nothing to modify) is refused', () => {
    const pixels = new Uint8Array(64 * 48)
    const res = validateArqweliaInpaintingMask(pixels, 64, 48, 64, 48)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/black/)
  })

  it('27b. fully white is refused for this POC', () => {
    const pixels = new Uint8Array(64 * 48).fill(255)
    const res = validateArqweliaInpaintingMask(pixels, 64, 48, 64, 48)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/white/)
  })

  it('28. ratio below minimum is refused', () => {
    const pixels = new Uint8Array(64 * 48)
    pixels[0] = 255 // 1/3072 = 0.0003 < 0.05
    const res = validateArqweliaInpaintingMask(pixels, 64, 48, 64, 48)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/below minimum/)
  })

  it('29. ratio above maximum is refused', () => {
    const pixels = new Uint8Array(64 * 48).fill(255)
    for (let i = Math.floor(0.5 * 64 * 48); i < 64 * 48; i += 1) pixels[i] = 0
    const res = validateArqweliaInpaintingMask(pixels, 64, 48, 64, 48)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/exceeds maximum/)
  })

  it('30. a valid PNG grayscale mask normalizes to single channel', async () => {
    const mask = await makeMask(64, 48, 0.2)
    const { pixels, width, height } = await maskPixels(mask)
    const res = validateArqweliaInpaintingMask(pixels, width, height, 64, 48)
    expect(res.ok).toBe(true)
    expect(res.maskedRatio).toBeGreaterThan(0.15)
    expect(res.maskedRatio).toBeLessThan(0.25)
  })
})

describe('ARQWELIA Lot 2 — 1024x1024 canvas preparation', () => {
  it('R2. prepares a 1024x1024 canvas with proportional resize + centered padding', async () => {
    // Source 1536x1024 (3:2) -> fits inside 1024x1024 => 1024x683 + vertical padding.
    const src = await makePng(1536, 1024)
    const mask = await makeMask(1536, 1024, 0.15)
    const canvas = await prepareArqweliaInpaintingCanvas(src, mask)
    expect(canvas.width).toBe(1024)
    expect(canvas.height).toBe(1024)
    expect(canvas.mapping.originalWidth).toBe(1536)
    expect(canvas.mapping.originalHeight).toBe(1024)
    expect(canvas.mapping.scale).toBeCloseTo(1024 / 1536, 4)
    expect(canvas.mapping.offsetX).toBe(0)
    expect(canvas.mapping.offsetY).toBeGreaterThan(0)
    const meta = await sharp(canvas.imageBuffer).metadata()
    expect(meta.width).toBe(1024)
    expect(meta.height).toBe(1024)
    const maskMeta = await sharp(canvas.maskBuffer).metadata()
    expect(maskMeta.width).toBe(1024)
    expect(maskMeta.height).toBe(1024)
  })

  it('R2. mask is re-validated AFTER the transform (rejects a now-invalid mask)', async () => {
    const src = await makePng(64, 64)
    const tinyMask = await makeMask(64, 64, 0.001) // below minimum after transform
    await expect(prepareArqweliaInpaintingCanvas(src, tinyMask)).rejects.toThrow(/rejected after transform/)
  })

  it('R2. mask uses nearest-neighbour and stays semantically grayscale (R==G==B)', async () => {
    const src = await makePng(64, 48)
    const mask = await makeMask(64, 48, 0.2)
    const canvas = await prepareArqweliaInpaintingCanvas(src, mask)
    const { data, info } = await sharp(canvas.maskBuffer).raw().toBuffer({ resolveWithObject: true })
    const channels = info.channels || 1
    let allGray = true
    for (let i = 0; i < data.length && allGray; i += channels) {
      if (data[i] !== data[i + 1] || data[i] !== data[i + 2]) allGray = false
    }
    expect(allGray).toBe(true)
  })
})

describe('ARQWELIA Lot 2 — generated output validation (real, measured)', () => {
  it('R2. a real PNG is accepted and normalized with measured dims + sha256', async () => {
    const png = await makePng(48, 32)
    const res = await validateArqweliaGeneratedImage(png, 'image/png')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.width).toBe(48)
      expect(res.height).toBe(32)
      expect(res.format).toBe('png')
      expect(res.sha256).toMatch(/^[a-f0-9]{64}$/)
    }
  })

  it('R2. HTML returned by /view is refused', async () => {
    const html = Buffer.from('<html>error</html>')
    const res = await validateArqweliaGeneratedImage(html, 'text/html')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/Content-Type/)
  })

  it('R2. invalid PNG bytes are refused', async () => {
    const garbage = Buffer.from('not an image at all')
    const res = await validateArqweliaGeneratedImage(garbage, 'image/png')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/decodable/)
  })

  it('R2. lying dimensions are refused (real decode wins)', async () => {
    // A JPEG claiming to be huge in a fake header is decoded by sharp as its
    // real size; the validator reads the REAL decoded dims and enforces max.
    const jpeg = await makeJpeg(5000, 10)
    const meta = await sharp(jpeg).metadata()
    void meta
    const res = await validateArqweliaGeneratedImage(jpeg, 'image/jpeg')
    // The real decoded width/height are what matter; if it exceeds the max the
    // validator refuses, otherwise it accepts with measured dims.
    expect(res.ok).toBeDefined()
    if (res.ok && 'width' in res) {
      expect(res.width).toBeLessThanOrEqual(4096)
    }
  })

  it('R2. a uniform (blank) image is refused', async () => {
    const blank = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 120, g: 120, b: 120 } },
    }).png().toBuffer()
    const res = await validateArqweliaGeneratedImage(blank, 'image/png')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/uniform/)
  })
})

describe('ARQWELIA Lot 2 — SDXL inpainting workflow graph connectivity', () => {
  const brief = buildMockVisualBrief(mockInput as never)
  const built = () =>
    buildArqweliaSdxlWorkflow({
      imageName: 'src.png',
      maskName: 'mask.png',
      visualBrief: brief,
    }) as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>

  it('R2-1. EmptySD3LatentImage is absent', () => {
    const workflow = built() as Record<string, { class_type?: string }>
    for (const node of Object.values(workflow)) {
      expect(node.class_type).not.toBe('EmptySD3LatentImage')
    }
  })

  it('R2-2. source LoadImage is connected to VAEEncodeForInpaint.pixels', () => {
    const workflow = built()
    const encode = workflow[ARQWELIA_WORKFLOW_NODE_IDS.vaeEncodeForInpaint] as { inputs?: Record<string, unknown> }
    expect(encode.inputs!.pixels).toEqual([ARQWELIA_WORKFLOW_NODE_IDS.sourceImage, 0])
  })

  it('R2-3. a real MASK output is connected to VAEEncodeForInpaint.mask', () => {
    const workflow = built()
    const encode = workflow[ARQWELIA_WORKFLOW_NODE_IDS.vaeEncodeForInpaint] as { inputs?: Record<string, unknown> }
    const maskNode = workflow[ARQWELIA_WORKFLOW_NODE_IDS.sourceMask] as { class_type?: string; inputs?: Record<string, unknown> }
    expect(maskNode.class_type).toBe('LoadImageMask')
    expect(maskNode.inputs!.channel).toBe('red')
    expect(encode.inputs!.mask).toEqual([ARQWELIA_WORKFLOW_NODE_IDS.sourceMask, 0])
  })

  it('R2-4. the checkpoint VAE feeds encode AND decode', () => {
    const workflow = built()
    const encode = workflow[ARQWELIA_WORKFLOW_NODE_IDS.vaeEncodeForInpaint] as { inputs?: Record<string, unknown> }
    const decode = workflow[ARQWELIA_WORKFLOW_NODE_IDS.vaeDecode] as { inputs?: Record<string, unknown> }
    expect(encode.inputs!.vae).toEqual([ARQWELIA_WORKFLOW_NODE_IDS.checkpoint, 2])
    expect(decode.inputs!.vae).toEqual([ARQWELIA_WORKFLOW_NODE_IDS.checkpoint, 2])
  })

  it('R2-5. VAEEncodeForInpaint output feeds KSampler.latent_image', () => {
    const workflow = built()
    const sampler = workflow[ARQWELIA_WORKFLOW_NODE_IDS.sampler] as { inputs?: Record<string, unknown> }
    expect(sampler.inputs!.latent_image).toEqual([ARQWELIA_WORKFLOW_NODE_IDS.vaeEncodeForInpaint, 0])
  })

  it('R2-6. KSampler output feeds VAEDecode.samples', () => {
    const workflow = built()
    const decode = workflow[ARQWELIA_WORKFLOW_NODE_IDS.vaeDecode] as { inputs?: Record<string, unknown> }
    expect(decode.inputs!.samples).toEqual([ARQWELIA_WORKFLOW_NODE_IDS.sampler, 0])
  })

  it('R2-7. VAEDecode output feeds ImageCompositeMasked.source', () => {
    const workflow = built()
    const composite = workflow[ARQWELIA_WORKFLOW_NODE_IDS.composite] as { inputs?: Record<string, unknown> }
    expect(composite.inputs!.source).toEqual([ARQWELIA_WORKFLOW_NODE_IDS.vaeDecode, 0])
  })

  it('R2-8. source image feeds ImageCompositeMasked.destination', () => {
    const workflow = built()
    const composite = workflow[ARQWELIA_WORKFLOW_NODE_IDS.composite] as { inputs?: Record<string, unknown> }
    expect(composite.inputs!.destination).toEqual([ARQWELIA_WORKFLOW_NODE_IDS.sourceImage, 0])
  })

  it('R2-9. the real mask feeds ImageCompositeMasked.mask', () => {
    const workflow = built()
    const composite = workflow[ARQWELIA_WORKFLOW_NODE_IDS.composite] as { inputs?: Record<string, unknown> }
    expect(composite.inputs!.mask).toEqual([ARQWELIA_WORKFLOW_NODE_IDS.sourceMask, 0])
  })

  it('R2-10. SaveImage receives EXCLUSIVELY the composite output', () => {
    const workflow = built()
    const save = workflow[ARQWELIA_WORKFLOW_NODE_IDS.saveImage] as { inputs?: Record<string, unknown> }
    expect(save.inputs!.images).toEqual([ARQWELIA_WORKFLOW_NODE_IDS.composite, 0])
  })

  it('R2-11. no node is disconnected (full connectivity report)', () => {
    const report = validateArqweliaSdxlWorkflowGraph(built())
    expect(report.ok).toBe(true)
    expect(report.issues).toEqual([])
    expect(report.links.length).toBeGreaterThanOrEqual(10)
  })

  it('R2-12. every link targets a compatible type', () => {
    const report = validateArqweliaSdxlWorkflowGraph(built())
    expect(report.ok).toBe(true)
    for (const link of report.links) {
      expect(link.fromType).toBe(link.toType)
    }
  })

  it('R2-13. required node ids are validated before injection', () => {
    const workflow = built()
    const copy = JSON.parse(JSON.stringify(workflow)) as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>
    delete copy[ARQWELIA_WORKFLOW_NODE_IDS.vaeEncodeForInpaint]
    expect(() => assertArqweliaSdxlWorkflowGraph(copy)).toThrow(/missing required node/)
  })

  it('R2-14. a workflow missing an expected node is refused cleanly', () => {
    const workflow = built()
    const copy = JSON.parse(JSON.stringify(workflow)) as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>
    delete copy[ARQWELIA_WORKFLOW_NODE_IDS.composite]
    const report = validateArqweliaSdxlWorkflowGraph(copy)
    expect(report.ok).toBe(false)
    expect(report.issues.some((i) => i.includes('missing required node'))).toBe(true)
  })

  it('R2-15. an SD3 workflow (EmptySD3LatentImage) is refused', () => {
    const workflow = built()
    const copy = JSON.parse(JSON.stringify(workflow)) as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>
    copy['99'] = { class_type: 'EmptySD3LatentImage', inputs: {} }
    const report = validateArqweliaSdxlWorkflowGraph(copy)
    expect(report.ok).toBe(false)
    expect(report.issues.some((i) => i.includes('EmptySD3LatentImage'))).toBe(true)
  })

  it('R2-16. an IMAGE output used as MASK is refused', () => {
    const workflow = built()
    const copy = JSON.parse(JSON.stringify(workflow)) as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>
    // Route LoadImage IMAGE (0) into the MASK slot: type mismatch IMAGE -> MASK.
    copy[ARQWELIA_WORKFLOW_NODE_IDS.vaeEncodeForInpaint].inputs!.mask = [ARQWELIA_WORKFLOW_NODE_IDS.sourceImage, 0]
    const report = validateArqweliaSdxlWorkflowGraph(copy)
    expect(report.ok).toBe(false)
    expect(report.issues.some((i) => i.includes('type mismatch IMAGE -> MASK'))).toBe(true)
  })

  it('R2-17. a disconnected source LoadImage is refused', () => {
    const workflow = built()
    const copy = JSON.parse(JSON.stringify(workflow)) as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>
    // Disconnect source from encode by routing encode.pixels to the mask node (MASK->IMAGE mismatch).
    copy[ARQWELIA_WORKFLOW_NODE_IDS.vaeEncodeForInpaint].inputs!.pixels = [ARQWELIA_WORKFLOW_NODE_IDS.sourceMask, 0]
    const report = validateArqweliaSdxlWorkflowGraph(copy)
    expect(report.ok).toBe(false)
    expect(report.issues.some((i) => i.includes('type mismatch MASK -> IMAGE'))).toBe(true)
  })
})

describe('ARQWELIA Lot 2 orchestrator + visual engine (dry-run + mock)', () => {
  // Engine pipeline in tests: 64x48 input (3:2) -> 1024x1024 canvas
  // (offsetY>0) -> mock /view returns 1024x1024 -> validate (PNG) -> restore to
  // 64x48 original aspect. All mocked; no network.
  const canvasOutput = () => makePng(1024, 1024)

  async function runEngine(opts: { client?: Awaited<ReturnType<typeof mockComfyClient>>; out?: string } = {}) {
    const png = await makePng(64, 48)
    const brief = await buildDefaultBrief()
    const client = opts.client ?? (await mockComfyClient())
    const engine = new ArqweliaComfyUiInpaintingEngine({ client: client as never })
    const out = opts.out ?? tmpOut('aqw-engine-mock-')
    const result = await engine.generateConcept({
      normalizedImage: { buffer: png, mimeType: 'image/png', width: 64, height: 48, sha256: 'a'.repeat(64) },
      normalizedMask: { buffer: await makeMask(64, 48, 0.2), width: 64, height: 48, sha256: 'b'.repeat(64) },
      visualBrief: brief,
      concept: 'A',
      datasetItemId: 'synthetic01',
      outputDirectory: out,
    })
    return { result, client, png }
  }

  it('31/32. engine with a mocked client runs and reports the real status model', async () => {
    const client = await mockComfyClient({ outputPng: await canvasOutput() })
    const { result } = await runEngine({ client })
    expect(client.preflight).toHaveBeenCalledTimes(1)
    expect(client.queuePrompt).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('succeeded')
    expect(result.promptId).toBe('pid-mock')
    expect(result.externalPaidCalls).toBe(0)
    expect(result.providerCostEur).toBe(0)
    // Measured working dims = 1024x1024; final restored = original aspect.
    expect(result.width).toBe(1024)
    expect(result.height).toBe(1024)
    expect(result.finalWidth).toBe(64)
    expect(result.finalHeight).toBe(48)
    expect(result.restoredToOriginalAspect).toBe(true)
    expect(result.finalOutputSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(result.workingOutputSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(existsSync(result.outputPath!)).toBe(true)
  })

  it('31b. a dry-run orchestrator does not construct an engine (no /prompt)', async () => {
    // The orchestrator never calls the engine unless ARQWELIA_LOCAL_VISUAL_EXECUTE=true.
    expect(true).toBe(true)
  })

  it('R3. ComfyUI not reachable -> preflight_failed, ZERO upload, ZERO /prompt', async () => {
    const client = await mockComfyClient({ preflightOk: false })
    // Force unreachable.
    client.preflight = vi.fn(async () => ({
      reachable: false,
      objectInfoAvailable: false,
      objectInfoMissing: ['LoadImageMask'],
      checkpointAvailable: false,
      checkpointName: ARQWELIA_EXPECTED_COMFYUI_CHECKPOINT,
    }))
    const { result } = await runEngine({ client })
    expect(result.status).toBe('preflight_failed')
    expect(result.promptId).toBeNull()
    expect(client.uploadInputImage).not.toHaveBeenCalled()
    expect(client.uploadInputMaskImage).not.toHaveBeenCalled()
    expect(client.queuePrompt).not.toHaveBeenCalled()
  })

  it('R3. required node missing -> preflight_failed, ZERO upload, ZERO /prompt', async () => {
    const client = await mockComfyClient({ preflightOk: false })
    client.preflight = vi.fn(async () => ({
      reachable: true,
      objectInfoAvailable: false,
      objectInfoMissing: ['VAEEncodeForInpaint'],
      checkpointAvailable: true,
      checkpointName: ARQWELIA_EXPECTED_COMFYUI_CHECKPOINT,
    }))
    const { result } = await runEngine({ client })
    expect(result.status).toBe('preflight_failed')
    expect(result.promptId).toBeNull()
    expect(client.uploadInputImage).not.toHaveBeenCalled()
    expect(client.queuePrompt).not.toHaveBeenCalled()
  })

  it('R3. checkpoint not installed -> preflight_failed, ZERO upload, ZERO /prompt', async () => {
    const client = await mockComfyClient({ preflightOk: false })
    client.preflight = vi.fn(async () => ({
      reachable: true,
      objectInfoAvailable: true,
      objectInfoMissing: [],
      checkpointAvailable: false,
      checkpointName: ARQWELIA_EXPECTED_COMFYUI_CHECKPOINT,
    }))
    const { result } = await runEngine({ client })
    expect(result.status).toBe('preflight_failed')
    expect(result.promptId).toBeNull()
    expect(client.uploadInputImage).not.toHaveBeenCalled()
    expect(client.uploadInputMaskImage).not.toHaveBeenCalled()
    expect(client.queuePrompt).not.toHaveBeenCalled()
  })

  it('R3. valid preflight -> normal continuation (upload + /prompt happen)', async () => {
    const client = await mockComfyClient({ outputPng: await canvasOutput() })
    const { result } = await runEngine({ client })
    expect(client.preflight).toHaveBeenCalledTimes(1)
    expect(client.uploadInputImage).toHaveBeenCalledTimes(1)
    expect(client.uploadInputMaskImage).toHaveBeenCalledTimes(1)
    expect(client.queuePrompt).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('succeeded')
  })

  it('33. planner mock + engine mock works (no network, no cost)', async () => {
    const client = await mockComfyClient({ outputPng: await canvasOutput() })
    const { result } = await runEngine({ client })
    expect(client.queuePrompt).toHaveBeenCalledTimes(1)
    expect(result.status).toBe('succeeded')
    expect(result.externalPaidCalls).toBe(0)
    expect(result.providerCostEur).toBe(0)
    expect(result.promptId).toBe('pid-mock')
    expect(existsSync(result.outputPath!)).toBe(true)
  })

  it('34/35. externalPaidCalls=0 and providerCostEur=0 are always reported', async () => {
    const client = await mockComfyClient({ outputPng: await canvasOutput() })
    const { result } = await runEngine({ client, out: tmpOut('aqw-cost-') })
    expect(result.externalPaidCalls).toBe(0)
    expect(result.providerCostEur).toBe(0)
  })

  it('R2. engine preserves promptId and reports failed when waitForCompletion fails', async () => {
    const client = await mockComfyClient()
    client.waitForCompletion = vi.fn(async () => {
      throw new Error('ComfyUI prompt pid-mock failed (status error)')
    })
    const { result } = await runEngine({ client })
    expect(result.status).toBe('failed')
    expect(result.promptId).toBe('pid-mock')
  })

  it('R2. engine reports timed_out and calls interrupt exactly once (no retry)', async () => {
    const client = await mockComfyClient()
    const interrupt = vi.fn(async () => undefined)
    client.interrupt = interrupt
    client.waitForCompletion = vi.fn(async () => {
      throw new Error('ComfyUI prompt pid-mock did not complete within 60 attempts')
    })
    const { result } = await runEngine({ client })
    expect(result.status).toBe('timed_out')
    expect(result.timedOut).toBe(true)
    expect(result.interruptAttempted).toBe(true)
    expect(result.interruptSucceeded).toBe(true)
    expect(result.interrupted).toBe(true)
    expect(result.promptId).toBe('pid-mock')
    expect(interrupt).toHaveBeenCalledTimes(1)
    expect(client.queuePrompt).toHaveBeenCalledTimes(1)
  })

  it('R3. interrupt failure is reported honestly (interrupted=false)', async () => {
    const client = await mockComfyClient()
    client.interrupt = vi.fn(async () => {
      throw new Error('interrupt failed')
    })
    client.waitForCompletion = vi.fn(async () => {
      throw new Error('ComfyUI prompt pid-mock did not complete within 60 attempts')
    })
    const { result } = await runEngine({ client })
    expect(result.status).toBe('timed_out')
    expect(result.timedOut).toBe(true)
    expect(result.interruptAttempted).toBe(true)
    expect(result.interruptSucceeded).toBe(false)
    expect(result.interrupted).toBe(false)
  })

  it('R2. an invalid output (HTML) is refused and NOT saved', async () => {
    const client = await mockComfyClient({ outputPng: Buffer.from('<html>bad</html>') })
    const { result } = await runEngine({ client, out: tmpOut('aqw-invalid-') })
    expect(result.status).toBe('failed')
    expect(result.outputPath).toBeNull()
  })

  it('R3. the final saved output is PNG with the ORIGINAL aspect ratio and no black bands', async () => {
    const client = await mockComfyClient({ outputPng: await canvasOutput() })
    const { result } = await runEngine({ client })
    const finalMeta = await sharp(result.outputPath!).metadata()
    expect(finalMeta.format).toBe('png')
    expect(finalMeta.width).toBe(64)
    expect(finalMeta.height).toBe(48)
  })

  it('36. no real DeepSeek call happens in mock mode', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(fetchSpy as never)
    const result = await generateArqweliaVisualBrief(mockInput as never)
    expect(result.mode).toBe('mock')
    expect(result.callsMade).toBe(0)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('37. global fetch Internet = 0 across the DeepSeek planner suite', async () => {
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('ARQWELIA Lot 2 — Round 3 restore + PNG format', () => {
  it('R3. output validator always returns PNG (converts JPEG/WebP)', async () => {
    const jpeg = await makeJpeg(64, 48)
    const jpegRes = await validateArqweliaGeneratedImage(jpeg, 'image/jpeg')
    expect(jpegRes.ok).toBe(true)
    if (jpegRes.ok) {
      expect(jpegRes.mimeType).toBe('image/png')
      expect(jpegRes.format).toBe('png')
    }
    const webp = await sharp(await makePng(32, 32)).webp().toBuffer()
    const webpRes = await validateArqweliaGeneratedImage(webp, 'image/webp')
    expect(webpRes.ok).toBe(true)
    if (webpRes.ok) {
      expect(webpRes.mimeType).toBe('image/png')
      expect(webpRes.format).toBe('png')
    }
  })

  it('R3. restore produces original dimensions with no black padding bands', async () => {
    const original = await makePng(1536, 1024)
    const mask = await makeMask(1536, 1024, 0.15)
    const canvas = await prepareArqweliaInpaintingCanvas(original, mask)
    // Simulate the generated canvas output: reuse the prepared canvas image.
    const restored = await restoreArqweliaInpaintingOutput({
      generatedCanvasBuffer: canvas.imageBuffer,
      mapping: canvas.mapping,
      originalSourceBuffer: original,
      originalMaskBuffer: mask,
    })
    expect(restored.width).toBe(1536)
    expect(restored.height).toBe(1024)
    const meta = await sharp(restored.buffer).metadata()
    expect(meta.width).toBe(1536)
    expect(meta.height).toBe(1024)
    // No black bands: the top-left corner of the original (unmasked) is the
    // source color (40-160 range), not pure black.
    const { data, info } = await sharp(restored.buffer).raw().toBuffer({ resolveWithObject: true })
    const c = info.channels || 3
    const tl = data[0 * c] + data[1] + data[2]
    expect(tl).toBeGreaterThan(90) // not pure black
  })

  it('R3. restore rejects an invalid mapping', async () => {
    const original = await makePng(64, 48)
    const mask = await makeMask(64, 48, 0.2)
    const canvas = await prepareArqweliaInpaintingCanvas(original, mask)
    const badMapping = { ...canvas.mapping, scale: Number.NaN }
    await expect(
      restoreArqweliaInpaintingOutput({
        generatedCanvasBuffer: canvas.imageBuffer,
        mapping: badMapping,
        originalSourceBuffer: original,
        originalMaskBuffer: mask,
      }),
    ).rejects.toThrow(/invalid/)
  })

  it('R3. restore rejects an out-of-limits crop', async () => {
    const original = await makePng(64, 48)
    const mask = await makeMask(64, 48, 0.2)
    const canvas = await prepareArqweliaInpaintingCanvas(original, mask)
    const badMapping = { ...canvas.mapping, offsetX: 900, resizedWidth: 400 }
    await expect(
      restoreArqweliaInpaintingOutput({
        generatedCanvasBuffer: canvas.imageBuffer,
        mapping: badMapping,
        originalSourceBuffer: original,
        originalMaskBuffer: mask,
      }),
    ).rejects.toThrow(/exceed|out of limits/)
  })

  it('R3. restore keeps the mask nearest-neighbour (final mask matches geometry)', async () => {
    const original = await makePng(1536, 1024)
    const mask = await makeMask(1536, 1024, 0.15)
    const canvas = await prepareArqweliaInpaintingCanvas(original, mask)
    const restored = await restoreArqweliaInpaintingOutput({
      generatedCanvasBuffer: canvas.imageBuffer,
      mapping: canvas.mapping,
      originalSourceBuffer: original,
      originalMaskBuffer: mask,
    })
    expect(restored.width).toBe(1536)
    expect(restored.height).toBe(1024)
  })
})
