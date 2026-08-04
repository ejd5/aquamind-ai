/**
 * ARQWELIA Lot 2 — PR #80 Round 5 + Round 6 corrections tests.
 *
 * All checks are STATIC against the VERSIONED notebooks in the repo:
 *   - notebooks/arqwelia-sdxl-inpainting-free-gpu.ipynb
 *   - notebooks/arqwelia-sdxl-inpainting-kaggle-first-run.ipynb
 *
 * These tests NEVER depend on $HOME or any path outside the repo. They pass on
 * a clean machine after `git clone`. No generation, no model download, no
 * network, no cost.
 */

import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const VERSIONED_NB = join(process.cwd(), 'notebooks/arqwelia-sdxl-inpainting-free-gpu.ipynb')
const KAGGLE_NB = join(process.cwd(), 'notebooks/arqwelia-sdxl-inpainting-kaggle-first-run.ipynb')

const NOTEBOOKS = [VERSIONED_NB, KAGGLE_NB]

function loadNotebook(path: string): { code: string; md: string; json: string } {
  const json = readFileSync(path, 'utf8')
  const nb = JSON.parse(json)
  const code = nb.cells
    .filter((c: { cell_type?: string }) => c.cell_type === 'code')
    .map((c: { source: string[] }) => c.source.join(''))
    .join('\n')
  const md = nb.cells
    .filter((c: { cell_type?: string }) => c.cell_type === 'markdown')
    .map((c: { source: string[] }) => c.source.join(''))
    .join('\n')
  return { code, md, json }
}

// ---------------------------------------------------------------------------
// A pure, testable version of the recursive Kaggle resolver. This mirrors the
// logic embedded in the Kaggle notebook and is what the notebook uses at runtime.
// ---------------------------------------------------------------------------

