#!/usr/bin/env python3
"""
P5-MULTIPOOL-PDF — adds 2 new i18n namespaces (`pool`, `pdfReport`) to all 7
locale files (fr, en, es, de, it, pt, nl) and updates 2 feature keys
(`oasis.features.1pool` → `3pools`, `wellness.features.1pool1spa` → `3profiles`).

Idempotent: re-running overwrites the same values.
"""
import json
import os
from pathlib import Path

LOCALES_DIR = Path("/home/z/my-project/src/i18n/locales")

# ─── New namespaces ─────────────────────────────────────────────────────────
# `pool.*` is used by the header switcher + onboarding add-mode + API errors.
# `pdfReport.*` is used by the PDF download buttons + the report title.

POOL_NAMESPACE = {
    "fr": {
        "myPools": "Mes piscines",
        "addPool": "Ajouter une piscine",
        "addPoolActivate": "Ajouter cette piscine",
        "deletePool": "Supprimer cette piscine",
        "cannotDeleteLast": "Vous devez conserver au moins une piscine.",
        "poolDeleted": "Piscine supprimée",
        "deleteError": "Suppression impossible",
        "upgradeForMorePools": "Passez à un plan supérieur pour gérer plusieurs piscines.",
        "limitReached": "Limite atteinte : votre plan autorise {max} piscine(s).",
        "switchPool": "Changer de piscine",
        "activePool": "Piscine active",
        "addModeTitle": "Ajouter une piscine",
        "addModeSubtitle": "Renseignez les caractéristiques de votre nouvelle piscine. Elle s'ajoutera à votre liste."
    },
    "en": {
        "myPools": "My pools",
        "addPool": "Add a pool",
        "addPoolActivate": "Add this pool",
        "deletePool": "Delete this pool",
        "cannotDeleteLast": "You must keep at least one pool.",
        "poolDeleted": "Pool deleted",
        "deleteError": "Unable to delete",
        "upgradeForMorePools": "Upgrade to manage multiple pools.",
        "limitReached": "Limit reached: your plan allows {max} pool(s).",
        "switchPool": "Switch pool",
        "activePool": "Active pool",
        "addModeTitle": "Add a pool",
        "addModeSubtitle": "Enter the details of your new pool. It will be added to your list."
    },
    "es": {
        "myPools": "Mis piscinas",
        "addPool": "Añadir una piscina",
        "addPoolActivate": "Añadir esta piscina",
        "deletePool": "Eliminar esta piscina",
        "cannotDeleteLast": "Debes conservar al menos una piscina.",
        "poolDeleted": "Piscina eliminada",
        "deleteError": "No se puede eliminar",
        "upgradeForMorePools": "Mejora tu plan para gestionar varias piscinas.",
        "limitReached": "Límite alcanzado: tu plan permite {max} piscina(s).",
        "switchPool": "Cambiar de piscina",
        "activePool": "Piscina activa",
        "addModeTitle": "Añadir una piscina",
        "addModeSubtitle": "Introduce los datos de tu nueva piscina. Se añadirá a tu lista."
    },
    "de": {
        "myPools": "Meine Pools",
        "addPool": "Pool hinzufügen",
        "addPoolActivate": "Diesen Pool hinzufügen",
        "deletePool": "Diesen Pool löschen",
        "cannotDeleteLast": "Sie müssen mindestens einen Pool behalten.",
        "poolDeleted": "Pool gelöscht",
        "deleteError": "Löschen nicht möglich",
        "upgradeForMorePools": "Upgraden Sie, um mehrere Pools zu verwalten.",
        "limitReached": "Limit erreicht: Ihr Plan erlaubt {max} Pool(s).",
        "switchPool": "Pool wechseln",
        "activePool": "Aktiver Pool",
        "addModeTitle": "Pool hinzufügen",
        "addModeSubtitle": "Geben Sie die Daten Ihres neuen Pools ein. Er wird zu Ihrer Liste hinzugefügt."
    },
    "it": {
        "myPools": "Le mie piscine",
        "addPool": "Aggiungi una piscina",
        "addPoolActivate": "Aggiungi questa piscina",
        "deletePool": "Elimina questa piscina",
        "cannotDeleteLast": "Devi mantenere almeno una piscina.",
        "poolDeleted": "Piscina eliminata",
        "deleteError": "Eliminazione non riuscita",
        "upgradeForMorePools": "Passa a un piano superiore per gestire più piscine.",
        "limitReached": "Limite raggiunto: il tuo piano permette {max} piscina(e).",
        "switchPool": "Cambia piscina",
        "activePool": "Piscina attiva",
        "addModeTitle": "Aggiungi una piscina",
        "addModeSubtitle": "Inserisci i dati della tua nuova piscina. Verrà aggiunta alla tua lista."
    },
    "pt": {
        "myPools": "As minhas piscinas",
        "addPool": "Adicionar uma piscina",
        "addPoolActivate": "Adicionar esta piscina",
        "deletePool": "Eliminar esta piscina",
        "cannotDeleteLast": "Tem de manter pelo menos uma piscina.",
        "poolDeleted": "Piscina eliminada",
        "deleteError": "Não foi possível eliminar",
        "upgradeForMorePools": "Atualize o plano para gerir várias piscinas.",
        "limitReached": "Limite atingido: o seu plano permite {max} piscina(s).",
        "switchPool": "Mudar de piscina",
        "activePool": "Piscina ativa",
        "addModeTitle": "Adicionar uma piscina",
        "addModeSubtitle": "Introduza os dados da sua nova piscina. Será adicionada à sua lista."
    },
    "nl": {
        "myPools": "Mijn zwembaden",
        "addPool": "Zwembad toevoegen",
        "addPoolActivate": "Dit zwembad toevoegen",
        "deletePool": "Dit zwembad verwijderen",
        "cannotDeleteLast": "U moet minstens één zwembad behouden.",
        "poolDeleted": "Zwembad verwijderd",
        "deleteError": "Verwijderen niet mogelijk",
        "upgradeForMorePools": "Upgrade om meerdere zwembaden te beheren.",
        "limitReached": "Limiet bereikt: uw abonnement staat {max} zwembad(en) toe.",
        "switchPool": "Wissel van zwembad",
        "activePool": "Actief zwembad",
        "addModeTitle": "Zwembad toevoegen",
        "addModeSubtitle": "Vul de gegevens van uw nieuwe zwembad in. Het wordt aan uw lijst toegevoegd."
    },
}

