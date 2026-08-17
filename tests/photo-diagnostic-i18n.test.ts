/**
 * AQWELIA — P0-A i18n : la sortie IA du diagnostic photo ne doit JAMAIS afficher
 * de texte anglais brut quand la locale active est le français.
 *
 * Tests de la couche de normalisation `photo-diagnostic-normalize` : tokens
 * d'observation anglais → français, imageType canonique, fallback localisé.
 *
 * Round 2 : locale-safe (aucune injection FR dans une locale non-FR), parsing
 * JSON robuste, normalisation stricte (confidence clampée, typeHint fallback).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { normalizePhotoDiagnostic } from '@/lib/pool/photo-diagnostic-normalize'
import { extractStructuredJson } from '@/lib/pool/extract-structured-json'

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

describe('Round 2 — locale-safe : AUCUNE injection française hors FR', () => {
  const englishParsed = {
    imageType: 'water',
    userFriendlySummary: 'The image shows greenish water.',
    detectedIssues: ['greenish water', 'floating debris'],
    probableIssues: ['algae growth'],
    recommendedNextStep: 'test the water and check the filter',
    missingData: ['chlorine level'],
    safetyWarnings: ['do not swim'],
    confidence: 0.7,
  }

  for (const locale of ['en', 'es', 'pt', 'de', 'it', 'nl']) {
    it(`${locale} → le texte du modèle est préservé, aucun mot français injecté`, () => {
      const out = normalizePhotoDiagnostic(englishParsed, locale)
      expect(out.userFriendlySummary).toBe('The image shows greenish water.')
      expect(out.recommendedNextStep).toBe('test the water and check the filter')
      expect(out.detectedIssues).toEqual(['greenish water', 'floating debris'])
      // Aucune traduction FR (accents/typographie) ne doit apparaître.
      const all = [out.userFriendlySummary, ...out.detectedIssues, ...out.probableIssues, out.recommendedNextStep ?? '', ...out.missingData, ...out.safetyWarnings].join(' ')
      expect(all).not.toContain('l’image')
      expect(all).not.toContain('eau verdâtre')
      expect(all).not.toContain('débris')
      expect(all).not.toContain('algues')
      expect(all).not.toContain('vérifier le filtre')
    })
  }
})

describe('Round 2 — parsing JSON robuste', () => {
  it('JSON pur', () => {
    expect(extractStructuredJson('{"a":1}')).toEqual({ a: 1 })
  })

  it('JSON dans des fences markdown ```json ... ```', () => {
    const r = extractStructuredJson('```json\n{"imageType":"water","confidence":0.8}\n```')
    expect(r).toEqual({ imageType: 'water', confidence: 0.8 })
  })

  it('texte parasite avant/après un objet JSON', () => {
    const r = extractStructuredJson('Voici mon analyse :\n{"imageType":"water","detectedIssues":["algues"]}\nMerci !')
    expect(r).toEqual({ imageType: 'water', detectedIssues: ['algues'] })
  })

  it('retours à la ligne et espaces', () => {
    const r = extractStructuredJson('{\n  "imageType": "wall",\n  "confidence": 0.5\n}')
    expect(r).toEqual({ imageType: 'wall', confidence: 0.5 })
  })

  it('rejette un array racine', () => {
    expect(extractStructuredJson('[{"a":1}]')).toBeNull()
  })

  it('rejette une valeur primitive', () => {
    expect(extractStructuredJson('"just a string"')).toBeNull()
    expect(extractStructuredJson('42')).toBeNull()
  })

  it('retourne null sans throw pour un contenu invalide', () => {
    expect(() => extractStructuredJson('pas de json ici')).not.toThrow()
    expect(extractStructuredJson('pas de json ici')).toBeNull()
    expect(extractStructuredJson('')).toBeNull()
    expect(extractStructuredJson('   ')).toBeNull()
  })

  it('gère plusieurs objets : prend le premier objet racine valide', () => {
    const r = extractStructuredJson('{"a":1}\n{"b":2}')
    expect(r).toEqual({ a: 1 })
  })
})

describe('Round 2 — normalisation stricte', () => {
  it('confidence clampée 0..1 (NaN/Infinity/négatif/>1)', () => {
    expect(normalizePhotoDiagnostic({ confidence: 1.5 }, 'fr').confidence).toBe(1)
    expect(normalizePhotoDiagnostic({ confidence: -3 }, 'fr').confidence).toBe(0)
    expect(normalizePhotoDiagnostic({ confidence: NaN }, 'fr').confidence).toBe(0)
    expect(normalizePhotoDiagnostic({ confidence: Infinity }, 'fr').confidence).toBe(0)
    expect(normalizePhotoDiagnostic({ confidence: 0.42 }, 'fr').confidence).toBe(0.42)
    expect(normalizePhotoDiagnostic({ confidence: '0.6' }, 'fr').confidence).toBe(0.6)
    expect(normalizePhotoDiagnostic({ confidence: 'abc' }, 'fr').confidence).toBe(0)
  })

  it('imageType : trim + lowercase + typeHint fallback + unknown', () => {
    expect(normalizePhotoDiagnostic({ imageType: '  Pool Wall  ' }, 'fr').imageType).toBe('wall')
    // modèle ne fournit pas d'imageType exploitable → fallback typeHint valide.
    expect(normalizePhotoDiagnostic({}, 'fr', '', 'electrolyzer').imageType).toBe('electrolyzer')
    expect(normalizePhotoDiagnostic({}, 'fr', '', 'unknown').imageType).toBe('unknown')
    expect(normalizePhotoDiagnostic({}, 'fr', '', undefined).imageType).toBe('unknown')
  })

  it('strings/arrays : trim + filtre non-string, pas de undefined/NaN', () => {
    const out = normalizePhotoDiagnostic(
      {
        detectedIssues: ['  a  ', '   ', 42, null, 'b'],
        probableIssues: 'not-an-array',
        missingData: ['  x  '],
        safetyWarnings: [],
      },
      'fr',
    )
    expect(out.detectedIssues).toEqual(['a', 'b'])
    expect(out.probableIssues).toEqual([])
    expect(out.missingData).toEqual(['x'])
    expect(out.safetyWarnings).toEqual([])
  })

  it('fallback : typeHint conservé + structure valide sans pavé brut', () => {
    const out = normalizePhotoDiagnostic(null, 'fr', 'Raw English output...', 'water')
    expect(out.fallbackRaw).toBe(true)
    expect(out.userFriendlySummary).toBeNull()
    expect(out.imageType).toBe('water')
    expect(out.detectedIssues).toEqual([])
    expect(out.confidence).toBe(0)
  })
})

describe('photo-diagnostic route — contract i18n + timeout', () => {
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

  it('la route répond 504 + code timeout pour un timeout serveur', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/api/pool/photo-diagnostic/route.ts'),
      'utf8',
    )
    expect(src).toContain("code: 'timeout'")
    expect(src).toContain('photoDiagnostic.timeout')
    expect(src).toContain('status: 504')
  })
})