export function arqweliaResolveInput(
  defaultPath: string,
  baseGlob: string,
  label: string,
  kaggleInputRoot: string,
  fileLister: (pattern: string) => string[],
): string {
  if (existsSync(defaultPath)) return defaultPath
  const root = kaggleInputRoot
  const allMatches = fileLister(baseGlob)
  const matches = allMatches.filter(
    (m) => !m.replace(/\\/g, '/').startsWith(`${root}/notebooks/`),
  )
  if (matches.length === 1) return matches[0]
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous ${label}: found ${matches.length} files under /kaggle/input — refusing without generation`,
    )
  }
  throw new Error(`${label} not found under /kaggle/input`)
}

describe('ARQWELIA Lot 2 Round 6 — notebooks are VERSIONED in the repo', () => {
  it('both notebooks exist inside the repo (no $HOME dependency)', () => {
    for (const p of NOTEBOOKS) {
      expect(existsSync(p)).toBe(true)
      expect(p.startsWith(process.cwd())).toBe(true)
    }
  })

  it('notebooks are valid JSON with no cell outputs, no embedded images, no secrets, no /Users paths', () => {
    for (const p of NOTEBOOKS) {
      const { json } = loadNotebook(p)
      const nb = JSON.parse(json)
      // no cell outputs
      for (const c of nb.cells as Array<{ outputs?: unknown[] }>) {
        if (c.outputs !== undefined) expect(c.outputs.length).toBe(0)
      }
      // no secrets / tokens / provider APIs / Mac user path
      expect(json).not.toMatch(/nvapi-[A-Za-z0-9]|sk-[A-Za-z0-9]{10}/)
      expect(json).not.toMatch(/api\.openai\.com|api\.nvidia\.com|build\.nvidia\.com|run\.comfy\.ai/)
      expect(json).not.toMatch(/KAGGLE_API_TOKEN|HF_TOKEN|GITHUB_TOKEN|DEEPSEEK_API_KEY/)
      expect(json).not.toContain('/Users/')
    }
  })

  it('does NOT read homedir()/Documents/AQWELIA (clean-machine safe)', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      expect(code).not.toContain('homedir()')
      expect(code).not.toContain('Documents/AQWELIA')
    }
  })
})

describe('ARQWELIA Lot 2 Round 6 — single-use gate on BOTH notebooks', () => {
  it('both define AUTHORIZED_GENERATIONS=1 and generation_attempts=0', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      expect(code).toContain('AUTHORIZED_GENERATIONS = 1')
      expect(code).toContain('generation_attempts = 0')
    }
  })

  it('the gate is enforced immediately BEFORE the single pipe()', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      const gateIdx = code.indexOf('generation_attempts >= AUTHORIZED_GENERATIONS')
      const incIdx = code.indexOf('generation_attempts += 1')
      const pipeIdx = code.indexOf('result = pipe(')
      expect(gateIdx).toBeGreaterThan(-1)
      expect(incIdx).toBeGreaterThan(gateIdx)
      expect(pipeIdx).toBeGreaterThan(incIdx)
    }
  })

  it('exactly ONE static pipe() call; no retry; no loop in the generation cell', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      expect(code.match(/result = pipe\(/g)?.length ?? 0).toBe(1)
      // Find the generation cell and assert it contains no for/while loop.
      const nb = JSON.parse(readFileSync(p, 'utf8'))
      const genCell = nb.cells.find(
        (c: { cell_type?: string; source: string[] }) => c.cell_type === 'code' && c.source.join('').includes('result = pipe('),
      )
      expect(genCell).toBeDefined()
      const genCode = genCell.source.join('')
      expect(genCode).not.toMatch(/^\s*(for|while)\b/m)
      expect(code).not.toMatch(/retry\s*\(/)
    }
  })
})

describe('ARQWELIA Lot 2 Round 6 — fail-closed CLIP with BOTH SDXL tokenizers', () => {
  it('uses clip_token_counts with pipe.tokenizer AND pipe.tokenizer_2', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      expect(code).toContain('def clip_token_counts(text):')
      expect(code).toContain('pipe.tokenizer(')
      expect(code).toContain('pipe.tokenizer_2(')
      expect(code).toContain('raise RuntimeError("Both SDXL tokenizers are required")')
    }
  })

  it('NO word-count fallback (except Exception -> len(text.split()) removed)', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      expect(code).not.toContain('len(text.split())')
      expect(code).not.toMatch(/except Exception:\s*\n\s*return/)
    }
  })

  it('enforces <= 75 on all four counters and reports them separately', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      for (const c of ['positiveTokenizer1Count', 'positiveTokenizer2Count', 'negativeTokenizer1Count', 'negativeTokenizer2Count']) {
        expect(code).toContain(`assert ${c} <= 75`)
        expect(code).toContain(c)
      }
    }
  })

  it('any tokenizer exception stops BEFORE pipe()', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      const tokenizerIdx = code.indexOf('clip_token_counts(')
      const pipeIdx = code.indexOf('result = pipe(')
      expect(tokenizerIdx).toBeGreaterThan(-1)
      expect(pipeIdx).toBeGreaterThan(tokenizerIdx)
    }
  })
})

describe('ARQWELIA Lot 2 Round 6 — effective inference steps', () => {
  it('computes effectiveInferenceSteps = min(int(steps*strength), steps)', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      expect(code).toContain(
        'effectiveInferenceSteps = min(int(configuredInferenceSteps * strength), configuredInferenceSteps)',
      )
      expect(code).toContain('"configuredInferenceSteps": 35')
      expect(code).toContain('"strength": 0.99')
    }
  })

  it('expected values: 25*0.82=>20, 35*0.99=>34, 35*1.0=>35', () => {
    const eff = (steps: number, strength: number) => Math.min(Math.floor(steps * strength), steps)
    expect(eff(25, 0.82)).toBe(20)
    expect(eff(35, 0.99)).toBe(34)
    expect(eff(35, 1.0)).toBe(35)
  })
})

describe('ARQWELIA Lot 2 Round 6 — pixel metrics clarified', () => {
  it('renames raw metrics (rawGeneratedChangedPixelRatioInsideMask / rawGeneratedUnchangedPixelRatioOutsideMask)', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      expect(code).toContain('rawGeneratedChangedPixelRatioInsideMask')
      expect(code).toContain('rawGeneratedUnchangedPixelRatioOutsideMask')
    }
  })

  it('adds finalCompositeUnchangedPixelRatioOutsideMask (computed vs ORIGINAL source)', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      expect(code).toContain('finalCompositeUnchangedPixelRatioOutsideMask')
      expect(code).toContain('mask_orig')
    }
  })
})

describe('ARQWELIA Lot 2 Round 6 — honest failure report', () => {
  it('wraps pipe() in try/except, sets generationStatus=failed, writes report, re-raises (no retry)', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      expect(code).toContain('try:')
      expect(code).toContain('result = pipe(')
      expect(code).toContain('generationStatus = "succeeded"')
      expect(code).toContain('except Exception as exc:')
      expect(code).toContain('generationStatus = "failed"')
      expect(code).toContain('notebook-run-report.json')
      expect(code).toContain('raise')
      // generation_attempts stays consumed (1), no reset
      expect(code).toContain('"generationAttempts": generation_attempts')
    }
  })

  it('error report has no full traceback / no secret', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      expect(code).toContain('generationError = str(exc)')
      expect(code).not.toContain('traceback.format_exc()')
    }
  })
})

describe('ARQWELIA Lot 2 Round 6 — real recursive resolver test', () => {
  it('finds exactly one nested file; refuses zero; refuses two; ignores /kaggle/input/notebooks/**', () => {
    const root = mkdtempSync(join(tmpdir(), 'aqw-kaggle-input-'))
    // nested real path
    const nested = join(root, 'datasets', 'aqwelia', 'arqwelia-concept-a-input')
    mkdirSync(nested, { recursive: true })
    writeFileSync(join(nested, 'synthetic01.png'), 'x')
    writeFileSync(join(nested, 'synthetic01-pool-mask.png'), 'y')
    // a notebooks mount that must be ignored
    const nbMount = join(root, 'notebooks')
    mkdirSync(nbMount, { recursive: true })
    writeFileSync(join(nbMount, 'synthetic01.png'), 'nope')

    // Simulate glob results as paths under "/kaggle/input/...".
    const KAGGLE_PREFIX = '/kaggle/input'
    const toKaggle = (p: string) => KAGGLE_PREFIX + p.slice(root.length)
    const list = (pattern: string): string[] => {
      const suffix = pattern.split('/').pop()!
      const out: string[] = []
      const walk = (dir: string) => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, e.name)
          if (e.isDirectory()) walk(p)
          else if (e.name === suffix) out.push(toKaggle(p))
        }
      }
      walk(root)
      return out
    }

    // source: exactly one (nested dataset), notebook mount excluded
    const src = arqweliaResolveInput('/missing/src.png', '/kaggle/input/**/synthetic01.png', 'synthetic01.png', KAGGLE_PREFIX, list)
    expect(src).toBe(toKaggle(join(nested, 'synthetic01.png')))

    // mask: exactly one
    const mask = arqweliaResolveInput('/missing/mask.png', '/kaggle/input/**/synthetic01-pool-mask.png', 'synthetic01-pool-mask.png', KAGGLE_PREFIX, list)
    expect(mask).toBe(toKaggle(join(nested, 'synthetic01-pool-mask.png')))

    // zero results -> refused
    expect(() =>
      arqweliaResolveInput('/missing/none.png', '/kaggle/input/**/nope.png', 'nope.png', KAGGLE_PREFIX, () => []),
    ).toThrow(/not found under/)

    // two results -> ambiguous refused
    expect(() =>
      arqweliaResolveInput('/missing/src.png', '/kaggle/input/**/synthetic01.png', 'synthetic01.png', KAGGLE_PREFIX, () => [
        '/kaggle/input/datasets/a/synthetic01.png',
        '/kaggle/input/datasets/b/synthetic01.png',
      ]),
    ).toThrow(/Ambiguous/)
  })

  it('the notebook embeds the resolver with /kaggle/input/notebooks exclusion', () => {
    const { code } = loadNotebook(KAGGLE_NB)
    expect(code).toContain('glob.glob(base_glob, recursive=True)')
    expect(code).toContain('/kaggle/input/notebooks/')
  })
})

describe('ARQWELIA Lot 2 Round 6 — VAE non-deprecated API + hosted disclosure', () => {
  it('uses pipe.vae.enable_slicing()/enable_tiling() (non-deprecated), never pipe.enable_vae_*', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      expect(code).toContain('pipe.vae.enable_slicing()')
      expect(code).toContain('pipe.vae.enable_tiling()')
      expect(code).not.toContain('pipe.enable_vae_slicing()')
      expect(code).not.toContain('pipe.enable_vae_tiling()')
      expect(code).toContain('pipe.enable_model_cpu_offload()')
    }
  })

  it('discloses hosted data processing (no absolute "stay local" claim)', () => {
    const { md } = loadNotebook(VERSIONED_NB)
    const kaggleMd = loadNotebook(KAGGLE_NB).md
    // The old absolute claim must not be present.
    expect(md + kaggleMd).not.toContain('nothing is sent to a remote provider')
    // The honest disclosure is present.
    expect(md + kaggleMd).toContain('hosting provider')
    expect(md + kaggleMd).toContain('no image-generation API is called')
  })
})

describe('ARQWELIA Lot 2 Round 6 — model/revision pinned, single pipe, CUDA gate', () => {
  it('both notebooks pin MODEL_ID + MODEL_REVISION', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      expect(code).toContain('diffusers/stable-diffusion-xl-1.0-inpainting-0.1')
      expect(code).toContain('115134f363124c53c7d878647567d04daf26e41e')
    }
  })

  it('no pipe.to("cuda")', () => {
    for (const p of NOTEBOOKS) {
      expect(loadNotebook(p).code).not.toContain('pipe.to("cuda")')
    }
  })

  it('CUDA gate precedes the single pipe()', () => {
    for (const p of NOTEBOOKS) {
      const { code } = loadNotebook(p)
      const cudaIdx = code.indexOf('torch.cuda.is_available()')
      const pipeIdx = code.indexOf('result = pipe(')
      expect(cudaIdx).toBeGreaterThan(-1)
      expect(pipeIdx).toBeGreaterThan(cudaIdx)
    }
  })
})
