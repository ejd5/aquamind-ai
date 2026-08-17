import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

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
  it('wires all three StripScan visuals while preserving translated copy', () => {
    const source = readFileSync(join(ROOT, 'src/components/aquamind/strip-scanner.tsx'), 'utf8')
    for (const asset of stripAssets) expect(source).toContain(asset)
    expect(source).toContain("t('guideStep1Title')")
    expect(source).toContain("t('guideStep2Title')")
    expect(source).toContain("t('guideStep3Title')")
  })

  it('wires all three Photo Diagnostic visuals without locale-specific image text', () => {
    const source = readFileSync(join(ROOT, 'src/components/aquamind/module-diagnostic.tsx'), 'utf8')
    for (const asset of photoAssets) expect(source).toContain(asset)
  })

  it('ships all six public assets', () => {
    for (const asset of [...stripAssets, ...photoAssets]) {
      expect(existsSync(join(ROOT, 'public', asset.replace(/^\//, '')))).toBe(true)
    }
  })
})
