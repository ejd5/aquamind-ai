#!/usr/bin/env python3
"""Add actionPlan namespace + diagnostic missing keys to FR and EN locale files."""
import json
from collections import OrderedDict
from pathlib import Path

LOCALE_DIR = Path('/home/z/my-project/src/i18n/locales')

ACTION_PLAN_FR = {
    'iaAdjustTac': "Ajuster l'alcalinité (TAC)",
    'iaLowerPh': 'Baisser le pH',
    'iaRaisePh': 'Monter le pH',
    'iaPhOk': 'pH correct',
    'iaChlorineShock': 'Chloration choc',
    'iaAddSlowChlorine': 'Ajouter chlore lent',
    'iaTreatChloramines': 'Traitement chloramines',
    'iaAddStabilizer': 'Ajouter stabilisant',
    'iaDiluteWater': "Diluer l'eau (CYA trop haut)",
    'iaAddSalt': 'Ajouter du sel',
    'iaTreatPhosphates': 'Traiter les phosphates',
    'iaMaintainFiltration': 'Maintenir la filtration',
    'iaRetest': "Re-tester l'eau",
    'iaAdjustTacDetail': 'TAC {current} mg/L cible {target} mg/L. A faire AVANT le pH.',
    'iaLowerPhDetail': 'pH {current} cible {target}. Indispensable avant tout traitement chlore.',
    'iaRaisePhDetail': 'pH {current} cible {target}.',
    'iaPhOkDetail': 'pH {ph} dans la plage ideale. Ne pas toucher.',
    'iaChlorineShockDetail': 'Chlore libre {chlorine} mg/L trop bas. Faire un choc (apres pH equilibre).',
    'iaAddSlowChlorineDetail': 'Chlore libre {chlorine} mg/L un peu bas. Completer avec chlore lent.',
    'iaTreatChloraminesDetail': 'Chlore combine {combined} mg/L eleve. Chloration choc pour casser les chloramines (odeur, irritation).',
    'iaAddStabilizerDetail': 'CYA {current} mg/L cible {target} mg/L.',
    'iaDiluteWaterDetail': "CYA {cya} mg/L bloque le chlore. Renouveler 20-30% de l'eau.",
    'iaAddSaltDetail': "Sel {salt} g/L trop bas pour l'electrolyseur.",
    'iaTreatPhosphatesDetail': 'Phosphates {phosphates} mg/L : nourrissent les algues. Utiliser un reducteur de phosphates.',
    'iaMaintainFiltrationHours': 'Filtrer au moins {hours}h pour bien repartir les produits.',
    'iaMaintainFiltrationNormal': "Filtration normale (moitie de la temperature de l'eau en heures).",
    'iaRetestHours': "Refaire un test dans {hours}h pour verifier l'effet.",
    'iaRetestDefault': 'Refaire un test dans 24-48h.',
    'iaAdjustTacProduct': 'TAC+',
    'iaLowerPhProduct': 'pH-',
    'iaRaisePhProduct': 'pH+',
    'iaChlorineShockProduct': 'Chlore choc',
    'iaAddSlowChlorineProduct': 'Chlore lent',
    'dndNoMixChemicals': 'Ne jamais melanger deux produits chimiques differents (chlore + acide = gaz toxique).',
    'dndNoPurePour': 'Ne jamais verser du produit pur directement dans la piscine sans dilution (sauf sel).',
    'dndWaterIntoAcid': "Ne jamais ajouter de l'eau dans un produit acide : toujours ajouter le produit dans l'eau.",
    'dndNoShockWithoutPh': 'Ne jamais faire une chloration choc sans avoir verifie le pH au prealable.',
    'dndNoBathAfterShock': 'Ne jamais se baigner pendant ou juste apres un traitement choc.',
    'dndNoStoreChlorineAcid': 'Ne jamais stocker chlore et acide cote a cote.',
    'dndNoCyaOver50': 'Ne pas depasser 50 mg/L de stabilisant (CYA) : le chlore devient inefficace.',
    'dndNoBath8h': 'Ne pas se baigner pendant au moins 8h apres le choc.',
    'dndNoMaskChlorineSmell': "Ne pas masquer l'odeur de chlore avec du parfum : c'est un signe de chloramines.",
    'dndNoAddStabilizer': 'Ne pas ajouter de stabilisant : le niveau est deja trop eleve.',
    'diagBalanced': 'Votre eau est globalement equilibree (indice {cwi}/100). Maintenez le rythme de tests et de filtration. Baignade : {swim}.',
    'diagIssues': "Diagnostic ({sevLabel}) indice eau claire {cwi}/100. Points a traiter : {issues}. Suivez le plan d'action ordonne ci-dessous. Baignade : {swim}.",
    'sevLabelUrgent': 'URGENT',
    'sevLabelHigh': 'Action recommandee',
    'sevLabelMedium': 'A surveiller',
    'swimLabelAllowed': 'autorisee',
    'swimLabelAvoid': 'deconseillee',
    'swimLabelForbidden': 'interdite',
    'swimLabelUnknown': 'a confirmer apres mesures',
    'issuePh': 'pH {ph}',
    'issueFreeChlorine': 'chlore libre {chlorine} mg/L',
    'issueCombinedChlorine': 'chloramines elevees',
    'issueTac': 'TAC {tac}',
    'proPhExtreme': 'pH extreme : un professionnel peut aider a reequilibrer sans risque.',
    'proOverChlorination': 'Surchloration massive : envisagez une dilution partielle ou un pro.',
    'proHighChloramines': "Chloramines tres elevees : choc necessaire, un pro peut piloter l'operation.",
}

