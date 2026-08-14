/**
 * B2C onboarding → PoolProfile payload builder tests.
 *
 * The onboarding is a 4-step wizard. The POST body must only contain fields
 * from the steps the user actually walked through (confirmed). UI defaults
 * for unvisited steps must never be forwarded as if they were the user's
 * business choices.
 */
import { describe, it, expect } from 'vitest'
import {
  buildPoolProfileCreateBody,
  invalidProfileFields,
  validateProfileBody,
  deriveConfirmedFields,
  parseConfirmedFields,
  isPoolFieldConfirmed,
  type OnboardingForm,
} from '@/lib/pool/onboarding-form'

function makeForm(overrides: Partial<OnboardingForm> = {}): OnboardingForm {
  return {
    name: 'Ma piscine',
    waterBodyType: 'pool',
    volume: '40',
    unit: 'm3',
    shape: 'rectangular',
    surfaceType: 'liner',
    treatmentType: 'chlorine',
    saltSystem: false,
    filterType: 'sand',
    pumpType: '',
    region: '',
    sunExposure: 'medium',
    covered: false,
    usageLevel: 'medium',
    spaSeats: 4,
    spaTemperature: 37,
    spaUsageFrequency: 'medium',
    spaBrand: '',
    ...overrides,
  }
}

describe('buildPoolProfileCreateBody — only confirmed steps are persisted', () => {
  it('always includes step 1 fields (name, volume, unit, waterBodyType)', () => {
    const body = buildPoolProfileCreateBody(makeForm(), new Set([1]))
    expect(body.name).toBe('Ma piscine')
    expect(body.volume).toBe(40)
    expect(body.unit).toBe('m3')
    expect(body.waterBodyType).toBe('pool')
  })

  it('step 1 only → NO treatment/filter/environment fields are sent', () => {
    const body = buildPoolProfileCreateBody(makeForm(), new Set([1]))
    expect(body.treatmentType).toBeUndefined()
    expect(body.saltSystem).toBeUndefined()
    expect(body.filterType).toBeUndefined()
    expect(body.pumpType).toBeUndefined()
    expect(body.sunExposure).toBeUndefined()
    expect(body.usageLevel).toBeUndefined()
    expect(body.covered).toBeUndefined()
    expect(body.region).toBeUndefined()
  })

  it('steps 1+2 → forwards treatment + derived saltSystem only', () => {
    const body = buildPoolProfileCreateBody(
      makeForm({ treatmentType: 'salt' }),
      new Set([1, 2]),
    )
    expect(body.treatmentType).toBe('salt')
    expect(body.saltSystem).toBe(true)
    expect(body.filterType).toBeUndefined()
    expect(body.sunExposure).toBeUndefined()
  })

  it('steps 1+2+3 → forwards filtration + pump', () => {
    const body = buildPoolProfileCreateBody(
      makeForm({ treatmentType: 'chlorine', filterType: 'glass', pumpType: 'Dolphin X' }),
      new Set([1, 2, 3]),
    )
    expect(body.filterType).toBe('glass')
    expect(body.pumpType).toBe('Dolphin X')
    expect(body.sunExposure).toBeUndefined()
    expect(body.usageLevel).toBeUndefined()
    expect(body.covered).toBeUndefined()
  })

  it('all 4 steps → forwards environment fields (region, sun, usage, cover)', () => {
    const body = buildPoolProfileCreateBody(
      makeForm({ region: 'Bordeaux', sunExposure: 'high', usageLevel: 'low', covered: true }),
      new Set([1, 2, 3, 4]),
    )
    expect(body.region).toBe('Bordeaux')
    expect(body.sunExposure).toBe('high')
    expect(body.usageLevel).toBe('low')
    expect(body.covered).toBe(true)
  })

  it('saltSystem stays derived from treatmentType even if form flag disagrees', () => {
    const body = buildPoolProfileCreateBody(
      makeForm({ treatmentType: 'chlorine', saltSystem: true }),
      new Set([1, 2]),
    )
    expect(body.saltSystem).toBe(false)
  })

  it('spa water body adds spa step-1 fields (seats, temp, usage)', () => {
    const body = buildPoolProfileCreateBody(
      makeForm({
        waterBodyType: 'spa',
        volume: '1.5',
        treatmentType: 'bromine',
        spaSeats: 5,
        spaTemperature: 39,
        spaUsageFrequency: 'high',
      }),
      new Set([1]),
    )
    expect(body.waterBodyType).toBe('spa')
    expect(body.spaSeats).toBe(5)
    expect(body.spaTemperature).toBe(39)
    expect(body.spaUsageFrequency).toBe('high')
    // treatment is step 2 — not confirmed → omitted
    expect(body.treatmentType).toBeUndefined()
  })

  it('P0-2 « Passer » ne crée AUCUNE fausse donnée métier (pas de chlore/sable/medium)', () => {
    // "Passer" était supprimé de l'onboarding : plus aucun chemin ne POSTe un
    // profil « par défaut » (40m³ + chlorine + sand + medium…) comme si c'était
    // un choix utilisateur. Un payload strictement limité à l'étape 1 ne doit
    // contenir AUCUN champ des étapes 2-4 (traitement, filtration, climat).
    const body = buildPoolProfileCreateBody(makeForm(), new Set([1]))
    expect(body.treatmentType).toBeUndefined()
    expect(body.filterType).toBeUndefined()
    expect(body.saltSystem).toBeUndefined()
    expect(body.sunExposure).toBeUndefined()
    expect(body.usageLevel).toBeUndefined()
    expect(body.covered).toBeUndefined()
    expect(body.region).toBeUndefined()
    expect(body.pumpType).toBeUndefined()
  })
})

