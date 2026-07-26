import type { Locale } from '@/i18n/config'
import {
  resolveContextualOperatingTargets,
  type ContextualTargetContext,
} from './contextual-targets'

export const CONTEXTUAL_SWIM_SAFETY_METHOD_VERSION = 'cdc-swim-safety-v1' as const

export type ContextualSwimStatus = 'allowed' | 'avoid' | 'forbidden' | 'unknown'

export type ContextualSwimReasonCode =
  | 'ph_extreme_low'
  | 'ph_extreme_high'
  | 'ph_outside_operational_range'
  | 'disinfectant_not_measured'
  | 'free_chlorine_below_contextual_minimum'
  | 'free_chlorine_above_manufacturer_maximum'
  | 'bromine_below_minimum'
  | 'bromine_above_maximum'
  | 'combined_chlorine_high'
  | 'cya_not_recommended_for_spa'
  | 'unsupported_primary_disinfectant'

export type ContextualSwimLimitation =
  | 'manufacturer_chlorine_maximum_required'
  | 'unsupported_primary_disinfectant'

export interface ContextualSwimTestInput {
  ph: number
  freeChlorine?: number | null
  combinedChlorine?: number | null
  bromine?: number | null
  cyanuricAcid?: number | null
}

export interface ContextualSwimContext extends ContextualTargetContext {
  manufacturerChlorineMax?: number | null
}

export interface ContextualSwimReason {
  code: ContextualSwimReasonCode
  message: string
  params: Record<string, string | number>
}

export interface ContextualSwimAssessment {
  status: ContextualSwimStatus
  reasons: ContextualSwimReason[]
  limitations: ContextualSwimLimitation[]
  methodVersion: typeof CONTEXTUAL_SWIM_SAFETY_METHOD_VERSION
  sourceCodes: Array<'CDC_HOME_POOL_2024' | 'CDC_HEALTHY_SWIMMING_2025'>
}

type CopyTable = Record<ContextualSwimReasonCode, string>