ACTION_PLAN_EN = {
    'iaAdjustTac': 'Adjust alkalinity (TAC)',
    'iaLowerPh': 'Lower pH',
    'iaRaisePh': 'Raise pH',
    'iaPhOk': 'pH correct',
    'iaChlorineShock': 'Chlorine shock',
    'iaAddSlowChlorine': 'Add slow chlorine',
    'iaTreatChloramines': 'Treat chloramines',
    'iaAddStabilizer': 'Add stabilizer',
    'iaDiluteWater': 'Dilute water (CYA too high)',
    'iaAddSalt': 'Add salt',
    'iaTreatPhosphates': 'Treat phosphates',
    'iaMaintainFiltration': 'Maintain filtration',
    'iaRetest': 'Re-test the water',
    'iaAdjustTacDetail': 'TAC {current} mg/L target {target} mg/L. Do this BEFORE pH.',
    'iaLowerPhDetail': 'pH {current} target {target}. Essential before any chlorine treatment.',
    'iaRaisePhDetail': 'pH {current} target {target}.',
    'iaPhOkDetail': 'pH {ph} in the ideal range. Leave it alone.',
    'iaChlorineShockDetail': 'Free chlorine {chlorine} mg/L too low. Shock treatment (after pH balanced).',
    'iaAddSlowChlorineDetail': 'Free chlorine {chlorine} mg/L slightly low. Top up with slow chlorine.',
    'iaTreatChloraminesDetail': 'Combined chlorine {combined} mg/L high. Shock treatment to break down chloramines (odor, irritation).',
    'iaAddStabilizerDetail': 'CYA {current} mg/L target {target} mg/L.',
    'iaDiluteWaterDetail': 'CYA {cya} mg/L blocks chlorine. Renew 20-30% of the water.',
    'iaAddSaltDetail': 'Salt {salt} g/L too low for the electrolyzer.',
    'iaTreatPhosphatesDetail': 'Phosphates {phosphates} mg/L: feeds algae. Use a phosphate remover.',
    'iaMaintainFiltrationHours': 'Filter at least {hours}h to distribute products well.',
    'iaMaintainFiltrationNormal': 'Normal filtration (half the water temperature in hours).',
    'iaRetestHours': 'Retest in {hours}h to check the effect.',
    'iaRetestDefault': 'Retest in 24-48h.',
    'iaAdjustTacProduct': 'TAC+',
    'iaLowerPhProduct': 'pH-',
    'iaRaisePhProduct': 'pH+',
    'iaChlorineShockProduct': 'Chlorine shock',
    'iaAddSlowChlorineProduct': 'Slow chlorine',
    'dndNoMixChemicals': 'Never mix two different chemical products (chlorine + acid = toxic gas).',
    'dndNoPurePour': 'Never pour pure product directly into the pool without dilution (except salt).',
    'dndWaterIntoAcid': 'Never add water to an acid product: always add the product to the water.',
    'dndNoShockWithoutPh': 'Never do a shock chlorination without checking the pH first.',
    'dndNoBathAfterShock': 'Never swim during or right after a shock treatment.',
    'dndNoStoreChlorineAcid': 'Never store chlorine and acid side by side.',
    'dndNoCyaOver50': 'Do not exceed 50 mg/L of stabilizer (CYA): chlorine becomes ineffective.',
    'dndNoBath8h': 'Do not swim for at least 8h after the shock.',
    'dndNoMaskChlorineSmell': "Do not mask the chlorine smell with perfume: it's a sign of chloramines.",
    'dndNoAddStabilizer': 'Do not add stabilizer: the level is already too high.',
    'diagBalanced': 'Your water is generally balanced (index {cwi}/100). Maintain the testing and filtration pace. Swimming: {swim}.',
    'diagIssues': 'Diagnosis ({sevLabel}) clear water index {cwi}/100. Issues to address: {issues}. Follow the ordered action plan below. Swimming: {swim}.',
    'sevLabelUrgent': 'URGENT',
    'sevLabelHigh': 'Action recommended',
    'sevLabelMedium': 'To monitor',
    'swimLabelAllowed': 'allowed',
    'swimLabelAvoid': 'not recommended',
    'swimLabelForbidden': 'forbidden',
    'swimLabelUnknown': 'to confirm after measurements',
    'issuePh': 'pH {ph}',
    'issueFreeChlorine': 'free chlorine {chlorine} mg/L',
    'issueCombinedChlorine': 'high chloramines',
    'issueTac': 'TAC {tac}',
    'proPhExtreme': 'Extreme pH: a professional can help rebalance safely.',
    'proOverChlorination': 'Massive over-chlorination: consider partial dilution or a pro.',
    'proHighChloramines': 'Very high chloramines: shock needed, a pro can manage the operation.',
}

