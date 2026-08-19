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

  it('la route répond 504 + code timeout pour un vrai timeout serveur', () => {
    const src = readFileSync(join(root, 'src/app/api/pool/strip-scan/route.ts'), 'utf8')
    expect(src).toContain("code: 'timeout'")
    expect(src).toContain('stripScan.scanTimeout')
    expect(src).toContain('status: 504')
  })
})

describe('nvidia vision — budget borné + retry strict', () => {
  let calls = 0
  const realFetch = globalThis.fetch

  beforeEach(() => {
    calls = 0
    process.env.NVIDIA_API_KEY = 'test-key'
  })

  afterEach(() => {
    globalThis.fetch = realFetch
    delete process.env.NVIDIA_API_KEY
  })

  it('budget total < maxDuration=60s : 2 fenêtres de ≤ 25s, jamais 2×60s', () => {
    const src = readFileSync(join(root, 'src/lib/ai/nvidia.ts'), 'utf8')
    expect(src).toContain('VISION_TOTAL_BUDGET_MS = 50_000')
    expect(src).toContain('VISION_PER_CALL_MS = 25_000')
    expect(src).toContain('VISION_MAX_FETCH = 2')
    // Aucune fenêtre unique de 60s dans le client vision.
    expect(src).not.toContain('AbortSignal.timeout(60000)')
  })

  it('maximum 2 fetch, pas de boucle (timeout → 1 retry puis échec)', async () => {
    globalThis.fetch = (async () => {
      calls += 1
      throw new DOMException('The operation was aborted', 'AbortError')
    }) as typeof fetch
    const { nvidiaVision } = await import('@/lib/ai/nvidia')
    await expect(nvidiaVision('p', 'data:image/jpeg;base64,x')).rejects.toThrow()
    expect(calls).toBe(2)
  })

  it('PAS de retry sur erreur HTTP 4xx', async () => {
    globalThis.fetch = (async () => {
      calls += 1
      return new Response('{"error":"bad request"}', {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch
    const { nvidiaVision } = await import('@/lib/ai/nvidia')
    await expect(nvidiaVision('p', 'data:image/jpeg;base64,x')).rejects.toThrow()
    // 1 seul appel : un 400 n'est pas retryable.
    expect(calls).toBe(1)
  })

  it('PAS de retry sur erreur 5xx non-timeout', async () => {
    globalThis.fetch = (async () => {
      calls += 1
      return new Response('boom', { status: 503 })
    }) as typeof fetch
    const { nvidiaVision } = await import('@/lib/ai/nvidia')
    await expect(nvidiaVision('p', 'data:image/jpeg;base64,x')).rejects.toThrow()
    expect(calls).toBe(1)
  })
})

describe('strip-scanner UI — message de timeout localisé', () => {
  it('le composant gère TimeoutError / AbortError + timeout serveur 504/code timeout', () => {
    const src = readFileSync(join(root, 'src/components/aquamind/strip-scanner.tsx'), 'utf8')
    expect(src).toContain("e.name === 'TimeoutError' || e.name === 'AbortError'")
    expect(src).toContain("e.status === 504 || (e.body as { code?: string })?.code === 'timeout'")
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

  it('la structure d’intégration des visuels des 3 étapes guidées est prête (assets /guides/)', () => {
    const src = readFileSync(join(root, 'src/components/aquamind/strip-scanner.tsx'), 'utf8')
    // PR #102/#103 : les 3 étapes guident vers les PNG originaux validés
    // (branding déjà présent dans les PNG, aucun overlay logo ajouté par l'UI),
    // le texte reste fourni par i18n.
    expect(src).toContain("illustration: '/guides/stripscan/stripscan-guide-1-prepare.png'")
    expect(src).toContain("illustration: '/guides/stripscan/stripscan-guide-2-lighting.png'")
    expect(src).toContain("illustration: '/guides/stripscan/stripscan-guide-3-align.png'")
    // Titres/textes toujours issus des traductions i18n (jamais hardcodés).
    expect(src).toContain("t('guideStep1Title')")
    expect(src).toContain("t('guideStep2Title')")
    expect(src).toContain("t('guideStep3Title')")
    // Rendu : object-contain (pas de recadrage) ; aucun overlay logo dupliqué.
    expect(src).toContain('Step.illustration && (')
    expect(src).toContain('object-contain')
    expect(src).not.toContain('/branding/aqwelia-logo-main.png')
  })
})
