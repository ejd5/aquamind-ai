/**
 * Pure helpers for the B2C onboarding → PoolProfile POST payload.
 *
 * The onboarding is a 4-step wizard. We must NOT persist UI defaults for
 * steps the user never actually visited/confirmed. `buildPoolProfileCreateBody`
 * only forwards the fields belonging to the steps that were really walked
 * through, so server-side defaults are the single source of truth for the
 * rest (no silent client-side "business truth").
 *
 * P0-1 (Round 2): the PoolProfile table keeps NOT NULL business columns with
 * technical DB defaults (e.g. treatmentType='chlorine', shape='rectangular').
 * To distinguish "user-confirmed value" from "technical default", the server
 * records `confirmedFields` (JSON array of storage field names) on every
 * create/update. The recommendation engine must consult it before treating a
 * business value as user truth.
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

/**
 * Storage field names that carry BUSINESS meaning (vs pure technical fields
 * like id / createdAt). These are the fields that must NOT be silently
 * attributed to the user when only a technical DB default is stored.
 */
export const BUSINESS_FIELDS: readonly string[] = [
  'name',
  'volume',
  'unit',
  'waterBodyType',
  'shape',
  'surfaceType',
  'treatmentType',
  'saltSystem',
  'filterType',
  'pumpType',
  'region',
  'sunExposure',
  'covered',
  'usageLevel',
  'spaSeats',
  'spaTempTarget',
  'spaUsageFreq',
  'spaBrand',
] as const

/** Client-side aliases → storage field names (used to map confirmed fields). */
const FIELD_ALIASES: Record<string, string> = {
  spaTempTarget: 'spaTemperature',
  spaUsageFreq: 'spaUsageFrequency',
}

/**
 * Derive the list of storage field names the client explicitly provided in a
 * request body. Only these are "confirmed" business values; everything else in
 * the stored row is a technical DB default.
 */
export function deriveConfirmedFields(body: Record<string, unknown>): string[] {
  const confirmed: string[] = []
  for (const field of BUSINESS_FIELDS) {
    const alias = FIELD_ALIASES[field]
    const present =
      body[field] !== undefined || (alias !== undefined && body[alias] !== undefined)
    if (present) confirmed.push(field)
  }
  return confirmed
}

/** Parse the `confirmedFields` JSON column of a stored PoolProfile row. */
export function parseConfirmedFields(profile: { confirmedFields?: string | null }): string[] {
  if (!profile?.confirmedFields) return []
  try {
    const parsed = JSON.parse(profile.confirmedFields)
    return Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === 'string') : []
  } catch {
    return []
  }
}

/** True when the stored value of `field` was explicitly confirmed by the user. */
export function isPoolFieldConfirmed(
  profile: { confirmedFields?: string | null },
  field: string,
): boolean {
  return parseConfirmedFields(profile).includes(field)
}

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

/** Spa temperature range (mirrors SPA_SPECIFICS.temperatureRange). */
export const SPA_TEMP_RANGE = { min: 28, max: 40 } as const
/** Spa seats range (mirrors SPA_SPECIFICS.seatsRange). */
export const SPA_SEATS_RANGE = { min: 2, max: 8 } as const

export interface ProfileValidationError {
  field: string
  code: string
}

/**
 * Server-side business validation for a PoolProfile create/update body.
 * Mirrors the HTML/client controls — never trust the client alone.
 *
 * `partial=true` (PATCH) only validates fields that are actually present.
 * `partial=false` (POST) requires the core fields.
 */
export function validateProfileBody(
  body: Record<string, unknown>,
  opts: { partial?: boolean } = {},
): ProfileValidationError[] {
  const partial = opts.partial ?? false
  const errors: ProfileValidationError[] = []

  const pushError = (field: string, code: string) => {
    if (!errors.some((e) => e.field === field && e.code === code)) {
      errors.push({ field, code })
    }
  }

  // ── name: required on create, non-empty when provided ─────────────────
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      pushError('name', 'EMPTY_NAME')
    }
  } else if (!partial) {
    pushError('name', 'NAME_REQUIRED')
  }

  // ── volume: finite, strictly positive ─────────────────────────────────
  const volumeRaw = body.volume
  if (volumeRaw !== undefined && volumeRaw !== null && volumeRaw !== '') {
    const v = Number(volumeRaw)
    if (!Number.isFinite(v) || v <= 0) {
      pushError('volume', 'INVALID_VOLUME')
    }
  } else if (!partial && (volumeRaw === undefined || volumeRaw === null)) {
    pushError('volume', 'VOLUME_REQUIRED')
  }

  // ── unit: only m3 | gal ───────────────────────────────────────────────
  if (body.unit !== undefined && body.unit !== 'm3' && body.unit !== 'gal') {
    pushError('unit', 'INVALID_UNIT')
  }

  // ── enums (whitelist) ─────────────────────────────────────────────────
  for (const field of invalidProfileFields(body)) {
    pushError(field, 'INVALID_FIELD')
  }

  // ── spa temperature (client alias spaTemperature) within business range
  const spaTempRaw =
    body.spaTempTarget !== undefined ? body.spaTempTarget : body.spaTemperature
  if (spaTempRaw !== undefined && spaTempRaw !== null && spaTempRaw !== '') {
    const t = Number(spaTempRaw)
    if (!Number.isFinite(t) || t < SPA_TEMP_RANGE.min || t > SPA_TEMP_RANGE.max) {
      pushError('spaTempTarget', 'INVALID_SPA_TEMP')
    }
  }

  // ── spa seats within business range ───────────────────────────────────
  if (body.spaSeats !== undefined && body.spaSeats !== null && body.spaSeats !== '') {
    const s = Number(body.spaSeats)
    if (!Number.isInteger(s) || s < SPA_SEATS_RANGE.min || s > SPA_SEATS_RANGE.max) {
      pushError('spaSeats', 'INVALID_SPA_SEATS')
    }
  }

  return errors
}
