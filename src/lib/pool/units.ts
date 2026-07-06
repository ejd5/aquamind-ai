// Conversions d'unités

export type VolumeUnit = 'm3' | 'gal'

export function toM3(volume: number, unit: VolumeUnit): number {
  return unit === 'gal' ? volume * 0.00378541 : volume
}

export function formatVolume(volume: number, unit: VolumeUnit): string {
  if (unit === 'gal') return `${Math.round(volume)} gal`
  return `${volume} m³`
}

export function formatQuantity(amount: number, unit: string): string {
  if (unit === 'L') return `${amount.toFixed(2)} L`
  if (unit === 'ml') return `${Math.round(amount)} ml`
  if (unit === 'g') return `${Math.round(amount)} g`
  if (unit === 'kg') return `${amount.toFixed(2)} kg`
  if (unit === 'tablet') return `${Math.ceil(amount)} pastille(s)`
  return `${amount.toFixed(2)} ${unit}`
}

export function roundTo(value: number, decimals = 1): number {
  const f = Math.pow(10, decimals)
  return Math.round(value * f) / f
}
