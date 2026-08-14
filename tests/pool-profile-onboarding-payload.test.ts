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

  it('skip() default profile path still sends an explicit full body', () => {
    // Represents the "default profile" shortcut — user explicitly chose defaults.
    const body = buildPoolProfileCreateBody(makeForm(), new Set([1, 2, 3, 4]))
    expect(body.volume).toBe(40)
    expect(body.treatmentType).toBe('chlorine')
    expect(body.filterType).toBe('sand')
    expect(body.sunExposure).toBe('medium')
    expect(body.usageLevel).toBe('medium')
    expect(body.covered).toBe(false)
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
