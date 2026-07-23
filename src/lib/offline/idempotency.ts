import { createHash } from 'node:crypto'

export type OfflineMutationMethod = 'POST' | 'PATCH' | 'DELETE'

const ALLOWED_MUTATIONS: Readonly<Record<string, ReadonlySet<OfflineMutationMethod>>> = {
  '/api/pool/action-plan': new Set(['POST']),
  '/api/chat': new Set(['POST', 'DELETE']),
  '/api/pool/water-test': new Set(['POST', 'DELETE']),
  '/api/pool/equipment': new Set(['POST', 'PATCH', 'DELETE']),
  '/api/pool/inventory': new Set(['POST', 'DELETE']),
  '/api/pool/reminders': new Set(['POST', 'PATCH', 'DELETE']),
}

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/

export class OfflineReplayValidationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 403 | 409,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'OfflineReplayValidationError'
  }
}

export function validateIdempotencyKey(value: string | null): string {
  const key = value?.trim() || ''
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new OfflineReplayValidationError(
      'Invalid Idempotency-Key header',
      400,
      'invalid_idempotency_key',
    )
  }
  return key
}

export function normalizeOfflineTarget(
  origin: string,
  path: string,
  method: string,
): { url: URL; method: OfflineMutationMethod } {
  const normalizedMethod = method.toUpperCase() as OfflineMutationMethod
  if (!['POST', 'PATCH', 'DELETE'].includes(normalizedMethod)) {
    throw new OfflineReplayValidationError('Unsupported mutation method', 400, 'invalid_method')
  }

  let url: URL
  try {
    url = new URL(path, origin)
  } catch {
    throw new OfflineReplayValidationError('Invalid replay path', 400, 'invalid_path')
  }

  if (url.origin !== origin || !url.pathname.startsWith('/api/')) {
    throw new OfflineReplayValidationError('External replay target denied', 403, 'target_denied')
  }

  const allowedMethods = ALLOWED_MUTATIONS[url.pathname]
  if (!allowedMethods?.has(normalizedMethod)) {
    throw new OfflineReplayValidationError(
      'Replay target is not allowlisted',
      403,
      'target_denied',
    )
  }

  return { url, method: normalizedMethod }
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`

  const object = value as Record<string, unknown>
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
    .join(',')}}`
}

export function hashOfflineMutation(
  method: OfflineMutationMethod,
  path: string,
  body: unknown,
): string {
  return createHash('sha256')
    .update(method)
    .update('\n')
    .update(path)
    .update('\n')
    .update(stableJson(body ?? null))
    .digest('hex')
}

export function isRetryableReplayStatus(status: number): boolean {
  return status >= 500
}
