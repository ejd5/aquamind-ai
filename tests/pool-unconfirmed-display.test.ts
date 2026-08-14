/**
 * AQWELIA PR #92 — display of UNCONFIRMED PoolProfile values.
 *
 * Bug 1 — header/pill must NOT show a stored technical volume (e.g. 48 m³)
 *         when `volume` is not user-confirmed.
 * Bug 2 — the editor's "Votre ville" input must NOT show raw GPS coordinates
 *         when `region` is not user-confirmed.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  poolVolumeLabel,
  buildPoolProfilePatchBody,
  deriveConfirmedFields,
} from '@/lib/pool/onboarding-form'

const profile = {
  name: 'Ma piscine',
  volume: 48,
  unit: 'm3',
  treatmentType: 'chlorine',
  saltSystem: false,
}

describe('BUG 1 — poolVolumeLabel gate (header / pill)', () => {
  it('volume DB présent + non confirmé => AUCUN « 48 m³ » (label vide)', () => {
    const label = poolVolumeLabel({
      ...profile,
      confirmedFields: JSON.stringify(['name']),
    })
    expect(label).toBe('')
    expect(label).not.toContain('48')
    expect(label).not.toContain('m³')
  })

  it('confirmedFields null => aucun volume affiché', () => {
    expect(poolVolumeLabel({ ...profile, confirmedFields: null })).toBe('')
  })

  it('volume confirmé => « 48 m³ » affiché', () => {
    const label = poolVolumeLabel({
      ...profile,
      confirmedFields: JSON.stringify(['name', 'volume', 'unit']),
    })
    expect(label).toBe('48 m³')
  })

  it('volume confirmé en gallons => « 48 gal »', () => {
    const label = poolVolumeLabel({
      ...profile,
      unit: 'gal',
      confirmedFields: JSON.stringify(['name', 'volume', 'unit']),
    })
    expect(label).toBe('48 gal')
  })

  it('volume invalide (<= 0) même confirmé => aucun volume affiché', () => {
    const label = poolVolumeLabel({
      ...profile,
      volume: 0,
      confirmedFields: JSON.stringify(['name', 'volume', 'unit']),
    })
    expect(label).toBe('')
  })
})

describe('BUG 2 — region non confirmé jamais PATCHé ni affiché', () => {
  const gpsProfile = {
    ...profile,
    region: '43.6832,5.2034',
    confirmedFields: JSON.stringify(['name']),
  }

  it('modifier SEULEMENT le nom => region reste non confirmé et n’est PAS PATCHé', () => {
    const body = buildPoolProfilePatchBody(
      { ...gpsProfile, name: 'Ma piscine sud' },
      new Set(['name']),
    )
    expect(body.name).toBe('Ma piscine sud')
    expect(body.region).toBeUndefined()
    const confirmed = deriveConfirmedFields(body)
    expect(confirmed).toEqual(['name'])
    expect(confirmed).not.toContain('region')
  })

  it('modification volontaire de region => region peut être explicitement confirmé', () => {
    const body = buildPoolProfilePatchBody(
      { ...gpsProfile, region: 'Marseille' },
      new Set(['region']),
    )
    expect(body.region).toBe('Marseille')
    expect(deriveConfirmedFields(body)).toContain('region')
  })

  it('effacer volontairement la region => elle est vidée (null côté serveur) et reste confirmée comme champ touché', () => {
    const body = buildPoolProfilePatchBody(
      { ...gpsProfile, region: '' },
      new Set(['region']),
    )
    expect(body.region).toBe('')
    expect(deriveConfirmedFields(body)).toContain('region')
  })

  it('contrat UI: l’éditeur ne rend PAS la valeur technique region quand elle n’est pas confirmée', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/aquamind/pool-profile-editor.tsx'),
      'utf8',
    )
    // The region input value must be gated on isConfirmed('region') and fall
    // back to an empty/neutral value (placeholder « Non renseigné »).
    expect(source).toMatch(/isConfirmed\('region'\) \? profile\.region/)
    expect(source).toContain(`placeholder={isConfirmed('region') ? t('cityPlaceholder') : t('notProvided')}`)
  })

  it('contrat UI: le header ne reconstruit PAS le volume brut sans confirmedFields', () => {
    const header = readFileSync(
      join(process.cwd(), 'src/components/aquamind/header.tsx'),
      'utf8',
    )
    const mobileHeader = readFileSync(
      join(process.cwd(), 'src/components/mobile/mobile-header.tsx'),
      'utf8',
    )
    // Both headers must use the gating helper, never the raw volume+unit.
    expect(header).toContain('poolVolumeLabel(profile)')
    expect(mobileHeader).toContain('poolVolumeLabel(profile)')
  })
})
