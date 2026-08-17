/**
 * AQWELIA — P0-B StripScan timeout : le scan ne doit plus mourir silencieusement
 * sur « The operation was aborted due to timeout ». La route monte le
 * maxDuration serverless, le client vision a un retry borné, et l'UI traduit
 * les erreurs de timeout en français.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

describe('strip-scan route — maxDuration serverless (fix timeout)', () => {
  it('la route strip-scan monte explicitement maxDuration = 60', () => {
    const src = readFileSync(join(root, 'src/app/api/pool/strip-scan/route.ts'), 'utf8')
    expect(src).toContain('export const maxDuration = 60')
  })

  it('les erreurs 500 de strip-scan sont localisées (jamais de message anglais brut)', () => {
    const src = readFileSync(join(root, 'src/app/api/pool/strip-scan/route.ts'), 'utf8')
    expect(src).toContain("stripScan.analysisFailed")
    expect(src).not.toMatch(/const msg = e instanceof Error \? e\.message/)
  })
})

describe('nvidia vision — retry borné sur timeout', () => {
  let calls = 0
  const realFetch = globalThis.fetch

  beforeEach(() => {
    calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      const err = new DOMException('The operation was aborted', 'AbortError')
      throw err
    }) as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('un timeout → un retry automatique puis échec propre (pas de boucle infinie)', async () => {
    process.env.NVIDIA_API_KEY = 'test-key'
    const { nvidiaVision } = await import('@/lib/ai/nvidia')
    await expect(
      nvidiaVision('prompt', 'data:image/jpeg;base64,xxx'),
    ).rejects.toThrow()
    // 1 appel initial + 1 retry = 2 fetch max, pas plus.
    expect(calls).toBe(2)
    delete process.env.NVIDIA_API_KEY
  })
})

describe('strip-scanner UI — message de timeout localisé', () => {
  it('le composant gère TimeoutError / AbortError avec une clé i18n dédiée', () => {
    const src = readFileSync(join(root, 'src/components/aquamind/strip-scanner.tsx'), 'utf8')
    expect(src).toContain("e.name === 'TimeoutError' || e.name === 'AbortError'")
    expect(src).toContain("t('scanTimeout')")
    expect(src).toContain("t('scanTimeoutDesc')")
  })

  it('les états de progression (5 étapes) et le badge lecture indicative sont câblés', () => {
    const src = readFileSync(join(root, 'src/components/aquamind/strip-scanner.tsx'), 'utf8')
    for (const k of ['progressPrep', 'progressRead', 'progressColor', 'progressCheck', 'progressResult']) {
      expect(src).toContain(`t('${k}')`)
    }
    expect(src).toContain("t('indicativeReading')")
    expect(src).toContain("t('indicativeReadingDesc')")
  })

  it('la structure d’intégration des visuels des 3 étapes guidées est prête', () => {
    const src = readFileSync(join(root, 'src/components/aquamind/strip-scanner.tsx'), 'utf8')
    expect(src).toContain('illustration: t(\'guideStep1Illustration\')')
    expect(src).toContain('illustration: t(\'guideStep2Illustration\')')
    expect(src).toContain('illustration: t(\'guideStep3Illustration\')')
    expect(src).toContain('Step.illustration && (')
  })
})
