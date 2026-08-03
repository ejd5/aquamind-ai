import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  arqweliaBenchmarkCandidates,
  arqweliaBenchmarkDocumentaryCandidates,
  getArqweliaBenchmarkCandidate,
} from '../scripts/lib/arqwelia-benchmark/candidates'
import {
  ARQWELIA_BENCHMARK_AUTHORIZED,
  ARQWELIA_BENCHMARK_MAX_BUDGET_EUR,
  ArqweliaProviderError,
  billingFromCaughtError,
  billingSnapshot,
  billingSummaryLines,
  computeGate,
  ensureNoRealCall,
  redactSecrets,
  redactedEnvSummary,
} from '../scripts/lib/arqwelia-benchmark/provider'
import { normalizeImageForAi } from '@/lib/images/secure-image'
import { PHASE0A_RETENTION_CONFIG } from '../scripts/lib/arqwelia-benchmark/phase0a-manifest.mjs'

const CLI = join(process.cwd(), 'scripts/benchmark-arqwelia-smoke.mjs')

/**
 * The CLI imports TypeScript (`src/lib/images/secure-image.ts`) and therefore
 * must run under Bun (a plain Node 20 runtime cannot load TS). `bun` resolves
 * via PATH inside the test process.
 */
function runCli(args: string[], env: Record<string, string | undefined> = {}) {
  return spawnSync('bun', [CLI, ...args], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  })
}

function tmpOut(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

function latestReportJson(dir: string): { path: string; data: Record<string, unknown> } {
  const json = readdirSync(dir).filter(
    (file) => file.endsWith('.json') && !file.startsWith('phase0a-manifest'),
  )
  expect(json.length).toBeGreaterThan(0)
  const path = join(dir, json[json.length - 1])
  return { path, data: JSON.parse(readFileSync(path, 'utf8')) }
}

async function writeJpegWithExif(
  filePath: string,
  width = 2400,
  height = 1200,
): Promise<void> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 30, g: 140, b: 210 } },
  })
    .jpeg({ quality: 90 })
    .withMetadata({ orientation: 6 })
    .toBuffer()
  writeFileSync(filePath, buffer)
}

