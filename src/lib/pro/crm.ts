export const PRO_CLIENT_STATUSES = ['prospect', 'active', 'paused', 'archived'] as const
export const PRO_CONTACT_CHANNELS = ['email', 'phone', 'sms', 'whatsapp'] as const
export const PRO_POOL_STATUSES = ['active', 'seasonal', 'inactive'] as const
export const PRO_INTERVENTION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export const PRO_ACTIVITY_TYPES = [
  'note',
  'call',
  'email',
  'sms',
  'visit',
  'follow_up',
  'status_change',
  'client_created',
  'intervention_scheduled',
  'intervention_started',
  'intervention_completed',
  'intervention_cancelled',
] as const

export type ProClientStatus = (typeof PRO_CLIENT_STATUSES)[number]
export type ProContactChannel = (typeof PRO_CONTACT_CHANNELS)[number]
export type ProPoolStatus = (typeof PRO_POOL_STATUSES)[number]
export type ProInterventionPriority = (typeof PRO_INTERVENTION_PRIORITIES)[number]
export type ProActivityType = (typeof PRO_ACTIVITY_TYPES)[number]

export function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value as T[number])
}

export function cleanOptionalText(value: unknown, maxLength = 10_000): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text.slice(0, maxLength) : null
}

export function serializeShortStringArray(value: unknown, maxItems = 20): string | null {
  const items = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []
  const normalized = [...new Set(
    items
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().replace(/\s+/g, ' ').slice(0, 40))
      .filter(Boolean),
  )].slice(0, maxItems)
  return normalized.length ? JSON.stringify(normalized) : null
}

export function parseStoredStringArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
}

export type ParsedOptionalDate = {
  provided: boolean
  valid: boolean
  value: Date | null
}

export function parseOptionalDate(value: unknown): ParsedOptionalDate {
  if (value === undefined) return { provided: false, valid: true, value: null }
  if (value === null || value === '') return { provided: true, valid: true, value: null }
  const date = new Date(String(value))
  return {
    provided: true,
    valid: !Number.isNaN(date.getTime()),
    value: Number.isNaN(date.getTime()) ? null : date,
  }
}

export function parseOptionalAmount(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return undefined
  return Math.round(amount * 100) / 100
}

export function normalizeCurrency(value: unknown): string {
  const currency = typeof value === 'string' ? value.trim().toUpperCase() : 'EUR'
  return /^[A-Z]{3}$/.test(currency) ? currency : 'EUR'
}
