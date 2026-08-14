/**
 * AQWELIA PR #91 — Round 3: P0-1 / P0-2 regression tests.
 *
 * P0-1 — the profile editor must NEVER turn old technical DB defaults into
 *        confirmed user choices. Only fields actually touched (dirty) are PATCHed.
 * P0-2 — an unconfirmed `volume` (technical value from a legacy flow) must never
 *        be presented to the AI nor drive a precise dosage/recommendation.
 */
import { describe, it, expect } from 'vitest'
import {
  buildPoolProfilePatchBody,
  deriveConfirmedFields,
  parseConfirmedFields,
  confirmedPoolVolume,
} from '@/lib/pool/onboarding-form'
import { buildPoolContext } from '@/lib/pool/ai-context'
import { assessDosageReadiness } from '@/lib/pool/dosage-readiness'
import { generateScientificallyQualifiedActionPlan } from '@/lib/pool/scientific-action-plan'
import { assessScientificQuality } from '@/lib/pool/scientific-quality'
import { calculateRestockNeeds } from '@/lib/pool/restock-engine'

// ── P0-1: editor PATCH payload is limited to the dirty fields ─────────────

describe('P0-1 buildPoolProfilePatchBody — PATCH only what the user touched', () => {
  const stored = {
    name: 'Ma piscine',
    volume: 40,
    unit: 'm3',
    waterBodyType: 'pool',
    shape: 'rectangular',
    surfaceType: 'liner',
    treatmentType: 'chlorine',
    saltSystem: false,
    filterType: 'sand',
    pumpType: null,
    region: null,
    sunExposure: 'medium',
    covered: false,
    usageLevel: 'medium',
  }

  it('PATCH du seul name ne confirme AUCUN autre champ (technical defaults stay unconfirmed)', () => {
    // The user edits ONLY the name in the editor session.
    const body = buildPoolProfilePatchBody(stored, new Set(['name']))
    expect(Object.keys(body)).toEqual(['name'])
    // Deriving the confirmed fields from this PATCH body only yields "name".
    const confirmed = deriveConfirmedFields(body)
    expect(confirmed).toEqual(['name'])
    expect(confirmed).not.toContain('treatmentType')
    expect(confirmed).not.toContain('filterType')
    expect(confirmed).not.toContain('sunExposure')
    expect(confirmed).not.toContain('usageLevel')
    expect(confirmed).not.toContain('volume')
  })

  it('union server-side: confirmedFields ["name","volume"] + PATCH name = exactly ["name","volume"]', () => {
    // Simulates the server PATCH union (existing confirmed + newly provided).
    const existing = new Set(parseConfirmedFields({ confirmedFields: JSON.stringify(['name', 'volume']) }))
    const body = buildPoolProfilePatchBody(stored, new Set(['name']))
    for (const f of deriveConfirmedFields(body)) existing.add(f)
    const merged = [...existing].sort()
    expect(merged).toEqual(['name', 'volume'])
    expect(merged).not.toContain('treatmentType')
    expect(merged).not.toContain('filterType')
    expect(merged).not.toContain('sunExposure')
  })

  it('un champ non confirmé peut être EXPLICITEMENT confirmé en le modifiant', () => {
    // The user picks a treatment type → it becomes dirty → sent → confirmed.
    const body = buildPoolProfilePatchBody(
      { ...stored, treatmentType: 'salt', saltSystem: true },
      new Set(['name', 'treatmentType', 'saltSystem']),
    )
    expect(body.treatmentType).toBe('salt')
    const confirmed = deriveConfirmedFields(body)
    expect(confirmed).toContain('name')
    expect(confirmed).toContain('treatmentType')
    expect(confirmed).toContain('saltSystem')
    // Still never invents untouched fields.
    expect(confirmed).not.toContain('filterType')
    expect(confirmed).not.toContain('sunExposure')
  })

  it('une session sans modification ne PATCH rien (bouton Enregistrer inerte)', () => {
    const body = buildPoolProfilePatchBody(stored, new Set())
    expect(Object.keys(body)).toHaveLength(0)
  })

  it('mappe les alias spa vers les noms PATCH (spaTempTarget → spaTemperature)', () => {
    const body = buildPoolProfilePatchBody(
      { spaTempTarget: 37, spaUsageFreq: 'high' },
      new Set(['spaTempTarget', 'spaUsageFreq']),
    )
    expect(body.spaTemperature).toBe(37)
    expect(body.spaUsageFrequency).toBe('high')
    const confirmed = deriveConfirmedFields(body)
    expect(confirmed).toContain('spaTempTarget')
    expect(confirmed).toContain('spaUsageFreq')
  })
})

// ── P0-2: unconfirmed volume → "non renseigné" in the AI context ──────────