describe('ARQWELIA Lot 2 benchmark harness (A1 round 3)', () => {
  it('registers unique executable candidate ids (nvidia-nim, openai-gpt-image, mock) and blocks zai', () => {
    const ids = arqweliaBenchmarkCandidates.map((candidate) => candidate.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(
      expect.arrayContaining(['nvidia-nim', 'openai-gpt-image', 'mock']),
    )
    expect(ids).not.toContain('zai-glm')
    expect(arqweliaBenchmarkCandidates).toHaveLength(3)
    const zaiDoc = arqweliaBenchmarkDocumentaryCandidates.find(
      (candidate) => candidate.id === 'zai-glm',
    )
    expect(zaiDoc).toBeDefined()
    expect(zaiDoc!.state).toBe('blocked_missing_capability')
    expect(zaiDoc!.supportsImageEditing).toBe(false)
    expect(zaiDoc!.runSmoke).toBeUndefined()
  })

  it('defaults to a dry-run posture (no authorization, no budget)', () => {
    expect(ARQWELIA_BENCHMARK_AUTHORIZED).toBe(false)
    expect(ARQWELIA_BENCHMARK_MAX_BUDGET_EUR).toBe(0)
  })

  it('keeps cost UNKNOWN without official pricing except openai (official gpt-image-2 pricing)', () => {
    for (const candidate of arqweliaBenchmarkCandidates) {
      const cost = candidate.estimateOfficialCost()
      if (candidate.id === 'openai-gpt-image') {
        expect(cost.known).toBe(true)
        expect(cost.costPerImageEur).toBeNull()
        expect(cost.officialPricingSource).toBe('https://openai.com/api/pricing/')
        expect(cost.note).toMatch(/0\.041/)
        expect(cost.note).toMatch(/NO USD→EUR conversion/)
      } else {
        expect(cost.known).toBe(false)
        expect(cost.costPerImageEur).toBeUndefined()
        expect(cost.note).toMatch(/UNKNOWN — TO BE MEASURED IN LOT 0/)
      }
    }
  })

  it('dry-run with mock works without any key (default posture)', () => {
    const mock = getArqweliaBenchmarkCandidate('mock')
    expect(mock).toBeDefined()
    expect(mock!.validateConfiguration().ok).toBe(true)

    const out = tmpOut('aqw-bench-mock-')
    const result = runCli(['--provider', 'mock', '--out', out])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('DRY RUN — NO EXTERNAL CALL')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')

    const { data } = latestReportJson(out)
    expect(data.realProviderCalls).toBe(0)
    expect(data.paidCostEur).toBe(0)
    expect(data.dryRun).toBe(true)
    expect(data.billingStatus).toBe('not_called')
  })

  it('mock smoke writes a placeholder PNG without any credential', async () => {
    const mock = getArqweliaBenchmarkCandidate('mock')!
    const out = tmpOut('aqw-bench-mock-png-')
    const result = await mock.runSmoke!({
      providerId: 'mock',
      model: 'mock-image-v1',
      outDir: out,
      budgetMaxEur: 0,
      realCallAuthorized: false,
    })
    expect(result.ok).toBe(true)
    expect(result.externalCalls).toBe(0)
    expect(result.actualCostEur).toBe(0)
    expect(result.billingStatus).toBe('not_called')
    expect(result.officialPricingSource).toBeNull()
    expect(result.outputPath).toBeDefined()
    expect(readFileSync(result.outputPath!).length).toBeGreaterThan(0)
  })

  // -- non-bypassable authorization (env-only) ------------------------------

  it('refuses a real call without authorization', async () => {
    expect(() => ensureNoRealCall({ realCallAuthorized: false, budgetMaxEur: 5 })).toThrow(
      /authorization/,
    )
    const nvidia = getArqweliaBenchmarkCandidate('nvidia-nim')!
    await expect(
      nvidia.runSmoke!({
        providerId: 'nvidia-nim',
        model: 'tbd',
        outDir: tmpOut('aqw-bench-nva-'),
        budgetMaxEur: 5,
        realCallAuthorized: false,
      }),
    ).rejects.toThrow(/authorization/)
  })

  it('refuses a real call without budget', async () => {
    expect(() => ensureNoRealCall({ realCallAuthorized: true, budgetMaxEur: 0 })).toThrow(/budget/)
    expect(() => ensureNoRealCall({ realCallAuthorized: true, budgetMaxEur: -1 })).toThrow(/budget/)
    const openai = getArqweliaBenchmarkCandidate('openai-gpt-image')!
    await expect(
      openai.runSmoke!({
        providerId: 'openai-gpt-image',
        model: 'gpt-image-1',
        outDir: tmpOut('aqw-bench-oai-'),
        budgetMaxEur: 0,
        realCallAuthorized: true,
      }),
    ).rejects.toThrow(/budget/)
  })

  it('accepts a real call guard only when authorized AND budgeted', () => {
    expect(() => ensureNoRealCall({ realCallAuthorized: true, budgetMaxEur: 1 })).not.toThrow()
  })

  it('real adapters stay stubbed — authorized smoke still throws NOT IMPLEMENTED', async () => {
    const nvidia = getArqweliaBenchmarkCandidate('nvidia-nim')!
    await expect(
      nvidia.runSmoke!({
        providerId: 'nvidia-nim',
        model: 'tbd',
        outDir: tmpOut('aqw-bench-nva2-'),
        budgetMaxEur: 5,
        realCallAuthorized: true,
      }),
    ).rejects.toThrow(/NOT IMPLEMENTED/)
  })

  it('--budget alone (no env authorized) does NOT unlock a real call', () => {
    const out = tmpOut('aqw-bench-budget-alone-')
    const result = runCli(['--provider', 'mock', '--out', out, '--budget', '1'])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('DRY RUN — NO EXTERNAL CALL')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')

    const { data } = latestReportJson(out)
    expect(data.dryRun).toBe(true)
    expect(data.authorized).toBe(false)
  })

  it('the CLI no longer accepts the --authorized flag (env-only authorization)', () => {
    const result = runCli(['--provider', 'mock', '--out', tmpOut('aqw-bench-auth-'), '--authorized'])
    expect(result.status).toBe(2)
    expect(result.stderr).toMatch(/Unknown flag: --authorized/)
    expect(result.stderr).not.toContain('DRY RUN')
  })

  it('--budget above the env ceiling is rejected', () => {
    const result = runCli(['--provider', 'mock', '--out', tmpOut('aqw-bench-cap-'), '--budget', '50'], {
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '1',
    })
    expect(result.status).toBe(2)
    expect(result.stderr).toMatch(/exceeds ARQWELIA_BENCHMARK_MAX_BUDGET_EUR/)
  })

  it('--budget below the env ceiling is allowed but still dry-run without env authorization', () => {
    const out = tmpOut('aqw-bench-below-')
    const result = runCli(['--provider', 'mock', '--out', out, '--budget', '1'], {
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '2',
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('DRY RUN — NO EXTERNAL CALL')

    const { data } = latestReportJson(out)
    expect(data.dryRun).toBe(true)
    expect(data.authorized).toBe(false)
    expect(data.budgetMaxEur).toBe(1)
  })

  it('--budget <= 0 is rejected', () => {
    const result = runCli(['--provider', 'mock', '--out', tmpOut('aqw-bench-zero-'), '--budget', '0'])
    expect(result.status).toBe(2)
    expect(result.stderr).toMatch(/Invalid --budget value/)
  })

  // -- round 4: HARD OWNER BUDGET CAP (Phase 0A, maximumBudgetEur = 2) -------

  it('HARD OWNER CAP: envBudget=2, no --budget → effectiveBudget=2 (allowed)', () => {
    expect(PHASE0A_RETENTION_CONFIG.maximumBudgetEur).toBe(2)
    const out = tmpOut('aqw-bench-owner2-')
    const result = runCli(['--provider', 'mock', '--out', out], {
      ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '2',
    })
    expect(result.status).toBe(0)
    const { data } = latestReportJson(out)
    expect(data.budgetMaxEur).toBe(2)
    expect(data.dryRun).toBe(true)
    expect(data.realProviderCalls).toBe(0)
  })

  it('HARD OWNER CAP: envBudget=2, --budget=1 → effectiveBudget=1 (allowed)', () => {
    const out = tmpOut('aqw-bench-owner2b-')
    const result = runCli(['--provider', 'mock', '--out', out, '--budget', '1'], {
      ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '2',
    })
    expect(result.status).toBe(0)
    const { data } = latestReportJson(out)
    expect(data.budgetMaxEur).toBe(1)
    expect(data.realProviderCalls).toBe(0)
  })

  it('HARD OWNER CAP: envBudget=2, --budget=3 → refusal (exit non-zero)', () => {
    const result = runCli(['--provider', 'mock', '--out', tmpOut('aqw-bench-owner2c-'), '--budget', '3'], {
      ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '2',
    })
    expect(result.status).toBe(2)
    expect(result.stderr).toMatch(/exceeds ARQWELIA_BENCHMARK_MAX_BUDGET_EUR/)
    expect(result.stderr).toMatch(/REDUCE the budget/)
  })

  it('HARD OWNER CAP: envBudget=10, no --budget → refusal (env exceeds owner cap)', () => {
    const result = runCli(['--provider', 'mock', '--out', tmpOut('aqw-bench-owner2d-')], {
      ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '10',
    })
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('(10)')
    expect(result.stderr).toMatch(
      new RegExp(`owner budget cap \\(${PHASE0A_RETENTION_CONFIG.maximumBudgetEur} EUR\\)`),
    )
  })

  it('HARD OWNER CAP: envBudget=10, --budget=2 → refusal ALSO (env config exceeds owner cap)', () => {
    const result = runCli(['--provider', 'mock', '--out', tmpOut('aqw-bench-owner2e-'), '--budget', '2'], {
      ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '10',
    })
    expect(result.status).toBe(2)
    expect(result.stderr).toMatch(
      new RegExp(`owner budget cap \\(${PHASE0A_RETENTION_CONFIG.maximumBudgetEur} EUR\\)`),
    )
  })

  // -- reliable billing metrics ---------------------------------------------

  it('billing contract: non-implemented / dry-run → externalCalls=0, actualCostEur=0, billingStatus=not_called', () => {
    const snap = billingSnapshot({
      billingStatus: 'not_called',
      externalCalls: 0,
      actualCostEur: 0,
      officialPricingSource: null,
    })
    expect(snap.paidCostEur).toBe(0)
    expect(snap.externalCalls).toBe(0)
    expect(snap.billingStatus).toBe('not_called')

    const out = tmpOut('aqw-bench-nonim-')
    const result = runCli(['--provider', 'openai-gpt-image', '--out', out])
    expect(result.status).toBe(0)
    const { data } = latestReportJson(out)
    const r = data.result as {
      externalCalls: number
      actualCostEur: number
      billingStatus: string
    }
    expect(r.externalCalls).toBe(0)
    expect(r.actualCostEur).toBe(0)
    expect(r.billingStatus).toBe('not_called')
    expect(data.paidCostEur).toBe(0)
  })

  it('billing contract: hypothetical real call WITHOUT billing proof → actualCostEur=null, billingStatus=unknown (never PAID_COST=0)', () => {
    const stub = {
      billingStatus: 'unknown' as const,
      actualCostEur: null,
      externalCalls: 1,
      officialPricingSource: null,
    }
    const snap = billingSnapshot(stub)
    expect(snap.billingStatus).toBe('unknown')
    expect(snap.externalCalls).toBe(1)
    expect(snap.paidCostEur).toBeNull()

    const lines = billingSummaryLines(stub)
    expect(lines).toContain('billing_status=unknown')
    expect(lines).toContain('REAL_PROVIDER_CALLS=1, PAID_COST=UNKNOWN')
    expect(lines.some((line) => /PAID_COST=0/.test(line))).toBe(false)
  })

  it('billing contract: measured cost uses actualCostEur', () => {
    const snap = billingSnapshot({
      billingStatus: 'measured',
      actualCostEur: 0.04,
      externalCalls: 1,
      officialPricingSource: 'https://example.com/pricing',
    })
    expect(snap.paidCostEur).toBe(0.04)
    expect(snap.officialPricingSource).toBe('https://example.com/pricing')
    const lines = billingSummaryLines({
      billingStatus: 'measured',
      actualCostEur: 0.04,
      externalCalls: 1,
      officialPricingSource: 'https://example.com/pricing',
    })
    expect(lines).toContain('REAL_PROVIDER_CALLS=1, PAID_COST=0.04')
  })

  it('report exposes the billing contract fields for the smoke result', () => {
    const out = tmpOut('aqw-bench-billrep-')
    const result = runCli(['--provider', 'mock', '--out', out])
    expect(result.status).toBe(0)
    const { data } = latestReportJson(out)
    const r = data.result as Record<string, unknown>
    expect(r).toHaveProperty('externalCalls')
    expect(r).toHaveProperty('actualCostEur')
    expect(r).toHaveProperty('billingStatus')
    expect(r).toHaveProperty('officialPricingSource')
    expect(r).toHaveProperty('durationMs')
    expect(data).toHaveProperty('billingStatus')
    expect(data).toHaveProperty('officialPricingSource')
    expect(data).toHaveProperty('realProviderCalls')
    expect(data).toHaveProperty('paidCostEur')
  })

  // -- PII-free report ------------------------------------------------------

  it('report has no absolute path, no local username, no raw prompt, no imagePath/promptA keys', async () => {
    const dir = tmpOut('aqw-bench-pii-src-')
    const exifJpeg = join(dir, 'with-exif.jpg')
    await writeJpegWithExif(exifJpeg)
    const out = tmpOut('aqw-bench-pii-out-')
    const prompt = 'Transform this garden into a modern minimalist space'
    const result = runCli([
      '--provider',
      'mock',
      '--image',
      exifJpeg,
      '--promptA',
      prompt,
      '--out',
      out,
    ])
    expect(result.status).toBe(0)

    const { path, data } = latestReportJson(out)
    const jsonText = readFileSync(path, 'utf8')
    const raw = JSON.stringify(data)

    expect(data).not.toHaveProperty('imagePath')
    expect(data).not.toHaveProperty('promptA')
    expect(jsonText).not.toContain(exifJpeg)
    expect(jsonText).not.toContain('with-exif.jpg')
    expect(jsonText).not.toContain(process.env.HOME ?? '/Users/')
    expect(jsonText).not.toContain(prompt)

    const image = data.image as { datasetItemId: string; normalizedSha256: string } | null
    expect(image).not.toBeNull()
    expect(image).not.toHaveProperty('sourceFileName')
    expect(image!.datasetItemId).toMatch(/^[a-f0-9]{16}$/)
    expect(image!.datasetItemId).not.toContain('/')
    expect(image!.datasetItemId).not.toContain('with-exif')
    expect(image!.normalizedSha256).toMatch(/^[a-f0-9]{64}$/)

    const p = data.prompt as { version: string; sha256: string | null }
    expect(p.version).toBe('arqwelia-lot2-v1')
    expect(p.sha256).toMatch(/^[a-f0-9]{64}$/)

    for (const file of readdirSync(out)) {
      const content = readFileSync(join(out, file), 'utf8')
      expect(content).not.toContain(prompt)
      expect(content).not.toContain('/Users/')
      expect(content).not.toContain(exifJpeg)
    }
  })

  it('report stores output as a file NAME only, never an absolute path', () => {
    const out = tmpOut('aqw-bench-rel-')
    const result = runCli(['--provider', 'mock', '--out', out])
    expect(result.status).toBe(0)
    const { data } = latestReportJson(out)
    const r = data.result as { outputFileName: string | null }
    expect(r.outputFileName).toBeDefined()
    expect(r.outputFileName).not.toContain('/')
    const jsonText = readFileSync(latestReportJson(out).path, 'utf8')
    expect(jsonText).not.toContain(process.cwd())
  })

  // -- canonical normalization (single source of truth) ---------------------

  it('CLI imports the canonical normalizeImageForAi and the divergent mirror is deleted', () => {
    const cliSource = readFileSync(CLI, 'utf8')
    expect(cliSource).toContain("src/lib/images/secure-image")
    expect(cliSource).toContain('normalizeImageForAi')
    expect(cliSource).not.toContain('normalize-image.mjs')
    expect(
      existsSync(join(process.cwd(), 'scripts/lib/arqwelia-benchmark/normalize-image.mjs')),
    ).toBe(false)
  })

  it('normalizes an EXIF-bearing JPEG: output EXIF-free, sha256 present, ≤1600px', async () => {
    const input = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: { r: 30, g: 140, b: 210 } },
    })
      .jpeg({ quality: 90 })
      .withMetadata({ orientation: 6 })
      .toBuffer()

    const normalized = await normalizeImageForAi(
      `data:image/jpeg;base64,${input.toString('base64')}`,
    )
    expect(normalized.width).toBeLessThanOrEqual(1600)
    expect(normalized.height).toBeLessThanOrEqual(1600)
    expect(normalized.mimeType).toBe('image/jpeg')
    expect(normalized.sha256).toMatch(/^[a-f0-9]{64}$/)

    const meta = await sharp(normalized.buffer).metadata()
    expect(meta.exif).toBeUndefined()
    expect(meta.orientation).toBeUndefined()
    expect(meta.iptc).toBeUndefined()
    expect(meta.xmp).toBeUndefined()
  })

  it('CLI ACCEPTS a source photo WITH EXIF, normalizes it, and never copies the raw source', async () => {
    const dir = tmpOut('aqw-bench-exif-in-')
    const exifJpeg = join(dir, 'with-exif.jpg')
    await writeJpegWithExif(exifJpeg)
    const out = tmpOut('aqw-bench-exif-out-')

    const result = runCli(['--provider', 'mock', '--image', exifJpeg, '--out', out])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('image=normalized')
    expect(result.stdout).not.toContain('un-normalized metadata')

    const { data } = latestReportJson(out)
    const image = data.image as {
      datasetItemId: string
      normalizedSha256: string
      width: number
      height: number
    }
    expect(image.datasetItemId).toMatch(/^[a-f0-9]{16}$/)
    expect(image.datasetItemId).not.toContain('with-exif')
    expect(image.normalizedSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(image.width).toBeLessThanOrEqual(1600)
    expect(image.height).toBeLessThanOrEqual(1600)

    const files = readdirSync(out)
    expect(files).not.toContain('with-exif.jpg')
    const png = files.find((file) => file.endsWith('.png'))
    expect(png).toBeDefined()
    const meta = await sharp(readFileSync(join(out, png!))).metadata()
    expect(meta.exif).toBeUndefined()
    expect(meta.orientation).toBeUndefined()
  })

  it('CLI rejects a corrupted image with a clear error', () => {
    const dir = tmpOut('aqw-bench-bad-')
    const bad = join(dir, 'bad.jpg')
    writeFileSync(bad, 'not an image at all')
    const out = tmpOut('aqw-bench-bad-out-')
    const result = runCli(['--provider', 'mock', '--image', bad, '--out', out])
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/error/)
  })

  // -- secrets --------------------------------------------------------------

  it('never prints secrets (in-process redaction)', () => {
    const logs: string[] = []
    const original = console.log
    console.log = (...args: string[]) => {
      logs.push(args.join(' '))
    }
    try {
      const env = {
        DB_URL: 'postgres://example',
        APP_VERSION: '1.0',
        NVIDIA_API_KEY: 'nvapi-fake-123',
        OPENAI_API_KEY: 'sk-fake-456',
      }
      for (const line of redactedEnvSummary(env)) console.log(line)
      console.log(redactSecrets('nvapi-abc123 sk_live_xyz whsec_zzz rc_wh_qq'))
    } finally {
      console.log = original
    }

    const output = logs.join('\n')
    expect(output).not.toContain('nvapi-fake-123')
    expect(output).not.toContain('sk-fake-456')
    expect(output).not.toMatch(/nvapi-/)
    expect(output).not.toMatch(/sk-/)
    expect(output).not.toMatch(/KEY|TOKEN|SECRET/i)
  })

  it('never prints injected secrets through the CLI', () => {
    const out = tmpOut('aqw-bench-secrets-')
    const result = runCli(['--provider', 'mock', '--out', out], {
      NVIDIA_API_KEY: 'nvapi-fake-abc',
      OPENAI_API_KEY: 'sk-fake-xyz',
      Z_AI_API_KEY: 'zai-secret-999',
    })

    expect(result.status).toBe(0)
    expect(result.stdout).not.toContain('nvapi-fake-abc')
    expect(result.stdout).not.toContain('sk-fake-xyz')
    expect(result.stdout).not.toContain('zai-secret-999')
    expect(result.stdout).not.toMatch(/nvapi-|sk-/)

    for (const file of readdirSync(out)) {
      const content = readFileSync(join(out, file), 'utf8')
      expect(content).not.toContain('nvapi-fake-abc')
      expect(content).not.toContain('sk-fake-xyz')
      expect(content).not.toContain('zai-secret-999')
    }
  })

  // -- round 3: env-only budget gate (computeGate) --------------------------

  it('computeGate: auth=true, env budget ABSENT, --budget 5 → NO real call', () => {
    const gate = computeGate({ cliBudget: 5, envAuthorized: true, envBudgetRaw: undefined })
    expect(gate.envAuthorized).toBe(true)
    expect(gate.envBudget).toBe(0)
    expect(gate.envGateOpen).toBe(false)
    expect(gate.effectiveBudget).toBe(0)
    expect(gate.realCallAuthorized).toBe(false)
  })

  it('computeGate: auth=true, envBudget=0, --budget 5 → NO real call', () => {
    const gate = computeGate({ cliBudget: 5, envAuthorized: true, envBudgetRaw: '0' })
    expect(gate.envBudget).toBe(0)
    expect(gate.envGateOpen).toBe(false)
    expect(gate.effectiveBudget).toBe(0)
    expect(gate.realCallAuthorized).toBe(false)
  })

  it('computeGate: auth=true, envBudget="abc", --budget 5 → NO real call (invalid env)', () => {
    const gate = computeGate({ cliBudget: 5, envAuthorized: true, envBudgetRaw: 'abc' })
    expect(gate.envBudget).toBe(0)
    expect(gate.envGateOpen).toBe(false)
    expect(gate.realCallAuthorized).toBe(false)
  })

  it('computeGate: auth=true, envBudget=10, --budget 5 → envGateOpen, effectiveBudget=5, realCallAuthorized TRUE (adapter still NOT IMPLEMENTED)', () => {
    const gate = computeGate({ cliBudget: 5, envAuthorized: true, envBudgetRaw: '10' })
    expect(gate.envGateOpen).toBe(true)
    expect(gate.effectiveBudget).toBe(5)
    expect(gate.realCallAuthorized).toBe(true)
  })

  it('computeGate/CLI: auth=true, --budget 15 above the env ceiling → REJECT (cli above env ceiling)', () => {
    // computeGate alone does not enforce the Phase 0A owner cap — that is the
    // CLI's job. The env ceiling check still applies here.
    const gate = computeGate({ cliBudget: 15, envAuthorized: true, envBudgetRaw: '1' })
    expect(gate.effectiveBudget).toBe(1)
    const out = tmpOut('aqw-bench-rej15-')
    const result = runCli(['--provider', 'mock', '--out', out, '--budget', '15'], {
      ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '1',
    })
    expect(result.status).toBe(2)
    expect(result.stderr).toMatch(/exceeds ARQWELIA_BENCHMARK_MAX_BUDGET_EUR/)
  })

  it('CRITICAL GATE: authorized + envBudget=0 + --budget 1 stays DRY RUN, realCallAuthorized=false', () => {
    const out = tmpOut('aqw-bench-gate-zero-')
    const result = runCli(['--provider', 'mock', '--out', out, '--budget', '1'], {
      ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '0',
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('DRY RUN — NO EXTERNAL CALL')
    expect(result.stdout).toContain('realCallAuthorized=false')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')

    const { data } = latestReportJson(out)
    expect(data.dryRun).toBe(true)
    expect(data.realCallAuthorized).toBe(false)
    expect(data.authorized).toBe(true)
    expect(data.budgetMaxEur).toBe(0)
  })

  it('authorized + budget WITHOUT phase0aExecute stays a DRY RUN (third lock missing)', () => {
    const out = tmpOut('aqw-bench-tech-')
    const result = runCli(['--provider', 'openai-gpt-image', '--out', out, '--budget', '1'], {
      ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '2',
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('realCallAuthorized=true')
    expect(result.stdout).toContain('phase0aExecute=false')
    expect(result.stdout).toContain('DRY RUN — NO EXTERNAL CALL')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')
    const { data } = latestReportJson(out)
    const r = data.result as { billingStatus: string; externalCalls: number }
    expect(r.billingStatus).toBe('not_called')
    expect(r.externalCalls).toBe(0)
  })

  it('all three env gates open: runSmoke is invoked but still NO real call (no key → default transport NOT IMPLEMENTED)', async () => {
    const srcDir = tmpOut('aqw-bench-3gates-img-')
    const imagePath = join(srcDir, 'source.jpg')
    const jpeg = await sharp({
      create: { width: 640, height: 480, channels: 3, background: { r: 40, g: 120, b: 200 } },
    })
      .jpeg()
      .toBuffer()
    writeFileSync(imagePath, jpeg)
    const out = tmpOut('aqw-bench-3gates-')
    const result = runCli(
      ['--provider', 'openai-gpt-image', '--image', imagePath, '--out', out, '--concept', 'A', '--dataset-id', 'item001', '--dataset-kind', 'synthetic'],
      {
        ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
        ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '2',
        ARQWELIA_BENCHMARK_PHASE0A_EXECUTE: 'true',
      },
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('realCallAuthorized=true')
    expect(result.stdout).toContain('phase0aExecute=true')
    expect(result.stdout).toContain('mode=smoke')
    expect(result.stdout).not.toContain('DRY RUN — NO EXTERNAL CALL')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')
    const { data } = latestReportJson(out)
    const r = data.result as { billingStatus: string; externalCalls: number }
    expect(r.billingStatus).toBe('not_called')
    expect(r.externalCalls).toBe(0)
    expect(data.realProviderCalls).toBe(0)
    expect(data.paidCostEur).toBe(0)
  })

  // -- round 3: provider receives ONLY the normalized image -----------------

  const FAKE_CAPTURE_MODULE = `
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
export default {
  id: 'fake-capture',
  model: 'fake-capture-v1',
  supportsImageEditing: true,
  dryRunSafe: true,
  dryRunDescription: 'test-only capture provider',
  validateConfiguration() { return { ok: true } },
  estimateOfficialCost() { return { known: false, note: 'test-only' } },
  async runSmoke(opts) {
    const captured = {
      keys: Object.keys(opts).sort(),
      hasImagePathKey: Object.prototype.hasOwnProperty.call(opts, 'imagePath'),
      hasPromptConceptAKey: Object.prototype.hasOwnProperty.call(opts, 'promptConceptA'),
      receivedSha256: opts.normalizedImageBuffer
        ? createHash('sha256').update(opts.normalizedImageBuffer).digest('hex')
        : null,
      normalizedImageDataUrlPrefix: opts.normalizedImageDataUrl ? opts.normalizedImageDataUrl.slice(0, 22) : null,
      normalizedMimeType: opts.normalizedMimeType ?? null,
      normalizedSha256: opts.normalizedSha256 ?? null,
      normalizedWidth: opts.normalizedWidth ?? null,
      normalizedHeight: opts.normalizedHeight ?? null,
      promptVersion: opts.promptVersion ?? null,
      sanitizedPrompt: opts.sanitizedPrompt ?? null,
      providerId: opts.providerId,
      model: opts.model,
      budgetMaxEur: opts.budgetMaxEur,
      realCallAuthorized: opts.realCallAuthorized,
    }
    writeFileSync(join(opts.outDir, 'captured-args.json'), JSON.stringify(captured, null, 2))
    if (opts.normalizedImageBuffer) {
      writeFileSync(join(opts.outDir, 'received-buffer.bin'), opts.normalizedImageBuffer)
    }
    return {
      providerId: opts.providerId,
      model: opts.model,
      ok: true,
      externalCalls: 0,
      actualCostEur: 0,
      billingStatus: 'not_called',
      officialPricingSource: null,
      durationMs: 0,
    }
  },
}
`

  it('adapter receives ONLY normalized fields — no imagePath, no raw-source buffer, EXIF-free', async () => {
    const srcDir = tmpOut('aqw-bench-capture-src-')
    const exifJpeg = join(srcDir, 'garden-location.jpg')
    await writeJpegWithExif(exifJpeg)

    const input = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: { r: 30, g: 140, b: 210 } },
    })
      .jpeg({ quality: 90 })
      .withMetadata({ orientation: 6 })
      .toBuffer()
    const expected = await normalizeImageForAi(`data:image/jpeg;base64,${input.toString('base64')}`)

    const fakeDir = tmpOut('aqw-bench-fake-')
    const fakeModule = join(fakeDir, 'fake-capture.mjs')
    writeFileSync(fakeModule, FAKE_CAPTURE_MODULE)

    const out = tmpOut('aqw-bench-capture-out-')
    const result = runCli(
      ['--provider', 'fake-capture', '--image', exifJpeg, '--promptA', 'A concept prompt', '--out', out],
      { ARQWELIA_BENCHMARK_EXTRA_CANDIDATE_MODULE: fakeModule },
    )
    expect(result.status).toBe(0)

    const captured = JSON.parse(readFileSync(join(out, 'captured-args.json'), 'utf8'))
    expect(captured.hasImagePathKey).toBe(false)
    expect(captured.hasPromptConceptAKey).toBe(false)
    expect(captured.keys).not.toContain('imagePath')
    expect(captured.keys).not.toContain('promptConceptA')
    expect(captured.keys).toEqual(
      expect.arrayContaining([
        'providerId',
        'model',
        'normalizedImageBuffer',
        'normalizedImageDataUrl',
        'normalizedMimeType',
        'normalizedSha256',
        'normalizedWidth',
        'normalizedHeight',
        'promptVersion',
        'sanitizedPrompt',
        'outDir',
        'budgetMaxEur',
        'realCallAuthorized',
      ]),
    )
    expect(captured.receivedSha256).toBe(expected.sha256)
    expect(captured.normalizedSha256).toBe(expected.sha256)
    expect(captured.normalizedWidth).toBe(expected.width)
    expect(captured.normalizedHeight).toBe(expected.height)
    expect(captured.normalizedMimeType).toBe('image/jpeg')
    expect(captured.normalizedImageDataUrlPrefix).toBe('data:image/jpeg;base64')
    expect(captured.promptVersion).toBe('arqwelia-lot2-v1')
    expect(captured.sanitizedPrompt).toBe('A concept prompt')

    const received = readFileSync(join(out, 'received-buffer.bin'))
    expect(received.equals(expected.buffer)).toBe(true)
    const meta = await sharp(received).metadata()
    expect(meta.exif).toBeUndefined()
    expect(meta.orientation).toBeUndefined()
    expect(meta.iptc).toBeUndefined()
    expect(meta.xmp).toBeUndefined()
  })

  // -- round 3: conservative billing on error -------------------------------

  it('billing on error: error before any proven external call → not_called / 0 / 0', () => {
    const error = new ArqweliaProviderError('failed during validation', {
      externalCalls: 0,
      actualCostEur: 0,
      billingStatus: 'not_called',
    })
    const billing = billingFromCaughtError(error)
    expect(billing.billingStatus).toBe('not_called')
    expect(billing.externalCalls).toBe(0)
    expect(billing.actualCostEur).toBe(0)
  })

  it('billing on error: error after an external call started → unknown / null', () => {
    const error = new ArqweliaProviderError('connection lost mid-call', {
      externalCalls: 3,
      actualCostEur: null,
      billingStatus: 'unknown',
    })
    const billing = billingFromCaughtError(error)
    expect(billing.billingStatus).toBe('unknown')
    expect(billing.externalCalls).toBe(3)
    expect(billing.actualCostEur).toBeNull()
  })

  it('billing on error: officially measured cost → measured + real value', () => {
    const error = new ArqweliaProviderError('invoice recorded before failure', {
      externalCalls: 1,
      actualCostEur: 0.04,
      billingStatus: 'measured',
      officialPricingSource: 'https://example.com/pricing',
    })
    const billing = billingFromCaughtError(error)
    expect(billing.billingStatus).toBe('measured')
    expect(billing.externalCalls).toBe(1)
    expect(billing.actualCostEur).toBe(0.04)
    expect(billing.officialPricingSource).toBe('https://example.com/pricing')
  })

  it('billing on error: generic adapter error → conservative default unknown / 1 / null (never not_called/0/0)', () => {
    const billing = billingFromCaughtError(new Error('boom'))
    expect(billing.billingStatus).toBe('unknown')
    expect(billing.externalCalls).toBe(1)
    expect(billing.actualCostEur).toBeNull()
    expect(billing).not.toMatchObject({ billingStatus: 'not_called', externalCalls: 0, actualCostEur: 0 })
  })

  const FAKE_ERROR_MODULE = `
export default {
  id: 'fake-error',
  model: 'fake-error-v1',
  supportsImageEditing: true,
  dryRunSafe: false,
  dryRunDescription: 'test-only error provider',
  validateConfiguration() { return { ok: true } },
  estimateOfficialCost() { return { known: false, note: 'test-only' } },
  async runSmoke() {
    throw new Error('adapter exploded mid-call')
  },
}
`

  it('CLI: a generic authorized adapter error is reported as unknown / 1 / null', () => {
    const fakeDir = tmpOut('aqw-bench-fake-err-')
    const fakeModule = join(fakeDir, 'fake-error.mjs')
    writeFileSync(fakeModule, FAKE_ERROR_MODULE)
    const out = tmpOut('aqw-bench-err-out-')
    const result = runCli(['--provider', 'fake-error', '--out', out], {
      ARQWELIA_BENCHMARK_AUTHORIZED: 'true',
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '2',
      ARQWELIA_BENCHMARK_PHASE0A_EXECUTE: 'true',
      ARQWELIA_BENCHMARK_EXTRA_CANDIDATE_MODULE: fakeModule,
    })
    expect(result.status).toBe(0)
    const { data } = latestReportJson(out)
    const r = data.result as {
      billingStatus: string
      externalCalls: number
      actualCostEur: number | null
      error: string
    }
    expect(r.billingStatus).toBe('unknown')
    expect(r.externalCalls).toBe(1)
    expect(r.actualCostEur).toBeNull()
    expect(r.error).toContain('adapter exploded mid-call')
    expect(data.paidCostEur).toBeNull()
    expect(data.realProviderCalls).toBe(1)
  })

  // -- round 3: PII-free (final leaks removed) ------------------------------

  it('unreadable image error message is exactly "Image file could not be read" (no path)', () => {
    const dir = tmpOut('aqw-bench-noex-')
    const missing = join(dir, 'does-not-exist.jpg')
    const out = tmpOut('aqw-bench-noex-out-')
    const result = runCli(['--provider', 'mock', '--image', missing, '--out', out])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Image file could not be read')
    expect(result.stderr).not.toContain(missing)
    expect(result.stderr).not.toContain('does-not-exist')
    expect(result.stderr).not.toMatch(/could not be read:\s+\S+/)
  })

  it('report uses --dataset-id (controlled alphanumeric id), never the local filename', async () => {
    const dir = tmpOut('aqw-bench-dsid-')
    const jpeg = join(dir, 'my-private-garden.jpg')
    await writeJpegWithExif(jpeg)
    const out = tmpOut('aqw-bench-dsid-out-')
    const result = runCli(['--provider', 'mock', '--image', jpeg, '--dataset-id', 'item001', '--out', out])
    expect(result.status).toBe(0)
    const { data } = latestReportJson(out)
    const image = data.image as { datasetItemId: string; normalizedSha256: string }
    expect(image.datasetItemId).toBe('item001')
    expect(image.normalizedSha256).toMatch(/^[a-f0-9]{64}$/)

    const jsonText = readFileSync(latestReportJson(out).path, 'utf8')
    expect(jsonText).not.toContain('my-private-garden.jpg')
    expect(jsonText).not.toContain('my-private-garden')
    expect(jsonText).not.toContain('sourceFileName')
  })

  it('non-alphanumeric --dataset-id is rejected', () => {
    const out = tmpOut('aqw-bench-dsid-bad-')
    const result = runCli(['--provider', 'mock', '--dataset-id', 'bad/id', '--out', out])
    expect(result.status).toBe(2)
    expect(result.stderr).toMatch(/Invalid --dataset-id/)
    expect(result.stderr).not.toContain('bad/id')
  })
})
