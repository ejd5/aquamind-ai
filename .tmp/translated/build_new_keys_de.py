#!/usr/bin/env python3
"""Builder for new-keys-de.json — 108 German translations for AQWELIA pool/spa app.
Source: FR (primary) + EN (reference) from new-keys-worksheet.json.
Rules: formal Sie-form, comma decimals (7,2 not 7.2), keep AQWELIA, acronyms
(pH, TAC, CYA, TH, NaCl, LSI), units (mg/L, g/L, ml, g, kg, °C, h),
preserve ICU params verbatim.
"""
import json
from pathlib import Path

TRANSLATIONS = {
    # --- Action titles (13) ---
    "actionPlan.iaAdjustTac": "Alkalinität (TAC) anpassen",
    "actionPlan.iaLowerPh": "pH senken",
    "actionPlan.iaRaisePh": "pH anheben",
    "actionPlan.iaPhOk": "pH korrekt",
    "actionPlan.iaChlorineShock": "Stoßchlorung",
    "actionPlan.iaAddSlowChlorine": "Langsamchlor hinzufügen",
    "actionPlan.iaTreatChloramines": "Chloramine behandeln",
    "actionPlan.iaAddStabilizer": "Stabilisator hinzufügen",
    "actionPlan.iaDiluteWater": "Wasser verdünnen (CYA zu hoch)",
    "actionPlan.iaAddSalt": "Salz hinzufügen",
    "actionPlan.iaTreatPhosphates": "Phosphate behandeln",
    "actionPlan.iaMaintainFiltration": "Filtration aufrechterhalten",
    "actionPlan.iaRetest": "Wasser erneut testen",

    # --- Action details with ICU params (15) ---
    "actionPlan.iaAdjustTacDetail": "TAC {current} mg/L Ziel {target} mg/L. VOR dem pH-Wert durchführen.",
    "actionPlan.iaLowerPhDetail": "pH {current} Ziel {target}. Unverzichtbar vor jeder Chlorbehandlung.",
    "actionPlan.iaRaisePhDetail": "pH {current} Ziel {target}.",
    "actionPlan.iaPhOkDetail": "pH {ph} im Idealbereich. Nicht verändern.",
    "actionPlan.iaChlorineShockDetail": "Freies Chlor {chlorine} mg/L zu niedrig. Stoßbehandlung durchführen (nach pH-Ausgleich).",
    "actionPlan.iaAddSlowChlorineDetail": "Freies Chlor {chlorine} mg/L leicht niedrig. Mit Langsamchlor ergänzen.",
    "actionPlan.iaTreatChloraminesDetail": "Gebundenes Chlor {combined} mg/L hoch. Stoßchlorung zum Aufbrechen der Chloramine (Geruch, Reizung).",
    "actionPlan.iaAddStabilizerDetail": "CYA {current} mg/L Ziel {target} mg/L.",
    "actionPlan.iaDiluteWaterDetail": "CYA {cya} mg/L blockiert das Chlor. 20-30% des Wassers erneuern.",
    "actionPlan.iaAddSaltDetail": "Salz {salt} g/L zu niedrig für das Elektrolysegerät.",
    "actionPlan.iaTreatPhosphatesDetail": "Phosphate {phosphates} mg/L: nähren Algen. Einen Phosphatentferner verwenden.",
    "actionPlan.iaMaintainFiltrationHours": "Mindestens {hours}h filtern, um die Produkte gut zu verteilen.",
    "actionPlan.iaMaintainFiltrationNormal": "Normale Filtration (Hälfte der Wassertemperatur in Stunden).",
    "actionPlan.iaRetestHours": "In {hours}h erneut testen, um die Wirkung zu überprüfen.",
    "actionPlan.iaRetestDefault": "In 24-48h erneut testen.",

    # --- Products (5) ---
    "actionPlan.iaAdjustTacProduct": "TAC+",
    "actionPlan.iaLowerPhProduct": "pH-",
    "actionPlan.iaRaisePhProduct": "pH+",
    "actionPlan.iaChlorineShockProduct": "Stoßchlor",
    "actionPlan.iaAddSlowChlorineProduct": "Langsamchlor",

    # --- Forbidden actions (10) ---
    "actionPlan.dndNoMixChemicals": "Niemals zwei verschiedene Chemikalien mischen (Chlor + Säure = toxisches Gas).",
    "actionPlan.dndNoPurePour": "Niemals reines Produkt unverdünnt direkt in den Pool gießen (außer Salz).",
    "actionPlan.dndWaterIntoAcid": "Niemals Wasser zu einem Säureprodukt geben: immer das Produkt zum Wasser geben.",
    "actionPlan.dndNoShockWithoutPh": "Niemals eine Stoßchlorung durchführen, ohne vorher den pH-Wert geprüft zu haben.",
    "actionPlan.dndNoBathAfterShock": "Niemals während oder direkt nach einer Stoßbehandlung baden.",
    "actionPlan.dndNoStoreChlorineAcid": "Niemals Chlor und Säure nebeneinander lagern.",
    "actionPlan.dndNoCyaOver50": "50 mg/L Stabilisator (CYA) nicht überschreiten: das Chlor wird unwirksam.",
    "actionPlan.dndNoBath8h": "Nach der Stoßbehandlung mindestens 8h nicht baden.",
    "actionPlan.dndNoMaskChlorineSmell": "Den Chlangeruch nicht mit Parfüm überdecken: es ist ein Zeichen für Chloramine.",
    "actionPlan.dndNoAddStabilizer": "Keinen Stabilisator hinzufügen: der Wert ist bereits zu hoch.",

    # --- Diagnosis narrative (2) ---
    "actionPlan.diagBalanced": "Ihr Wasser ist insgesamt ausgeglichen (Index {cwi}/100). Behalten Sie Test- und Filtrationsrhythmus bei. Baden: {swim}.",
    "actionPlan.diagIssues": "Diagnose ({sevLabel}) Kristallwasser-Index {cwi}/100. Zu behandelnde Punkte: {issues}. Folgen Sie dem nachstehenden geordneten Aktionsplan. Baden: {swim}.",

    # --- Severity labels (3) ---
    "actionPlan.sevLabelUrgent": "DRINGEND",
    "actionPlan.sevLabelHigh": "Handlung empfohlen",
    "actionPlan.sevLabelMedium": "Zu überwachen",

    # --- Swim labels (4) ---
    "actionPlan.swimLabelAllowed": "erlaubt",
    "actionPlan.swimLabelAvoid": "nicht empfohlen",
    "actionPlan.swimLabelForbidden": "verboten",
    "actionPlan.swimLabelUnknown": "nach Messung zu bestätigen",

    # --- Issues (4) ---
    "actionPlan.issuePh": "pH {ph}",
    "actionPlan.issueFreeChlorine": "freies Chlor {chlorine} mg/L",
    "actionPlan.issueCombinedChlorine": "hohe Chloramine",
    "actionPlan.issueTac": "TAC {tac}",

    # --- Professional advice (3) ---
    "actionPlan.proPhExtreme": "Extremer pH-Wert: Ein Fachmann kann beim sicheren Re-Ausgleich helfen.",
    "actionPlan.proOverChlorination": "Massive Überchlorung: Erwägen Sie eine teilweise Verdünnung oder einen Fachmann.",
    "actionPlan.proHighChloramines": "Sehr hohe Chloramine: Stoßbehandlung erforderlich, ein Fachmann kann den Vorgang steuern.",

    # --- Dosing products/methods/warnings (28) ---
    "actionPlan.dosePhMinusProduct": "pH- (Säure)",
    "actionPlan.dosePhMinusMethod": "In einem Eimer Poolwasser verdünnen, vor den Einlaufdüsen verteilen, Filtration in Betrieb.",
    "actionPlan.dosePhMinusWarningGap": "Abweichung zu groß: Behandlung auf -{delta} pH begrenzt. Nach der Filtration erneut testen.",
    "actionPlan.dosePhPlusProduct": "pH+ (Natriumcarbonat)",
    "actionPlan.dosePhPlusMethod": "In einem Eimer verdünnen, vor den Einlaufdüsen verteilen, Filtration in Betrieb.",
    "actionPlan.dosePhPlusWarningGap": "Abweichung zu groß: Behandlung auf +{delta} pH begrenzt.",
    "actionPlan.doseChlorineShockProduct": "Stoßchlor (65% aktiv)",
    "actionPlan.doseChlorineShockMethod": "In einem Eimer Wasser auflösen, vor den Einlaufdüsen gießen. Bevorzugt abends, ohne Badende.",
    "actionPlan.doseChlorineShockWarningBath": "ACHTUNG: Stoßchlorung. Mindestens 8h kein Baden.",
    "actionPlan.doseChlorineShockWarningMix": "Niemals Stoßchlor und pH- mischen.",
    "actionPlan.doseChlorineShockWarningPh": "pH-Wert VOR der Stoßbehandlung prüfen (ideal 7,2-7,4).",
    "actionPlan.doseChlorineSlowProduct": "Langsamchlor (20g Tabletten)",
    "actionPlan.doseChlorineSlowMethod": "In den Skimmer oder Dosierer geben. Je nach Verbrauch erneuern.",
    "actionPlan.doseChlorineSlowWarningSkimmer": "Nicht in den Skimmer geben, wenn gleichzeitig eine Anti-Algen-Behandlung erfolgt.",
    "actionPlan.doseAlkalinityPlusProduct": "TAC+ (Natriumbicarbonat)",
    "actionPlan.doseAlkalinityPlusMethod": "Verdünnen, verteilen, Filtration in Betrieb. Warten, bevor der pH-Wert nachjustiert wird.",
    "actionPlan.doseAlkalinityPlusWarningOrder": "TAC VOR dem pH-Wert anpassen.",
    "actionPlan.doseCalciumPlusProduct": "Calcium+ (Calciumchlorid)",
    "actionPlan.doseCalciumPlusMethod": "In einem Eimer verdünnen, langsam vor den Einlaufdüsen gießen.",
    "actionPlan.doseStabilizerPlusProduct": "Stabilisator (Cyanursäure)",
    "actionPlan.doseStabilizerPlusMethod": "Langsam in den Skimmer gießen, Filtration in Betrieb. Langsame Auflösung (24-48h).",
    "actionPlan.doseStabilizerPlusWarningMax": "50 mg/L nicht überschreiten. Zu viel Stabilisator blockiert das Chlor.",
    "actionPlan.doseSaltPlusProduct": "Poolsalz (NaCl)",
    "actionPlan.doseSaltPlusMethod": "Salz direkt in den Pool gießen, Filtration in Betrieb bis zur vollständigen Auflösung.",
    "actionPlan.doseSaltPlusWarningCheck": "Vor dem Hinzufügen das vom Elektrolysegerät benötigte Salz prüfen.",
    "actionPlan.doseAntiAlgaeProduct": "Algizid (kurativ)",
    "actionPlan.doseAntiAlgaeMethod": "Vor den Einlaufdüsen gießen, Filtration in Betrieb. Die Wände bürsten.",
    "actionPlan.doseAntiAlgaeWarningPh": "Der pH-Wert muss VORHER ausgeglichen sein. Wirkt vor allem präventiv.",
    "actionPlan.doseFlocculantProduct": "Flockungsmittel",
    "actionPlan.doseFlocculantMethod": "Vor den Einlaufdüsen gießen, Filtration 1h, dann 12h ausschalten zum Absetzen, danach absaugen.",
    "actionPlan.doseFlocculantWarningFilter": "Nur mit Sandfilter kompatibel. Nicht mit Kartuschenfilter verwenden.",

    # --- Diagnostic namespace (18) ---
    # Swim reasons (8)
    "diagnostic.swimReasonPhCriticalAcidic": "pH {ph} außerhalb des Sicherheitsbereichs (zu sauer).",
    "diagnostic.swimReasonPhCriticalBasic": "pH {ph} außerhalb des Sicherheitsbereichs (zu basisch).",
    "diagnostic.swimReasonPhWarning": "pH {ph} leicht außerhalb des Idealbereichs.",
    "diagnostic.swimReasonChlorineInsufficient": "Freies Chlor unzureichend: Desinfektion nicht gewährleistet.",
    "diagnostic.swimReasonChlorineTooHigh": "Freies Chlor {chlorine} mg/L zu hoch: Reizung, Überdosierung.",
    "diagnostic.swimReasonChlorineHighLimit": "Freies Chlor an der Obergrenze.",
    "diagnostic.swimReasonChlorineNotMeasured": "Freies Chlor nicht gemessen.",
    "diagnostic.swimReasonCombinedChlorine": "Gebundenes Chlor {combined} mg/L: reizende Chloramine, starker Geruch.",

    # LSI labels (6)
    "diagnostic.lsiBalancedLabel": "Ausgeglichen",
    "diagnostic.lsiSlightlyScalingLabel": "Leicht verkalkend",
    "diagnostic.lsiScalingLabel": "Verkalkend",
    "diagnostic.lsiSlightlyAgressiveLabel": "Leicht aggressiv",
    "diagnostic.lsiAgressiveLabel": "Aggressives Wasser",
    "diagnostic.lsiMissingLabel": "-",

    # Clarity labels (4)
    "diagnostic.clarityPerfect": "Perfektes Wasser",
    "diagnostic.clarityWatch": "Zu überwachen",
    "diagnostic.clarityAction": "Handlung empfohlen",
    "diagnostic.clarityUrgent": "Dringend",
}


def main():
    out_path = Path("/home/z/my-project/.tmp/translated/new-keys-de.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(TRANSLATIONS, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Wrote {len(TRANSLATIONS)} keys to {out_path}")
    print(f"File size: {out_path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