PDF_REPORT_NAMESPACE = {
    "fr": {
        "title": "Rapport d'eau AQWELIA",
        "subtitle": "Synthèse complète — mesures, diagnostic, plan d'action",
        "generatedAt": "Généré le {date}",
        "poolSection": "Profil de la piscine",
        "volume": "Volume",
        "treatment": "Traitement",
        "filterType": "Filtration",
        "waterBodyType": "Type de bassin",
        "latestTestSection": "Dernier test d'eau",
        "noTest": "Aucun test enregistré",
        "parameter": "Paramètre",
        "value": "Valeur",
        "ideal": "Idéal",
        "status": "Statut",
        "clearWaterIndex": "Indice eau claire",
        "swimSafety": "Sécurité baignade",
        "diagnosisSection": "Diagnostic",
        "actionPlanSection": "Plan d'action",
        "immediateActions": "Actions immédiates",
        "chemicalDosages": "Dosages recommandés",
        "doNotDo": "À ne pas faire",
        "recommendationsSection": "Recommandations",
        "downloadPdf": "Télécharger le rapport PDF",
        "downloadPdfShort": "Rapport PDF",
        "preparing": "Préparation du PDF…",
        "downloadError": "Échec du téléchargement",
        "downloadErrorDesc": "Impossible de générer le rapport PDF.",
        "upgradeForPdf": "Passez à Oasis ou Wellness pour télécharger le rapport PDF.",
        "disclaimer": "Ce rapport est généré automatiquement par AQWELIA à partir de vos mesures. Il ne remplace pas l'avis d'un professionnel. En cas de doute, contactez votre pisciniste.",
        "page": "Page {n}",
        "noPlanAvailable": "Aucun plan d'action disponible",
        "latestTestsSection": "5 derniers tests"
    },
    "en": {
        "title": "AQWELIA Water Report",
        "subtitle": "Full synthesis — measurements, diagnosis, action plan",
        "generatedAt": "Generated on {date}",
        "poolSection": "Pool profile",
        "volume": "Volume",
        "treatment": "Treatment",
        "filterType": "Filtration",
        "waterBodyType": "Water body type",
        "latestTestSection": "Latest water test",
        "noTest": "No test recorded",
        "parameter": "Parameter",
        "value": "Value",
        "ideal": "Ideal",
        "status": "Status",
        "clearWaterIndex": "Clear Water Index",
        "swimSafety": "Swim safety",
        "diagnosisSection": "Diagnosis",
        "actionPlanSection": "Action plan",
        "immediateActions": "Immediate actions",
        "chemicalDosages": "Recommended dosages",
        "doNotDo": "Do not do",
        "recommendationsSection": "Recommendations",
        "downloadPdf": "Download PDF report",
        "downloadPdfShort": "PDF report",
        "preparing": "Preparing PDF…",
        "downloadError": "Download failed",
        "downloadErrorDesc": "Unable to generate the PDF report.",
        "upgradeForPdf": "Upgrade to Oasis or Wellness to download the PDF report.",
        "disclaimer": "This report is generated automatically by AQWELIA from your measurements. It does not replace the advice of a professional. If in doubt, contact your pool specialist.",
        "page": "Page {n}",
        "noPlanAvailable": "No action plan available",
        "latestTestsSection": "5 latest tests"
    },
    "es": {
        "title": "Informe de agua AQWELIA",
        "subtitle": "Síntesis completa — medidas, diagnóstico, plan de acción",
        "generatedAt": "Generado el {date}",
        "poolSection": "Perfil de la piscina",
        "volume": "Volumen",
        "treatment": "Tratamiento",
        "filterType": "Filtración",
        "waterBodyType": "Tipo de cuenca",
        "latestTestSection": "Último análisis de agua",
        "noTest": "Ningún análisis registrado",
        "parameter": "Parámetro",
        "value": "Valor",
        "ideal": "Ideal",
        "status": "Estado",
        "clearWaterIndex": "Índice de agua clara",
        "swimSafety": "Seguridad de baño",
        "diagnosisSection": "Diagnóstico",
        "actionPlanSection": "Plan de acción",
        "immediateActions": "Acciones inmediatas",
        "chemicalDosages": "Dosificaciones recomendadas",
        "doNotDo": "No hacer",
        "recommendationsSection": "Recomendaciones",
        "downloadPdf": "Descargar informe PDF",
        "downloadPdfShort": "Informe PDF",
        "preparing": "Preparando PDF…",
        "downloadError": "Error en la descarga",
        "downloadErrorDesc": "No se pudo generar el informe PDF.",
        "upgradeForPdf": "Pasa a Oasis o Wellness para descargar el informe PDF.",
        "disclaimer": "Este informe es generado automáticamente por AQWELIA a partir de tus medidas. No sustituye el consejo de un profesional. En caso de duda, contacta con tu instalador de piscinas.",
        "page": "Página {n}",
        "noPlanAvailable": "No hay plan de acción disponible",
        "latestTestsSection": "5 últimos análisis"
    },
    "de": {
        "title": "AQWELIA Wasserbericht",
        "subtitle": "Vollständige Synthese — Messwerte, Diagnose, Aktionsplan",
        "generatedAt": "Erstellt am {date}",
        "poolSection": "Pool-Profil",
        "volume": "Volumen",
        "treatment": "Behandlung",
        "filterType": "Filtration",
        "waterBodyType": "Beckentyp",
        "latestTestSection": "Letzte Wasseranalyse",
        "noTest": "Keine Analyse erfasst",
        "parameter": "Parameter",
        "value": "Wert",
        "ideal": "Ideal",
        "status": "Status",
        "clearWaterIndex": "Klarwasserindex",
        "swimSafety": "Badesicherheit",
        "diagnosisSection": "Diagnose",
        "actionPlanSection": "Aktionsplan",
        "immediateActions": "Sofortmaßnahmen",
        "chemicalDosages": "Empfohlene Dosierungen",
        "doNotDo": "Nicht tun",
        "recommendationsSection": "Empfehlungen",
        "downloadPdf": "PDF-Bericht herunterladen",
        "downloadPdfShort": "PDF-Bericht",
        "preparing": "PDF wird vorbereitet…",
        "downloadError": "Download fehlgeschlagen",
        "downloadErrorDesc": "PDF-Bericht konnte nicht erstellt werden.",
        "upgradeForPdf": "Upgrade auf Oasis oder Wellness, um den PDF-Bericht herunterzuladen.",
        "disclaimer": "Dieser Bericht wird von AQWELIA automatisch aus Ihren Messwerten erstellt. Er ersetzt nicht den Rat eines Fachmanns. Im Zweifel wenden Sie sich an Ihren Pool-Fachmann.",
        "page": "Seite {n}",
        "noPlanAvailable": "Kein Aktionsplan verfügbar",
        "latestTestsSection": "Die 5 letzten Analysen"
    },
    "it": {
        "title": "Rapporto acqua AQWELIA",
        "subtitle": "Sintesi completa — misure, diagnosi, piano d'azione",
        "generatedAt": "Generato il {date}",
        "poolSection": "Profilo piscina",
        "volume": "Volume",
        "treatment": "Trattamento",
        "filterType": "Filtrazione",
        "waterBodyType": "Tipo di vasca",
        "latestTestSection": "Ultima analisi dell'acqua",
        "noTest": "Nessuna analisi registrata",
        "parameter": "Parametro",
        "value": "Valore",
        "ideal": "Ideale",
        "status": "Stato",
        "clearWaterIndex": "Indice acqua limpida",
        "swimSafety": "Sicurezza bagno",
        "diagnosisSection": "Diagnosi",
        "actionPlanSection": "Piano d'azione",
        "immediateActions": "Azioni immediate",
        "chemicalDosages": "Dosaggi consigliati",
        "doNotDo": "Da non fare",
        "recommendationsSection": "Consigli",
        "downloadPdf": "Scarica rapporto PDF",
        "downloadPdfShort": "Rapporto PDF",
        "preparing": "Preparazione PDF…",
        "downloadError": "Download non riuscito",
        "downloadErrorDesc": "Impossibile generare il rapporto PDF.",
        "upgradeForPdf": "Passa a Oasis o Wellness per scaricare il rapporto PDF.",
        "disclaimer": "Questo rapporto è generato automaticamente da AQWELIA a partire dalle tue misure. Non sostituisce il parere di un professionista. In caso di dubbio, contatta il tuo specialista della piscina.",
        "page": "Pagina {n}",
        "noPlanAvailable": "Nessun piano d'azione disponibile",
        "latestTestsSection": "Ultime 5 analisi"
    },
    "pt": {
        "title": "Relatório de água AQWELIA",
        "subtitle": "Síntese completa — medições, diagnóstico, plano de ação",
        "generatedAt": "Gerado em {date}",
        "poolSection": "Perfil da piscina",
        "volume": "Volume",
        "treatment": "Tratamento",
        "filterType": "Filtragem",
        "waterBodyType": "Tipo de piscina",
        "latestTestSection": "Última análise de água",
        "noTest": "Nenhuma análise registada",
        "parameter": "Parâmetro",
        "value": "Valor",
        "ideal": "Ideal",
        "status": "Estado",
        "clearWaterIndex": "Índice de água límpida",
        "swimSafety": "Segurança de banho",
        "diagnosisSection": "Diagnóstico",
        "actionPlanSection": "Plano de ação",
        "immediateActions": "Ações imediatas",
        "chemicalDosages": "Dosagens recomendadas",
        "doNotDo": "Não fazer",
        "recommendationsSection": "Recomendações",
        "downloadPdf": "Descarregar relatório PDF",
        "downloadPdfShort": "Relatório PDF",
        "preparing": "A preparar PDF…",
        "downloadError": "Falha no download",
        "downloadErrorDesc": "Não foi possível gerar o relatório PDF.",
        "upgradeForPdf": "Mude para Oasis ou Wellness para descarregar o relatório PDF.",
        "disclaimer": "Este relatório é gerado automaticamente pela AQWELIA a partir das suas medições. Não substitui o conselho de um profissional. Em caso de dúvida, contacte o seu especialista de piscina.",
        "page": "Página {n}",
        "noPlanAvailable": "Nenhum plano de ação disponível",
        "latestTestsSection": "Últimas 5 análises"
    },
    "nl": {
        "title": "AQWELIA Waterrapport",
        "subtitle": "Volledige synthese — metingen, diagnose, actieplan",
        "generatedAt": "Gegenereerd op {date}",
        "poolSection": "Zwembadprofiel",
        "volume": "Volume",
        "treatment": "Behandeling",
        "filterType": "Filtratie",
        "waterBodyType": "Type bassin",
        "latestTestSection": "Laatste wateranalyse",
        "noTest": "Geen analyse geregistreerd",
        "parameter": "Parameter",
        "value": "Waarde",
        "ideal": "Ideaal",
        "status": "Status",
        "clearWaterIndex": "Helderwaterindex",
        "swimSafety": "Veiligheid zwemmen",
        "diagnosisSection": "Diagnose",
        "actionPlanSection": "Actieplan",
        "immediateActions": "Onmiddellijke acties",
        "chemicalDosages": "Aanbevolen doseringen",
        "doNotDo": "Niet doen",
        "recommendationsSection": "Aanbevelingen",
        "downloadPdf": "PDF-rapport downloaden",
        "downloadPdfShort": "PDF-rapport",
        "preparing": "PDF voorbereiden…",
        "downloadError": "Download mislukt",
        "downloadErrorDesc": "Kan het PDF-rapport niet genereren.",
        "upgradeForPdf": "Upgrade naar Oasis of Wellness om het PDF-rapport te downloaden.",
        "disclaimer": "Dit rapport wordt automatisch door AQWELIA gegenereerd op basis van uw metingen. Het vervangt niet het advies van een professional. Bij twijfel neemt u contact op met uw zwembadspecialist.",
        "page": "Pagina {n}",
        "noPlanAvailable": "Geen actieplan beschikbaar",
        "latestTestsSection": "5 laatste analyses"
    },
}

