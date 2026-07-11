#!/usr/bin/env python3
"""Builder for new-keys-nl.json — Dutch translations of 108 new i18n keys.

Source: /home/z/my-project/.tmp/worksheets/new-keys-worksheet.json
Target: /home/z/my-project/.tmp/translated/new-keys-nl.json

Conventions (aligned with existing NL locale):
- chloor (chlorine), shock (shock), langzame chloor (slow chlorine)
- skimmer (kept), retourmonden (refoulements), zandfilter, patroonfilter
- vlokmiddel (flocculant), elektrolyseapparaat (electrolyzer)
- stabilisator, anti-algen, fosfaten, chloramines
- gebalanceerd (balanced), kalkafzettend (scaling), agressief (aggressive)
- Dringend / Actie aanbevolen / In de gaten houden (severity labels)
- toegestaan / afgeraden / verboden / te bevestigen (swim labels)
- Dutch decimal comma: 7,2-7,4 ; 20-30% ; 24-48u
- ICU params preserved verbatim
- Acronyms kept: pH, TAC, CYA, TH, NaCl, LSI
- Units kept: mg/L, g/L, ml, g, kg, °C, h
- Brand AQWELIA kept untranslated
"""
import json
from pathlib import Path

TRANSLATIONS = {
    # ===== actionPlan namespace (90 keys) =====

    # --- Action titles (ia = issue actions) ---
    "actionPlan.iaAdjustTac": "Alkaliteit aanpassen (TAC)",
    "actionPlan.iaLowerPh": "pH verlagen",
    "actionPlan.iaRaisePh": "pH verhogen",
    "actionPlan.iaPhOk": "pH correct",
    "actionPlan.iaChlorineShock": "Chloorshock",
    "actionPlan.iaAddSlowChlorine": "Langzame chloor toevoegen",
    "actionPlan.iaTreatChloramines": "Chloramines behandelen",
    "actionPlan.iaAddStabilizer": "Stabilisator toevoegen",
    "actionPlan.iaDiluteWater": "Water verdunnen (CYA te hoog)",
    "actionPlan.iaAddSalt": "Zout toevoegen",
    "actionPlan.iaTreatPhosphates": "Fosfaten behandelen",
    "actionPlan.iaMaintainFiltration": "Filtratie handhaven",
    "actionPlan.iaRetest": "Water opnieuw testen",

    # --- Action details (with ICU params) ---
    "actionPlan.iaAdjustTacDetail": "TAC {current} mg/L doel {target} mg/L. Doe dit VÓÓR de pH.",
    "actionPlan.iaLowerPhDetail": "pH {current} doel {target}. Essentieel vóór elke chloorbehandeling.",
    "actionPlan.iaRaisePhDetail": "pH {current} doel {target}.",
    "actionPlan.iaPhOkDetail": "pH {ph} in de ideale range. Niet aanpassen.",
    "actionPlan.iaChlorineShockDetail": "Vrij chloor {chlorine} mg/L te laag. Shock uitvoeren (na pH-balans).",
    "actionPlan.iaAddSlowChlorineDetail": "Vrij chloor {chlorine} mg/L iets te laag. Aanvullen met langzame chloor.",
    "actionPlan.iaTreatChloraminesDetail": "Gebonden chloor {combined} mg/L hoog. Chloorshock om chloramines af te breken (geur, irritatie).",
    "actionPlan.iaAddStabilizerDetail": "CYA {current} mg/L doel {target} mg/L.",
    "actionPlan.iaDiluteWaterDetail": "CYA {cya} mg/L blokkeert de chloor. 20-30% van het water verversen.",
    "actionPlan.iaAddSaltDetail": "Zout {salt} g/L te laag voor het elektrolyseapparaat.",
    "actionPlan.iaTreatPhosphatesDetail": "Fosfaten {phosphates} mg/L: voeden algen. Een fosfaatverwijderaar gebruiken.",
    "actionPlan.iaMaintainFiltrationHours": "Minstens {hours}u filteren om de producten goed te verspreiden.",
    "actionPlan.iaMaintainFiltrationNormal": "Normale filtratie (helft van de watertemperatuur in uren).",
    "actionPlan.iaRetestHours": "Opnieuw testen binnen {hours}u om het effect te controleren.",
    "actionPlan.iaRetestDefault": "Opnieuw testen binnen 24-48u.",

    # --- Product labels ---
    "actionPlan.iaAdjustTacProduct": "TAC+",
    "actionPlan.iaLowerPhProduct": "pH-",
    "actionPlan.iaRaisePhProduct": "pH+",
    "actionPlan.iaChlorineShockProduct": "Chloorshock",
    "actionPlan.iaAddSlowChlorineProduct": "Langzame chloor",

    # --- Forbidden actions (dnd = do not do) ---
    "actionPlan.dndNoMixChemicals": "Nooit twee verschillende chemicaliën mengen (chloor + zuur = giftig gas).",
    "actionPlan.dndNoPurePour": "Nooit puur product direct in het zwembad gieten zonder verdunning (behalve zout).",
    "actionPlan.dndWaterIntoAcid": "Nooit water aan een zuur product toevoegen: altijd het product aan het water toevoegen.",
    "actionPlan.dndNoShockWithoutPh": "Nooit een chloorshock uitvoeren zonder vooraf de pH te controleren.",
    "actionPlan.dndNoBathAfterShock": "Nooit zwemmen tijdens of vlak na een shockbehandeling.",
    "actionPlan.dndNoStoreChlorineAcid": "Nooit chloor en zuur naast elkaar opslaan.",
    "actionPlan.dndNoCyaOver50": "Niet meer dan 50 mg/L stabilisator (CYA): chloor wordt ineffectief.",
    "actionPlan.dndNoBath8h": "Minstens 8u niet zwemmen na de shock.",
    "actionPlan.dndNoMaskChlorineSmell": "De chloorgeur niet maskeren met parfum: het is een teken van chloramines.",
    "actionPlan.dndNoAddStabilizer": "Geen stabilisator toevoegen: het niveau is al te hoog.",

    # --- Diagnostic intros ---
    "actionPlan.diagBalanced": "Uw water is over het algemeen gebalanceerd (index {cwi}/100). Houd het tempo van testen en filtratie aan. Zwemmen: {swim}.",
    "actionPlan.diagIssues": "Diagnose ({sevLabel}) helderwaterindex {cwi}/100. Punten om aan te pakken: {issues}. Volg het geordende actieplan hieronder. Zwemmen: {swim}.",

    # --- Severity labels ---
    "actionPlan.sevLabelUrgent": "DRINGEND",
    "actionPlan.sevLabelHigh": "Actie aanbevolen",
    "actionPlan.sevLabelMedium": "In de gaten houden",

    # --- Swim labels ---
    "actionPlan.swimLabelAllowed": "toegestaan",
    "actionPlan.swimLabelAvoid": "afgeraden",
    "actionPlan.swimLabelForbidden": "verboden",
    "actionPlan.swimLabelUnknown": "te bevestigen na metingen",

    # --- Issues ---
    "actionPlan.issuePh": "pH {ph}",
    "actionPlan.issueFreeChlorine": "vrij chloor {chlorine} mg/L",
    "actionPlan.issueCombinedChlorine": "hoge chloramines",
    "actionPlan.issueTac": "TAC {tac}",

    # --- Professional advice ---
    "actionPlan.proPhExtreme": "Extreme pH: een professional kan helpen veilig te herbalanceren.",
    "actionPlan.proOverChlorination": "Massale overchlorering: overweeg een gedeeltelijke verdunning of een pro.",
    "actionPlan.proHighChloramines": "Zeer hoge chloramines: shock nodig, een pro kan de bewerking sturen.",

    # --- Dosing: pH- ---
    "actionPlan.dosePhMinusProduct": "pH- (zuur)",
    "actionPlan.dosePhMinusMethod": "Verdunnen in een emmer zwembadwater, verspreiden voor de retourmonden, filtratie aan.",
    "actionPlan.dosePhMinusWarningGap": "Verschil te groot: behandeling beperkt tot -{delta} pH. Opnieuw testen na filtratie.",

    # --- Dosing: pH+ ---
    "actionPlan.dosePhPlusProduct": "pH+ (natriumcarbonaat)",
    "actionPlan.dosePhPlusMethod": "Verdunnen in een emmer, verspreiden voor de retourmonden, filtratie aan.",
    "actionPlan.dosePhPlusWarningGap": "Verschil te groot: behandeling beperkt tot +{delta} pH.",

    # --- Dosing: Chlorine shock ---
    "actionPlan.doseChlorineShockProduct": "Chloorshock (65% actief)",
    "actionPlan.doseChlorineShockMethod": "Oplossen in een emmer water, gieten voor de retourmonden. Bij voorkeur 's avonds, zonder zwemmers.",
    "actionPlan.doseChlorineShockWarningBath": "LET OP: chloorshock. Minstens 8u niet zwemmen.",
    "actionPlan.doseChlorineShockWarningMix": "Nooit chloorshock en pH- mengen.",
    "actionPlan.doseChlorineShockWarningPh": "Controleer de pH VÓÓR de shock (ideaal 7,2-7,4).",

    # --- Dosing: Slow chlorine ---
    "actionPlan.doseChlorineSlowProduct": "Langzame chloor (tabletten 20g)",
    "actionPlan.doseChlorineSlowMethod": "Plaatsen in de skimmer of doseerder. Vernieuwen naargelang het verbruik.",
    "actionPlan.doseChlorineSlowWarningSkimmer": "Niet in de skimmer plaatsen bij gelijktijdige anti-algenbehandeling.",

    # --- Dosing: Alkalinity+ (TAC+) ---
    "actionPlan.doseAlkalinityPlusProduct": "TAC+ (natriumbicarbonaat)",
    "actionPlan.doseAlkalinityPlusMethod": "Verdunnen, verspreiden, filtratie aan. Wachten voordat de pH opnieuw wordt aangepast.",
    "actionPlan.doseAlkalinityPlusWarningOrder": "Pas de TAC VÓÓR de pH aan.",

    # --- Dosing: Calcium+ ---
    "actionPlan.doseCalciumPlusProduct": "Calcium+ (calciumchloride)",
    "actionPlan.doseCalciumPlusMethod": "Verdunnen in een emmer, langzaam gieten voor de retourmonden.",

    # --- Dosing: Stabilizer+ ---
    "actionPlan.doseStabilizerPlusProduct": "Stabilisator (cyaanzuur)",
    "actionPlan.doseStabilizerPlusMethod": "Langzaam in de skimmer gieten, filtratie aan. Langzame oplossing (24-48u).",
    "actionPlan.doseStabilizerPlusWarningMax": "Niet meer dan 50 mg/L. Te veel stabilisator blokkeert chloor.",

    # --- Dosing: Salt+ ---
    "actionPlan.doseSaltPlusProduct": "Zwembadzout (NaCl)",
    "actionPlan.doseSaltPlusMethod": "Zout direct in het zwembad gieten, filtratie aan tot volledig opgelost.",
    "actionPlan.doseSaltPlusWarningCheck": "Controleer het zout dat uw elektrolyseapparaat vereist vóór toevoeging.",

    # --- Dosing: Anti-algae ---
    "actionPlan.doseAntiAlgaeProduct": "Anti-algen (curatief)",
    "actionPlan.doseAntiAlgaeMethod": "Gieten voor de retourmonden, filtratie aan. De wanden borstelen.",
    "actionPlan.doseAntiAlgaeWarningPh": "De pH moet VÓÓR gebalanceerd zijn. Vooral effectief ter preventie.",

    # --- Dosing: Flocculant ---
    "actionPlan.doseFlocculantProduct": "Vlokmiddel",
    "actionPlan.doseFlocculantMethod": "Gieten voor de retourmonden, filtratie 1u dan stop 12u voor bezinking, dan opzuigen.",
    "actionPlan.doseFlocculantWarningFilter": "Alleen compatibel met zandfilter. Niet gebruiken met patroonfilter.",

    # ===== diagnostic namespace (18 keys) =====

    # --- Swim reasons ---
    "diagnostic.swimReasonPhCriticalAcidic": "pH {ph} buiten veiligheidsrange (te zuur).",
    "diagnostic.swimReasonPhCriticalBasic": "pH {ph} buiten veiligheidsrange (te basisch).",
    "diagnostic.swimReasonPhWarning": "pH {ph} iets buiten de ideale range.",
    "diagnostic.swimReasonChlorineInsufficient": "Onvoldoende vrij chloor: desinfectie niet gewaarborgd.",
    "diagnostic.swimReasonChlorineTooHigh": "Vrij chloor {chlorine} mg/L te hoog: irritatie, overdosering.",
    "diagnostic.swimReasonChlorineHighLimit": "Vrij chloor op de bovengrens.",
    "diagnostic.swimReasonChlorineNotMeasured": "Vrij chloor niet gemeten.",
    "diagnostic.swimReasonCombinedChlorine": "Gebonden chloor {combined} mg/L: irriterende chloramines, sterke geur.",

    # --- LSI labels ---
    "diagnostic.lsiBalancedLabel": "Gebalanceerd",
    "diagnostic.lsiSlightlyScalingLabel": "Licht kalkafzettend",
    "diagnostic.lsiScalingLabel": "Kalkafzettend",
    "diagnostic.lsiSlightlyAgressiveLabel": "Licht agressief",
    "diagnostic.lsiAgressiveLabel": "Agressief water",
    "diagnostic.lsiMissingLabel": "-",

    # --- Clarity labels ---
    "diagnostic.clarityPerfect": "Perfect water",
    "diagnostic.clarityWatch": "In de gaten houden",
    "diagnostic.clarityAction": "Actie aanbevolen",
    "diagnostic.clarityUrgent": "Dringend",
}


def main():
    out = Path("/home/z/my-project/.tmp/translated/new-keys-nl.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as f:
        json.dump(TRANSLATIONS, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Wrote {len(TRANSLATIONS)} keys, {out.stat().st_size} bytes to {out}")


if __name__ == "__main__":
    main()
