from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'src' / 'components' / 'aquamind' / 'diagnostic-action-plan.tsx'
text = path.read_text(encoding='utf-8')

old_import = "import { useTranslations } from 'next-intl'\n"
new_import = """import { useTranslations } from 'next-intl'
import {
  calculateDiagnosticProtocolDose,
  calculatePhCorrection,
  dosageInMillilitres,
  formatDosageQuantity,
} from '@/lib/pool/diagnostic-dosage'
"""
if old_import not in text:
    raise SystemExit('next-intl import not found')
text = text.replace(old_import, new_import, 1)

start_marker = "// Dosage helpers — user-friendly approximations for the action plan."
end_marker = "// Step generation"
start = text.index(start_marker)
# Include the separator comment before the old helper heading.
start = text.rfind('// ─', 0, start)
end = text.index(end_marker, start)
end = text.rfind('// ─', start, end)

replacement = """// ───────────────────────────────────────────────────────────────────────────
// Dosage display — all quantities come from the central deterministic engine.
// ───────────────────────────────────────────────────────────────────────────

function computePhRecommendation(
  ph: number,
  poolVolume: number,
  t: TFunc,
): {
  product: string
  quantity: number
  unit: string
  message: string
  warning?: string
} | null {
  const IDEAL_LOW = 7.0
  const IDEAL_HIGH = 7.4

  if (ph >= IDEAL_LOW && ph <= IDEAL_HIGH) {
    return {
      product: '—',
      quantity: 0,
      unit: 'g',
      message: t('phIdeal'),
    }
  }

  const dosage = calculatePhCorrection(ph, poolVolume)
  if (!dosage) return null
  const qty = formatDosageQuantity(dosage)

  if (ph > IDEAL_HIGH) {
    return {
      product: t('productPhMinus'),
      quantity: dosage.quantity,
      unit: dosage.unit,
      message: t('phHigh', {
        ph: ph.toFixed(2),
        qty,
        delta: Math.min(ph - IDEAL_HIGH, 0.3).toFixed(1),
      }),
      warning: t('phHighWarning'),
    }
  }

  return {
    product: t('productPhPlus'),
    quantity: dosage.quantity,
    unit: dosage.unit,
    message: t('phLow', {
      ph: ph.toFixed(2),
      qty,
      delta: Math.min(IDEAL_LOW - ph, 0.3).toFixed(1),
    }),
    warning: t('phLowWarning'),
  }
}

"""
text = text[:start] + replacement + text[end:]

# Add centrally calculated protocol quantities once per generated plan.
needle = """  const tacField: InputField = {
    name: 'alkalinity',
    label: t('fieldTacLabel'),
    unit: 'mg/L',
    placeholder: '100',
    step: '1',
    min: 0,
    max: 300,
  }

"""
insert = needle + """  const shockDose = calculateDiagnosticProtocolDose(
    'green_water_chlorine_shock',
    poolVolume,
  )
  const shockGrams = shockDose?.unit === 'g' ? Math.round(shockDose.quantity) : 0
  const antiAlgaeDose = calculateDiagnosticProtocolDose('anti_algae_curative', poolVolume)
  const antiAlgaeMillilitres = Math.round(dosageInMillilitres(antiAlgaeDose))
  const flocculantDose = calculateDiagnosticProtocolDose(
    'flocculant_clarification',
    poolVolume,
  )
  const flocculantMillilitres = Math.round(dosageInMillilitres(flocculantDose))

"""
if needle not in text:
    raise SystemExit('TAC field block not found')
text = text.replace(needle, insert, 1)

# Remove static pH quantities. A real measured pH drives the live central-engine preview.
text = text.replace(
    "          t('greenS1I5', { qty: phMinusGramsPer01(poolVolume), volume: poolVolume }),\n",
    '',
)
text = text.replace(
    "        dosageText: (v) =>\n          t('greenS1Dosage', { qty: phMinusGramsPer01(v), volume: v }),\n",
    '',
)
text = text.replace(
    "        dosageText: (v) =>\n          t('greenS2Dosage', { qty: Math.round(phMinusGramsPer01(v) / 2), volume: v }),\n",
    '',
)
text = text.replace(
    "          t('cloudyS2I3', { qty: phMinusGramsPer01(poolVolume), volume: poolVolume }),\n",
    '',
)
text = text.replace(
    "        dosageText: (v) => t('cloudyS2Dosage', { qty: phMinusGramsPer01(v), volume: v }),\n",
    '',
)

# Replace protocol quantities with values derived from the central engine.
text = text.replace('            qty: chlorineShockGrams(poolVolume),', '            qty: shockGrams,')
text = text.replace(
    '            tablets: (chlorineShockGrams(poolVolume) / 20).toFixed(0),',
    '            tablets: Math.max(1, Math.round(shockGrams / 20)),',
)
text = text.replace(
    "        dosageText: (v) => t('greenS3Dosage', { qty: chlorineShockGrams(v), volume: v }),",
    """        dosageText: (v) => {
          const dose = calculateDiagnosticProtocolDose('green_water_chlorine_shock', v)
          return dose ? formatDosageQuantity(dose) : '—'
        },""",
)
text = text.replace('            qty: antiAlgaeMl(poolVolume),', '            qty: antiAlgaeMillilitres,')
text = text.replace(
    '            liters: (antiAlgaeMl(poolVolume) / 1000).toFixed(2),',
    '            liters: (antiAlgaeMillilitres / 1000).toFixed(2),',
)
text = text.replace(
    "        dosageText: (v) => t('greenS4Dosage', { qty: antiAlgaeMl(v), volume: v }),",
    """        dosageText: (v) => {
          const dose = calculateDiagnosticProtocolDose('anti_algae_curative', v)
          return dose ? formatDosageQuantity(dose) : '—'
        },""",
)
text = text.replace(
    "          t('cloudyS3I3', { volume: poolVolume, qty: flocculantMl(poolVolume) }),",
    "          t('cloudyS3I3', { volume: poolVolume, qty: flocculantMillilitres }),",
)
text = text.replace(
    "        dosageText: (v) => t('cloudyS3Dosage', { qty: flocculantMl(v), volume: v }),",
    """        dosageText: (v) => {
          const dose = calculateDiagnosticProtocolDose('flocculant_clarification', v)
          return dose ? formatDosageQuantity(dose) : '—'
        },""",
)

for forbidden in (
    'phMinusGramsPer01',
    'phPlusGramsPer01',
    'chlorineShockGrams',
    'antiAlgaeMl',
    'flocculantMl',
    'function fmtQty',
):
    if forbidden in text:
        raise SystemExit(f'Local dosage helper still present: {forbidden}')

path.write_text(text, encoding='utf-8')