# ─── Feature key updates ────────────────────────────────────────────────────
# freemium.ts now uses `oasis.features.3pools` and `wellness.features.3profiles`.

FEATURE_UPDATES = {
    "fr": {
        "oasis.features.3pools": "Jusqu'à 3 piscines",
        "wellness.features.3profiles": "Jusqu'à 3 profils (piscine + spa)",
    },
    "en": {
        "oasis.features.3pools": "Up to 3 pools",
        "wellness.features.3profiles": "Up to 3 profiles (pool + spa)",
    },
    "es": {
        "oasis.features.3pools": "Hasta 3 piscinas",
        "wellness.features.3profiles": "Hasta 3 perfiles (piscina + spa)",
    },
    "de": {
        "oasis.features.3pools": "Bis zu 3 Pools",
        "wellness.features.3profiles": "Bis zu 3 Profile (Pool + Spa)",
    },
    "it": {
        "oasis.features.3pools": "Fino a 3 piscine",
        "wellness.features.3profiles": "Fino a 3 profili (piscina + spa)",
    },
    "pt": {
        "oasis.features.3pools": "Até 3 piscinas",
        "wellness.features.3profiles": "Até 3 perfis (piscina + spa)",
    },
    "nl": {
        "oasis.features.3pools": "Tot 3 zwembaden",
        "wellness.features.3profiles": "Tot 3 profielen (zwembad + spa)",
    },
}


