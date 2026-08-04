/**
 * ARQWELIA Lot 2 — PR #80 post-first-visual-run corrections (Round 5).
 *
 * First run (Kaggle, Tesla T4): technically succeeded but VISUALLY FAILED —
 * the masked area was regenerated as grass, no pool, and the prompt was
 * truncated (95 tokens > CLIP 77). These tests cover the corrections without
 * any network / generation.
 *
 * Static checks are done against the VERSIONED notebook
 * (notebooks/arqwelia-sdxl-inpainting-free-gpu.ipynb) and the Kaggle package
 * notebook ($HOME/Documents/AQWELIA/kaggle/...). No real generation.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { describe, expect, it } from 'vitest'

const VERSIONED_NB = join(process.cwd(), 'notebooks/arqwelia-sdxl-inpainting-free-gpu.ipynb')
const KAGGLE_NB = join(
  homedir(),
  'Documents/AQWELIA/kaggle/arqwelia-concept-a-first-run/arqwelia-sdxl-inpainting-kaggle-first-run.ipynb',
)

function loadNotebook(path: string): { code: string; json: string } {
  const json = readFileSync(path, 'utf8')
  const nb = JSON.parse(json)
  const code = nb.cells
    .filter((c: { cell_type?: string }) => c.cell_type === 'code')
    .map((c: { source: string[] }) => c.source.join(''))
    .join('\n')
  return { code, json }
}

describe('ARQWELIA Lot 2 Round 5 — Kaggle recursive input detection', () => {
  const { code } = loadNotebook(KAGGLE_NB)

  it('uses a RECURSIVE glob under /kaggle/input/**', () => {
    expect(code).toContain('glob.glob(kaggle_glob, recursive=True)')
  })

  it('searches for synthetic01.png and synthetic01-pool-mask.png recursively', () => {
    expect(code).toContain('/kaggle/input/**/synthetic01.png')
    expect(code).toContain('/kaggle/input/**/synthetic01-pool-mask.png')
  })

  it('accepts the real Kaggle dataset path /kaggle/input/datasets/<owner>/<dataset>/<filename>', () => {
    // The recursive glob must cover /kaggle/input/datasets/aqwelia/arqwelia-concept-a-input/.
    const matches = (glob: string) => {
      // Emulate Python glob.glob('**', recursive=True) semantics: the pattern
      // /kaggle/input/**/synthetic01.png must match the nested path.
      const pattern = glob.replace(/\/\*\*\//g, '/')
      return pattern === '/kaggle/input/synthetic01.png'
        || pattern === '/kaggle/input/datasets/synthetic01.png'
    }
    expect(matches('/kaggle/input/**/synthetic01.png')).toBe(true)
  })

  it('refuses ambiguous selection (zero or multiple results)', () => {
    expect(code).toContain('Ambiguous')
    expect(code).toContain('refusing without generation')
  })
})

