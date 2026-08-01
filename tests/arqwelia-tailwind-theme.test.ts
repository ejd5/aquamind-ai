/**
 * ARQWELIA — CSS-first Tailwind v4 theme token test.
 *
 * Verifies that every --arqwelia-* variable used by arq-* utilities is mapped
 * in the @theme inline block of src/app/globals.css so Tailwind v4 actually
 * compiles the classes. Also enforces that no @config directive was added
 * (CSS-first strategy, per the Tailwind audit).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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

const REQUIRED_COLOR_MAPPINGS: Record<string, string> = {
  '--color-arq-navy': '--arqwelia-navy',
  '--color-arq-navy-2': '--arqwelia-navy-2',
  '--color-arq-navy-deep': '--arqwelia-navy-deep',
  '--color-arq-aqua': '--arqwelia-aqua',
  '--color-arq-aqua-bright': '--arqwelia-aqua-bright',
  '--color-arq-cyan': '--arqwelia-cyan',
  '--color-arq-sand': '--arqwelia-sand',
  '--color-arq-mist': '--arqwelia-mist',
  '--color-arq-ink': '--arqwelia-ink',
  '--color-arq-ink-2': '--arqwelia-ink-2',
  '--color-arq-champagne': '--arqwelia-champagne',
  '--color-arq-gold-soft': '--arqwelia-gold-soft',
  '--color-arq-border': '--arqwelia-border',
  '--color-arq-border-strong': '--arqwelia-border-strong',
  '--color-arq-border-gold': '--arqwelia-border-gold',
}

const REQUIRED_SHADOW_MAPPINGS: Record<string, string> = {
  '--shadow-arq-deep': '--arqwelia-shadow-deep',
  '--shadow-arq-glow': '--arqwelia-glow-aqua',
  '--shadow-arq-glow-strong': '--arqwelia-glow-aqua-strong',
  '--shadow-arq-aqua': '--arqwelia-aqua',
}

describe('ARQWELIA @theme inline mappings', () => {
  it('does not add an @config directive (CSS-first strategy)', () => {
    expect(css.includes('@config')).toBe(false)
  })

  it('contains every required --color-arq-* mapping', () => {
    for (const [mapping, source] of Object.entries(REQUIRED_COLOR_MAPPINGS)) {
      expect(themeBlock).toContain(`${mapping}: var(${source})`)
    }
  })

  it('contains every required --shadow-arq-* mapping', () => {
    for (const [mapping, source] of Object.entries(REQUIRED_SHADOW_MAPPINGS)) {
      expect(themeBlock).toContain(`${mapping}: var(${source})`)
    }
  })

  it('each mapped source variable exists in :root', () => {
    const rootBlock = css.slice(css.indexOf(':root'))
    const allSources = [
      ...Object.values(REQUIRED_COLOR_MAPPINGS),
      ...Object.values(REQUIRED_SHADOW_MAPPINGS),
    ]
    for (const source of allSources) {
      expect(rootBlock).toContain(`${source}:`)
    }
  })
})
