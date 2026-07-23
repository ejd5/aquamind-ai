// P0-C contract: diagnostic UI must never own chemical coefficients.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  calculateDiagnosticProtocolDose,
  calculatePhCorrection,
  dosageInMillilitres,
  formatDosageQuantity,
} from '@/lib/pool/diagnostic-dosage'

describe('P0-C diagnostic dosing single source', () => {
  it('uses the central engine for capped pH corrections', () => {
    const phMinus = calculatePhCorrection(7.8, 40)
    const phPlus = calculatePhCorrection(6.8, 40)

    expect(phMinus).not.toBeNull()
    expect(phMinus?.unit).toBe('ml')
    expect(phMinus?.quantity).toBeCloseTo(900, 6)

    expect(phPlus).not.toBeNull()
    expect(phPlus?.unit).toBe('g')
    expect(phPlus?.quantity).toBeCloseTo(120, 6)

    expect(calculatePhCorrection(7.2, 40)).toBeNull()
  })

  it('derives diagnostic protocol quantities from the central engine', () => {
    const shock = calculateDiagnosticProtocolDose('green_water_chlorine_shock', 40)
    const antiAlgae = calculateDiagnosticProtocolDose('anti_algae_curative', 40)
    const flocculant = calculateDiagnosticProtocolDose('flocculant_clarification', 40)

    expect(shock?.unit).toBe('g')
    expect(shock?.quantity).toBeCloseTo(400, 6)
    expect(antiAlgae?.unit).toBe('L')
    expect(antiAlgae?.quantity).toBeCloseTo(0.8, 6)
    expect(flocculant?.unit).toBe('L')
    expect(flocculant?.quantity).toBeCloseTo(0.2, 6)
    expect(dosageInMillilitres(antiAlgae)).toBeCloseTo(800, 6)
  })

  it('formats the exact central-engine unit', () => {
    const phMinus = calculatePhCorrection(7.5, 40)
    const antiAlgae = calculateDiagnosticProtocolDose('anti_algae_curative', 40)

    expect(phMinus && formatDosageQuantity(phMinus)).toBe('300 mL')
    expect(antiAlgae && formatDosageQuantity(antiAlgae)).toBe('0.80 L')
  })

  it('keeps all dosage coefficients out of the UI component', () => {
    const component = readFileSync(
      join(process.cwd(), 'src/components/aquamind/diagnostic-action-plan.tsx'),
      'utf8',
    )

    expect(component).toContain("from '@/lib/pool/diagnostic-dosage'")
    expect(component).not.toContain('phMinusGramsPer01')
    expect(component).not.toContain('phPlusGramsPer01')
    expect(component).not.toContain('chlorineShockGrams')
    expect(component).not.toContain('antiAlgaeMl')
    expect(component).not.toContain('flocculantMl')
    expect(component).not.toMatch(/poolVolume\s*\*\s*(10|15|20|5)/)
  })
})
