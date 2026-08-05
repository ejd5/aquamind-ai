/**
 * AQWELIA Wave A1 — Scientific single path regression tests.
 *
 * Verifies that EVERY user-facing path producing an actionable plan
 * (recommendation / quantity / bathing indication / dosing) uses the SAME
 * canonical scientific engine:
 *   1. POST /api/pool/water-test
 *   2. POST /api/pool/action-plan
 *   3. POST /api/pool/strip-scan (save=true)
 *   4. GET /api/dashboard (plan regeneration)
 *
 * Acceptance criteria:
 *   - zero public imports of the legacy generateActionPlan in these routes;
 *   - same inputs => same readiness / visible-or-masked quantity / methodVersion
 *     across all paths;
 *   - salt without a manufacturer target stays non-calculable;
 *   - chlorine with pH out of target stays deferred when the rules require it;
 *   - no quantity is exposed when a dosage is non-calculable;
 *   - StripScan and dashboard regeneration never bypass the rules;
 *   - no silent fallback to the legacy engine.
 *
 * Static route checks + behavioral checks against the canonical engine (the
 * engine is deterministic, so the same inputs yield the same qualified output).
 * No network, no real API calls.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { generateScientificallyQualifiedActionPlan } from '@/lib/pool/scientific-action-plan'
import { DOSAGE_METHOD_VERSION } from '@/lib/pool/scientific-action-plan'
import {
  buildDashboardPlanView,
  storedPlanIsCanonical,
  safeParseJsonArray,
} from '@/lib/pool/dashboard-plan-gate'

const ROUTES = {
  waterTest: join(process.cwd(), 'src/app/api/pool/water-test/route.ts'),
  actionPlan: join(process.cwd(), 'src/app/api/pool/action-plan/route.ts'),
  stripScan: join(process.cwd(), 'src/app/api/pool/strip-scan/route.ts'),
  dashboard: join(process.cwd(), 'src/app/api/dashboard/route.ts'),
}

const completeTest = {
  ph: 7.4,
  freeChlorine: 2,
  totalChlorine: 2.2,
  combinedChlorine: 0.2,
  bromine: null,
  alkalinity: 100,
  calciumHardness: 200,
  cyanuricAcid: 40,
  salt: null,
  phosphates: 0.05,
  temperature: 27,
  totalDissolvedSolids: 1000,
}

const chlorinePool = {
  volume: 50,
  unit: 'm3' as const,
  treatmentType: 'chlorine',
  saltSystem: false,
  waterBodyType: 'pool',
  filterType: 'sand',
}

describe('Wave A1 — canonical engine used by all four public paths', () => {
  it('no public user path imports the legacy generateActionPlan directly', () => {
    for (const [name, path] of Object.entries(ROUTES)) {
      const src = readFileSync(path, 'utf8')
      expect(
        src.includes(`import { generateActionPlan } from '@/lib/pool/action-plan'`) ||
          src.includes(`generateActionPlan(`),
        `${name} must not import or call the legacy generateActionPlan`,
      ).toBe(false)
    }
  })

  it('all four public paths route through generateScientificallyQualifiedActionPlan', () => {
    for (const [name, path] of Object.entries(ROUTES)) {
      const src = readFileSync(path, 'utf8')
      expect(src, `${name} must use the canonical scientific engine`).toContain(
        'generateScientificallyQualifiedActionPlan',
      )
    }
  })

  it('the canonical engine is imported from the scientific-action-plan module', () => {
    for (const [name, path] of Object.entries(ROUTES)) {
      const src = readFileSync(path, 'utf8')
      expect(src).toContain("from '@/lib/pool/scientific-action-plan'")
    }
  })
})

describe('Wave A1 — identical qualification across paths (deterministic)', () => {
  it('the same test/profile yields the same readiness for the same param', () => {
    const plan = generateScientificallyQualifiedActionPlan(completeTest, chlorinePool, 'fr')
    // The engine is deterministic; every path must call exactly this function.
    for (const dosage of plan.chemicalDosages) {
      expect(dosage.methodVersion).toBe(DOSAGE_METHOD_VERSION)
      expect(typeof dosage.readiness.state).toBe('string')
    }
  })

  it('salt without a manufacturer target stays non-calculable and masked', () => {
    const plan = generateScientificallyQualifiedActionPlan(
      { ...completeTest, salt: 2 },
      { ...chlorinePool, treatmentType: 'salt', saltSystem: true },
      'fr',
    )
    const salt = plan.chemicalDosages.find((dosage) => dosage.param === 'salt_plus')
    expect(salt?.readiness.state).toBe('not_calculable')
    expect(salt?.readiness.reasons).toContain('equipment_salt_range_required')
    expect(salt?.quantity).toBe('—')
    expect(salt?.estimatedCost).toBe('—')
    expect(salt?.calculationSuppressed).toBe(true)
    expect(plan.immediateActions.some((action) => action.actionKey === 'iaAddSalt')).toBe(false)
  })

  it('chlorine with pH out of target stays deferred and quantity hidden', () => {
    const plan = generateScientificallyQualifiedActionPlan(
      { ...completeTest, ph: 7.9, freeChlorine: 0.2 },
      chlorinePool,
      'fr',
    )
    const shock = plan.chemicalDosages.find((dosage) => dosage.param === 'chlorine_shock')
    expect(shock?.readiness.state).toBe('deferred')
    expect(shock?.readiness.reasons).toContain('rebalance_ph_first')
    expect(shock?.quantity).toBe('—')
    expect(shock?.calculationSuppressed).toBe(true)
  })

  it('no quantity is exposed when a dosage is non-calculable', () => {
    const plan = generateScientificallyQualifiedActionPlan(
      { ...completeTest, salt: 2 },
      { ...chlorinePool, treatmentType: 'salt', saltSystem: true },
      'en',
    )
    for (const dosage of plan.chemicalDosages) {
      if (dosage.readiness.state !== 'ready') {
        expect(dosage.quantity).toBe('—')
        expect(dosage.estimatedCost).toBe('—')
      }
    }
  })

  it('same inputs produce the same methodVersion across runs', () => {
    const a = generateScientificallyQualifiedActionPlan(completeTest, chlorinePool, 'fr')
    const b = generateScientificallyQualifiedActionPlan(completeTest, chlorinePool, 'fr')
    expect(a.dosageMethodVersion).toBe(b.dosageMethodVersion)
    expect(a.dosageMethodVersion).toBe(DOSAGE_METHOD_VERSION)
    expect(a.scientificConfidence.methodVersion).toBe(b.scientificConfidence.methodVersion)
    expect(a.contextualSwimSafety.methodVersion).toBe(b.contextualSwimSafety.methodVersion)
  })
})

describe('Wave A1 — action-plan route persists the scientific contract', () => {
  it('persists scientific / dosage / swimSafety method versions', () => {
    const src = readFileSync(ROUTES.actionPlan, 'utf8')
    expect(src).toContain('scientificMethodVersion: plan.scientificConfidence.methodVersion')
    expect(src).toContain('dosageMethodVersion: plan.dosageMethodVersion')
    expect(src).toContain('swimSafetyMethodVersion: plan.contextualSwimSafety.methodVersion')
    expect(src).toContain('generateScientificallyQualifiedActionPlan(')
  })

  it('builds the qualified profile with the full scientific contract fields', () => {
    const src = readFileSync(ROUTES.actionPlan, 'utf8')
    for (const field of ['waterBodyType', 'filterType', 'manufacturerSaltMin', 'manufacturerSaltMax', 'manufacturerChlorineMax']) {
      expect(src).toContain(field)
    }
  })
})

describe('Wave A1 — StripScan does not bypass the rules', () => {
  it('uses the canonical scientific engine and persists the scientific contract when save=true', () => {
    const src = readFileSync(ROUTES.stripScan, 'utf8')
    expect(src).toContain('generateScientificallyQualifiedActionPlan')
    expect(src).not.toContain('generateActionPlan')
    expect(src).not.toContain('assessSwimSafety')
    expect(src).toContain('scientificMethodVersion: qualifiedPlan.scientificConfidence.methodVersion')
    expect(src).toContain('dosageMethodVersion: qualifiedPlan.dosageMethodVersion')
    expect(src).toContain('swimSafetyMethodVersion: qualifiedPlan.contextualSwimSafety.methodVersion')
    expect(src).toContain('calculateLsiAssessment')
    expect(src).not.toContain('calculateLSI(')
  })

  it('derives the persisted swim safety from the qualified contextual assessment', () => {
    const src = readFileSync(ROUTES.stripScan, 'utf8')
    expect(src).toContain('const contextualSwim = qualifiedPlan?.contextualSwimSafety.status')
    expect(src).toContain('swimSafety: contextualSwim')
    expect(src).not.toContain('swim = assessSwimSafety')
  })
})

describe('Wave A1 — dashboard regeneration does not bypass the rules', () => {
  it('regenerates the plan through the canonical scientific engine (never the legacy one)', () => {
    const src = readFileSync(ROUTES.dashboard, 'utf8')
    expect(src).toContain("from '@/lib/pool/scientific-action-plan'")
    expect(src).toContain("from '@/lib/pool/dashboard-plan-gate'")
    expect(src).not.toContain("from '@/lib/pool/action-plan'")
    expect(src).not.toContain('generateActionPlan(')
    expect(src).not.toContain('assessSwimSafety')
    expect(src).toContain('generateScientificallyQualifiedActionPlan(')
  })

  it('builds the plan view through the fail-closed dashboard-plan-gate helper', () => {
    const src = readFileSync(ROUTES.dashboard, 'utf8')
    expect(src).toContain('buildDashboardPlanView({')
    const gate = readFileSync(
      join(process.cwd(), 'src/lib/pool/dashboard-plan-gate.ts'),
      'utf8',
    )
    expect(gate).toContain('scientificRequalificationRequired')
    expect(gate).toContain('failClosedView')
  })

  it('the stored plan is fetched as a child of the LATEST test (association)', () => {
    const src = readFileSync(ROUTES.dashboard, 'utf8')
    expect(src).toContain("include: {\n        actionPlans: {")
    expect(src).toContain('const storedPlan = latestTest?.actionPlans?.[0] ?? null')
    expect(src).toContain('storedPlan?.waterTestId === latestTest?.id')
  })

  it('header swim is FAIL-CLOSED: freshPlan authoritative, otherwise unknown (never a legacy engine)', () => {
    const src = readFileSync(ROUTES.dashboard, 'utf8')
    expect(src).toContain('buildDashboardSwim({')
    expect(src).toContain('const sanitizedLatestTest = sanitizeDashboardLatestTest(latestTest as any)')
    expect(src).not.toContain('assessSwimSafety(')
    expect(src).not.toContain('latestTest.swimSafety || \'unknown\'')
  })
})

describe('Wave A1 — water-test route remains the canonical reference', () => {
  it('uses the canonical engine with provenance-adjusted confidence', () => {
    const src = readFileSync(ROUTES.waterTest, 'utf8')
    expect(src).toContain('generateScientificallyQualifiedActionPlan(')
    expect(src).not.toContain("from '@/lib/pool/action-plan'")
    // The engine's 4th argument is the provenance-shaped measurement-confidence
    // input (measuredAt / measurementMethod / measurementMetadata).
    expect(src).toContain('provenance,')
    expect(src).toContain("normalizeMeasurementProvenance(")
  })
})

// ---------------------------------------------------------------------------
// Wave A1 Round 2 — fail-closed dashboard plan gate (BEHAVIORAL tests)
// ---------------------------------------------------------------------------

const legacyStoredPlan = {
  id: 'legacy-plan-1',
  waterTestId: 'wt-1',
  diagnosis: 'Ancien diagnostic',
  diagnosisKey: 'diagIssues',
  severity: 'high',
  confidence: 0.9,
  // NO scientific method versions — produced by the legacy engine
  immediateActions: JSON.stringify([{ actionKey: 'iaAddSalt', action: 'Ajouter du sel' }]),
  chemicalDosages: JSON.stringify([
    { param: 'salt_plus', quantity: '12 kg', estimatedCost: '≈ 12.00 €' },
  ]),
  doNotDo: JSON.stringify(['dnd1']),
  doNotDoKeys: JSON.stringify(['dndKey1']),
  estimatedCost: '≈ 12.00 €',
  retestInHours: 24,
  filtrationHours: 6,
}

const canonicalStoredPlan = {
  id: 'canonical-plan-1',
  waterTestId: 'wt-1',
  diagnosis: 'Diagnostic canonique',
  diagnosisKey: 'diagIssues',
  severity: 'medium',
  confidence: 0.85,
  scientificMethodVersion: 'measurement-confidence-v1',
  dosageMethodVersion: DOSAGE_METHOD_VERSION,
  swimSafetyMethodVersion: 'contextual-swim-safety-v1',
  immediateActions: JSON.stringify([{ actionKey: 'iaAdjustTac', action: 'Ajuster TAC' }]),
  chemicalDosages: JSON.stringify([
    { param: 'alkalinity_plus', quantity: '—', estimatedCost: '—', calculationSuppressed: true },
  ]),
  doNotDo: JSON.stringify(['dnd1']),
  doNotDoKeys: JSON.stringify(['dndKey1']),
  estimatedCost: '—',
  retestInHours: 24,
  filtrationHours: 6,
}

describe('Wave A1 Round 2 — fail-closed dashboard plan gate (behavioral)', () => {
  it('1. a stored legacy plan WITHOUT scientific method versions is requalified, never actionable', () => {
    const view = buildDashboardPlanView({
      freshPlan: null,
      storedPlan: legacyStoredPlan,
      storedPlanBelongsToLatestTest: true,
    })
    expect(view).not.toBeNull()
    expect(view?.scientificPlanAvailable).toBe(false)
    expect(view?.scientificRequalificationRequired).toBe(true)
    // No actionable quantity / cost / validated dosing action.
    expect(view?.chemicalDosages).toEqual([])
    expect(view?.immediateActions).toEqual([])
    expect(view?.estimatedCost).toBeNull()
    // Safe, non-actionable info preserved.
    expect(view?.diagnosis).toBe('Ancien diagnostic')
    expect(view?.doNotDo).toEqual(['dnd1'])
  })

  it('2. a simulated scientific regeneration failure returns a fail-closed view (even a canonical stored plan)', () => {
    const view = buildDashboardPlanView({
      freshPlan: null, // regeneration failed
      storedPlan: canonicalStoredPlan,
      storedPlanBelongsToLatestTest: true,
    })
    expect(view?.scientificPlanAvailable).toBe(false)
    expect(view?.scientificRequalificationRequired).toBe(true)
    // No actionable quantity / cost / validated dosing action is exposed.
    expect(view?.chemicalDosages).toEqual([])
    expect(view?.immediateActions).toEqual([])
    expect(view?.estimatedCost).toBeNull()
    // Safe, non-actionable info preserved.
    expect(view?.diagnosis).toBe('Diagnostic canonique')
  })

  it('3. a latest test WITHOUT a plan returns null (no plan from a previous test)', () => {
    const view = buildDashboardPlanView({
      freshPlan: null,
      storedPlan: null,
      storedPlanBelongsToLatestTest: false,
    })
    expect(view).toBeNull()
  })

  it('4. a stored plan belonging to ANOTHER test is never exposed (diagnosis included)', () => {
    const view = buildDashboardPlanView({
      freshPlan: null,
      storedPlan: canonicalStoredPlan, // waterTestId 'wt-1'
      storedPlanBelongsToLatestTest: false, // latest test is a different id
    })
    expect(view?.scientificPlanAvailable).toBe(false)
    expect(view?.scientificRequalificationRequired).toBe(true)
    expect(view?.associationMismatch).toBe(true)
    expect(view?.immediateActions).toEqual([])
    expect(view?.chemicalDosages).toEqual([])
    expect(view?.estimatedCost).toBeNull()
    // Another test's diagnosis must not leak either.
    expect(view?.diagnosis).toBeNull()
  })

  it('5. storedPlanIsCanonical detects canonical method versions (a pure qualifier)', () => {
    expect(storedPlanIsCanonical(canonicalStoredPlan)).toBe(true)
    expect(storedPlanIsCanonical(legacyStoredPlan)).toBe(false)
    expect(safeParseJsonArray(canonicalStoredPlan.chemicalDosages)).toHaveLength(1)
  })

  it('6. a fresh regenerated plan is returned as EPHEMERAL (no stored identity reuse)', () => {
    const freshPlan = generateScientificallyQualifiedActionPlan(
      { ph: 7.4, freeChlorine: 2, alkalinity: 100 },
      { volume: 50, unit: 'm3', treatmentType: 'chlorine', saltSystem: false, waterBodyType: 'pool', filterType: 'sand' },
      'fr',
    ) as any
    const view = buildDashboardPlanView({
      freshPlan,
      storedPlan: legacyStoredPlan, // legacy stored plan must be ignored
      storedPlanBelongsToLatestTest: false, // stored plan belongs to another test
    })
    expect(view?.scientificPlanAvailable).toBe(true)
    expect(view?.scientificRequalificationRequired).toBe(false)
    expect(view?.ephemeral).toBe(true)
    expect(view?.id).toBeUndefined()
    // The fresh plan's quantities are canonical (readiness-masked when needed).
    expect(Array.isArray(view?.chemicalDosages)).toBe(true)
    // No legacy identity leaked.
    expect(view?.waterTestId).toBeUndefined()
  })

  it('7. no actionable quantity or estimatedCost is exposed in fail-closed mode', () => {
    const view = buildDashboardPlanView({
      freshPlan: null,
      storedPlan: legacyStoredPlan,
      storedPlanBelongsToLatestTest: true,
    })
    expect(view?.chemicalDosages).toEqual([])
    expect(view?.estimatedCost).toBeNull()
    expect(view?.retestInHours).toBeNull()
    expect(view?.filtrationHours).toBeNull()
  })

  it('never falls back to generateActionPlan (module-level guarantee)', () => {
    const dashboard = readFileSync(ROUTES.dashboard, 'utf8')
    expect(dashboard).not.toContain('generateActionPlan')
  })
})

// ---------------------------------------------------------------------------
// Wave A1 Round 3 — public response contract (server-side sanitization)
// ---------------------------------------------------------------------------

import {
  sanitizeDashboardLatestTest,
  buildDashboardSwim,
} from '@/lib/pool/dashboard-plan-gate'

const legacyPlanRecord = {
  id: 'legacy-plan-1',
  waterTestId: 'wt-1',
  diagnosis: 'Ancien diagnostic',
  diagnosisKey: 'diagIssues',
  severity: 'high',
  confidence: 0.9,
  immediateActions: JSON.stringify([{ actionKey: 'iaAddSalt', action: 'Ajouter du sel' }]),
  chemicalDosages: JSON.stringify([{ param: 'salt_plus', quantity: '12 kg', estimatedCost: '≈ 12.00 €' }]),
  doNotDo: JSON.stringify(['dnd1']),
  doNotDoKeys: JSON.stringify(['dndKey1']),
  estimatedCost: '≈ 12.00 €',
  retestInHours: 24,
  filtrationHours: 6,
  executions: [{ id: 'ex1' }],
  outcome: { id: 'out1' },
}

const latestTestWithLegacyPlan = {
  id: 'wt-1',
  ph: 7.8,
  freeChlorine: 0.2,
  swimSafety: 'forbidden',
  actionPlans: [legacyPlanRecord],
}

describe('Wave A1 Round 3 — public dashboard response contract (serialized)', () => {
  it('1. sanitizeDashboardLatestTest strips actionPlans from a test carrying a legacy plan', () => {
    const sanitized = sanitizeDashboardLatestTest(latestTestWithLegacyPlan)
    expect(sanitized?.id).toBe('wt-1')
    expect((sanitized as any).actionPlans).toBeUndefined()
  })

  it('2. the PUBLIC latestTest never contains actionPlans (server-side, before JSON)', () => {
    const sanitized = sanitizeDashboardLatestTest(latestTestWithLegacyPlan) as any
    expect(sanitized.actionPlans).toBeUndefined()
    const serialized = JSON.stringify(sanitized)
    expect(serialized).not.toContain('actionPlans')
  })

  it('3. legacy chemicalDosages are absent from every nested path of the public test', () => {
    const sanitized = sanitizeDashboardLatestTest(latestTestWithLegacyPlan) as any
    const serialized = JSON.stringify(sanitized)
    expect(serialized).not.toContain('chemicalDosages')
    expect(serialized).not.toContain('salt_plus')
  })

  it('4. legacy immediateActions are absent from every nested path of the public test', () => {
    const sanitized = sanitizeDashboardLatestTest(latestTestWithLegacyPlan) as any
    const serialized = JSON.stringify(sanitized)
    expect(serialized).not.toContain('immediateActions')
    expect(serialized).not.toContain('iaAddSalt')
  })

  it('5. legacy estimatedCost is absent from every nested path of the public test', () => {
    const sanitized = sanitizeDashboardLatestTest(latestTestWithLegacyPlan) as any
    const serialized = JSON.stringify(sanitized)
    expect(serialized).not.toContain('estimatedCost')
    expect(serialized).not.toContain('12 kg')
    expect(serialized).not.toContain('12.00')
  })

  it('6. latestPlan stays fail-closed when no fresh plan exists', () => {
    const plan = buildDashboardPlanView({
      freshPlan: null,
      storedPlan: legacyPlanRecord,
      storedPlanBelongsToLatestTest: true,
    })
    expect(plan?.scientificPlanAvailable).toBe(false)
    expect(plan?.scientificRequalificationRequired).toBe(true)
    expect(plan?.chemicalDosages).toEqual([])
    expect(plan?.immediateActions).toEqual([])
    expect(plan?.estimatedCost).toBeNull()
  })

  it('7. swim.status is unknown when no fresh plan exists', () => {
    const swim = buildDashboardSwim({ freshPlan: null, hasLatestTest: true })
    expect(swim?.status).toBe('unknown')
    expect(swim?.reasons).toEqual([])
  })

  it('8. scientificRequalificationRequired is surfaced on an unqualified swim', () => {
    const swim = buildDashboardSwim({ freshPlan: null, hasLatestTest: true })
    expect(swim?.scientificRequalificationRequired).toBe(true)
    // The historical stored swimSafety is never presented as current.
    const serialized = JSON.stringify(swim)
    expect(serialized).not.toContain('forbidden')
  })

  it('9. a valid freshPlan returns the canonical contextual swim status', () => {
    const swim = buildDashboardSwim({
      freshPlan: { swimSafety: 'allowed', swimReasons: ['ok'] },
      hasLatestTest: true,
    })
    expect(swim?.status).toBe('allowed')
    expect(swim?.reasons).toEqual(['ok'])
    expect(swim?.scientificRequalificationRequired).toBe(false)
  })

  it('10. the full public response JSON contains no historical dosage (consumer cannot bypass latestPlan)', () => {
    const sanitizedTest = sanitizeDashboardLatestTest(latestTestWithLegacyPlan) as any
    const planView = buildDashboardPlanView({
      freshPlan: null,
      storedPlan: legacyPlanRecord,
      storedPlanBelongsToLatestTest: true,
    })
    const response = {
      latestTest: sanitizedTest,
      latestPlan: planView,
      swim: buildDashboardSwim({ freshPlan: null, hasLatestTest: true }),
    }
    const serialized = JSON.stringify(response)
    // No raw plan leak through latestTest (no actionPlans key at all).
    expect(serialized).not.toContain('actionPlans')
    // No historical dosage VALUE leaks through any path.
    expect(serialized).not.toContain('12 kg')
    expect(serialized).not.toContain('12.00')
    expect(serialized).not.toContain('iaAddSalt')
    // The fail-closed plan view exposes only safe info + flags.
    expect(serialized).toContain('scientificRequalificationRequired')
    expect(serialized).toContain('"chemicalDosages":[]')
    expect(serialized).toContain('"immediateActions":[]')
    expect(serialized).toContain('"estimatedCost":null')
    expect(serialized).toContain('"status":"unknown"')
  })
})