describe('P0-2 ai-context — volume only shown when confirmed', () => {
  const base = {
    name: 'Ma piscine',
    volume: 40,
    unit: 'm3' as const,
    treatmentType: 'chlorine',
    filterType: 'sand',
    saltSystem: false,
    sunExposure: 'medium',
    covered: false,
    usageLevel: 'medium',
    confirmedFields: null,
  }

  it('volume non confirmé => contexte IA affiche « non renseigné »', () => {
    const ctx = buildPoolContext(
      { ...base, confirmedFields: JSON.stringify(['name']) },
      null,
    )
    expect(ctx).toContain('non renseigné')
    expect(ctx).not.toMatch(/Volume: 40/)
  })

  it('volume confirmé => la valeur réelle est utilisée', () => {
    const ctx = buildPoolContext(
      { ...base, confirmedFields: JSON.stringify(['name', 'volume', 'unit']) },
      null,
    )
    expect(ctx).toMatch(/Volume: 40 m³/)
    expect(ctx).not.toMatch(/Volume: non renseigné/)
  })
})

// ── P0-2: no precise dosage from an unconfirmed volume ────────────────────

describe('P0-2 dosage engines — unconfirmed volume never produces a precise quantity', () => {
  const test = {
    ph: 7.2,
    freeChlorine: 0.3,
    alkalinity: 90,
    cyanuricAcid: 25,
  }

  it('assessDosageReadiness returns not_calculable/invalid_pool_volume when volume is unconfirmed', () => {
    const r = assessDosageReadiness('chlorine_shock', test, {
      volume: 40,
      treatmentType: 'chlorine',
      saltSystem: false,
      waterBodyType: 'pool',
      volumeConfirmed: false,
    })
    expect(r.state).toBe('not_calculable')
    expect(r.reasons).toContain('invalid_pool_volume')
  })

  it('generateScientificallyQualifiedActionPlan masks ALL dosages when volume is unconfirmed', () => {
    const plan = generateScientificallyQualifiedActionPlan(
      test,
      {
        volume: 40,
        unit: 'm3',
        treatmentType: 'chlorine',
        saltSystem: false,
        waterBodyType: 'pool',
        filterType: 'sand',
        volumeConfirmed: false,
      },
      'fr',
    )
    expect(plan.chemicalDosages.length).toBeGreaterThan(0)
    for (const d of plan.chemicalDosages) {
      expect(d.readiness.state).not.toBe('ready')
      expect(d.calculationSuppressed).toBe(true)
      expect(d.quantity).toBe('—')
      expect(d.estimatedCost).toBe('—')
    }
  })

  it('scientific quality treats an unconfirmed volume as invalid_pool_volume (not dosage-eligible)', () => {
    const q = assessScientificQuality(test, {
      volume: 40,
      treatmentType: 'chlorine',
      saltSystem: false,
      waterBodyType: 'pool',
      volumeConfirmed: false,
    })
    expect(q.limitations).toContain('invalid_pool_volume')
    expect(q.dosageEligible).toBe(false)
  })

  it('confirmedPoolVolume returns null when volume is unconfirmed, the value otherwise', () => {
    expect(confirmedPoolVolume({ volume: 40, confirmedFields: JSON.stringify(['name']) })).toBeNull()
    expect(confirmedPoolVolume({ volume: 40, confirmedFields: JSON.stringify(['name', 'volume']) })).toBe(40)
  })
})

// ── P0-2: restock never derives a precise order qty from an unconfirmed volume ─

describe('P0-2 restock — unconfirmed volume suppresses consumption-based estimates', () => {
  const inventory = [
    { id: 'p1', productName: 'Chlore choc', category: 'chlorine_shock', quantity: 100, unit: 'g', concentration: null },
  ]
  const tests = []
  const pool = {
    volume: 40,
    unit: 'm3',
    treatmentType: 'chlorine',
    saltSystem: false,
    confirmedFields: JSON.stringify(['name']),
  }

  it('no weekly consumption / order quantity when volume is unconfirmed', () => {
    const assessment = calculateRestockNeeds(inventory, tests, pool)
    expect(assessment.items).toHaveLength(1)
    const item = assessment.items[0]
    expect(item.volumeUnconfirmed).toBe(true)
    expect(item.weeklyConsumption).toBe(0)
    expect(item.daysRemaining).toBe(9999)
    expect(item.recommendedOrderQty).toBe(0)
    expect(item.urgency).toBe('low')
  })

  it('precise estimates are restored once volume is confirmed', () => {
    const assessment = calculateRestockNeeds(inventory, tests, {
      ...pool,
      confirmedFields: JSON.stringify(['name', 'volume', 'treatmentType']),
    })
    const item = assessment.items[0]
    expect(item.volumeUnconfirmed).toBe(false)
    expect(item.weeklyConsumption).toBeGreaterThan(0)
    expect(item.daysRemaining).toBeLessThan(9999)
  })
})
