/**
 * AQWELIA PR #104 — regression: weather crash (assessment null) + sidebar polish.
 *
 * Garantit :
 *   - WeatherResponse accepte assessment null (feature gate weather_advanced) ;
 *   - un garde existe avant tout accès à assessment.alerts / algaeRisk / swimComfort ;
 *   - le chemin assessment=null affiche quand même la météo basique + une carte
 *     Premium avec CTA paywall ;
 *   - la sidebar desktop est élargie (w-72 ≥ 288px) et les labels ne sont plus
 *     tronqués ;
 *   - la navigation mobile n'est pas modifiée.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const exists = (p: string) => existsSync(join(ROOT, p))

describe('PR #104 — weather crash : assessment nullable', () => {
  it('WeatherResponse accepte assessment null + upgradeRequired', () => {
    const src = read('src/components/aquamind/module-weather.tsx')
    expect(src).toMatch(/assessment: Assessment \| null/)
    expect(src).toMatch(/upgradeRequired\?: boolean/)
  })

  it('un garde existe AVANT le premier accès à assessment.alerts[0]', () => {
    const src = read('src/components/aquamind/module-weather.tsx')
    // Le premier déréférencement des alerts est protégé par hasAssessment.
    const hasAssessmentIdx = src.indexOf('const hasAssessment = assessment !== null')
    expect(hasAssessmentIdx).toBeGreaterThan(-1)
    const alertsGuard = src.indexOf('assessment.alerts', hasAssessmentIdx)
    expect(alertsGuard).toBeGreaterThan(-1)
    // Il n'existe AUCUN accès à assessment.alerts sans garde avant la garde.
    const derefBeforeGuard = src.slice(0, hasAssessmentIdx)
    expect(derefBeforeGuard).not.toContain('assessment.alerts')
    expect(derefBeforeGuard).not.toContain('assessment.algaeRisk')
    expect(derefBeforeGuard).not.toContain('assessment.swimComfort')
    expect(derefBeforeGuard).not.toContain('assessment.filtration')
  })

  it('le chemin assessment=null affiche la météo basique (weather toujours rendu)', () => {
    const src = read('src/components/aquamind/module-weather.tsx')
    // La carte Premium (analyse avancée) n'apparaît QUE si !hasAssessment.
    expect(src).toContain('{!hasAssessment && (')
    expect(src).toContain("t('premiumAnalysis')")
    // Le forecast 3 jours et les conditions actuelles restent toujours rendus.
    expect(src).toContain("t('forecast3days')")
    expect(src).toContain("t('currentConditions')")
  })

  it('il existe un CTA vers le paywall / plans', () => {
    const src = read('src/components/aquamind/module-weather.tsx')
    expect(src).toContain("onNavigate('paywall')")
    expect(src).toContain("t('premiumCta')")
  })
})

describe('PR #104 — sidebar desktop élargie', () => {
  it('la sidebar desktop utilise w-72 (≥ 288px)', () => {
    const src = read('src/components/aquamind/app-shell.tsx')
    expect(src).toContain('w-72')
    expect(src).not.toMatch(/w-56/)
  })

  it('le label desktop n’utilise plus truncate', () => {
    const src = read('src/components/aquamind/app-shell.tsx')
    // Le label de la sidebar desktop est en wrap (whitespace-normal + flex-1).
    expect(src).toContain('min-w-0 flex-1 whitespace-normal text-left leading-tight')
    // Plus aucun truncate dans le rendu desktop (recherche globale).
    expect(src).not.toContain('truncate')
  })

  it('la navigation mobile n’est pas modifiée (bottom nav + sheet utilisent short)', () => {
    const src = read('src/components/aquamind/app-shell.tsx')
    // Bottom nav mobile : libellés courts (item.short), pas de truncate introduit.
    expect(src).toContain('{item.short}')
    // Le sheet mobile "Plus" rend encore le label complet en texte court + label.
    expect(src).toContain('<p className="text-sm font-semibold">{item.short}</p>')
    // La largeur w-72 n'est appliquée qu'à l'aside desktop (hidden md:block).
    expect(src).toContain('hidden h-[calc(100vh-8rem)] w-72 shrink-0')
  })
})

describe('PR #104 R2 — desktop shell full-width', () => {
  it('le conteneur shell desktop ne centre plus dans max-w-7xl', () => {
    const src = read('src/components/aquamind/app-shell.tsx')
    // Le conteneur réel du shell (ligne du div juste avant <aside>) n'a plus
    // ni max-w-7xl ni mx-auto dans sa className.
    const asideIdx = src.indexOf('<aside')
    expect(asideIdx).toBeGreaterThan(-1)
    const divLine = src.slice(0, asideIdx).split('\n').filter((l) => l.includes('flex-1 gap-0')).pop() || ''
    expect(divLine).not.toContain('max-w-7xl')
    expect(divLine).not.toContain('mx-auto')
    expect(divLine).toContain('w-full')
  })

  it('le conteneur shell desktop est full-width (flex w-full, pas de max-width)', () => {
    const src = read('src/components/aquamind/app-shell.tsx')
    expect(src).toMatch(/className="flex w-full flex-1 gap-0 px-3 sm:px-6"/)
  })

  it('le contenu principal reste flex-1 + min-w-0 (profite de l’espace libéré)', () => {
    const src = read('src/components/aquamind/app-shell.tsx')
    expect(src).toContain('<main className="min-w-0 flex-1 px-4 py-6 pb-28 sm:px-6 md:pb-10">')
  })

  it('la sidebar desktop reste w-72 sans truncate', () => {
    const src = read('src/components/aquamind/app-shell.tsx')
    expect(src).toContain('w-72')
    expect(src).not.toContain('w-56')
    expect(src).toContain('min-w-0 flex-1 whitespace-normal text-left leading-tight')
    expect(src).not.toContain('truncate')
  })
})

describe('PR #104 R3 — header desktop aligné à gauche', () => {
  it('le conteneur header desktop n’utilise plus la contrainte centrée (max-w-7xl / mx-auto)', () => {
    const src = read('src/components/aquamind/header.tsx')
    // Le wrapper du header (juste après <header>) n'a plus max-w-7xl ni mx-auto.
    const headerIdx = src.indexOf('<header className="sticky')
    expect(headerIdx).toBeGreaterThan(-1)
    const wrapperIdx = src.indexOf('<div className="flex h-32', headerIdx)
    expect(wrapperIdx).toBeGreaterThan(-1)
    const wrapperLine = src.slice(headerIdx).split('\n').find((l) => l.includes('h-32 items-center justify-between')) || ''
    expect(wrapperLine).not.toContain('max-w-7xl')
    expect(wrapperLine).not.toContain('mx-auto')
  })

  it('le header est full-width sur desktop et aligné sur le shell (px-3 sm:px-6)', () => {
    const src = read('src/components/aquamind/header.tsx')
    expect(src).toContain('flex h-32 items-center justify-between px-3 sm:px-6')
  })

  it('le logo AQWELIA reste en tête (zone gauche du header)', () => {
    const src = read('src/components/aquamind/header.tsx')
    // Le logo est le premier élément du wrapper (gauche), la nav/avatar à droite.
    const logoIdx = src.indexOf('/branding/aqwelia-logo-main.png')
    const navIdx = src.indexOf('flex items-center gap-2')
    expect(logoIdx).toBeGreaterThan(-1)
    expect(navIdx).toBeGreaterThan(logoIdx)
  })

  it('la navigation / avatar droite reste présente', () => {
    const src = read('src/components/aquamind/header.tsx')
    expect(src).toContain('flex items-center gap-2')
    expect(src).toContain('onBackToLanding &&')
    expect(src).toContain('userMenuAria')
  })

  it('la sidebar desktop reste inchangée (w-72, hidden md:block)', () => {
    const shell = read('src/components/aquamind/app-shell.tsx')
    expect(shell).toContain('hidden h-[calc(100vh-8rem)] w-72 shrink-0')
  })

  it('la météo reste inchangée (assessment nullable + garde hasAssessment)', () => {
    const src = read('src/components/aquamind/module-weather.tsx')
    expect(src).toMatch(/assessment: Assessment \| null/)
    expect(src).toContain('const hasAssessment = assessment !== null')
    expect(src).toContain("{!hasAssessment && (")
  })
})

describe('PR #104 — i18n premium weather', () => {
  it('toutes les locales définissent les clés premium weather', () => {
    for (const locale of ['fr', 'en', 'es', 'pt', 'de', 'it', 'nl']) {
      const json = JSON.parse(read(`src/i18n/locales/${locale}.json`))
      expect(json.weather.summaryUnavailable).toBeTruthy()
      expect(json.weather.premiumAnalysis).toBeTruthy()
      expect(json.weather.premiumAnalysisTitle).toBeTruthy()
      expect(json.weather.premiumAnalysisDesc).toBeTruthy()
      expect(json.weather.premiumCta).toBeTruthy()
    }
  })
})
