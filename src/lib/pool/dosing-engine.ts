// Moteur de dosage DÉTERMINISTE (non-IA) — l'IP critique d'AQWELIA
// Calcule la quantité de produit à ajouter pour passer d'une valeur courante à une cible.
// Approximations prudentes basées sur les standards piscine.
// Toujours rappeler de respecter la notice produit.

import { toM3, VolumeUnit } from './units'

export interface DosageInput {
  param: 'ph_minus' | 'ph_plus' | 'chlorine_shock' | 'chlorine_slow' | 'alkalinity_plus' | 'calcium_plus' | 'stabilizer_plus' | 'salt_plus' | 'anti_algae' | 'flocculant'
  current: number
  target: number
  volume: number
  volumeUnit: VolumeUnit
}

export interface DosageResult {
  product: string
  quantity: number
  unit: string
  method: string
  filtrationHours: number
  retestInHours: number
  waitBeforeSwimHours: number
  warnings: string[]
  estimatedCost?: string
}

const COEFFS = {
  ph_minus_per_01_per_m3: 7.5,
  ph_plus_per_01_per_m3: 1.5,
  chlorine_shock_per_mg_per_m3: 1.5,
  chlorine_slow_per_m3: 0.033,
  alkalinity_plus_per_10_per_m3: 17,
  calcium_plus_per_10_per_m3: 18,
  stabilizer_plus_per_10_per_m3: 10,
  salt_plus_per_gl_per_m3: 1000,
  anti_algae_curative_per_m3: 0.02,
  flocculant_per_m3: 0.005,
}

const MAX_SAFE_DELTA_PH = 0.3

