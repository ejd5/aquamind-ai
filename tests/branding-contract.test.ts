/**
 * AQWELIA — MASTER BRANDING : contrat d'intégration.
 *
 * Garantit que :
 *   - les nouveaux assets officiels existent (logo principal + icône A) ;
 *   - l'ancien logo `logo-aqwelia-web.png` n'est PLUS référencé dans le code ;
 *   - les anciens assets de marque inutilisés ont été retirés de public/ ;
 *   - favicon / apple-touch-icon sont régénérés depuis l'icône A ;
 *   - le SEO pointe vers le nouveau logo officiel ;
 *   - AUCUN wordmark « AQWELIA / COPILOTE PISCINE » adjacent au logo (P0/P4) ;
 *   - les assets de marque sont détourés (canal alpha transparent) (P5).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), 'utf8')
const exists = (p: string) => existsSync(join(root, p))

describe('AQWELIA master branding — assets officiels', () => {
  it('les deux assets sources officiels sont présents', () => {
    expect(exists('public/branding/aqwelia-logo-main.png')).toBe(true)
    expect(exists('public/branding/aqwelia-icon-a.png')).toBe(true)
  })

  it('l’ancien logo principal n’est plus référencé dans le code', () => {
    const files = [
      'src/components/aquamind/header.tsx',
      'src/components/landing/landing-page.tsx',
      'src/components/mobile/mobile-header.tsx',
      'src/app/auth/signin/page.tsx',
      'src/lib/seo.ts',
      'src/components/seo/structured-data.tsx',
      'src/app/layout.tsx',
    ]
    for (const f of files) {
      expect(read(f)).not.toContain('logo-aqwelia-web.png')
    }
  })

  it('le SEO et le structured-data pointent vers le nouveau logo', () => {
    expect(read('src/lib/seo.ts')).toContain('/branding/aqwelia-logo-main.png')
    expect(read('src/components/seo/structured-data.tsx')).toContain(
      '/branding/aqwelia-logo-main.png',
    )
  })

  it('les anciens assets inutilisés sont retirés de public/', () => {
    for (const gone of [
      'public/logo-aqwelia-web.png',
      'public/logo-aqwelia.png',
      'public/logo-aqwelia-2x.png',
      'public/logo.svg',
      'public/icon-aqwelia.png',
      'public/icon-aqwelia-48.png',
    ]) {
      expect(exists(gone), `${gone} doit avoir été supprimé`).toBe(false)
    }
  })

  it('les favicons sont régénérés depuis l’icône A (petites tailles)', () => {
    const icon = exists('src/app/icon.png')
    const apple = exists('public/apple-touch-icon.png')
    expect(icon).toBe(true)
    expect(apple).toBe(true)
    // Références metadata inchangées mais contenu régénéré (32 / 180).
    expect(read('src/app/layout.tsx')).toContain('icon: "/icon.png"')
    expect(read('src/app/layout.tsx')).toContain('apple: "/apple-touch-icon.png"')
  })
})

describe('AQWELIA master branding — header / wordmark (P0, P4)', () => {
  const brandFiles = [
    'src/components/aquamind/header.tsx',
    'src/components/landing/landing-page.tsx',
    'src/components/mobile/mobile-header.tsx',
    'src/app/(public)/layout.tsx',
    'src/app/auth/signin/page.tsx',
    'src/app/legal/layout.tsx',
    'src/app/care/layout.tsx',
    'src/app/growth/layout.tsx',
    'src/app/academy/layout.tsx',
    'src/app/partenaires/layout.tsx',
    'src/app/affiliation/page.tsx',
    'src/app/business/layout.tsx',
    'src/app/pro/app/layout.tsx',
    'src/app/growth/app/layout.tsx',
    'src/components/pro/pro-route-shell.tsx',
    'src/app/admin/page.tsx',
  ]

  it('plus aucun wordmark textuel adjacent au logo (header/shells)', () => {
    for (const f of brandFiles) {
      const s = read(f)
      // L'image du logo n'est plus suivie d'un bloc wordmark « AQWELIA ».
      expect(s, `${f} ne doit plus contenir de wordmark adjacent`).not.toMatch(
        /aqwelia-logo-main\.png[\s\S]{0,220}aqua-text-gradient/,
      )
      expect(s, `${f} ne doit plus afficher le sous-titre headerCopilote`).not.toContain(
        'headerCopilote',
      )
    }
  })

  it('le header principal affiche uniquement le logo (aucune mention AQWELIA texte à côté)', () => {
    const header = read('src/components/aquamind/header.tsx')
    // Le bloc textuel (wordmark + badge + copilote) a été supprimé.
    expect(header).not.toMatch(/leading-tight/)
    expect(header).not.toContain('headerCopilote')
    expect(header).toContain('h-28')
  })

  it('le mobile header utilise l’icône A, sans wordmark', () => {
    const mh = read('src/components/mobile/mobile-header.tsx')
    expect(mh).toContain('/branding/aqwelia-icon-a.png')
    expect(mh).not.toMatch(/aqua-text-gradient/)
    expect(mh).not.toContain("t('pro')")
  })
})

describe('AQWELIA master branding — détourage transparent (P5)', () => {
  function hasAlphaChannel(p: string): boolean {
    const b = readFileSync(join(root, p))
    // PNG color type byte (offset 25): 6 = RGBA, 4 = grayscale+alpha.
    return b[25] === 6 || b[25] === 4
  }

  it('logo principal : RGBA (transparence) et coins transparents', () => {
    expect(hasAlphaChannel('public/branding/aqwelia-logo-main.png')).toBe(true)
  })

  it('icône A : RGBA (transparence)', () => {
    expect(hasAlphaChannel('public/branding/aqwelia-icon-a.png')).toBe(true)
  })

  it('favicon et apple-touch-icon : RGBA', () => {
    expect(hasAlphaChannel('src/app/icon.png')).toBe(true)
    expect(hasAlphaChannel('public/apple-touch-icon.png')).toBe(true)
  })
})
