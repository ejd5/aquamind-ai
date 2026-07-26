export const MEASUREMENT_PROVENANCE_METHOD_VERSION = 'measurement-provenance-v1' as const

export const MEASUREMENT_METHODS = [
  'manual',
  'kit_drop',
  'strip',
  'photometer',
  'probe',
  'device',
  'imported',
] as const

export type MeasurementMethod = (typeof MEASUREMENT_METHODS)[number]

export interface MeasurementProvenanceInput {
  measuredAt?: unknown
  measurementMethod?: unknown
  measurementMetadata?: unknown
  source?: unknown
}

export interface MeasurementProvenance {
  measuredAt: Date
  measurementMethod: MeasurementMethod
  measurementMetadata: string | null
  methodVersion: typeof MEASUREMENT_PROVENANCE_METHOD_VERSION
}

export class MeasurementProvenanceError extends Error {
  constructor(
    public code:
      | 'INVALID_MEASURED_AT'
      | 'MEASURED_AT_IN_FUTURE'
      | 'INVALID_MEASUREMENT_METHOD'
      | 'INVALID_MEASUREMENT_METADATA'
      | 'MEASUREMENT_METADATA_TOO_LARGE',
    message: string,
  ) {
    super(message)
    this.name = 'MeasurementProvenanceError'
  }
}

function fallbackMethod(source: unknown): MeasurementMethod {
  if (source === 'strip_photo') return 'strip'
  if (source === 'device') return 'device'
  if (source === 'imported') return 'imported'
  return 'manual'
}

function parseMeasuredAt(value: unknown, now: Date): Date {
  if (value === undefined || value === null || value === '') return now
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) {
    throw new MeasurementProvenanceError('INVALID_MEASURED_AT', 'Invalid measurement date')
  }
  if (parsed.getTime() > now.getTime() + 5 * 60 * 1000) {
    throw new MeasurementProvenanceError(
      'MEASURED_AT_IN_FUTURE',
      'Measurement date cannot be in the future',
    )
  }
  return parsed
}

function parseMethod(value: unknown, source: unknown): MeasurementMethod {
  if (value === undefined || value === null || value === '') return fallbackMethod(source)
  if (typeof value === 'string' && MEASUREMENT_METHODS.includes(value as MeasurementMethod)) {
    return value as MeasurementMethod
  }
  throw new MeasurementProvenanceError(
    'INVALID_MEASUREMENT_METHOD',
    'Unsupported measurement method',
  )
}

function sanitizeMetadata(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new MeasurementProvenanceError(
      'INVALID_MEASUREMENT_METADATA',
      'Measurement metadata must be an object',
    )
  }

  const record = value as Record<string, unknown>
  const sanitized: Record<string, string | number | boolean | null> = {}
  for (const key of [
    'deviceBrand',
    'deviceModel',
    'deviceId',
    'calibrationAt',
    'lotNumber',
    'operator',
    'accuracyClass',
    'unitSystem',
  ]) {
    const item = record[key]
    if (item === undefined) continue
    if (item === null || ['string', 'number', 'boolean'].includes(typeof item)) {
      sanitized[key] = typeof item === 'string' ? item.trim().slice(0, 240) : item as number | boolean | null
    }
  }

  const serialized = JSON.stringify(sanitized)
  if (serialized.length > 4_000) {
    throw new MeasurementProvenanceError(
      'MEASUREMENT_METADATA_TOO_LARGE',
      'Measurement metadata is too large',
    )
  }
  return serialized === '{}' ? null : serialized
}

export function normalizeMeasurementProvenance(
  input: MeasurementProvenanceInput,
  now = new Date(),
): MeasurementProvenance {
  return {
    measuredAt: parseMeasuredAt(input.measuredAt, now),
    measurementMethod: parseMethod(input.measurementMethod, input.source),
    measurementMetadata: sanitizeMetadata(input.measurementMetadata),
    methodVersion: MEASUREMENT_PROVENANCE_METHOD_VERSION,
  }
}
