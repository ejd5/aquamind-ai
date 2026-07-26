import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ProCommercialError,
  assertCommercialTransition,
  calculateCommercialLines,
  createCommercialNumber,
  parseCommercialDocument,
  serializeCommercialDocument,
  type ProCommercialDocument,
} from '@/lib/pro/commercial'

const root = process.cwd()

describe('P1 Commercial Pro', () => {
  it('calculates line and document totals deterministically', () => {
    const result = calculateCommercialLines([
      {
        description: 'Entretien mensuel',
        quantity: 2,
        unit: 'visit',
        unitPrice: 85,
        taxRate: 20,
      },
      {
        description: 'Cartouche filtrante',
        quantity: 3,
        unit: 'piece',
        unitPrice: 19.99,
        taxRate: 10,
      },
    ])

    expect(result.lines[0]).toMatchObject({
      lineSubtotal: 170,
      lineTax: 34,
      lineTotal: 204,
    })
    expect(result.lines[1]).toMatchObject({
      lineSubtotal: 59.97,
      lineTax: 6,
      lineTotal: 65.97,
    })
    expect(result).toMatchObject({ subtotal: 229.97, taxTotal: 40, total: 269.97 })
  })

  it('rejects empty, negative and excessive commercial values', () => {
    expect(() => calculateCommercialLines([])).toThrowError(ProCommercialError)
    expect(() => calculateCommercialLines([
      { description: '', quantity: 1, unitPrice: 10, taxRate: 20 },
    ])).toThrowError(/description/)
    expect(() => calculateCommercialLines([
      { description: 'Bad quantity', quantity: 0, unitPrice: 10, taxRate: 20 },
    ])).toThrowError(/quantity/)
    expect(() => calculateCommercialLines([
      { description: 'Bad price', quantity: 1, unitPrice: -1, taxRate: 20 },
    ])).toThrowError(/price/)
    expect(() => calculateCommercialLines([
      { description: 'Bad tax', quantity: 1, unitPrice: 10, taxRate: 101 },
    ])).toThrowError(/tax rate/)
  })

  it('enforces quote and invoice lifecycle transitions', () => {
    expect(() => assertCommercialTransition('quote', 'draft', 'sent')).not.toThrow()
    expect(() => assertCommercialTransition('quote', 'sent', 'accepted')).not.toThrow()
    expect(() => assertCommercialTransition('invoice', 'sent', 'overdue')).not.toThrow()
    expect(() => assertCommercialTransition('invoice', 'overdue', 'paid')).not.toThrow()
    expect(() => assertCommercialTransition('quote', 'draft', 'paid')).toThrowError(/not allowed/)
    expect(() => assertCommercialTransition('invoice', 'paid', 'draft')).toThrowError(/not allowed/)
  })

  it('serializes and restores versioned commercial documents', () => {
    const document: ProCommercialDocument = {
      version: 'pro-commercial-v1',
      type: 'quote',
      number: 'DEV-20260726-ABC123',
      status: 'draft',
      currency: 'EUR',
      proClientId: 'client-1',
      proInterventionId: null,
      issueDate: '2026-07-26T12:00:00.000Z',
      dueDate: null,
      validUntil: '2026-08-25T12:00:00.000Z',
      subtotal: 100,
      taxTotal: 20,
      total: 120,
      notes: null,
      sentAt: null,
      acceptedAt: null,
      paidAt: null,
      reminderCount: 0,
      lastReminderAt: null,
      lines: [{
        catalogItemId: null,
        description: 'Entretien',
        quantity: 1,
        unit: 'visit',
        unitPrice: 100,
        taxRate: 20,
        lineSubtotal: 100,
        lineTax: 20,
        lineTotal: 120,
        sortOrder: 0,
      }],
    }
    expect(parseCommercialDocument(serializeCommercialDocument(document))).toEqual(document)
    expect(() => parseCommercialDocument('{"version":"unknown"}')).toThrowError(ProCommercialError)
  })

  it('creates recognizable quote and invoice numbers', () => {
    const now = new Date('2026-07-26T12:00:00.000Z')
    expect(createCommercialNumber('quote', now)).toMatch(/^DEV-20260726-[A-F0-9]{6}$/)
    expect(createCommercialNumber('invoice', now)).toMatch(/^FAC-20260726-[A-F0-9]{6}$/)
  })

  it('ships catalog, document, conversion and reminder APIs with Pro access control', () => {
    const catalog = readFileSync(join(root, 'src/app/api/pro/commercial/catalog/route.ts'), 'utf8')
    const documents = readFileSync(join(root, 'src/app/api/pro/commercial/documents/route.ts'), 'utf8')
    const detail = readFileSync(join(root, 'src/app/api/pro/commercial/documents/[id]/route.ts'), 'utf8')
    const convert = readFileSync(join(root, 'src/app/api/pro/commercial/documents/[id]/convert/route.ts'), 'utf8')
    const remind = readFileSync(join(root, 'src/app/api/pro/commercial/documents/[id]/remind/route.ts'), 'utf8')

    for (const route of [catalog, documents, detail, convert, remind]) {
      expect(route).toContain('getProAccess')
      expect(route).toContain('access.canManage')
    }
    expect(catalog).toContain('db.productInventory')
    expect(catalog).toContain("version: 'pro-catalog-v1'")
    expect(documents).toContain('calculateCommercialLines')
    expect(documents).toContain('db.proClientActivity.create')
    expect(detail).toContain('assertCommercialTransition')
    expect(convert).toContain('sourceQuoteActivityId')
    expect(convert).toContain('Quote already converted')
    expect(remind).toContain("deliveryStatus: 'recorded'")
    expect(remind).toContain("type: 'payment_reminder'")
  })
})