export function calculateDosage(input: DosageInput): DosageResult | null {
  const m3 = toM3(input.volume, input.volumeUnit)
  const delta = input.target - input.current
  const warnings: string[] = []

  switch (input.param) {
    case 'ph_minus': {
      if (delta >= 0) return null
      const drop = -delta
      const effectiveDrop = Math.min(drop, MAX_SAFE_DELTA_PH)
      if (effectiveDrop < drop) warnings.push(`Écart trop grand : traitement limité à -${MAX_SAFE_DELTA_PH} pH. Refaire un test après filtration.`)
      const qty = effectiveDrop / 0.1 * COEFFS.ph_minus_per_01_per_m3 * m3
      return {
        product: 'pH- (acide)',
        quantity: qty,
        unit: 'ml',
        method: 'Diluer dans un seau d\'eau de la piscine, répartir devant les refoulements, filtration en marche.',
        filtrationHours: 2,
        retestInHours: 3,
        waitBeforeSwimHours: 2,
        warnings: [...warnings, 'Ne jamais verser pH- pur directement. Ne jamais mélanger avec du chlore.'],
      }
    }

    case 'ph_plus': {
      if (delta <= 0) return null
      const rise = delta
      const effectiveRise = Math.min(rise, MAX_SAFE_DELTA_PH)
      if (effectiveRise < rise) warnings.push(`Écart trop grand : traitement limité à +${MAX_SAFE_DELTA_PH} pH.`)
      const qty = effectiveRise / 0.1 * COEFFS.ph_plus_per_01_per_m3 * m3
      return {
        product: 'pH+ (carbonate de sodium)',
        quantity: qty,
        unit: 'g',
        method: 'Diluer dans un seau, répartir devant les refoulements, filtration en marche.',
        filtrationHours: 2,
        retestInHours: 3,
        waitBeforeSwimHours: 2,
        warnings,
      }
    }

    case 'chlorine_shock': {
      if (delta <= 0) return null
      const rise = delta
      const qty = rise * COEFFS.chlorine_shock_per_mg_per_m3 * m3
      return {
        product: 'Chlore choc (65% actif)',
        quantity: qty,
        unit: 'g',
        method: 'Dissoudre dans un seau d\'eau, verser devant les refoulements. Préférer le soir, sans baigneurs.',
        filtrationHours: 4,
        retestInHours: 12,
        waitBeforeSwimHours: 8,
        warnings: [
          'ATTENTION : chloration choc. Aucune baignade pendant au moins 8h.',
          'Ne jamais mélanger chlore choc et pH-.',
          'Vérifier le pH AVANT le choc (idéal 7.2-7.4).',
        ],
      }
    }

    case 'chlorine_slow': {
      const qty = COEFFS.chlorine_slow_per_m3 * m3
      return {
        product: 'Chlore lent (pastilles 20g)',
        quantity: qty,
        unit: 'tablet',
        method: 'Placer dans le skimmer ou diffuseur. Renouveler selon consommation.',
        filtrationHours: 0,
        retestInHours: 48,
        waitBeforeSwimHours: 1,
        warnings: ['Ne pas placer dans le skimmer si traitement anti-algues simultané.'],
      }
    }

    case 'alkalinity_plus': {
      if (delta <= 0) return null
      const qty = (delta / 10) * COEFFS.alkalinity_plus_per_10_per_m3 * m3
      return {
        product: 'TAC+ (bicarbonate de sodium)',
        quantity: qty,
        unit: 'g',
        method: 'Diluer, répartir, filtration en marche. Attendre avant de retoucher le pH.',
        filtrationHours: 3,
        retestInHours: 24,
        waitBeforeSwimHours: 2,
        warnings: ['Ajuster le TAC AVANT le pH.'],
      }
    }

    case 'calcium_plus': {
      if (delta <= 0) return null
      const qty = (delta / 10) * COEFFS.calcium_plus_per_10_per_m3 * m3
      return {
        product: 'Calcium+ (chlorure de calcium)',
        quantity: qty,
        unit: 'g',
        method: 'Diluer dans un seau, verser lentement devant les refoulements.',
        filtrationHours: 3,
        retestInHours: 24,
        waitBeforeSwimHours: 2,
        warnings: [],
      }
    }

    case 'stabilizer_plus': {
      if (delta <= 0) return null
      const qty = (delta / 10) * COEFFS.stabilizer_plus_per_10_per_m3 * m3
      return {
        product: 'Stabilisant (acide cyanurique)',
        quantity: qty,
        unit: 'g',
        method: 'Verser lentement dans le skimmer, filtration en marche. Dissolution lente (24-48h).',
        filtrationHours: 6,
        retestInHours: 48,
        waitBeforeSwimHours: 1,
        warnings: ['Ne pas dépasser 50 mg/L. Trop de stabilisant bloque le chlore.'],
      }
    }

    case 'salt_plus': {
      if (delta <= 0) return null
      const qty = delta * COEFFS.salt_plus_per_gl_per_m3 * m3
      return {
        product: 'Sel piscine (NaCl)',
        quantity: qty / 1000,
        unit: 'kg',
        method: 'Verser le sel directement dans la piscine, filtration en marche jusqu\'à dissolution complète.',
        filtrationHours: 24,
        retestInHours: 24,
        waitBeforeSwimHours: 1,
        warnings: ['Vérifier le sel requis par votre électrolyseur avant ajout.'],
      }
    }

    case 'anti_algae': {
      const qty = COEFFS.anti_algae_curative_per_m3 * m3
      return {
        product: 'Anti-algues (curatif)',
        quantity: qty,
        unit: 'L',
        method: 'Verser devant les refoulements, filtration en marche. Brosser les parois.',
        filtrationHours: 24,
        retestInHours: 24,
        waitBeforeSwimHours: 4,
        warnings: ['Le pH doit être équilibré AVANT. Efficace surtout en prévention.'],
      }
    }

    case 'flocculant': {
      const qty = COEFFS.flocculant_per_m3 * m3
      return {
        product: 'Floculant',
        quantity: qty,
        unit: 'L',
        method: 'Verser devant les refoulements, filtration 1h puis coupure 12h pour décantation, puis aspiration.',
        filtrationHours: 1,
        retestInHours: 24,
        waitBeforeSwimHours: 2,
        warnings: ['Compatible avec filtre à sable uniquement. Ne pas utiliser avec filtre cartouche.'],
      }
    }

    default:
      return null
  }
}

const COSTS: Record<string, { per: number; unit: string }> = {
  ph_minus: { per: 0.005, unit: 'ml' },
  ph_plus: { per: 0.012, unit: 'g' },
  chlorine_shock: { per: 0.02, unit: 'g' },
  alkalinity_plus: { per: 0.01, unit: 'g' },
  calcium_plus: { per: 0.015, unit: 'g' },
  stabilizer_plus: { per: 0.015, unit: 'g' },
  salt_plus: { per: 0.6, unit: 'kg' },
  anti_algae: { per: 8, unit: 'L' },
  flocculant: { per: 6, unit: 'L' },
}

export function estimateCost(param: string, quantity: number): string {
  const c = COSTS[param]
  if (!c) return '—'
  const cost = quantity * c.per
  return `≈ ${cost.toFixed(2)} €`
}