DIAG_FR = {
    'swimReasonPhCriticalAcidic': 'pH {ph} hors plage de securite (trop acide).',
    'swimReasonPhCriticalBasic': 'pH {ph} hors plage de securite (trop basique).',
    'swimReasonPhWarning': 'pH {ph} legerement hors plage ideale.',
    'swimReasonChlorineInsufficient': 'Chlore libre insuffisant : desinfection non assuree.',
    'swimReasonChlorineTooHigh': 'Chlore libre {chlorine} mg/L trop eleve : irritation, surdosage.',
    'swimReasonChlorineHighLimit': 'Chlore libre en limite haute.',
    'swimReasonChlorineNotMeasured': 'Chlore libre non mesure.',
    'swimReasonCombinedChlorine': 'Chlore combine {combined} mg/L : chloramines irritantes, odeur forte.',
    'lsiBalancedLabel': 'Equilibree',
    'lsiSlightlyScalingLabel': 'Legerement entartrante',
    'lsiScalingLabel': 'Entartrante',
    'lsiSlightlyAgressiveLabel': 'Legerement agressive',
    'lsiAgressiveLabel': 'Eau agressive',
    'lsiMissingLabel': '-',
    'clarityPerfect': 'Eau parfaite',
    'clarityWatch': 'A surveiller',
    'clarityAction': 'Action recommandee',
    'clarityUrgent': 'Urgence',
}

DIAG_EN = {
    'swimReasonPhCriticalAcidic': 'pH {ph} outside safety range (too acidic).',
    'swimReasonPhCriticalBasic': 'pH {ph} outside safety range (too basic).',
    'swimReasonPhWarning': 'pH {ph} slightly outside ideal range.',
    'swimReasonChlorineInsufficient': 'Insufficient free chlorine: disinfection not assured.',
    'swimReasonChlorineTooHigh': 'Free chlorine {chlorine} mg/L too high: irritation, overdose.',
    'swimReasonChlorineHighLimit': 'Free chlorine at upper limit.',
    'swimReasonChlorineNotMeasured': 'Free chlorine not measured.',
    'swimReasonCombinedChlorine': 'Combined chlorine {combined} mg/L: irritating chloramines, strong odor.',
    'lsiBalancedLabel': 'Balanced',
    'lsiSlightlyScalingLabel': 'Slightly scaling',
    'lsiScalingLabel': 'Scaling',
    'lsiSlightlyAgressiveLabel': 'Slightly aggressive',
    'lsiAgressiveLabel': 'Aggressive water',
    'lsiMissingLabel': '-',
    'clarityPerfect': 'Perfect water',
    'clarityWatch': 'To monitor',
    'clarityAction': 'Action recommended',
    'clarityUrgent': 'Urgent',
}

def insert_alphabetical(d, new_key, new_value):
    new_d = OrderedDict()
    inserted = False
    for k in d:
        if not inserted and new_key < k:
            new_d[new_key] = new_value
            inserted = True
        new_d[k] = d[k]
    if not inserted:
        new_d[new_key] = new_value
    return new_d

def process(path, action_plan, diag_additions):
    with open(path) as f:
        d = json.load(f, object_pairs_hook=OrderedDict)
    diag = d.setdefault('diagnostic', OrderedDict())
    added_diag = 0
    for k, v in diag_additions.items():
        if k not in diag:
            diag[k] = v
            added_diag += 1
    d['diagnostic'] = diag
    added_ap = 0
    if 'actionPlan' not in d:
        d = insert_alphabetical(d, 'actionPlan', OrderedDict(action_plan))
        added_ap = len(action_plan)
    else:
        existing = d['actionPlan']
        for k, v in action_plan.items():
            if k not in existing:
                existing[k] = v
                added_ap += 1
        d['actionPlan'] = existing
    with open(path, 'w') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'{path.name}: added {added_ap} actionPlan keys, {added_diag} diagnostic keys')

process(LOCALE_DIR / 'fr.json', ACTION_PLAN_FR, DIAG_FR)
process(LOCALE_DIR / 'en.json', ACTION_PLAN_EN, DIAG_EN)

for lang in ['fr', 'en']:
    with open(LOCALE_DIR / f'{lang}.json') as f:
        d = json.load(f)
    ap = d.get('actionPlan', {})
    diag = d.get('diagnostic', {})
    print(f'{lang}.json: actionPlan={len(ap)} keys, diagnostic={len(diag)} keys')
    for k in ['iaAdjustTac', 'iaAdjustTacDetail', 'iaAdjustTacProduct', 'diagBalanced', 'dndNoMixChemicals']:
        assert k in ap, f'MISSING actionPlan.{k} in {lang}.json'
    for k in ['swimReasonPhCriticalAcidic', 'lsiBalancedLabel', 'clarityPerfect']:
        assert k in diag, f'MISSING diagnostic.{k} in {lang}.json'
print('All verifications passed!')
