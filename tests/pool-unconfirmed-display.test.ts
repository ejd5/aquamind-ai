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
  isPoolFieldConfirmed,
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

  it('P0-1: volume confirmé MAIS unité non confirmée => AUCUN « 48 m³ » (label vide)', () => {
    const label = poolVolumeLabel({
      ...profile,
      confirmedFields: JSON.stringify(['name', 'volume']),
    })
    expect(label).toBe('')
    expect(label).not.toContain('48')
    expect(label).not.toContain('m³')
  })

  it('P0-1: volume+unit confirmés => « 48 m³ » affiché', () => {
    const label = poolVolumeLabel({
      ...profile,
      confirmedFields: JSON.stringify(['volume', 'unit']),
    })
    expect(label).toBe('48 m³')
  })

  it('P0-1 Round 3: unit confirmée mais invalide (« litres ») => AUCUN « 48 » (label vide)', () => {
    const label = poolVolumeLabel({
      ...profile,
      unit: 'litres',
      confirmedFields: JSON.stringify(['volume', 'unit']),
    })
    expect(label).toBe('')
    expect(label).not.toContain('48')
  })

  it('P0-1 Round 3: unit confirmée mais vide ("") => label vide', () => {
    const label = poolVolumeLabel({
      ...profile,
      unit: '',
      confirmedFields: JSON.stringify(['volume', 'unit']),
    })
    expect(label).toBe('')
  })

  it('P0-1 Round 3: m3 confirmé => « 48 m³ » conservé', () => {
    const label = poolVolumeLabel({
      ...profile,
      unit: 'm3',
      confirmedFields: JSON.stringify(['volume', 'unit']),
    })
    expect(label).toBe('48 m³')
  })

  it('P0-1 Round 3: gal confirmé => « 48 gal » conservé', () => {
    const label = poolVolumeLabel({
      ...profile,
      unit: 'gal',
      confirmedFields: JSON.stringify(['volume', 'unit']),
    })
    expect(label).toBe('48 gal')
  })

  it('P0-1: volume confirmé en gallons + unité non confirmée => AUCUN « 48 gal »', () => {
    const label = poolVolumeLabel({
      ...profile,
      unit: 'gal',
      confirmedFields: JSON.stringify(['name', 'volume']),
    })
    expect(label).toBe('')
  })

  it('P0-1: volume+unit confirmés en gallons => « 48 gal » affiché', () => {
    const label = poolVolumeLabel({
      ...profile,
      unit: 'gal',
      confirmedFields: JSON.stringify(['volume', 'unit']),
    })
    expect(label).toBe('48 gal')
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
    // The region input value must be gated on isActive('region') (confirmed ||
    // dirty) and fall back to an empty/neutral value (placeholder « Non
    // renseigné »). Unconfirmed + untouched → never shows the raw GPS value.
    expect(source).toMatch(/isActive\('region'\) \? profile\.region/)
    expect(source).toContain(`placeholder={isActive('region') ? t('cityPlaceholder') : t('notProvided')}`)
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

describe('P0-2 — résumé mobile ProfileScreen (treatmentType / saltSystem)', () => {
  const stored = {
    ...profile,
    treatmentType: 'salt',
    saltSystem: true,
  }

  it('treatmentType DB présent mais non confirmé => n’est pas « affiché » (helper gate)', () => {
    // The rendering rule: only a confirmed treatmentType is shown.
    expect(
      isPoolFieldConfirmed({ ...stored, confirmedFields: JSON.stringify(['name']) }, 'treatmentType'),
    ).toBe(false)
    // And a confirmed saltSystem must be the gate for the "électrolyse" label.
    expect(
      isPoolFieldConfirmed({ ...stored, confirmedFields: JSON.stringify(['name']) }, 'saltSystem'),
    ).toBe(false)
  })

  it('treatmentType confirmé => affiché (gate passe)', () => {
    expect(
      isPoolFieldConfirmed(
        { ...stored, confirmedFields: JSON.stringify(['name', 'treatmentType']) },
        'treatmentType',
      ),
    ).toBe(true)
  })

  it('saltSystem DB présent mais non confirmé => électrolyse non affichée', () => {
    expect(
      isPoolFieldConfirmed({ ...stored, confirmedFields: JSON.stringify(['name']) }, 'saltSystem'),
    ).toBe(false)
  })

  it('saltSystem confirmé => comportement normal', () => {
    expect(
      isPoolFieldConfirmed(
        { ...stored, confirmedFields: JSON.stringify(['name', 'saltSystem']) },
        'saltSystem',
      ),
    ).toBe(true)
  })

  it('contrat UI: profile-screen utilise isPoolFieldConfirmed et ne rend jamais les valeurs brutes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/mobile/screens/profile-screen.tsx'),
      'utf8',
    )
    expect(source).toContain("isPoolFieldConfirmed(profile, 'treatmentType')")
    expect(source).toContain("isPoolFieldConfirmed(profile, 'saltSystem')")
    // The old bug rendered `profile.treatmentType` directly in the summary.
    expect(source).not.toContain('profile.treatmentType} ·')
    // The old bug rendered `profile.saltSystem ?` directly (without confirmation).
    expect(source).not.toMatch(/`\$\{profile\.saltSystem \?/)
  })

  it('aucun champ confirmé => le résumé retombe sur un texte neutre (pas d’ancienne valeur technique)', () => {
    // PoolProfileLite carries confirmedFields; with only name confirmed, both
    // volume and treatment/salt gates fail → the summary falls back to the
    // neutral "profileConfigureToStart" copy.
    const confirmed = ['name']
    const hasBusinessData =
      poolVolumeLabel({ ...stored, confirmedFields: JSON.stringify(confirmed) }) !== '' ||
      isPoolFieldConfirmed({ ...stored, confirmedFields: JSON.stringify(confirmed) }, 'treatmentType') ||
      isPoolFieldConfirmed({ ...stored, confirmedFields: JSON.stringify(confirmed) }, 'saltSystem')
    expect(hasBusinessData).toBe(false)
  })
})
