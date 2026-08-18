import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Round 3 contract: the six ORIGINAL validated PNG visuals are the source of
// truth. Language-neutral, no embedded text/logo, app-owned branding + i18n.
const ROOT = process.cwd()
const stripAssets = [
  '/guides/stripscan/stripscan-guide-1-prepare.png',
  '/guides/stripscan/stripscan-guide-2-lighting.png',
  '/guides/stripscan/stripscan-guide-3-align.png',
] as const
const photoAssets = [
  '/guides/photo-diagnostic/photo-diagnostic-guide-1-overview.png',
  '/guides/photo-diagnostic/photo-diagnostic-guide-2-closeup.png',
  '/guides/photo-diagnostic/photo-diagnostic-guide-3-frame.png',
] as const
const allAssets = [...stripAssets, ...photoAssets]
const legacySvg = [
  '/guides/stripscan/stripscan-guide-1-prepare.svg',
  '/guides/stripscan/stripscan-guide-2-lighting.svg',
  '/guides/stripscan/stripscan-guide-3-align.svg',
  '/guides/photo-diagnostic/photo-diagnostic-guide-1-overview.svg',
  '/guides/photo-diagnostic/photo-diagnostic-guide-2-closeup.svg',
  '/guides/photo-diagnostic/photo-diagnostic-guide-3-frame.svg',
]

describe('AQWELIA guided visual assets', () => {
  it('ships the six original validated PNG visuals', () => {
    for (const asset of allAssets) {
      const path = join(ROOT, 'public', asset.replace(/^\//, ''))
      expect(existsSync(path)).toBe(true)
    }
  })

  it('no legacy SVG guide is still referenced anywhere', () => {
    for (const f of ['src/components/aquamind/strip-scanner.tsx', 'src/components/aquamind/module-diagnostic.tsx']) {
      const src = readFileSync(join(ROOT, f), 'utf8')
      for (const svg of legacySvg) {
        expect(src).not.toContain(svg)
      }
    }
    for (const svg of legacySvg) {
      expect(existsSync(join(ROOT, 'public', svg.replace(/^\//, '')))).toBe(false)
    }
  })

  it('uses object-contain and overlays the official AQWELIA logo in StripScan', () => {
    const source = readFileSync(join(ROOT, 'src/components/aquamind/strip-scanner.tsx'), 'utf8')
    for (const asset of stripAssets) expect(source).toContain(asset)
    expect(source).toContain('object-contain')
    expect(source).toContain('/branding/aqwelia-logo-main.png')
  })

  it('provides a translated 3-step Photo Diagnostic guide', () => {
    const source = readFileSync(join(ROOT, 'src/components/aquamind/module-diagnostic.tsx'), 'utf8')
    for (const asset of photoAssets) expect(source).toContain(asset)
    expect(source).toContain("t('photoGuideStep1Title')")
    expect(source).toContain("t('photoGuideStep2Title')")
    expect(source).toContain("t('photoGuideStep3Title')")
    expect(source).toContain('/branding/aqwelia-logo-main.png')
  })

  it('defines Photo Diagnostic guide copy in every supported locale', () => {
    for (const locale of ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl']) {
      const json = JSON.parse(readFileSync(join(ROOT, `src/i18n/locales/${locale}.json`), 'utf8'))
      expect(json.diagnostic.photoGuideMode).toBeTruthy()
      expect(json.diagnostic.photoGuideStep1Title).toBeTruthy()
      expect(json.diagnostic.photoGuideStep2Title).toBeTruthy()
      expect(json.diagnostic.photoGuideStep3Title).toBeTruthy()
    }
  })
})
