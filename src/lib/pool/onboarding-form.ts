/**
 * Pure helpers for the B2C onboarding → PoolProfile POST payload.
 *
 * The onboarding is a 4-step wizard. We must NOT persist UI defaults for
 * steps the user never actually visited/confirmed. `buildPoolProfileCreateBody`
 * only forwards the fields belonging to the steps that were really walked
 * through, so server-side defaults are the single source of truth for the
 * rest (no silent client-side "business truth").
 */

export type WaterBodyType = 'pool' | 'spa' | 'both'

/** Fields edited in each onboarding step (pool branch). */
export const STEP_FIELDS: Record<number, string[]> = {
  1: ['name', 'waterBodyType', 'volume', 'unit', 'shape', 'surfaceType'],
  2: ['treatmentType', 'saltSystem'],
  3: ['filterType', 'pumpType'],
  4: ['region', 'sunExposure', 'usageLevel', 'covered'],
}

/** Extra fields edited in step 1 when the water body is a spa (or both). */
export const SPA_STEP_FIELDS: string[] = ['spaSeats', 'spaTemperature', 'spaUsageFrequency', 'spaBrand']

/** Whitelisted values — mirrors the PoolProfile schema enums. */
export const ALLOWED = {
  waterBodyType: ['pool', 'spa', 'both'],
  shape: ['rectangular', 'round', 'oval', 'free'],
  surfaceType: ['liner', 'shell', 'concrete', 'tile'],
  treatmentType: ['chlorine', 'salt', 'bromine', 'active_oxygen', 'uv', 'other'],
  filterType: ['sand', 'cartridge', 'glass', 'diatom'],
  sunExposure: ['low', 'medium', 'high'],
  usageLevel: ['low', 'medium', 'high'],
} as const

export interface OnboardingForm {
  name: string
  waterBodyType: WaterBodyType
  volume: string
  unit: string
  shape: string
  surfaceType: string
  treatmentType: string
  saltSystem: boolean
  filterType: string
  pumpType: string
  region: string
  sunExposure: string
  covered: boolean
  usageLevel: string
  spaSeats: number
  spaTemperature: number
  spaUsageFrequency: string
  spaBrand: string
}

/**
 * Build the POST body for /api/pool/profile.
 *
 * Only the fields of the *confirmed* steps are forwarded. `step === 1` is
 * always confirmed (the wizard starts there). A spa water body adds its own
 * step-1 fields.
 *
 * `saltSystem` is derived from the treatment type (client keeps in sync).
 */
export function buildPoolProfileCreateBody(
  form: OnboardingForm,
  confirmedSteps: Set<number>,
): Record<string, unknown> {
  const steps = new Set(confirmedSteps)
  steps.add(1) // step 1 is always walked

  const body: Record<string, unknown> = {
    volume: Number(form.volume),
    unit: form.unit,
    name: form.name,
    waterBodyType: form.waterBodyType,
  }

  const pushStep = (n: number) => {
    if (!steps.has(n)) return
    for (const field of STEP_FIELDS[n]) {
      if (field === 'name' || field === 'volume' || field === 'unit' || field === 'waterBodyType') continue
      if (field === 'saltSystem') {
        // saltSystem is derived from the treatment type — the server must not
        // trust a stale form flag that disagrees with the user's treatment choice.
        body.saltSystem = form.treatmentType === 'salt'
        continue
      }
      body[field] = form[field as keyof OnboardingForm]
    }
  }

  pushStep(1)
  pushStep(2)
  pushStep(3)
  pushStep(4)

  // Spa-specific step-1 fields
  if (form.waterBodyType === 'spa' || form.waterBodyType === 'both') {
    if (steps.has(1)) {
      body.spaSeats = form.spaSeats
      body.spaTemperature = form.spaTemperature
      body.spaUsageFrequency = form.spaUsageFrequency
      if (form.spaBrand) body.spaBrand = form.spaBrand
    }
  }

  return body
}

/**
 * Validate an incoming API body against the whitelisted enums.
 * Returns a list of invalid field names (empty = valid).
 */
export function invalidProfileFields(body: Record<string, unknown>): string[] {
  const invalid: string[] = []
  for (const field of Object.keys(ALLOWED)) {
    if (body[field] === undefined) continue
    const allowed = ALLOWED[field as keyof typeof ALLOWED] as readonly string[]
    if (typeof body[field] !== 'string' || !allowed.includes(body[field])) {
      invalid.push(field)
    }
  }
  return invalid
}
