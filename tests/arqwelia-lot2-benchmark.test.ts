import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  arqweliaBenchmarkCandidates,
  getArqweliaBenchmarkCandidate,
} from '../scripts/lib/arqwelia-benchmark/candidates'
import {
  ARQWELIA_BENCHMARK_AUTHORIZED,
  ARQWELIA_BENCHMARK_MAX_BUDGET_EUR,
  billingSnapshot,
  billingSummaryLines,
  ensureNoRealCall,
  redactSecrets,
  redactedEnvSummary,
} from '../scripts/lib/arqwelia-benchmark/provider'
import { normalizeImageForAi } from '@/lib/images/secure-image'

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
  const json = readdirSync(dir).filter((file) => file.endsWith('.json'))
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

describe('ARQWELIA Lot 2 benchmark harness (A1 round 2)', () => {
  it('registers unique candidate ids (nvidia-nim, zai-glm, openai-gpt-image, mock)', () => {
    const ids = arqweliaBenchmarkCandidates.map((candidate) => candidate.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(
      expect.arrayContaining(['nvidia-nim', 'zai-glm', 'openai-gpt-image', 'mock']),
    )
    expect(arqweliaBenchmarkCandidates).toHaveLength(4)
  })

  it('defaults to a dry-run posture (no authorization, no budget)', () => {
    expect(ARQWELIA_BENCHMARK_AUTHORIZED).toBe(false)
    expect(ARQWELIA_BENCHMARK_MAX_BUDGET_EUR).toBe(0)
  })

  it('keeps cost UNKNOWN without official pricing for every candidate', () => {
    for (const candidate of arqweliaBenchmarkCandidates) {
      const cost = candidate.estimateOfficialCost()
      expect(cost.known).toBe(false)
      expect(cost.costPerImageEur).toBeUndefined()
      expect(cost.note).toMatch(/UNKNOWN — TO BE MEASURED IN LOT 0/)
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
    const result = runCli(['--provider', 'mock', '--out', out, '--budget', '50'])

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
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '10',
    })
    expect(result.status).toBe(2)
    expect(result.stderr).toMatch(/exceeds ARQWELIA_BENCHMARK_MAX_BUDGET_EUR/)
  })

  it('--budget below the env ceiling is allowed but still dry-run without env authorization', () => {
    const out = tmpOut('aqw-bench-below-')
    const result = runCli(['--provider', 'mock', '--out', out, '--budget', '5'], {
      ARQWELIA_BENCHMARK_MAX_BUDGET_EUR: '50',
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('DRY RUN — NO EXTERNAL CALL')

    const { data } = latestReportJson(out)
    expect(data.dryRun).toBe(true)
    expect(data.authorized).toBe(false)
    expect(data.budgetMaxEur).toBe(5)
  })

  it('--budget <= 0 is rejected', () => {
    const result = runCli(['--provider', 'mock', '--out', tmpOut('aqw-bench-zero-'), '--budget', '0'])
    expect(result.status).toBe(2)
    expect(result.stderr).toMatch(/Invalid --budget value/)
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
    const result = runCli(['--provider', 'zai-glm', '--out', out])
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
    expect(jsonText).not.toContain(process.env.HOME ?? '/Users/')
    expect(jsonText).not.toContain(prompt)

    const image = data.image as { sourceFileName: string; normalizedSha256: string } | null
    expect(image).not.toBeNull()
    expect(image!.sourceFileName).toBe('with-exif.jpg')
    expect(image!.sourceFileName).not.toContain('/')
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
      sourceFileName: string
      normalizedSha256: string
      width: number
      height: number
    }
    expect(image.sourceFileName).toBe('with-exif.jpg')
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
})
