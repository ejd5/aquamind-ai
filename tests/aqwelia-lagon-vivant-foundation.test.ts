/**
 * AQWELIA — LAGON VIVANT foundation test (foundation PR).
 *
 * Verifies that the new opt-in visual foundation is:
 *   - wired into the Tailwind v4 @theme inline block (CSS-first strategy),
 *   - declared in :root and overridden in .dark (future dark mode),
 *   - purely additive: the legacy --gold token and P6-DESIGN palette are
 *     preserved byte-for-byte, and no existing screen references the new
 *     primitives (no big-bang visual change),
 *   - exposing readable cva variants on Badge and Button.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { aqweliaLagonTokens } from '../src/lib/design/aqwelia-tokens'
import { badgeVariants } from '../src/components/ui/badge'
import { buttonVariants } from '../src/components/ui/button'

const GLOBALS = join(process.cwd(), 'src', 'app', 'globals.css')
const css = readFileSync(GLOBALS, 'utf-8')

// The @theme inline block (between `@theme inline {` and its closing brace).
const themeBlock = (() => {
  const start = css.indexOf('@theme inline')
  expect(start).toBeGreaterThanOrEqual(0)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  return css.slice(open, close + 1)
})()

const rootBlock = css.slice(css.indexOf(':root'))
const darkBlock = css.slice(css.indexOf('.dark {'))

const REQUIRED_THEME_MAPPINGS: Record<string, string> = {
  '--color-aqua-vivid': '--aqwelia-aqua-vivid',
  '--color-aqua-vivid-ink': '--aqwelia-aqua-vivid-ink',
  '--color-lagoon-ink': '--aqwelia-lagoon-ink',
  '--color-coral': '--aqwelia-coral',
  '--color-coral-ink': '--aqwelia-coral-ink',
  '--color-champagne-ink': '--aqwelia-champagne-ink',
  '--color-surface-tint': '--aqwelia-surface-tint',
  '--color-success': '--aqwelia-success',
  '--color-success-ink': '--aqwelia-success-ink',
  '--color-warning': '--aqwelia-warning',
  '--color-warning-ink': '--aqwelia-warning-ink',
  '--color-info': '--aqwelia-info',
  '--color-info-ink': '--aqwelia-info-ink',
}

// camelCase token name -> CSS variable (light value must match globals.css).
const TS_TO_CSS: Record<keyof typeof aqweliaLagonTokens, string> = {
  aquaVivid: '--aqwelia-aqua-vivid',
  aquaVividInk: '--aqwelia-aqua-vivid-ink',
  lagoonInk: '--aqwelia-lagoon-ink',
  coral: '--aqwelia-coral',
  coralInk: '--aqwelia-coral-ink',
  champagneInk: '--aqwelia-champagne-ink',
  surfaceTint: '--aqwelia-surface-tint',
  success: '--aqwelia-success',
  successInk: '--aqwelia-success-ink',
  warning: '--aqwelia-warning',
  warningInk: '--aqwelia-warning-ink',
  info: '--aqwelia-info',
  infoInk: '--aqwelia-info-ink',
}

// Every color token needs a dark override (future-proofing dark mode).
const REQUIRED_DARK_OVERRIDES = Object.values(TS_TO_CSS)

const REQUIRED_PRIMITIVES = [
  '.app-bg-lagon',
  '.dark .app-bg-lagon',
  '.card-accent-lagon',
  '.card-accent-lagon::before',
  '.dark .card-accent-lagon',
  '.card-premium-champagne',
  '.card-premium-champagne::before',
  '.dark .card-premium-champagne',
  '.icon-chip',
  '.icon-chip-lagoon',
  '.icon-chip-aqua',
  '.icon-chip-coral',
  '.icon-chip-champagne',
  '.icon-chip-info',
  '.dark .icon-chip-lagoon',
  '.dark .icon-chip-aqua',
  '.dark .icon-chip-coral',
  '.dark .icon-chip-champagne',
  '.dark .icon-chip-info',
  '.halo-soft',
  '.btn-aqua-gradient',
  '.btn-champagne-gradient',
  '.dark .btn-champagne-gradient',
]

// Opt-in guarantee: LAGON VIVANT is applied progressively. Since PR #107 the
// shell + dashboard intentionally use the foundation; every other module and
// the mobile shell must remain untouched.
const UNTOUCHED_SCREENS = [
  'src/components/aquamind/header.tsx',
  'src/components/aquamind/module-diagnostic.tsx',
  'src/components/aquamind/strip-scanner.tsx',
  'src/components/aquamind/module-water-test.tsx',
  'src/components/aquamind/module-weather.tsx',
  'src/components/aquamind/module-guides.tsx',
  'src/components/aquamind/module-paywall.tsx',
  'src/components/mobile/bottom-tabs.tsx',
]
const NEW_CLASS_MARKERS = ['card-accent-lagon', 'card-premium-champagne', 'app-bg-lagon', 'icon-chip', 'btn-aqua-gradient', 'btn-champagne-gradient', 'icon-chip-info', 'icon-chip-lagoon', 'icon-chip-aqua', 'icon-chip-coral', 'icon-chip-champagne']

describe('AQWELIA Lagon Vivant foundation', () => {
  it('maps every new token in the @theme inline block (Tailwind v4)', () => {
    for (const [mapping, source] of Object.entries(REQUIRED_THEME_MAPPINGS)) {
      expect(themeBlock).toContain(`${mapping}: var(${source})`)
    }
  })

  it('does not add an @config directive (CSS-first strategy)', () => {
    expect(css.includes('@config')).toBe(false)
  })

  it('declares every source variable in :root with the value mirrored by the TS tokens', () => {
    for (const [tsName, cssVar] of Object.entries(TS_TO_CSS)) {
      const value = aqweliaLagonTokens[tsName as keyof typeof aqweliaLagonTokens]
      expect(rootBlock).toContain(`${cssVar}: ${value}`)
    }
  })

  it('declares the hairline gradients and soft glow in :root', () => {
    expect(rootBlock).toContain('--aqwelia-hairline: linear-gradient(90deg, #18CFC3 0%, #22D8C8 55%, #72E8DF 100%)')
    expect(rootBlock).toContain('--aqwelia-hairline-champagne:')
    expect(rootBlock).toContain('--aqwelia-glow-soft:')
  })

  it('provides a dark override for every color token (future dark mode)', () => {
    for (const source of REQUIRED_DARK_OVERRIDES) {
      expect(darkBlock).toContain(`${source}:`)
    }
  })

  it('preserves the legacy --gold token (no silent remap)', () => {
    expect(rootBlock).toContain('--gold: oklch(0.45 0.10 200)')
    expect(rootBlock).not.toContain('--gold: var(--aqwelia-champagne)')
    // P6-DESIGN palette stays untouched too.
    expect(rootBlock).toContain('--aqwelia-lagoon: #18CFC3')
    expect(rootBlock).toContain('--aqwelia-champagne: #C6A56B')
  })

  it('ships every opt-in primitive with a light and (where relevant) dark variant', () => {
    for (const primitive of REQUIRED_PRIMITIVES) {
      expect(css).toContain(primitive)
    }
  })

  it('keeps reduced-motion coverage for the new primitives', () => {
    const reducedBlock = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reducedBlock).toContain('.icon-chip')
    expect(reducedBlock).toContain('.btn-aqua-gradient')
    expect(reducedBlock).toContain('.btn-champagne-gradient')
  })

  it('is opt-in: no existing screen references the new primitives yet', () => {
    for (const screen of UNTOUCHED_SCREENS) {
      const content = readFileSync(join(process.cwd(), screen), 'utf-8')
      for (const marker of NEW_CLASS_MARKERS) {
        expect(content, `${screen} must not use ${marker} yet`).not.toContain(marker)
      }
    }
  })

  it('exposes readable Badge tint variants (contrast-safe ink + translucent tint)', () => {
    expect(badgeVariants({ variant: 'lagoon' })).toContain('bg-lagoon/15')
    expect(badgeVariants({ variant: 'lagoon' })).toContain('text-lagoon-ink')
    expect(badgeVariants({ variant: 'aqua' })).toContain('bg-aqua-vivid/15')
    expect(badgeVariants({ variant: 'coral' })).toContain('text-coral-ink')
    expect(badgeVariants({ variant: 'champagne' })).toContain('text-champagne-ink')
    expect(badgeVariants({ variant: 'success' })).toContain('text-success-ink')
    expect(badgeVariants({ variant: 'warning' })).toContain('text-warning-ink')
    expect(badgeVariants({ variant: 'info' })).toContain('text-info-ink')
  })

  it('exposes gradient Button variants backed by the CSS primitives', () => {
    expect(buttonVariants({ variant: 'aqua-gradient' })).toContain('btn-aqua-gradient')
    expect(buttonVariants({ variant: 'champagne-gradient' })).toContain('btn-champagne-gradient')
  })
})
