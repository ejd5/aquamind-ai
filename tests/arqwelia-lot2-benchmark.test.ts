import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
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
  ensureNoRealCall,
  redactSecrets,
  redactedEnvSummary,
} from '../scripts/lib/arqwelia-benchmark/provider'
import { normalizeImageForAi } from '@/lib/images/secure-image'

const CLI = join(process.cwd(), 'scripts/benchmark-arqwelia-smoke.mjs')

function tmpOut(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

function latestReportJson(dir: string): { path: string; data: unknown } {
  const json = readdirSync(dir).filter((file) => file.endsWith('.json'))
  expect(json.length).toBeGreaterThan(0)
  const path = join(dir, json[json.length - 1])
  return { path, data: JSON.parse(readFileSync(path, 'utf8')) }
}

describe('ARQWELIA Lot 2 benchmark harness (A1)', () => {
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
      expect(cost.note).toMatch(/UNKNOWN/)
    }
  })

  it('dry-run with mock works without any key', () => {
    const mock = getArqweliaBenchmarkCandidate('mock')
    expect(mock).toBeDefined()
    expect(mock!.validateConfiguration().ok).toBe(true)

    const out = tmpOut('aqw-bench-mock-')
    const env = { ...process.env, PATH: process.env.PATH ?? '' }
    const result = spawnSync(process.execPath, [CLI, '--provider', 'mock', '--out', out], {
      env,
      encoding: 'utf8',
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('DRY RUN — NO EXTERNAL CALL')
    expect(result.stdout).toContain('REAL_PROVIDER_CALLS=0, PAID_COST=0')

    const { data } = latestReportJson(out)
    expect((data as { realProviderCalls: number }).realProviderCalls).toBe(0)
    expect((data as { paidCostEur: number }).paidCostEur).toBe(0)
    expect((data as { dryRun: boolean }).dryRun).toBe(true)
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
    expect(result.outputPath).toBeDefined()
    expect(readFileSync(result.outputPath!).length).toBeGreaterThan(0)
  })

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
    const env = {
      ...process.env,
      NVIDIA_API_KEY: 'nvapi-fake-abc',
      OPENAI_API_KEY: 'sk-fake-xyz',
      Z_AI_API_KEY: 'zai-secret-999',
    }
    const result = spawnSync(process.execPath, [CLI, '--provider', 'mock', '--out', out], {
      env,
      encoding: 'utf8',
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

  it('normalizes an image before any provider step (≤1600px, EXIF stripped)', async () => {
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

    const meta = await sharp(normalized.buffer).metadata()
    expect(meta.exif).toBeUndefined()
  })

  it('CLI normalizes a clean source photo before invoking the provider', async () => {
    const png = tmpOut('aqw-bench-clean-')
    const cleanPng = join(png, 'clean.png')
    await writePng(cleanPng, 2400, 1200)

    const out = tmpOut('aqw-bench-clean-out-')
    const result = spawnSync(
      process.execPath,
      [CLI, '--provider', 'mock', '--image', cleanPng, '--out', out],
      { encoding: 'utf8' },
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('image=normalized')

    const { data } = latestReportJson(out)
    const image = (data as { image: { width: number; height: number; sha256: string } }).image
    expect(image.width).toBeLessThanOrEqual(1600)
    expect(image.height).toBeLessThanOrEqual(1600)
    expect(image.sha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('CLI refuses an image that still carries un-normalized metadata', async () => {
    const dir = tmpOut('aqw-bench-exif-')
    const exifJpeg = join(dir, 'with-exif.jpg')
    await writeJpegWithExif(exifJpeg)

    const out = tmpOut('aqw-bench-exif-out-')
    const result = spawnSync(
      process.execPath,
      [CLI, '--provider', 'mock', '--image', exifJpeg, '--out', out],
      { encoding: 'utf8' },
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/un-normalized metadata/)
  })
})

async function writePng(filePath: string, width: number, height: number): Promise<void> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 30, g: 140, b: 210 } },
  })
    .png()
    .toBuffer()
  const { writeFileSync } = await import('node:fs')
  writeFileSync(filePath, buffer)
}

async function writeJpegWithExif(filePath: string): Promise<void> {
  const buffer = await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 200, g: 30, b: 30 } },
  })
    .jpeg({ quality: 90 })
    .withMetadata({ orientation: 6 })
    .toBuffer()
  const { writeFileSync } = await import('node:fs')
  writeFileSync(filePath, buffer)
}
