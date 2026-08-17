/**
 * AQWELIA — P0-A i18n : la sortie IA du diagnostic photo ne doit JAMAIS afficher
 * de texte anglais brut quand la locale active est le français.
 *
 * Tests de la couche de normalisation `photo-diagnostic-normalize` : tokens
 * d'observation anglais → français, imageType canonique, fallback localisé.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { normalizePhotoDiagnostic } from '@/lib/pool/photo-diagnostic-normalize'

describe('normalizePhotoDiagnostic — i18n FR', () => {
  it('traduit le résumé anglais type « greenish water » en français', () => {
    const parsed = {
      imageType: 'water',
      userFriendlySummary: 'The image shows a rectangular pool with greenish water.',
      detectedIssues: ['greenish water', 'floating debris'],
      probableIssues: ['Low chlorine', 'algae growth'],
      recommendedNextStep: 'test the water and check the filter',
      missingData: ['chlorine level'],
      safetyWarnings: ['do not swim'],
      confidence: 0.7,
    }
    const out = normalizePhotoDiagnostic(parsed, 'fr')
    expect(out.userFriendlySummary).toContain('l’image montre')
    expect(out.userFriendlySummary).toContain('eau verdâtre')
    expect(out.userFriendlySummary).not.toMatch(/\bgreenish\b/i)
    expect(out.detectedIssues[0]).toBe('eau verdâtre')
    expect(out.detectedIssues[1]).toBe('débris flottants')
    expect(out.probableIssues.join(' ').toLowerCase()).toContain('algues')
    expect(out.recommendedNextStep).toContain('tester l’eau')
    expect(out.recommendedNextStep).toContain('vérifier le filtre')
    // Aucun token anglais connu ne subsiste.
    const all = [out.userFriendlySummary, ...out.detectedIssues, ...out.probableIssues, out.recommendedNextStep, ...out.missingData, ...out.safetyWarnings].join(' ').toLowerCase()
    for (const en of ['greenish water', 'floating debris', 'algae growth', 'test the water', 'check the filter']) {
      expect(all).not.toContain(en)
    }
  })

  it('mappe imageType vers un code canonique', () => {
    expect(normalizePhotoDiagnostic({ imageType: 'Pool Wall' }, 'fr').imageType).toBe('wall')
    expect(normalizePhotoDiagnostic({ imageType: 'bandelette' }, 'fr').imageType).toBe('strip')
    expect(normalizePhotoDiagnostic({ imageType: 'ELECTROLYZER' }, 'fr').imageType).toBe('electrolyzer')
    expect(normalizePhotoDiagnostic({}, 'fr').imageType).toBe('unknown')
  })

  it('fallback localisé : aucune réponse structurée ne laisse de pavé anglais', () => {
    const out = normalizePhotoDiagnostic(null, 'fr', 'Raw English text from the model...')
    expect(out.fallbackRaw).toBe(true)
    expect(out.userFriendlySummary).toBeNull()
    expect(out.detectedIssues).toEqual([])
  })

  it('préserve la structure quand la locale n’est pas fr (extensible multi-langues)', () => {
    const parsed = { imageType: 'water', userFriendlySummary: 'Water is clear' }
    const out = normalizePhotoDiagnostic(parsed, 'en')
    expect(out.userFriendlySummary).toBe('Water is clear')
    expect(out.imageType).toBe('water')
  })

  it('confiance : nombre ou 0', () => {
    expect(normalizePhotoDiagnostic({ confidence: 0.42 }, 'fr').confidence).toBe(0.42)
    expect(normalizePhotoDiagnostic({}, 'fr').confidence).toBe(0)
  })
})

describe('photo-diagnostic route — contract i18n', () => {
  it('la route monte explicitement maxDuration (fix timeout serverless)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/api/pool/photo-diagnostic/route.ts'),
      'utf8',
    )
    expect(src).toContain('export const maxDuration = 60')
  })

  it('les erreurs 500 ne fuient plus le message anglais du modèle', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/api/pool/photo-diagnostic/route.ts'),
      'utf8',
    )
    expect(src).toContain('photoDiagnostic.analysisFailed')
    expect(src).not.toMatch(/e\.message.*500|e instanceof Error \? e\.message/)
  })
})
