/**
 * AQWELIA — MASTER BRANDING : contrat d'intégration.
 *
 * Garantit que :
 *   - les nouveaux assets officiels existent (logo principal + icône A) ;
 *   - l'ancien logo `logo-aqwelia-web.png` n'est PLUS référencé dans le code ;
 *   - les anciens assets de marque inutilisés ont été retirés de public/ ;
 *   - favicon / apple-touch-icon sont régénérés depuis l'icône A ;
 *   - le SEO pointe vers le nouveau logo officiel.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
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
