/**
 * AQWELIA PR #93 — editor must allow editing UNCONFIRMED profile fields.
 *
 * Root cause fixed: the editor gated every control's value/visual state on
 * `isConfirmed(field)` alone, so a locally typed/selected value was wiped on the
 * next render (isConfirmed stays false until the PATCH succeeds). The fix uses
 * `isActive(field) = confirmed.has(field) || dirty.has(field)` for interactive
 * display ONLY — `buildPoolProfilePatchBody()` still decides what gets PATCHed.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { buildPoolProfilePatchBody } from '@/lib/pool/onboarding-form'

const stored = {
  name: 'Ma piscine',
  volume: 48,
  unit: 'm3',
  waterBodyType: 'pool',
  shape: 'rectangular',
  surfaceType: 'liner',
  treatmentType: 'chlorine',
  saltSystem: false,
  filterType: 'sand',
  pumpType: null,
  region: '43.6832,5.2034',
  sunExposure: 'medium',
  covered: false,
  usageLevel: 'medium',
}

// ── PATCH payload stays limited to the dirty session fields ───────────────

describe('PR #93 — Enregistrer PATChe uniquement les champs touchés', () => {
  it('Enregistrer volume seul => body = { volume: 48 } uniquement', () => {
    const body = buildPoolProfilePatchBody(
      { ...stored, volume: 48 },
      new Set(['volume']),
    )
    expect(body).toEqual({ volume: 48 })
  })

  it('Enregistrer volume + unit => body = { volume: 48, unit: "m3" } uniquement', () => {
    const body = buildPoolProfilePatchBody(
      { ...stored, volume: 48, unit: 'm3' },
      new Set(['volume', 'unit']),
    )
    expect(body).toEqual({ volume: 48, unit: 'm3' })
  })

  it('Enregistrer region seule => body = { region: "Salon-de-Provence" } uniquement', () => {
    const body = buildPoolProfilePatchBody(
      { ...stored, region: 'Salon-de-Provence' },
      new Set(['region']),
    )
    expect(body).toEqual({ region: 'Salon-de-Provence' })
  })

  it('Annuler (aucun champ touché) => aucun champ n’est PATCHé (body vide)', () => {
    expect(buildPoolProfilePatchBody(stored, new Set())).toEqual({})
  })

  it('toucher plusieurs champs => uniquement ces champs sont PATCHés', () => {
    const body = buildPoolProfilePatchBody(
      { ...stored, name: 'Sud', sunExposure: 'high' },
      new Set(['name', 'sunExposure']),
    )
    expect(Object.keys(body).sort()).toEqual(['name', 'sunExposure'])
    expect(body).not.toHaveProperty('shape')
    expect(body).not.toHaveProperty('treatmentType')
    expect(body).not.toHaveProperty('filterType')
  })

  it('anciennes valeurs DB non confirmées et non touchées => jamais dans le PATCH', () => {
    const body = buildPoolProfilePatchBody({ ...stored }, new Set(['name']))
    expect(body).toEqual({ name: 'Ma piscine' })
    expect(body).not.toHaveProperty('treatmentType')
    expect(body).not.toHaveProperty('filterType')
    expect(body).not.toHaveProperty('sunExposure')
    expect(body).not.toHaveProperty('volume')
    expect(body).not.toHaveProperty('region')
  })

  it('traitement salt cliqué => treatmentType + saltSystem dirty (cohérent)', () => {
    // Mirrors the editor's treatment onClick: update('treatmentType','salt')
    // AND update('saltSystem', true).
    const body = buildPoolProfilePatchBody(
      { ...stored, treatmentType: 'salt', saltSystem: true },
      new Set(['treatmentType', 'saltSystem']),
    )
    expect(body).toEqual({ treatmentType: 'salt', saltSystem: true })
  })
})

// ── PR #94: volume bound as a raw string (robust controlled number input) ──

describe('PR #94 — volume string binding: conversion at save, never in onChange', () => {
  it('volume saisi en string "48" => PATCH { volume: 48 } (converted at save)', () => {
    const body = buildPoolProfilePatchBody(
      { ...stored, volume: '48' },
      new Set(['volume']),
    )
    expect(body).toEqual({ volume: 48 })
  })

  it('volume string + unit => PATCH { volume: 48, unit: "m3" }', () => {
    const body = buildPoolProfilePatchBody(
      { ...stored, volume: '48', unit: 'm3' },
      new Set(['volume', 'unit']),
    )
    expect(body).toEqual({ volume: 48, unit: 'm3' })
  })

  it('volume vidé (string "") => PAS PATCHé (évite un 0 invalide)', () => {
    const body = buildPoolProfilePatchBody(
      { ...stored, volume: '' },
      new Set(['volume']),
    )
    expect(body).not.toHaveProperty('volume')
  })

  it('volume invalide (string non numérique) => PAS PATCHé', () => {
    const body = buildPoolProfilePatchBody(
      { ...stored, volume: 'abc' },
      new Set(['volume']),
    )
    expect(body).not.toHaveProperty('volume')
  })

  it('volume <= 0 => PAS PATCHé', () => {
    const body = buildPoolProfilePatchBody(
      { ...stored, volume: '0' },
      new Set(['volume']),
    )
    expect(body).not.toHaveProperty('volume')
  })
})

// ── Source contracts: interactive display uses isActive (confirmed || dirty) ──

describe('PR #93 — rendu interactif basé sur isActive (confirmed || dirty)', () => {
  const editor = () =>
    readFileSync(
      join(process.cwd(), 'src/components/aquamind/pool-profile-editor.tsx'),
      'utf8',
    )

  it('isActive est défini comme confirmed.has(field) || dirty.has(field)', () => {
    const source = editor()
    expect(source).toMatch(/const isActive = useCallback\(\s*\(field: string\) => confirmed\.has\(field\) \|\| dirty\.has\(field\)/)
  })

  it('volume : la valeur locale saisie reste visible pendant la session (string value, no Number round-trip)', () => {
    const source = editor()
    // The volume input must bind the raw string and must NOT convert via
    // Number() in onChange (that round-trip is what can drop keystrokes in
    // real browsers). Conversion happens only at save (buildPoolProfilePatchBody).
    expect(source).toContain("value={isActive('volume') ? String(profile.volume ?? '') : ''}")
    expect(source).toContain("onChange={(e) => update('volume', e.target.value)}")
  })

  it('unit : la sélection locale reste visible pendant la session', () => {
    const source = editor()
    expect(source).toContain("value={isActive('unit') ? profile.unit : undefined}")
  })

  it('region : le texte saisi reste visible pendant la session', () => {
    const source = editor()
    expect(source).toContain("value={isActive('region') ? profile.region || '' : ''}")
  })

  it('shape : clic => sélection visuelle active via dirty', () => {
    const source = editor()
    expect(source).toContain("isActive('shape') && profile.shape === s.value")
  })

  it('treatmentType : clic salt => sélection active via dirty', () => {
    const source = editor()
    expect(source).toContain("isActive('treatmentType') && profile.treatmentType === tr.value")
    // The onClick keeps saltSystem coherent.
    expect(source).toMatch(/update\('saltSystem', tr\.value === 'salt'\)/)
  })

  it('les autres choix (revêtement/filtre/ensoleillement/usage) sont gatés sur isActive', () => {
    const source = editor()
    expect(source).toContain("isActive('surfaceType') && profile.surfaceType === s.value")
    expect(source).toContain("isActive('filterType') && profile.filterType === f.value")
    expect(source).toContain("isActive('sunExposure') && profile.sunExposure === s.value")
    expect(source).toContain("isActive('usageLevel') && profile.usageLevel === u.value")
    expect(source).toContain("isActive('waterBodyType') && profile.waterBodyType === opt.value")
  })

  it('une valeur DB non confirmée et non touchée ne semble PAS sélectionnée', () => {
    const source = editor()
    // No control should ever highlight purely from the DB value: every active
    // check is ANDed with isActive(field), which is false before any touch.
    expect(source).not.toContain('profile.shape === s.value &&')
    expect(source).not.toMatch(/profile\.shape === s\.value\s*\}/)
  })

  it('le libellé « Non renseigné » disparaît dès que le champ est touché', () => {
    const source = editor()
    // Hints are gated on !isActive so interacting clears them.
    const hintUses = (source.match(/!isActive\('[a-zA-Z]+'\)/g) || []).length
    expect(hintUses).toBeGreaterThanOrEqual(8)
    // And they must reference the notProvided copy.
    expect(source).toContain("t('notProvided')")
  })

  it('P0-1 Round 2: pumpType non confirmé => valeur DB non affichée (value vide)', () => {
    const source = editor()
    expect(source).toContain("value={isActive('pumpType') ? profile.pumpType || '' : ''}")
  })

  it('P0-1 Round 2: pumpType saisi volontairement => visible via dirty + PATCHable', () => {
    const body = buildPoolProfilePatchBody(
      { ...stored, pumpType: 'Pentair X' },
      new Set(['pumpType']),
    )
    expect(body).toEqual({ pumpType: 'Pentair X' })
  })

  it('P0-2 Round 2: covered=true DB non confirmé => checkbox neutre (non cochée)', () => {
    const source = editor()
    expect(source).toContain("checked={isActive('covered') ? profile.covered : false}")
  })

  it('P0-2 Round 2: covered coché volontairement => nouvel état visible + PATCH covered seul', () => {
    const body = buildPoolProfilePatchBody(
      { ...stored, covered: true },
      new Set(['covered']),
    )
    expect(body).toEqual({ covered: true })
  })

  it('P0-2 Round 2: covered décoché volontairement => PATCH { covered: false }', () => {
    const body = buildPoolProfilePatchBody(
      { ...stored, covered: false },
      new Set(['covered']),
    )
    expect(body).toEqual({ covered: false })
  })
})
