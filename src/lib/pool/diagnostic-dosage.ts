import { calculateDosage, type DosageResult } from './dosing-engine'

const PH_IDEAL_LOW = 7.0
const PH_IDEAL_HIGH = 7.4

/**
 * A green-water shock protocol currently targets a +6.67 mg/L free-chlorine
 * increase. With the central 65%-active chlorine coefficient, this equals the
 * existing conservative protocol dose of approximately 10 g/m³.
 *
 * This target is deliberately centralized here so UI components never carry
 * their own chemical coefficients.
 */
const GREEN_WATER_SHOCK_TARGET_MG_L = 20 / 3

export type DiagnosticProtocol =
  | 'green_water_chlorine_shock'
  | 'anti_algae_curative'
  | 'flocculant_clarification'

export function calculatePhCorrection(
  ph: number,
  volumeM3: number,
): DosageResult | null {
  if (!Number.isFinite(ph) || !Number.isFinite(volumeM3) || volumeM3 <= 0) return null

  if (ph > PH_IDEAL_HIGH) {
    return calculateDosage({
      param: 'ph_minus',
      current: ph,
      target: PH_IDEAL_HIGH,
      volume: volumeM3,
      volumeUnit: 'm3',
    })
  }

  if (ph < PH_IDEAL_LOW) {
    return calculateDosage({
      param: 'ph_plus',
      current: ph,
      target: PH_IDEAL_LOW,
      volume: volumeM3,
      volumeUnit: 'm3',
    })
  }

  return null
}

export function calculateDiagnosticProtocolDose(
  protocol: DiagnosticProtocol,
  volumeM3: number,
): DosageResult | null {
  if (!Number.isFinite(volumeM3) || volumeM3 <= 0) return null

  switch (protocol) {
    case 'green_water_chlorine_shock':
      return calculateDosage({
        param: 'chlorine_shock',
        current: 0,
        target: GREEN_WATER_SHOCK_TARGET_MG_L,
        volume: volumeM3,
        volumeUnit: 'm3',
      })
    case 'anti_algae_curative':
      return calculateDosage({
        param: 'anti_algae',
        current: 0,
        target: 0,
        volume: volumeM3,
        volumeUnit: 'm3',
      })
    case 'flocculant_clarification':
      return calculateDosage({
        param: 'flocculant',
        current: 0,
        target: 0,
        volume: volumeM3,
        volumeUnit: 'm3',
      })
  }
}

export function dosageInMillilitres(result: DosageResult | null): number {
  if (!result) return 0
  if (result.unit === 'L') return result.quantity * 1000
  if (result.unit.toLowerCase() === 'ml') return result.quantity
  return 0
}

export function formatDosageQuantity(result: DosageResult): string {
  const unit = result.unit.toLowerCase()
  if (unit === 'ml') {
    return result.quantity >= 1000
      ? `${(result.quantity / 1000).toFixed(2)} L`
      : `${Math.round(result.quantity)} mL`
  }
  if (unit === 'g') {
    return result.quantity >= 1000
      ? `${(result.quantity / 1000).toFixed(2)} kg`
      : `${Math.round(result.quantity)} g`
  }
  if (unit === 'l') return `${result.quantity.toFixed(2)} L`
  if (unit === 'kg') return `${result.quantity.toFixed(2)} kg`
  if (unit === 'tablet') return `${Math.ceil(result.quantity)} tablet(s)`
  return `${Math.round(result.quantity * 100) / 100} ${result.unit}`
}
