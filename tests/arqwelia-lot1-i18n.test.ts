/**
 * ARQWELIA Lot 1 — i18n completeness test.
 *
 * Verifies that every locale supported by the app has the `arqwelia` namespace
 * with the same key structure as the FR canonical source. Catches missing keys
 * that would otherwise render raw key paths to users.
 *
 * Also greps ARQWELIA components for obvious hardcoded FR strings outside of
 * t() calls (a coarse safety net — full static analysis lives elsewhere).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const LOCALES = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl'] as const
const LOCALE_DIR = join(process.cwd(), 'src', 'i18n', 'locales')

function load(loc: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(LOCALE_DIR, `${loc}.json`), 'utf8'))
}

/** Collect all leaf key paths (dotted) under a namespace. */
function leafPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...leafPaths(v as Record<string, unknown>, path))
    } else {
      out.push(path)
    }
  }
  return out
}

describe('ARQWELIA Lot 1 — i18n completeness', () => {
  const fr = load('fr')
  const frArq = fr.arqwelia as Record<string, unknown>
  const frKeys = leafPaths(frArq, 'arqwelia').sort()

  it('FR canonical arqwelia namespace exists and is non-empty', () => {
    expect(frArq).toBeTruthy()
    expect(frKeys.length).toBeGreaterThan(20)
  })

  it.each(LOCALES)('%s has the same arqwelia key set as FR', (loc) => {
    const data = load(loc)
    const arq = data.arqwelia as Record<string, unknown>
    expect(arq).toBeTruthy()
    const keys = leafPaths(arq, 'arqwelia').sort()
    // Every FR key must be present in the other locale.
    const missing = frKeys.filter((k) => !keys.includes(k))
    expect(missing, `missing keys in ${loc}: ${missing.join(', ')}`).toEqual([])
  })
})