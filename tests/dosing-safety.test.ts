import { describe, expect, it } from 'vitest'
import { calculateDosage } from '@/lib/pool/dosing-engine'
import { generateActionPlan } from '@/lib/pool/action-plan'
import { assessSwimSafety, shouldCallProfessional } from '@/lib/pool/safety-rules'

describe('Deterministic dosing safety', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid pool volume (%s)',
    volume => {
      expect(calculateDosage({
        param: 'ph_minus', current: 8, target: 7.2, volume, volumeUnit: 'm3',
      })).toBeNull()
    }
  )

  it('rejects non-finite measurements', () => {
    expect(calculateDosage({
      param: 'chlorine_shock', current: Number.NaN, target: 2, volume: 50, volumeUnit: 'm3',
    })).toBeNull()
  })

  it('limits a pH correction to 0.3 per treatment', () => {
    const dose = calculateDosage({
      param: 'ph_minus', current: 8.2, target: 7.2, volume: 50, volumeUnit: 'm3',
    })
    expect(dose?.quantity).toBeCloseTo(1125)
    expect(dose?.warningKeys).toContain('dosePhMinusWarningGap')
    expect(dose?.retestInHours).toBe(3)
  })

  it('converts US gallons before calculating a dose', () => {
    const dose = calculateDosage({
      param: 'ph_plus', current: 7.1, target: 7.2, volume: 10_000, volumeUnit: 'gal',
    })
    expect(dose?.quantity).toBeCloseTo(56.78115, 4)
  })

  it('never calculates stabilizer above the 50 mg/L safety ceiling', () => {
    const dose = calculateDosage({
      param: 'stabilizer_plus', current: 20, target: 80, volume: 50, volumeUnit: 'm3',
    })
    expect(dose?.quantity).toBe(1500)
    expect(dose?.warningKeys).toContain('doseStabilizerPlusWarningMax')
    expect(calculateDosage({
      param: 'stabilizer_plus', current: 55, target: 80, volume: 50, volumeUnit: 'm3',
    })).toBeNull()
  })

  it('orders TAC before pH and chlorine treatment', () => {
    const plan = generateActionPlan(
      { ph: 8, freeChlorine: 0.2, alkalinity: 50 },
      { volume: 50, unit: 'm3', treatmentType: 'chlorine', saltSystem: false }
    )
    expect(plan.immediateActions.slice(0, 3).map(action => action.actionKey)).toEqual([
      'iaAdjustTac', 'iaLowerPh', 'iaChlorineShock',
    ])
    expect(plan.swimSafety).toBe('forbidden')
  })
})

describe('Bathing and escalation safety', () => {
  it('forbids bathing for critical pH or excessive combined chlorine', () => {
    expect(assessSwimSafety({ ph: 6.4, freeChlorine: 2 }).status).toBe('forbidden')
    expect(assessSwimSafety({ ph: 7.2, freeChlorine: 2, combinedChlorine: 0.5 }).status).toBe('forbidden')
  })

  it('keeps a critical pH forbidden when chlorine is not measured', () => {
    expect(assessSwimSafety({ ph: 8.4 }).status).toBe('forbidden')
  })

  it('recommends a professional for extreme readings', () => {
    expect(shouldCallProfessional({ ph: 6.4 })?.messageKey).toBe('proPhExtreme')
    expect(shouldCallProfessional({ ph: 7.2, freeChlorine: 11 })?.messageKey).toBe('proOverChlorination')
    expect(shouldCallProfessional({ ph: 7.2, combinedChlorine: 1.1 })?.messageKey).toBe('proHighChloramines')
  })
})
