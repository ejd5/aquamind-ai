#!/usr/bin/env python3
"""Add dosing-engine keys to actionPlan namespace in FR and EN locale files."""
import json
from pathlib import Path

LOCALE_DIR = Path('/home/z/my-project/src/i18n/locales')

DOSE_FR = {
    'dosePhMinusProduct': 'pH- (acide)',
    'dosePhMinusMethod': "Diluer dans un seau d'eau de la piscine, repartir devant les refoulements, filtration en marche.",
    'dosePhMinusWarningGap': 'Ecart trop grand : traitement limite a -{delta} pH. Refaire un test apres filtration.',
    'dosePhPlusProduct': 'pH+ (carbonate de sodium)',
    'dosePhPlusMethod': 'Diluer dans un seau, repartir devant les refoulements, filtration en marche.',
    'dosePhPlusWarningGap': 'Ecart trop grand : traitement limite a +{delta} pH.',
    'doseChlorineShockProduct': 'Chlore choc (65% actif)',
    'doseChlorineShockMethod': "Dissoudre dans un seau d'eau, verser devant les refoulements. Preferer le soir, sans baigneurs.",
    'doseChlorineShockWarningBath': 'ATTENTION : chloration choc. Aucune baignade pendant au moins 8h.',
    'doseChlorineShockWarningMix': 'Ne jamais melanger chlore choc et pH-.',
    'doseChlorineShockWarningPh': 'Verifier le pH AVANT le choc (ideal 7.2-7.4).',
    'doseChlorineSlowProduct': 'Chlore lent (pastilles 20g)',
    'doseChlorineSlowMethod': 'Placer dans le skimmer ou diffuseur. Renouveler selon consommation.',
    'doseChlorineSlowWarningSkimmer': 'Ne pas placer dans le skimmer si traitement anti-algues simultane.',
    'doseAlkalinityPlusProduct': 'TAC+ (bicarbonate de sodium)',
    'doseAlkalinityPlusMethod': 'Diluer, repartir, filtration en marche. Attendre avant de retoucher le pH.',
    'doseAlkalinityPlusWarningOrder': 'Ajuster le TAC AVANT le pH.',
    'doseCalciumPlusProduct': 'Calcium+ (chlorure de calcium)',
    'doseCalciumPlusMethod': 'Diluer dans un seau, verser lentement devant les refoulements.',
    'doseStabilizerPlusProduct': 'Stabilisant (acide cyanurique)',
    'doseStabilizerPlusMethod': 'Verser lentement dans le skimmer, filtration en marche. Dissolution lente (24-48h).',
    'doseStabilizerPlusWarningMax': 'Ne pas depasser 50 mg/L. Trop de stabilisant bloque le chlore.',
    'doseSaltPlusProduct': 'Sel piscine (NaCl)',
    'doseSaltPlusMethod': "Verser le sel directement dans la piscine, filtration en marche jusqu'a dissolution complete.",
    'doseSaltPlusWarningCheck': "Verifier le sel requis par votre electrolyseur avant ajout.",
    'doseAntiAlgaeProduct': 'Anti-algues (curatif)',
    'doseAntiAlgaeMethod': 'Verser devant les refoulements, filtration en marche. Brosser les parois.',
    'doseAntiAlgaeWarningPh': 'Le pH doit etre equilibre AVANT. Efficace surtout en prevention.',
    'doseFlocculantProduct': 'Floculant',
    'doseFlocculantMethod': 'Verser devant les refoulements, filtration 1h puis coupure 12h pour decantation, puis aspiration.',
    'doseFlocculantWarningFilter': 'Compatible avec filtre a sable uniquement. Ne pas utiliser avec filtre cartouche.',
}

DOSE_EN = {
    'dosePhMinusProduct': 'pH- (acid)',
    'dosePhMinusMethod': 'Dilute in a bucket of pool water, distribute in front of return jets, filtration running.',
    'dosePhMinusWarningGap': 'Gap too large: treatment limited to -{delta} pH. Retest after filtration.',
    'dosePhPlusProduct': 'pH+ (sodium carbonate)',
    'dosePhPlusMethod': 'Dilute in a bucket, distribute in front of return jets, filtration running.',
    'dosePhPlusWarningGap': 'Gap too large: treatment limited to +{delta} pH.',
    'doseChlorineShockProduct': 'Chlorine shock (65% active)',
    'doseChlorineShockMethod': 'Dissolve in a bucket of water, pour in front of return jets. Prefer evening, no swimmers.',
    'doseChlorineShockWarningBath': 'WARNING: shock chlorination. No swimming for at least 8h.',
    'doseChlorineShockWarningMix': 'Never mix chlorine shock and pH-.',
    'doseChlorineShockWarningPh': 'Check pH BEFORE shock (ideal 7.2-7.4).',
    'doseChlorineSlowProduct': 'Slow chlorine (20g tablets)',
    'doseChlorineSlowMethod': 'Place in skimmer or dispenser. Renew as needed.',
    'doseChlorineSlowWarningSkimmer': 'Do not place in skimmer if simultaneous anti-algae treatment.',
    'doseAlkalinityPlusProduct': 'TAC+ (sodium bicarbonate)',
    'doseAlkalinityPlusMethod': 'Dilute, distribute, filtration running. Wait before adjusting pH.',
    'doseAlkalinityPlusWarningOrder': 'Adjust TAC BEFORE pH.',
    'doseCalciumPlusProduct': 'Calcium+ (calcium chloride)',
    'doseCalciumPlusMethod': 'Dilute in a bucket, pour slowly in front of return jets.',
    'doseStabilizerPlusProduct': 'Stabilizer (cyanuric acid)',
    'doseStabilizerPlusMethod': 'Pour slowly into the skimmer, filtration running. Slow dissolution (24-48h).',
    'doseStabilizerPlusWarningMax': 'Do not exceed 50 mg/L. Too much stabilizer blocks chlorine.',
    'doseSaltPlusProduct': 'Pool salt (NaCl)',
    'doseSaltPlusMethod': 'Pour salt directly into the pool, filtration running until fully dissolved.',
    'doseSaltPlusWarningCheck': 'Check the salt required by your electrolyzer before adding.',
    'doseAntiAlgaeProduct': 'Anti-algae (curative)',
    'doseAntiAlgaeMethod': 'Pour in front of return jets, filtration running. Brush the walls.',
    'doseAntiAlgaeWarningPh': 'pH must be balanced BEFORE. Effective mainly as prevention.',
    'doseFlocculantProduct': 'Flocculant',
    'doseFlocculantMethod': 'Pour in front of return jets, filtration 1h then stop 12h for settling, then vacuum.',
    'doseFlocculantWarningFilter': 'Compatible with sand filter only. Do not use with cartridge filter.',
}

def process(path, additions):
    with open(path) as f:
        d = json.load(f)
    ap = d.setdefault('actionPlan', {})
    added = 0
    for k, v in additions.items():
        if k not in ap:
            ap[k] = v
            added += 1
    d['actionPlan'] = ap
    with open(path, 'w') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'{path.name}: added {added} dosing keys (actionPlan total: {len(ap)})')

process(LOCALE_DIR / 'fr.json', DOSE_FR)
process(LOCALE_DIR / 'en.json', DOSE_EN)
print('Done!')