describe('P0-1 confirmedFields — la vérité métier ne vient que des champs confirmés', () => {
  it('deriveConfirmedFields list UNIQUEMENT les champs présents dans le body', () => {
    const confirmed = deriveConfirmedFields({
      name: 'Ma piscine',
      volume: 40,
      unit: 'm3',
      waterBodyType: 'pool',
      treatmentType: 'salt',
    })
    expect(confirmed).toContain('name')
    expect(confirmed).toContain('volume')
    expect(confirmed).toContain('treatmentType')
    // Jamais inventé : filterType / sunExposure / usageLevel absents → non confirmés
    expect(confirmed).not.toContain('filterType')
    expect(confirmed).not.toContain('sunExposure')
    expect(confirmed).not.toContain('usageLevel')
    expect(confirmed).not.toContain('covered')
  })

  it('deriveConfirmedFields mappe les alias spa (spaTemperature → spaTempTarget)', () => {
    const confirmed = deriveConfirmedFields({ spaTemperature: 37, spaUsageFrequency: 'high' })
    expect(confirmed).toContain('spaTempTarget')
    expect(confirmed).toContain('spaUsageFreq')
  })

  it('parseConfirmedFields / isPoolFieldConfirmed distinguent confirmé vs défaut technique', () => {
    const stored = { confirmedFields: JSON.stringify(['name', 'volume', 'treatmentType']) }
    expect(parseConfirmedFields(stored)).toEqual(['name', 'volume', 'treatmentType'])
    expect(isPoolFieldConfirmed(stored, 'treatmentType')).toBe(true)
    // filterType a un défaut DB 'sand' mais n'est PAS confirmé → faux
    expect(isPoolFieldConfirmed(stored, 'filterType')).toBe(false)

    // NULL / invalide → aucun champ confirmé
    expect(parseConfirmedFields({ confirmedFields: null })).toEqual([])
    expect(parseConfirmedFields({ confirmedFields: 'not-json' })).toEqual([])
  })
})

