import { randomUUID } from 'node:crypto'

export const PRO_COMMERCIAL_FORMAT_VERSION = 'pro-commercial-v1' as const

export const PRO_COMMERCIAL_TYPES = ['quote', 'invoice'] as const
export type ProCommercialType = (typeof PRO_COMMERCIAL_TYPES)[number]

export const PRO_COMMERCIAL_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'overdue',
  'paid',
  'cancelled',
] as const
export type ProCommercialStatus = (typeof PRO_COMMERCIAL_STATUSES)[number]

export interface ProCommercialLineInput {
  catalogItemId?: string | null
  description?: unknown
  quantity?: unknown
  unit?: unknown
  unitPrice?: unknown
  taxRate?: unknown
}

export interface ProCommercialLine {
  catalogItemId: string | null
  description: string
  quantity: number
  unit: string
  unitPrice: number
  taxRate: number
  lineSubtotal: number
  lineTax: number
  lineTotal: number
  sortOrder: number
}

export interface ProCommercialDocument {
  version: typeof PRO_COMMERCIAL_FORMAT_VERSION
  type: ProCommercialType
  number: string
  status: ProCommercialStatus
  currency: string
  proClientId: string
  proInterventionId: string | null
  issueDate: string
  dueDate: string | null
  validUntil: string | null
  subtotal: number
  taxTotal: number
  total: number
  notes: string | null
  sentAt: string | null
  acceptedAt: string | null
  paidAt: string | null
  reminderCount: number
  lastReminderAt: string | null
  sourceQuoteActivityId?: string | null
  lines: ProCommercialLine[]
}

export class ProCommercialError extends Error {
  constructor(
    public code:
      | 'INVALID_DOCUMENT_TYPE'
      | 'INVALID_DOCUMENT_STATUS'
      | 'INVALID_LINES'
      | 'INVALID_LINE_DESCRIPTION'
      | 'INVALID_LINE_QUANTITY'
      | 'INVALID_LINE_PRICE'
      | 'INVALID_TAX_RATE'
      | 'INVALID_DATE'
      | 'INVALID_CURRENCY'
      | 'INVALID_STORED_DOCUMENT'
      | 'TRANSITION_NOT_ALLOWED',
    message: string,
  ) {
    super(message)
    this.name = 'ProCommercialError'
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function finiteNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function cleanText(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : ''
}

export function isCommercialType(value: unknown): value is ProCommercialType {
  return typeof value === 'string' && PRO_COMMERCIAL_TYPES.includes(value as ProCommercialType)
}

export function isCommercialStatus(value: unknown): value is ProCommercialStatus {
  return typeof value === 'string' && PRO_COMMERCIAL_STATUSES.includes(value as ProCommercialStatus)
}

export function normalizeCurrency(value: unknown): string {
  const currency = cleanText(value, 3).toUpperCase() || 'EUR'
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new ProCommercialError('INVALID_CURRENCY', 'Currency must use a 3-letter ISO code')
  }
  return currency
}

export function parseOptionalCommercialDate(value: unknown): string | null {
  if (value === '' || value === null || value === undefined) return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    throw new ProCommercialError('INVALID_DATE', 'Invalid commercial document date')
  }
  return date.toISOString()
}

