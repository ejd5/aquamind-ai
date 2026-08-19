/**
 * AQWELIA PR #103 — polish : suppression du double logo sur les visuels guidés +
 * localisation des anciens diagnostics sauvegardés à l'affichage.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizePhotoDiagnostic } from '@/lib/pool/photo-diagnostic-normalize'

const ROOT = process.cwd()
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

const stripPng = [
  '/guides/stripscan/stripscan-guide-1-prepare.png',
  '/guides/stripscan/stripscan-guide-2-lighting.png',
  '/guides/stripscan/stripscan-guide-3-align.png',
]
const photoPng = [
  '/guides/photo-diagnostic/photo-diagnostic-guide-1-overview.png',
  '/guides/photo-diagnostic/photo-diagnostic-guide-2-closeup.png',
  '/guides/photo-diagnostic/photo-diagnostic-guide-3-frame.png',
]

describe('PR #103 — suppression du double logo des visuels guidés', () => {
  it('StripScanner n’ajoute plus le logo overlay sur le PNG guidé', () => {
    const src = read('src/components/aquamind/strip-scanner.tsx')
    // L'image guidée est conservée avec object-contain, sans overlay logo.
    expect(src).toContain('className="h-44 w-full object-contain p-2 sm:h-48"')
    // Plus aucun overlay /branding/aqwelia-logo-main dans GuideStage.
    expect(src).not.toMatch(/branding\/aqwelia-logo-main\.png[\s\S]{0,120}opacity-80/)
  })

  it('ModuleDiagnostic n’ajoute plus le logo overlay sur le PNG guidé', () => {
    const src = read('src/components/aquamind/module-diagnostic.tsx')
    expect(src).toContain('className="h-36 w-full object-contain p-2 sm:h-40"')
    // Pas d'overlay logo sur le guide photo (le dialogue de suppression garde
    // l'icône A légitime).
    expect(src).not.toMatch(/activePhotoGuide\.src[\s\S]{0,200}branding\/aqwelia-logo-main/)
  })

  it('les 6 chemins PNG sont toujours présents et existent', () => {
    for (const asset of [...stripPng, ...photoPng]) {
      expect(existsSync(join(ROOT, 'public', asset.replace(/^\//, '')))).toBe(true)
      expect(read('src/components/aquamind/strip-scanner.tsx') + read('src/components/aquamind/module-diagnostic.tsx')).toContain(asset)
    }
  })

  it('les guides 1/3 → 3/3 restent en place (compteur UI + i18n)', () => {
    expect(read('src/components/aquamind/strip-scanner.tsx')).toContain('{guidedStep + 1}/{steps.length}')
    expect(read('src/components/aquamind/module-diagnostic.tsx')).toContain('{photoGuideStep + 1}/{photoGuideSteps.length}')
  })
})

describe('PR #103 — localisation des anciens diagnostics sauvegardés', () => {
  const englishSaved = {
    imageType: 'water',
    detectedIssues: ['greenish water', 'floating debris'],
    probableIssues: ['algae growth'],
    confidence: 0.6,
    missingData: ['chlorine level'],
    recommendedNextStep: 'test the water and check the filter',
    safetyWarnings: ['do not swim'],
    userFriendlySummary: 'The image shows greenish water and floating debris',
  }

  it('normalizePhotoDiagnostic est utilisé pour l’historique (import + appel)', () => {
    const src = read('src/components/aquamind/module-diagnostic.tsx')
    expect(src).toContain("from '@/lib/pool/photo-diagnostic-normalize'")
    expect(src).toContain('const localizedHistory = normalizePhotoDiagnostic(')
  })

  it('le résumé History utilise la version localisée (localizedSummary)', () => {
    const src = read('src/components/aquamind/module-diagnostic.tsx')
    expect(src).toContain('const localizedSummary = localizedHistory.userFriendlySummary ||')
    expect(src).toMatch(/localizedSummary && !isRefusalText\(localizedSummary\)\s*\? localizedSummary/)
  })

  it('la réouverture d’un ancien diagnostic utilise les champs localisés', () => {
    const src = read('src/components/aquamind/module-diagnostic.tsx')
    expect(src).toContain('imageType: localizedHistory.imageType')
    expect(src).toContain('detectedIssues: localizedHistory.detectedIssues')
    expect(src).toContain('probableIssues: localizedHistory.probableIssues')
    expect(src).toContain('userFriendlySummary: localizedHistory.userFriendlySummary || undefined')
  })

  it('un diagnostic EN devient correctement localisé en FR', () => {
    const out = normalizePhotoDiagnostic(englishSaved, 'fr', '', 'water')
    expect(out.userFriendlySummary).toContain('l’image montre')
    expect(out.userFriendlySummary).toContain('eau verdâtre')
    expect(out.userFriendlySummary).toContain('débris flottants')
    expect(out.detectedIssues[0]).toBe('eau verdâtre')
    expect(out.detectedIssues[1]).toBe('débris flottants')
    expect(out.probableIssues.join(' ').toLowerCase()).toContain('algues')
    expect(out.recommendedNextStep).toContain('tester l’eau')
  })

  it('la même donnée avec locale EN n’est PAS traduite en français', () => {
    const out = normalizePhotoDiagnostic(englishSaved, 'en', '', 'water')
    expect(out.userFriendlySummary).toBe('The image shows greenish water and floating debris')
    expect(out.detectedIssues).toEqual(['greenish water', 'floating debris'])
    expect(out.userFriendlySummary).not.toContain('l’image montre')
  })
})
