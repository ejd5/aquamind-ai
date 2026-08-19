/**
 * AQWELIA — LAGON VIVANT shell + dashboard test (PR #107).
 *
 * Garantit que la fondation PR #106 est réellement appliquée au shell et au
 * dashboard, tout en préservant :
 *   - le branding du header (logo master inchangé, pas de wordmark),
 *   - les contrats structurels desktop/mobile (sidebar w-72, bottom nav),
 *   - la sémantique scientifique des couleurs d'état de l'eau,
 *   - le périmètre de la PR (autres modules non modifiés),
 *   - la lisibilité typographique (plus de text-[8px]/[9px] dans le dashboard).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8')

const shell = read('src/components/aquamind/app-shell.tsx')
const header = read('src/components/aquamind/header.tsx')
const dashboard = read('src/components/aquamind/module-dashboard.tsx')

describe('LAGON VIVANT — shell', () => {
  it('applique le fond tinté .app-bg-lagon au conteneur racine', () => {
    expect(shell).toContain('app-bg-lagon flex min-h-screen flex-col bg-background')
  })

  it('conserve les contrats structurels PR #104 (shell full-width)', () => {
    expect(shell).toContain('className="flex w-full flex-1 gap-0 px-3 sm:px-6"')
    expect(shell).toContain('<main className="min-w-0 flex-1 px-4 py-6 pb-28 sm:px-6 md:pb-10">')
    expect(shell).toContain('hidden h-[calc(100vh-8rem)] w-72 shrink-0')
  })

  it('la sidebar conserve les labels complets sans truncate', () => {
    expect(shell).toContain('min-w-0 flex-1 whitespace-normal text-left leading-tight')
    expect(shell).not.toContain('truncate')
  })
})

describe('LAGON VIVANT — sidebar desktop', () => {
  it('assigne une famille de couleur cohérente par entrée de navigation', () => {
    expect(shell).toContain("tone: 'lagoon'")
    expect(shell).toContain("tone: 'aqua'")
    expect(shell).toContain("tone: 'info'")
    expect(shell).toContain("tone: 'champagne'")
  })

  it('le Premium utilise la famille champagne (valeur), pas le gold legacy', () => {
    expect(shell).toContain("{ id: 'paywall', label: t('premium'), short: t('shortPremium'), icon: Crown, tone: 'champagne' }")
    expect(shell).toContain('text-champagne')
  })

  it('les icônes utilisent des icon-chips colorés (inactif = teinte douce)', () => {
    expect(shell).toContain('icon-chip icon-chip-lagoon')
    expect(shell).toContain('icon-chip icon-chip-aqua')
    expect(shell).toContain('icon-chip icon-chip-info')
    expect(shell).toContain('icon-chip icon-chip-champagne')
  })

  it('les icônes actives utilisent un chip dégradé identifiable par famille', () => {
    expect(shell).toContain('bg-gradient-to-br from-lagoon to-aqua-vivid text-night')
    expect(shell).toContain('bg-gradient-to-br from-aqua to-aqua-vivid text-night')
    expect(shell).toContain('bg-gradient-to-br from-champagne to-[#E2C79A] text-night')
  })

  it('la ligne active est identifiable (ring + teinte de la famille, ROUND 2 renforcé)', () => {
    expect(shell).toContain('bg-gradient-to-r from-lagoon/20 to-aqua-vivid/15 text-foreground shadow-md ring-1 ring-lagoon/30')
    expect(shell).toContain('ring-1 ring-champagne/40')
  })

  it('le Premium est plus assumé au repos (fond champagne + bordure, ROUND 2)', () => {
    expect(shell).toContain('border border-champagne/40 bg-champagne/5 hover:border-champagne/70 hover:bg-champagne/10')
  })

  it('corail non utilisé dans la sidebar (usage rare, pas dominant)', () => {
    expect(shell).not.toContain('icon-chip-coral')
  })
})

describe('LAGON VIVANT — header (protection branding)', () => {
  it('le logo master et la hauteur restent inchangés', () => {
    expect(header).toContain('/branding/aqwelia-logo-main.png')
    expect(header).toContain('h-28')
    expect(header).toContain('flex h-32 items-center justify-between px-3 sm:px-6')
  })

  it('aucun wordmark texte n’est réintroduit à côté du logo', () => {
    expect(header).not.toMatch(/leading-tight/)
    expect(header).not.toContain('headerCopilote')
  })

  it('seule la surface/profondeur du header évolue (shadow + blur, minimal)', () => {
    expect(header).toContain('<header className="sticky top-0 z-50 w-full border-b border-gold/20 bg-background/55 shadow-[0_12px_32px_-24px_oklch(0.30_0.07_200/0.5)] backdrop-blur-2xl">')
  })
})

describe('LAGON VIVANT — dashboard', () => {
  it('la carte Niveau 1 (gauge eau claire) porte la surface hero-lagon', () => {
    expect(dashboard).toContain('<Card className="hero-lagon lg:col-span-1">')
  })

  it('l’état vide est une vraie composition premium (hero, orbes, halo, CTA valorisé)', () => {
    expect(dashboard).toContain('<Card className="hero-lagon">')
    expect(dashboard).toContain('glow-orb -left-12 -top-12 h-44 w-44 bg-aqua/40')
    expect(dashboard).toContain('glow-orb -bottom-14 -right-10 h-40 w-40 bg-lagoon/35')
    expect(dashboard).toContain('icon-chip icon-chip-lagoon relative h-16 w-16 shadow-lg shadow-lagoon/40 ring-1 ring-lagoon/30')
    expect(dashboard).toContain('variant="aqua-gradient"')
    expect(dashboard).toContain('size="lg"')
  })

  it('hiérarchie des cartes : verre lagon translucide sur les niveaux 2-3', () => {
    expect(dashboard).toContain('glass-card-lagon')
    // Le dashboard ne doit plus utiliser l’ancien verre blanc opaque.
    expect(dashboard).not.toContain('className="glass-card"')
  })

  it('le champagne n’apparaît que sur des accents nobles (jamais sur un statut scientifique)', () => {
    expect(dashboard).toContain('h-px w-8 bg-champagne/50')
    expect(dashboard).toContain('<Sparkles className="h-3.5 w-3.5 text-champagne" />')
    // La pastille de clarté (scientifique) reste sur les gradients de statut.
    expect(dashboard).toContain('rounded-full bg-gradient-to-r ${clarityGrad} px-4 py-1.5')
  })

  it('les quick actions utilisent les icon-chips et des surfaces teintées par action (ROUND 2 renforcé)', () => {
    expect(dashboard).toContain('icon-chip icon-chip-lagoon')
    expect(dashboard).toContain('icon-chip icon-chip-aqua')
    expect(dashboard).toContain('icon-chip icon-chip-info')
    expect(dashboard).toContain('border-lagoon/25 bg-gradient-to-br from-lagoon/15 via-card/70 to-transparent')
    expect(dashboard).toContain('border-aqua-vivid/25')
    expect(dashboard).toContain('border-info/25')
  })

  it('l’urgence conserve son identité destructive (pas de corail sur la sécurité)', () => {
    expect(dashboard).toContain('icon-chip bg-destructive/10 text-destructive')
    expect(dashboard).not.toContain('icon-chip-coral')
  })

  it('les quick actions ont un focus-visible et un lift hover discret', () => {
    expect(dashboard).toContain('focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60')
    expect(dashboard).toContain('hover:-translate-y-0.5')
  })

  it('l’état vide utilise le bouton aqua-gradient de la fondation', () => {
    expect(dashboard).toContain('variant="aqua-gradient"')
  })

  it('la sémantique scientifique des couleurs est préservée (vert/jaune/rouge)', () => {
    // Gauge : états accent/yellow/orange/destructive inchangés.
    expect(dashboard).toContain("'oklch(0.7 0.15 155)'")
    expect(dashboard).toContain("'oklch(0.58 0.22 27)'")
    // CLARITY_COLORS inchangé.
    expect(dashboard).toContain("from-destructive to-[oklch(0.4_0.18_25)]")
    // SWIM_CONFIG : allowed/avoid/forbidden conservent leurs classes sémantiques.
    expect(dashboard).toContain('border-yellow-400/30 bg-yellow-400/10')
    expect(dashboard).toContain('border-destructive/30 bg-destructive/10')
    expect(dashboard).toContain('bg-[oklch(0.7_0.15_155)]')
  })

  it('la marque et le statut scientifique restent séparés (aucune couleur de marque sur un statut)', () => {
    // Les couleurs LAGON VIVANT n'apparaissent jamais dans statusDotColor /
    // CLARITY_COLORS / SWIM_CONFIG (blocs sémantiques).
    const statusDot = dashboard.slice(dashboard.indexOf('function statusDotColor'), dashboard.indexOf('function Gauge'))
    expect(statusDot).not.toContain('lagoon')
    expect(statusDot).not.toContain('coral')
    expect(statusDot).not.toContain('champagne')
  })

  it('typographie : plus de text-[8px] ni text-[9px], 10px limité aux axes du mini-graphe', () => {
    expect(dashboard).not.toContain('text-[8px]')
    expect(dashboard).not.toContain('text-[9px]')
    const occurrences = (dashboard.match(/text-\[10px\]/g) || []).length
    expect(occurrences).toBeLessThanOrEqual(1)
  })
})

describe('LAGON VIVANT — périmètre strict', () => {
  it('les modules hors périmètre restent intacts', () => {
    const untouched = [
      'src/components/aquamind/module-diagnostic.tsx',
      'src/components/aquamind/strip-scanner.tsx',
      'src/components/aquamind/module-water-test.tsx',
      'src/components/aquamind/module-guides.tsx',
      'src/components/aquamind/module-paywall.tsx',
      'src/components/mobile/bottom-tabs.tsx',
    ]
    const markers = ['icon-chip', 'card-accent-lagon', 'app-bg-lagon', 'btn-aqua-gradient', 'btn-champagne-gradient', 'card-premium-champagne', 'glass-card-lagon', 'hero-lagon', 'glow-orb']
    for (const file of untouched) {
      const src = read(file)
      for (const marker of markers) {
        expect(src, `${file} ne doit pas contenir ${marker}`).not.toContain(marker)
      }
    }
  })

  it('la météo est harmonisée en surface uniquement (verre lagon, logique intacte)', () => {
    const weather = read('src/components/aquamind/module-weather.tsx')
    expect(weather).toContain('glass-card-lagon')
    // Aucune refonte logique : les gardes métier restent présents.
    expect(weather).toContain('const hasAssessment = assessment !== null')
    expect(weather).toContain("onNavigate('paywall')")
  })

  it('la navigation mobile (bottom nav) reste intacte avec ses libellés courts', () => {
    expect(shell).toContain('{item.short}')
    expect(shell).toContain('<p className="text-sm font-semibold">{item.short}</p>')
    expect(shell).toContain('md:hidden')
  })
})
