/**
 * ARQWELIA Lot 2 — A2 AR POC viewer tests (Vitest, no DOM/heavy renderer).
 *
 * Covers:
 *  - feature flag off → component returns null / ZERO DOM, flag on → renders
 *  - <model-viewer> AR attributes (ar-scale fixed, ar-modes webxr /
 *    scene-viewer / quick-look, src .glb, loading lazy, poster)
 *  - AR-unavailable fallback (poster + message + open-3D link)
 *  - reduced-motion static fallback
 *  - no Prisma / @/lib/db imports anywhere in the A2 files
 *  - the lab page sets robots noindex
 *  - @google/model-viewer present in package.json
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

/* ── Pure feature-flag helper (stubbed env) ────────────────────────────── */

async function flagWith(env: string | undefined): Promise<boolean> {
  vi.resetModules()
  if (env === undefined) {
    delete process.env.NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED
  } else {
    process.env.NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED = env
  }
  const { isArqweliaArPocEnabled } = await import('@/lib/features')
  return isArqweliaArPocEnabled()
}

/* ── Component render via renderToString (no DOM) ──────────────────────── */

async function renderViewer(
  env: string | undefined,
  props?: Record<string, unknown>,
): Promise<string> {
  vi.resetModules()
  if (env === undefined) {
    delete process.env.NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED
  } else {
    process.env.NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED = env
  }
  const { renderToString } = await import('react-dom/server')
  const { default: React } = await import('react')
  const { NextIntlClientProvider } = await import('next-intl')
  const frMessages = (await import('@/i18n/locales/fr.json')).default
  const { ArqweliaArViewer } = await import('@/components/arqwelia/ar-viewer')
  return renderToString(
    React.createElement(
      NextIntlClientProvider as React.ElementType,
      { locale: 'fr', messages: frMessages },
      React.createElement(ArqweliaArViewer as React.ElementType, props),
    ),
  )
}

describe('feature flag — isArqweliaArPocEnabled()', () => {
  it('returns false when env var is unset (default: disabled)', async () => {
    expect(await flagWith(undefined)).toBe(false)
    expect(await flagWith('false')).toBe(false)
    expect(await flagWith('0')).toBe(false)
  })

  it('returns true only when env var is exactly "true"', async () => {
    expect(await flagWith('true')).toBe(true)
  })
})

describe('ArqweliaArViewer — zero DOM when flag off', () => {
  it('flag off → renders nothing (empty string, ZERO DOM)', async () => {
    const html = await renderViewer('false')
    expect(html).toBe('')
  })

  it('flag unset → renders nothing (ZERO DOM)', async () => {
    const html = await renderViewer(undefined)
    expect(html).toBe('')
  })

  it('flag on → renders non-null initial state (poster + loading message)', async () => {
    const html = await renderViewer('true')
    expect(html.length).toBeGreaterThan(0)
    expect(html).toContain('/models/arqwelia-pool-poc-poster.svg')
    expect(html).toContain('Chargement du visualiseur 3D')
  })
})

describe('ArqweliaModelViewer — model-viewer AR attributes', () => {
  let html: string

  beforeAll(async () => {
    const { renderToString } = await import('react-dom/server')
    const { default: React } = await import('react')
    const { ArqweliaModelViewer } = await import('@/components/arqwelia/ar-viewer')
    html = renderToString(React.createElement(ArqweliaModelViewer, { alt: 'test alt' }))
  })

  it('renders a <model-viewer> element', () => {
    expect(html).toMatch(/<model-viewer/)
    expect(html).toMatch(/<\/model-viewer>/)
  })

  it('src points to the .glb POC model', () => {
    expect(html).toContain('src="/models/arqwelia-pool-poc.glb"')
  })

  it('sets ar-scale="fixed"', () => {
    expect(html).toContain('ar-scale="fixed"')
  })

  it('ar-modes includes webxr, scene-viewer and quick-look', () => {
    const modes = 'webxr scene-viewer quick-look'
    expect(html).toContain(`ar-modes="${modes}"`)
    expect(modes.split(' ')).toEqual(
      expect.arrayContaining(['webxr', 'scene-viewer', 'quick-look']),
    )
  })

  it('sets ar-placement="floor", camera-controls and shadow-intensity', () => {
    expect(html).toContain('ar-placement="floor"')
    expect(html).toContain('camera-controls')
    expect(html).toContain('shadow-intensity="1"')
  })

  it('lazy-loads the model and shows a poster', () => {
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('poster="/models/arqwelia-pool-poc-poster.svg"')
  })

  it('includes the descriptive alt', () => {
    expect(html).toContain('alt="test alt"')
  })

  it('AR is enabled by default (ar attribute present)', () => {
    expect(html).toMatch(/ ar(?:="")?/)
  })
})

describe('ArqweliaArViewer — AR-unavailable fallback', () => {
  it('flag on + arSupported={false} → visible 2D fallback (poster + message + 3D link)', async () => {
    const html = await renderViewer('true', { arSupported: false })
    expect(html).toContain('AR n')
    expect(html).toContain('pas disponible sur cet appareil')
    expect(html).toContain('/models/arqwelia-pool-poc-poster.svg')
    expect(html).toContain('Ouvrir la vue 3D interactive')
    expect(html).not.toMatch(/<model-viewer/)
  })

  it('flag on + reducedMotion → static poster + text, no model-viewer', async () => {
    const html = await renderViewer('true', { reducedMotion: true })
    expect(html).toContain('Réduction des animations activée')
    expect(html).toContain('/models/arqwelia-pool-poc-poster.svg')
    expect(html).not.toMatch(/<model-viewer/)
  })
})

describe('A2 scope hygiene — no Prisma / DB imports, noindex lab page', () => {
  const A2_FILES = [
    'src/components/arqwelia/ar-viewer.tsx',
    'src/app/(public)/arqwelia/lab/ar-poc/page.tsx',
    'src/lib/features.ts',
    'scripts/gen-arqwelia-pool-poc.mjs',
  ]

  it.each(A2_FILES)('%s does not import Prisma or @/lib/db', (file) => {
    const src = readFileSync(join(ROOT, file), 'utf8')
    expect(src).not.toMatch(/@\/lib\/db/)
    expect(src).not.toMatch(/from ['"]prisma['"]/)
    expect(src).not.toMatch(/require\(['"]prisma['"]\)/)
  })

  it('the lab page sets robots noindex', () => {
    const page = readFileSync(join(ROOT, 'src/app/(public)/arqwelia/lab/ar-poc/page.tsx'), 'utf8')
    expect(page).toContain('robots')
    expect(page).toMatch(/index:\s*false/)
    expect(page).toContain('generateMetadata')
  })

  it('package.json declares @google/model-viewer as a dependency', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
    expect(pkg.dependencies['@google/model-viewer']).toBeTruthy()
  })

  it('.env.example documents both AR POC flags', () => {
    const env = readFileSync(join(ROOT, '.env.example'), 'utf8')
    expect(env).toContain('ARQWELIA_AR_POC_ENABLED=false')
    expect(env).toContain('NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED=false')
  })
})