describe('validateProfileBody — validation serveur (jamais confiance au client)', () => {
  it('rejette volume <= 0, NaN, non numérique', () => {
    expect(validateProfileBody({ name: 'Piscine', volume: 0 }).some((e) => e.field === 'volume')).toBe(true)
    expect(validateProfileBody({ name: 'Piscine', volume: -5 }).some((e) => e.field === 'volume')).toBe(true)
    expect(validateProfileBody({ name: 'Piscine', volume: 'abc' }).some((e) => e.field === 'volume')).toBe(true)
    expect(validateProfileBody({ name: 'Piscine', volume: NaN }).some((e) => e.field === 'volume')).toBe(true)
  })

  it('rejette nom vide', () => {
    expect(validateProfileBody({ name: '', volume: 40 }).some((e) => e.field === 'name')).toBe(true)
    expect(validateProfileBody({ name: '   ', volume: 40 }).some((e) => e.field === 'name')).toBe(true)
  })

  it('rejette unité invalide', () => {
    expect(validateProfileBody({ name: 'Piscine', volume: 40, unit: 'litres' }).some((e) => e.field === 'unit')).toBe(true)
  })

  it('rejette valeurs enum hors whitelist', () => {
    const errs = validateProfileBody({ name: 'Piscine', volume: 40, treatmentType: 'laser' })
    expect(errs.some((e) => e.field === 'treatmentType')).toBe(true)
  })

  it('rejette température spa hors limites métier (28-40°C)', () => {
    expect(validateProfileBody({ name: 'Spa', volume: 1.5, waterBodyType: 'spa', spaTemperature: 50 }).some((e) => e.field === 'spaTempTarget')).toBe(true)
    expect(validateProfileBody({ name: 'Spa', volume: 1.5, waterBodyType: 'spa', spaTemperature: 20 }).some((e) => e.field === 'spaTempTarget')).toBe(true)
    expect(validateProfileBody({ name: 'Spa', volume: 1.5, waterBodyType: 'spa', spaTemperature: 37 }).some((e) => e.field === 'spaTempTarget')).toBe(false)
  })

  it('rejette places spa hors limites (2-8)', () => {
    expect(validateProfileBody({ name: 'Spa', volume: 1.5, waterBodyType: 'spa', spaSeats: 12 }).some((e) => e.field === 'spaSeats')).toBe(true)
    expect(validateProfileBody({ name: 'Spa', volume: 1.5, waterBodyType: 'spa', spaSeats: 4 }).some((e) => e.field === 'spaSeats')).toBe(false)
  })

  it('POST (non-partiel) exige name + volume', () => {
    expect(validateProfileBody({}).some((e) => e.field === 'name')).toBe(true)
    expect(validateProfileBody({}).some((e) => e.field === 'volume')).toBe(true)
  })
})

describe('invalidProfileFields — server-side enum whitelist', () => {
  it('accepts valid enum values', () => {
    const invalid = invalidProfileFields({
      waterBodyType: 'pool',
      shape: 'round',
      surfaceType: 'liner',
      treatmentType: 'salt',
      filterType: 'glass',
      sunExposure: 'high',
      usageLevel: 'low',
    })
    expect(invalid).toEqual([])
  })

  it('rejects unknown treatment / filter / exposure values', () => {
    const invalid = invalidProfileFields({
      treatmentType: 'laser',
      filterType: 'unknown',
      sunExposure: 'extreme',
    })
    expect(invalid).toContain('treatmentType')
    expect(invalid).toContain('filterType')
    expect(invalid).toContain('sunExposure')
  })

  it('rejects non-string values', () => {
    const invalid = invalidProfileFields({ usageLevel: 42, covered: 'yes' })
    expect(invalid).toContain('usageLevel')
    // covered is not enum-validated (boolean) → ignored
    expect(invalid).not.toContain('covered')
  })

  it('ignores absent fields', () => {
    expect(invalidProfileFields({ name: 'Piscine', volume: 40 })).toEqual([])
  })
})