const COPY: Record<Locale, CopyTable> = {
  fr: {
    ph_extreme_low: 'pH {ph} extrêmement acide : baignade interdite.',
    ph_extreme_high: 'pH {ph} extrêmement basique : baignade interdite.',
    ph_outside_operational_range: 'pH {ph} hors de la plage opérationnelle 7,0–7,8.',
    disinfectant_not_measured: '{parameter} non mesuré : sécurité de baignade impossible à confirmer.',
    free_chlorine_below_contextual_minimum: 'Chlore libre {value} mg/L sous le minimum contextuel de {minimum} mg/L.',
    free_chlorine_above_manufacturer_maximum: 'Chlore libre {value} mg/L au-dessus de la limite fabricant de {maximum} mg/L.',
    bromine_below_minimum: 'Brome {value} mg/L sous le minimum de {minimum} mg/L.',
    bromine_above_maximum: 'Brome {value} mg/L au-dessus du maximum de {maximum} mg/L.',
    combined_chlorine_high: 'Chlore combiné {value} mg/L : chloramines irritantes.',
    cya_not_recommended_for_spa: 'Le stabilisant CYA n’est pas recommandé dans un spa.',
    unsupported_primary_disinfectant: 'Le désinfectant principal déclaré ne permet pas une conclusion automatique.',
  },
  en: {
    ph_extreme_low: 'pH {ph} is extremely acidic: swimming is forbidden.',
    ph_extreme_high: 'pH {ph} is extremely alkaline: swimming is forbidden.',
    ph_outside_operational_range: 'pH {ph} is outside the 7.0–7.8 operating range.',
    disinfectant_not_measured: '{parameter} was not measured: swimming safety cannot be confirmed.',
    free_chlorine_below_contextual_minimum: 'Free chlorine {value} mg/L is below the contextual minimum of {minimum} mg/L.',
    free_chlorine_above_manufacturer_maximum: 'Free chlorine {value} mg/L is above the manufacturer limit of {maximum} mg/L.',
    bromine_below_minimum: 'Bromine {value} mg/L is below the minimum of {minimum} mg/L.',
    bromine_above_maximum: 'Bromine {value} mg/L is above the maximum of {maximum} mg/L.',
    combined_chlorine_high: 'Combined chlorine {value} mg/L: irritating chloramines are present.',
    cya_not_recommended_for_spa: 'Cyanuric acid is not recommended in a hot tub or spa.',
    unsupported_primary_disinfectant: 'The declared primary disinfectant does not support an automatic conclusion.',
  },
  es: {
    ph_extreme_low: 'pH {ph} extremadamente ácido: baño prohibido.',
    ph_extreme_high: 'pH {ph} extremadamente básico: baño prohibido.',
    ph_outside_operational_range: 'pH {ph} fuera del rango operativo 7,0–7,8.',
    disinfectant_not_measured: '{parameter} no medido: no se puede confirmar la seguridad del baño.',
    free_chlorine_below_contextual_minimum: 'Cloro libre {value} mg/L por debajo del mínimo contextual de {minimum} mg/L.',
    free_chlorine_above_manufacturer_maximum: 'Cloro libre {value} mg/L por encima del límite del fabricante de {maximum} mg/L.',
    bromine_below_minimum: 'Bromo {value} mg/L por debajo del mínimo de {minimum} mg/L.',
    bromine_above_maximum: 'Bromo {value} mg/L por encima del máximo de {maximum} mg/L.',
    combined_chlorine_high: 'Cloro combinado {value} mg/L: cloraminas irritantes.',
    cya_not_recommended_for_spa: 'No se recomienda ácido cianúrico en un spa.',
    unsupported_primary_disinfectant: 'El desinfectante principal declarado no permite una conclusión automática.',
  },
  de: {
    ph_extreme_low: 'pH {ph} ist extrem sauer: Baden verboten.',
    ph_extreme_high: 'pH {ph} ist extrem alkalisch: Baden verboten.',
    ph_outside_operational_range: 'pH {ph} liegt außerhalb des Betriebsbereichs 7,0–7,8.',
    disinfectant_not_measured: '{parameter} wurde nicht gemessen: Badesicherheit kann nicht bestätigt werden.',
    free_chlorine_below_contextual_minimum: 'Freies Chlor {value} mg/L liegt unter dem kontextbezogenen Minimum von {minimum} mg/L.',
    free_chlorine_above_manufacturer_maximum: 'Freies Chlor {value} mg/L liegt über der Herstellergrenze von {maximum} mg/L.',
    bromine_below_minimum: 'Brom {value} mg/L liegt unter dem Minimum von {minimum} mg/L.',
    bromine_above_maximum: 'Brom {value} mg/L liegt über dem Maximum von {maximum} mg/L.',
    combined_chlorine_high: 'Gebundenes Chlor {value} mg/L: reizende Chloramine.',
    cya_not_recommended_for_spa: 'Cyanursäure wird in einem Whirlpool oder Spa nicht empfohlen.',
    unsupported_primary_disinfectant: 'Das angegebene Hauptdesinfektionsmittel erlaubt keine automatische Bewertung.',
  },
  it: {
    ph_extreme_low: 'pH {ph} estremamente acido: balneazione vietata.',
    ph_extreme_high: 'pH {ph} estremamente basico: balneazione vietata.',
    ph_outside_operational_range: 'pH {ph} fuori dall’intervallo operativo 7,0–7,8.',
    disinfectant_not_measured: '{parameter} non misurato: impossibile confermare la sicurezza della balneazione.',
    free_chlorine_below_contextual_minimum: 'Cloro libero {value} mg/L sotto il minimo contestuale di {minimum} mg/L.',
    free_chlorine_above_manufacturer_maximum: 'Cloro libero {value} mg/L sopra il limite del produttore di {maximum} mg/L.',
    bromine_below_minimum: 'Bromo {value} mg/L sotto il minimo di {minimum} mg/L.',
    bromine_above_maximum: 'Bromo {value} mg/L sopra il massimo di {maximum} mg/L.',
    combined_chlorine_high: 'Cloro combinato {value} mg/L: clorammine irritanti.',
    cya_not_recommended_for_spa: 'L’acido cianurico non è raccomandato in una spa.',
    unsupported_primary_disinfectant: 'Il disinfettante principale dichiarato non consente una conclusione automatica.',
  },
  pt: {
    ph_extreme_low: 'pH {ph} extremamente ácido: banho proibido.',
    ph_extreme_high: 'pH {ph} extremamente básico: banho proibido.',
    ph_outside_operational_range: 'pH {ph} fora do intervalo operacional 7,0–7,8.',
    disinfectant_not_measured: '{parameter} não medido: não é possível confirmar a segurança do banho.',
    free_chlorine_below_contextual_minimum: 'Cloro livre {value} mg/L abaixo do mínimo contextual de {minimum} mg/L.',
    free_chlorine_above_manufacturer_maximum: 'Cloro livre {value} mg/L acima do limite do fabricante de {maximum} mg/L.',
    bromine_below_minimum: 'Bromo {value} mg/L abaixo do mínimo de {minimum} mg/L.',
    bromine_above_maximum: 'Bromo {value} mg/L acima do máximo de {maximum} mg/L.',
    combined_chlorine_high: 'Cloro combinado {value} mg/L: cloraminas irritantes.',
    cya_not_recommended_for_spa: 'O ácido cianúrico não é recomendado numa spa.',
    unsupported_primary_disinfectant: 'O desinfetante principal declarado não permite uma conclusão automática.',
  },
  nl: {
    ph_extreme_low: 'pH {ph} is extreem zuur: zwemmen verboden.',
    ph_extreme_high: 'pH {ph} is extreem basisch: zwemmen verboden.',
    ph_outside_operational_range: 'pH {ph} ligt buiten het werkbereik 7,0–7,8.',
    disinfectant_not_measured: '{parameter} is niet gemeten: zwemveiligheid kan niet worden bevestigd.',
    free_chlorine_below_contextual_minimum: 'Vrij chloor {value} mg/L ligt onder het contextuele minimum van {minimum} mg/L.',
    free_chlorine_above_manufacturer_maximum: 'Vrij chloor {value} mg/L ligt boven de fabrikantlimiet van {maximum} mg/L.',
    bromine_below_minimum: 'Broom {value} mg/L ligt onder het minimum van {minimum} mg/L.',
    bromine_above_maximum: 'Broom {value} mg/L ligt boven het maximum van {maximum} mg/L.',
    combined_chlorine_high: 'Gebonden chloor {value} mg/L: irriterende chloraminen.',
    cya_not_recommended_for_spa: 'Cyanuurzuur wordt niet aanbevolen in een spa.',
    unsupported_primary_disinfectant: 'Het opgegeven primaire desinfectiemiddel ondersteunt geen automatische conclusie.',
  },
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`))
}

function localizedReason(
  locale: Locale,
  code: ContextualSwimReasonCode,
  params: Record<string, string | number>,
): ContextualSwimReason {
  return {
    code,
    message: interpolate(COPY[locale]?.[code] ?? COPY.fr[code], params),
    params,
  }
}

function raiseStatus(
  current: ContextualSwimStatus,
  next: ContextualSwimStatus,
): ContextualSwimStatus {
  const rank: Record<ContextualSwimStatus, number> = {
    allowed: 0,
    unknown: 1,
    avoid: 2,
    forbidden: 3,
  }
  return rank[next] > rank[current] ? next : current
}

export function assessContextualSwimSafety(
  test: ContextualSwimTestInput,
  context: ContextualSwimContext,
  locale: Locale = 'fr',
): ContextualSwimAssessment {
  const targets = resolveContextualOperatingTargets(context)
  const reasons: ContextualSwimReason[] = []
  const limitations = new Set<ContextualSwimLimitation>()
  let status: ContextualSwimStatus = 'allowed'

  const add = (
    next: ContextualSwimStatus,
    code: ContextualSwimReasonCode,
    params: Record<string, string | number>,
  ) => {
    status = raiseStatus(status, next)
    reasons.push(localizedReason(locale, code, params))
  }

  if (!Number.isFinite(test.ph) || test.ph < 6.5) {
    add('forbidden', 'ph_extreme_low', { ph: test.ph })
  } else if (test.ph > 8.2) {
    add('forbidden', 'ph_extreme_high', { ph: test.ph })
  } else if (test.ph < targets.pH.minimum || (targets.pH.maximum != null && test.ph > targets.pH.maximum)) {
    add('avoid', 'ph_outside_operational_range', { ph: test.ph })
  }

  const disinfectant = targets.disinfectant
  if (!disinfectant) {
    limitations.add('unsupported_primary_disinfectant')
    add('unknown', 'unsupported_primary_disinfectant', {})
  } else if (disinfectant.parameter === 'bromine') {
    if (test.bromine == null || !Number.isFinite(test.bromine)) {
      add('unknown', 'disinfectant_not_measured', { parameter: 'Bromine' })
    } else if (test.bromine < disinfectant.minimum) {
      add('forbidden', 'bromine_below_minimum', {
        value: test.bromine,
        minimum: disinfectant.minimum,
      })
    } else if (disinfectant.maximum != null && test.bromine > disinfectant.maximum) {
      add('forbidden', 'bromine_above_maximum', {
        value: test.bromine,
        maximum: disinfectant.maximum,
      })
    }
  } else {
    if (test.freeChlorine == null || !Number.isFinite(test.freeChlorine)) {
      add('unknown', 'disinfectant_not_measured', { parameter: 'Free chlorine' })
    } else if (test.freeChlorine < disinfectant.minimum) {
      add('forbidden', 'free_chlorine_below_contextual_minimum', {
        value: test.freeChlorine,
        minimum: disinfectant.minimum,
      })
    }

    const manufacturerMaximum = context.manufacturerChlorineMax
    if (Number.isFinite(manufacturerMaximum) && (manufacturerMaximum as number) > 0) {
      if (test.freeChlorine != null && test.freeChlorine > (manufacturerMaximum as number)) {
        add('forbidden', 'free_chlorine_above_manufacturer_maximum', {
          value: test.freeChlorine,
          maximum: manufacturerMaximum as number,
        })
      }
    } else {
      limitations.add('manufacturer_chlorine_maximum_required')
    }

    if (test.combinedChlorine != null && test.combinedChlorine > 0.4) {
      add('forbidden', 'combined_chlorine_high', { value: test.combinedChlorine })
    }
  }

  if (context.waterBodyType === 'spa' && (test.cyanuricAcid ?? 0) > 0) {
    add('avoid', 'cya_not_recommended_for_spa', {})
  }

  return {
    status,
    reasons,
    limitations: [...limitations],
    methodVersion: CONTEXTUAL_SWIM_SAFETY_METHOD_VERSION,
    sourceCodes: ['CDC_HOME_POOL_2024', 'CDC_HEALTHY_SWIMMING_2025'],
  }
}