export function calculateCommercialLines(inputs: unknown): {
  lines: ProCommercialLine[]
  subtotal: number
  taxTotal: number
  total: number
} {
  if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 100) {
    throw new ProCommercialError('INVALID_LINES', 'A document requires between 1 and 100 lines')
  }

  const lines = inputs.map((raw, index): ProCommercialLine => {
    const input = (raw && typeof raw === 'object' ? raw : {}) as ProCommercialLineInput
    const description = cleanText(input.description, 500)
    const quantity = finiteNumber(input.quantity)
    const unitPrice = finiteNumber(input.unitPrice)
    const taxRate = input.taxRate === undefined ? 20 : finiteNumber(input.taxRate)
    const unit = cleanText(input.unit, 40) || 'unit'

    if (!description) {
      throw new ProCommercialError('INVALID_LINE_DESCRIPTION', `Line ${index + 1} requires a description`)
    }
    if (quantity === null || quantity <= 0 || quantity > 1_000_000) {
      throw new ProCommercialError('INVALID_LINE_QUANTITY', `Line ${index + 1} has an invalid quantity`)
    }
    if (unitPrice === null || unitPrice < 0 || unitPrice > 100_000_000) {
      throw new ProCommercialError('INVALID_LINE_PRICE', `Line ${index + 1} has an invalid unit price`)
    }
    if (taxRate === null || taxRate < 0 || taxRate > 100) {
      throw new ProCommercialError('INVALID_TAX_RATE', `Line ${index + 1} has an invalid tax rate`)
    }

    const normalizedQuantity = Math.round(quantity * 10_000) / 10_000
    const normalizedUnitPrice = roundMoney(unitPrice)
    const normalizedTaxRate = Math.round(taxRate * 100) / 100
    const lineSubtotal = roundMoney(normalizedQuantity * normalizedUnitPrice)
    const lineTax = roundMoney(lineSubtotal * normalizedTaxRate / 100)

    return {
      catalogItemId: cleanText(input.catalogItemId, 120) || null,
      description,
      quantity: normalizedQuantity,
      unit,
      unitPrice: normalizedUnitPrice,
      taxRate: normalizedTaxRate,
      lineSubtotal,
      lineTax,
      lineTotal: roundMoney(lineSubtotal + lineTax),
      sortOrder: index,
    }
  })

  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineSubtotal, 0))
  const taxTotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTax, 0))
  return { lines, subtotal, taxTotal, total: roundMoney(subtotal + taxTotal) }
}

export function createCommercialNumber(type: ProCommercialType, now = new Date()): string {
  const prefix = type === 'quote' ? 'DEV' : 'FAC'
  const date = now.toISOString().slice(0, 10).replaceAll('-', '')
  const suffix = randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()
  return `${prefix}-${date}-${suffix}`
}

const ALLOWED_TRANSITIONS: Record<ProCommercialType, Record<ProCommercialStatus, ProCommercialStatus[]>> = {
  quote: {
    draft: ['sent', 'cancelled'],
    sent: ['accepted', 'rejected', 'cancelled'],
    accepted: ['cancelled'],
    rejected: [],
    overdue: [],
    paid: [],
    cancelled: [],
  },
  invoice: {
    draft: ['sent', 'cancelled'],
    sent: ['overdue', 'paid', 'cancelled'],
    accepted: [],
    rejected: [],
    overdue: ['paid', 'cancelled'],
    paid: [],
    cancelled: [],
  },
}

export function assertCommercialTransition(
  type: ProCommercialType,
  current: ProCommercialStatus,
  next: ProCommercialStatus,
): void {
  if (current === next) return
  if (!ALLOWED_TRANSITIONS[type][current].includes(next)) {
    throw new ProCommercialError(
      'TRANSITION_NOT_ALLOWED',
      `Transition ${type}:${current} -> ${next} is not allowed`,
    )
  }
}

export function serializeCommercialDocument(document: ProCommercialDocument): string {
  return JSON.stringify(document)
}

export function parseCommercialDocument(value: unknown): ProCommercialDocument {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object')
    const document = parsed as Partial<ProCommercialDocument>
    if (
      document.version !== PRO_COMMERCIAL_FORMAT_VERSION ||
      !isCommercialType(document.type) ||
      !isCommercialStatus(document.status) ||
      typeof document.number !== 'string' ||
      typeof document.proClientId !== 'string' ||
      !Array.isArray(document.lines)
    ) {
      throw new Error('invalid fields')
    }
    return document as ProCommercialDocument
  } catch {
    throw new ProCommercialError('INVALID_STORED_DOCUMENT', 'Stored commercial document is invalid')
  }
}
