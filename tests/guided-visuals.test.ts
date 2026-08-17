import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Round 2 contract: language-neutral assets, app-owned branding and i18n copy.
const ROOT = process.cwd()
const stripAssets = [
  '/guides/stripscan/stripscan-guide-1-prepare.svg',
  '/guides/stripscan/stripscan-guide-2-lighting.svg',
  '/guides/stripscan/stripscan-guide-3-align.svg',
] as const
const photoAssets = [
  '/guides/photo-diagnostic/photo-diagnostic-guide-1-overview.svg',
  '/guides/photo-diagnostic/photo-diagnostic-guide-2-closeup.svg',
  '/guides/photo-diagnostic/photo-diagnostic-guide-3-frame.svg',
] as const

describe('AQWELIA guided visual assets', () => {
  it('ships six language-neutral SVG illustrations without embedded text', () => {
    for (const asset of [...stripAssets, ...photoAssets]) {
      const path = join(ROOT, 'public', asset.replace(/^\//, ''))
      expect(existsSync(path)).toBe(true)
      const svg = readFileSync(path, 'utf8')
      expect(svg).not.toContain('<text')
      expect(svg).not.toContain('AQWELIA')
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