def update_locale(locale: str) -> None:
    path = LOCALES_DIR / f"{locale}.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Add `pool` namespace (top-level)
    data["pool"] = POOL_NAMESPACE[locale]

    # 2. Add `pdfReport` namespace (top-level)
    data["pdfReport"] = PDF_REPORT_NAMESPACE[locale]

    # 3. Update feature keys inside `plans.oasis.features` and `plans.wellness.features`
    plans = data.get("plans", {})
    for plan_name, features_dict in (("oasis", "oasis"), ("wellness", "wellness")):
        plan_block = plans.get(plan_name, {})
        feats = plan_block.get("features", {})
        # Add the new key
        new_key = f"{plan_name}.features." + (
            "3pools" if plan_name == "oasis" else "3profiles"
        )
        feats[new_key.split(".")[-1]] = FEATURE_UPDATES[locale][new_key]
        # Don't remove the old `1pool` / `1pool1spa` keys (other code may still reference them
        # in caches); they're just no longer used by freemium.ts.

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"[{locale}] ✓ pool ({len(POOL_NAMESPACE[locale])} keys) + "
          f"pdfReport ({len(PDF_REPORT_NAMESPACE[locale])} keys) + 2 feature keys")


def main() -> None:
    for locale in ("fr", "en", "es", "de", "it", "pt", "nl"):
        update_locale(locale)


if __name__ == "__main__":
    main()