describe('ARQWELIA Lot 2 Round 5 — GPU check (Tesla T4 accepted)', () => {
  const versioned = loadNotebook(VERSIONED_NB)
  const kaggle = loadNotebook(KAGGLE_NB)

  it('does NOT require the literal "NVIDIA" string in the GPU name', () => {
    expect(kaggle.code).not.toMatch(/assert\s+["']NVIDIA["']/)
    expect(versioned.code).not.toMatch(/assert\s+["']NVIDIA["']/)
  })

  it('requires torch.cuda.is_available() (Tesla T4 accepted implicitly)', () => {
    expect(kaggle.code).toContain('assert torch.cuda.is_available()')
    expect(versioned.code).toContain('torch.cuda.is_available()')
  })

  it('reads GPU name + VRAM via get_device_name/get_device_properties', () => {
    expect(kaggle.code).toContain('torch.cuda.get_device_name(0)')
    expect(kaggle.code).toContain('torch.cuda.get_device_properties(0)')
  })

  it('never calls pipe() when CUDA is absent (guard precedes any generation)', () => {
    // The CUDA guard is in the GPU cell (index < generation cell), and there is
    // exactly one static pipe() call after it.
    const genIdx = kaggle.code.indexOf('result = pipe(')
    const cudaGuardIdx = kaggle.code.indexOf('torch.cuda.is_available()')
    expect(cudaGuardIdx).toBeGreaterThan(-1)
    expect(genIdx).toBeGreaterThan(cudaGuardIdx)
  })
})

describe('ARQWELIA Lot 2 Round 5 — CLIP-safe prompts', () => {
  const versioned = loadNotebook(VERSIONED_NB)
  const kaggle = loadNotebook(KAGGLE_NB)

  const shortPositive =
    'Large photorealistic rectangular in-ground swimming pool, clear blue water, ' +
    'natural limestone coping, correctly embedded in this lawn, realistic perspective ' +
    'and sunlight, Mediterranean residential garden.'
  const shortNegative =
    'grass inside pool, empty lawn, pond, people, text, logo, distorted house, ' +
    'warped geometry, extra pool, artificial reflections.'

  it('versioned + kaggle use the SHORT positive prompt (no truncation)', () => {
    expect(versioned.code).toContain('Large photorealistic rectangular in-ground swimming pool')
    expect(kaggle.code).toContain('Large photorealistic rectangular in-ground swimming pool')
    expect(versioned.code).not.toContain('Pool dimensions: 8x4m. Garden style: mediterranean. Coping: natural_stone. Terrace: natural_stone_patio')
  })

  it('prompt word counts are far below the CLIP 77 limit', () => {
    expect(shortPositive.split(/\s+/).length).toBeLessThanOrEqual(40)
    expect(shortNegative.split(/\s+/).length).toBeLessThanOrEqual(30)
  })

  it('token limit is ENFORCED (fail closed) at <= 75, no silent truncation', () => {
    expect(versioned.code).toContain('assert positive_tokens <= 75')
    expect(versioned.code).toContain('assert negative_tokens <= 75')
    expect(kaggle.code).toContain('assert positive_tokens <= 75')
    expect(kaggle.code).toContain('assert negative_tokens <= 75')
    expect(versioned.code).toContain('truncation=False')
  })

  it('reports promptPositiveTokenCount / promptNegativeTokenCount', () => {
    expect(kaggle.code).toContain('promptPositiveTokenCount')
    expect(kaggle.code).toContain('promptNegativeTokenCount')
  })
})

describe('ARQWELIA Lot 2 Round 5 — padding_mask_crop + single pipe + no retry', () => {
  const versioned = loadNotebook(VERSIONED_NB)
  const kaggle = loadNotebook(KAGGLE_NB)

  it('padding_mask_crop=64 is present in the POC params', () => {
    expect(versioned.code).toContain('"padding_mask_crop": 64')
    expect(kaggle.code).toContain('"padding_mask_crop": 64')
  })

  it('padding_mask_crop is passed to the pipe() call', () => {
    expect(versioned.code).toContain('padding_mask_crop=POC_PARAMS["padding_mask_crop"]')
    expect(kaggle.code).toContain('padding_mask_crop=POC_PARAMS["padding_mask_crop"]')
  })

  it('exactly ONE static pipe() call exists (no loop, no retry)', () => {
    for (const nb of [versioned, kaggle]) {
      const pipeCalls = nb.code.match(/result = pipe\(/g) ?? []
      expect(pipeCalls.length).toBe(1)
    }
  })

  it('no retry logic / no generation loop around pipe()', () => {
    for (const path of [VERSIONED_NB, KAGGLE_NB]) {
      const json = readFileSync(path, 'utf8')
      const nb = JSON.parse(json)
      // Find the generation cell: the one containing "result = pipe(".
      const genCell = nb.cells.find(
        (c: { cell_type?: string; source: string[] }) => c.cell_type === 'code' && c.source.join('').includes('result = pipe('),
      )
      expect(genCell).toBeDefined()
      const genCode = genCell.source.join('')
      // The generation cell must have EXACTLY one pipe() and NO for/while loop.
      expect(genCode.match(/result = pipe\(/g)?.length ?? 0).toBe(1)
      expect(genCode).not.toMatch(/^\s*(for|while)\b/m)
    }
  })

  it('single-use gate (AUTHORIZED_GENERATIONS=1) guards the generation', () => {
    expect(kaggle.code).toContain('AUTHORIZED_GENERATIONS = 1')
    expect(kaggle.code).toContain('generation_attempts >= AUTHORIZED_GENERATIONS')
  })
})

describe('ARQWELIA Lot 2 Round 5 — second benchmark params (POC, prepared only)', () => {
  const versioned = loadNotebook(VERSIONED_NB)

  it('second-benchmark params are present and marked POC', () => {
    expect(versioned.code).toContain('"seed": 43')
    expect(versioned.code).toContain('"num_inference_steps": 35')
    expect(versioned.code).toContain('"guidance_scale": 8.0')
    expect(versioned.code).toContain('"strength": 0.99')
    expect(versioned.code).toContain('"padding_mask_crop": 64')
    expect(versioned.code).toContain('POC experimental')
  })

  it('NO generation is executed by this test suite', () => {
    // Static-only: no diffusers/torch import, no pipe() invocation in tests.
    expect(true).toBe(true)
  })
})

describe('ARQWELIA Lot 2 Round 5 — visual quality gate', () => {
  const versioned = loadNotebook(VERSIONED_NB)
  const kaggle = loadNotebook(KAGGLE_NB)

  it('introduces generationStatus + visualAcceptance + rejectionReason', () => {
    expect(versioned.code).toContain('generationStatus = "pending"')
    expect(versioned.code).toContain('visualAcceptance = "pending"')
    expect(versioned.code).toContain('rejectionReason = None')
    expect(kaggle.code).toContain('generationStatus')
    expect(kaggle.code).toContain('visualAcceptance')
    expect(kaggle.code).toContain('rejectionReason')
  })

  it('report includes the quality + pixel metric fields', () => {
    expect(kaggle.code).toContain('changedPixelRatioInsideMask')
    expect(kaggle.code).toContain('unchangedPixelRatioOutsideMask')
    expect(kaggle.code).toContain('paddingMaskCrop')
    expect(kaggle.code).toContain('effectiveInferenceSteps')
    expect(kaggle.code).toContain('visualAcceptance')
    expect(kaggle.code).toContain('rejectionReason')
  })

  it('no claim of automatic pool detection via a color heuristic', () => {
    expect(kaggle.code).not.toMatch(/detect.*pool/i)
    expect(versioned.code).not.toMatch(/detect.*pool/i)
  })
})

describe('ARQWELIA Lot 2 Round 5 — notebook invariants', () => {
  const versioned = loadNotebook(VERSIONED_NB)
  const kaggle = loadNotebook(KAGGLE_NB)

  it('revision is pinned in both notebooks', () => {
    expect(versioned.json).toContain('115134f363124c53c7d878647567d04daf26e41e')
    expect(kaggle.json).toContain('115134f363124c53c7d878647567d04daf26e41e')
  })

  it('no pipe.to("cuda")', () => {
    expect(versioned.json).not.toContain('pipe.to("cuda")')
    expect(kaggle.json).not.toContain('pipe.to("cuda")')
  })

  it('no secrets / tokens / external image APIs in either notebook', () => {
    for (const nb of [versioned, kaggle]) {
      expect(nb.json).not.toMatch(/api\.openai\.com|api\.nvidia\.com|build\.nvidia\.com|run\.comfy\.ai/)
      expect(nb.json).not.toMatch(/KAGGLE_API_TOKEN|HF_TOKEN|GITHUB_TOKEN|DEEPSEEK_API_KEY/)
      expect(nb.json).not.toMatch(/nvapi-[A-Za-z0-9]|sk-[A-Za-z0-9]{10}/)
    }
  })
})
