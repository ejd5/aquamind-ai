import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CONTEXTUAL_TARGET_METHOD_VERSION,
  resolveContextualOperatingTargets,
} from '@/lib/pool/contextual-targets'
import { assessScientificQuality } from '@/lib/pool/scientific-quality'

const commonMeasurements = {
  ph: 7.4,
  alkalinity: 100,
  calciumHardness: 200,
  temperature: 27,
  totalDissolvedSolids: 1000,
}

describe('P1 Scientific contextual targets', () => {
  it('uses a 1 mg/L minimum free chlorine for a pool without CYA', () => {
    const targets = resolveContextualOperatingTargets({
      treatmentType: 'chlorine',
      waterBodyType: 'pool',
      cyanuricAcid: 0,
    })
    expect(targets.methodVersion).toBe(CONTEXTUAL_TARGET_METHOD_VERSION)
    expect(targets.disinfectant?.parameter).toBe('freeChlorine')
    expect(targets.disinfectant?.minimum).toBe(1)
    expect(targets.disinfectant?.maximum).toBeNull()
    expect(targets.disinfectant?.upperLimitBasis).toBe('manufacturer_label')
  })

  it('raises minimum free chlorine when CYA is present', () => {
    const targets = resolveContextualOperatingTargets({
      treatmentType: 'chlorine',
      waterBodyType: 'pool',
      cyanuricAcid: 30,
    })
    expect(targets.disinfectant?.minimum).toBe(2)
    expect(targets.cyanuricAcid.implication).toBe('raises_minimum_free_chlorine')
  })

  it('requires at least 3 mg/L chlorine and flags CYA in a spa', () => {
    const targets = resolveContextualOperatingTargets({
      treatmentType: 'chlorine',
      waterBodyType: 'spa',
      cyanuricAcid: 20,
    })
    expect(targets.disinfectant?.minimum).toBe(3)
    expect(targets.cyanuricAcid.allowed).toBe(false)
    expect(targets.cyanuricAcid.implication).toBe('not_recommended_for_spa')
    expect(targets.limitations).toContain('cyanuric_acid_not_recommended_for_spa')
  })

  it('uses bromine as the expected disinfectant for bromine treatment', () => {
    const targets = resolveContextualOperatingTargets({
      treatmentType: 'bromine',
      waterBodyType: 'spa',
    })
    expect(targets.disinfectant).toMatchObject({
      parameter: 'bromine',
      minimum: 3,
      preferredHigh: 8,
      maximum: 8,
    })

    const quality = assessScientificQuality(
      {
        ...commonMeasurements,
        bromine: 4,
      },
      {
        volume: 2,
        treatmentType: 'bromine',
        waterBodyType: 'spa',
      },
    )
    expect(quality.disinfectantField).toBe('bromine')
    expect(quality.limitations).not.toContain('missing_disinfectant_measurement')
    expect(quality.missingFields).not.toContain('freeChlorine')
    expect(quality.missingFields).not.toContain('cyanuricAcid')
    expect(quality.level).toBe('high')
  })

  it('does not invent a salt target without the equipment manual', () => {
    const unknown = resolveContextualOperatingTargets({
      treatmentType: 'salt',
      saltSystem: true,
      waterBodyType: 'pool',
    })
    expect(unknown.salt).toMatchObject({
      minimum: null,
      maximum: null,
      basis: 'equipment_manual',
    })
    expect(unknown.limitations).toContain('equipment_salt_range_required')

    const documented = resolveContextualOperatingTargets({
      treatmentType: 'salt',
      saltSystem: true,
      waterBodyType: 'pool',
      manufacturerSaltMin: 3,
      manufacturerSaltMax: 5,
    })
    expect(documented.salt).toMatchObject({
      minimum: 3,
      preferredLow: 3,
      preferredHigh: 5,
      maximum: 5,
      basis: 'manufacturer_range',
    })
    expect(documented.limitations).not.toContain('equipment_salt_range_required')
  })

  it('exposes contextual targets through the water-test API', () => {
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/pool/water-test/route.ts'),
      'utf8',
    )
    expect(route).toContain('resolveContextualOperatingTargets')
    expect(route).toContain('waterBodyType: profile?.waterBodyType')
    expect(route).toContain('contextualTargets,')
    expect(route).toContain('manufacturerSaltMin')
    expect(route).toContain('manufacturerSaltMax')
  })
})
