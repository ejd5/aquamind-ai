/**
 * ARQWELIA Lot 1 — i18n completeness test (Round 2, Option B).
 *
 * ARQWELIA is exposed ONLY in FR + EN. es/de/it/pt/nl are intentionally NOT
 * shipped with the `arqwelia` namespace (Option B): users with those UI
 * locales get an explicit EN fallback for ARQWELIA routes — no fake
 * multilingual. See docs/ARQWELIA_LOT1.md "i18n (Option B)".
 *
 * This test enforces:
 *  - fr + en both have the `arqwelia` namespace and share the same key set
 *  - es/de/it/pt/nl do NOT carry a French-seeded `arqwelia` namespace
 *    (i.e. no fake multilingual leaking through).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SUPPORTED = ['fr', 'en'] as const
const UNSUPPORTED = ['es', 'de', 'it', 'pt', 'nl'] as const
const LOCALE_DIR = join(process.cwd(), 'src', 'i18n', 'locales')

function load(loc: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(LOCALE_DIR, `${loc}.json`), 'utf8'))
}

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

describe('ARQWELIA Lot 1 — i18n (Option B: FR + EN only)', () => {
  it('fr + en both have a non-empty arqwelia namespace', () => {
    for (const loc of SUPPORTED) {
      const data = load(loc)
      expect(data.arqwelia, `${loc} should have arqwelia`).toBeTruthy()
      expect(leafPaths(data.arqwelia as Record<string, unknown>).length, `${loc} arqwelia should have keys`).toBeGreaterThan(20)
    }
  })

  it('fr + en share the same arqwelia key set', () => {
    const frKeys = leafPaths(load('fr').arqwelia as Record<string, unknown>, 'arqwelia').sort()
    const enKeys = leafPaths(load('en').arqwelia as Record<string, unknown>, 'arqwelia').sort()
    const missingInEn = frKeys.filter((k) => !enKeys.includes(k))
    expect(missingInEn, `missing in en: ${missingInEn.join(', ')}`).toEqual([])
  })

  it('es/de/it/pt/nl do NOT carry a fake arqwelia namespace (Option B)', () => {
    for (const loc of UNSUPPORTED) {
      const data = load(loc)
      // ARQWELIA must not surface FR-seeded keys for these locales.
      expect(data.arqwelia, `${loc} must not have arqwelia (Option B)`).toBeFalsy()
    }
  })
})