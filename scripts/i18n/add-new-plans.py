#!/usr/bin/env python3
"""
P1-TARIFS — Batch updater for the new B2C pricing (Découverte / Oasis / Wellness).

Adds the new plan keys to the `plans` namespace + the new `settings.planXxx`
keys in all 7 locale files (fr, en, es, de, it, pt, nl). Legacy keys
(free.*, premium.*, expert.*) are PRESERVED for backward compatibility.

Usage:
    python3 scripts/i18n/add-new-plans.py
"""

import json
import os
import sys
from pathlib import Path

LOCALES_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "i18n" / "locales"

# ---------------------------------------------------------------------------
# Per-locale translations
# ---------------------------------------------------------------------------
LOCALE_DATA = {
    "fr": {
        "decouverte": {
            "name": "Découverte",
            "tagline": "Gratuit — pour tester",
            "features": {
                "poolProfile": "Création d'un profil piscine",
                "5guides": "Accès limité aux guides (5 guides de base)",
                "2tests": "Une analyse manuelle limitée (2 tests/mois)",
                "basicWeather": "Aperçu des alertes météo (basique)",
                "history14": "Aperçu de l'historique (14 jours)",
                "2scans": "2 scans photo / mois",
                "lockedPremium": "Fonctions premium visibles mais verrouillées",
            },
        },
        "oasis": {
            "name": "Oasis",
            "tagline": "Le copilote piscine complet",
            "features": {
                "1pool": "1 piscine",
                "unlimitedTests": "Analyses illimitées",
                "personalizedRecos": "Recommandations personnalisées",
                "dosageCalc": "Calculs de dosage",
                "stripAssisted": "Analyse assistée bandelettes",
                "advancedWeather": "Alertes météo avancées",
                "smartReminders": "Rappels intelligents",
                "unlimitedHistory": "Historique illimité",
                "allGuidesVideos": "Guides complets + vidéos",
                "stockMgmt": "Gestion du stock",
                "careRecos": "Recommandations AQWELIA Care",
                "startupPlan": "Plan de remise en route",
                "winteringPlan": "Plan d'hivernage",
                "aiChat": "Assistance intelligente (AI chat)",
                "pdfReport": "Rapport PDF",
                "proMode": "Mode pro (LSI avancé)",
            },
        },
        "wellness": {
            "name": "Wellness",
            "tagline": "Piscine + Spa, sereinement",
            "features": {
                "1pool1spa": "1 piscine + 1 spa",
                "allOasis": "Tout Oasis",
                "spaTreatments": "Traitements spécifiques spa (brome, oxygène actif)",
                "warmWater": "Eau chaude",
                "separatedHistory": "Historiques illimités séparés",
                "pdfReports": "Rapports PDF",
                "separatedProfiles": "Profils d'eau séparés",
                "spaAlerts": "Alertes spécifiques spa",
            },
        },
        "year": "12 mois",
        "perYear": "/an",
        "emergencyPass": "Pass urgence",
        "comparison_spa": "Spa",
        "settings_planDecouverte": "Découverte",
        "settings_planOasis": "Oasis",
        "settings_planWellness": "Wellness",
        "gates_multi_pool": "Multi-piscines réservé à Oasis et Wellness.",
        "gates_pdf_report": "Rapport PDF réservé à Oasis et Wellness.",
        "gates_pro_mode": "Mode pro réservé à Oasis et Wellness.",
        "gates_spa_support": "Le support des spas est réservé au plan Wellness.",
    },
    "en": {
        "decouverte": {
            "name": "Discovery",
            "tagline": "Free — to try",
            "features": {
                "poolProfile": "Create a pool profile",
                "5guides": "Limited access to guides (5 basic guides)",
                "2tests": "Limited manual analysis (2 tests/month)",
                "basicWeather": "Basic weather alerts preview",
                "history14": "14-day history preview",
                "2scans": "2 photo scans / month",
                "lockedPremium": "Premium features visible but locked",
            },
        },
        "oasis": {
            "name": "Oasis",
            "tagline": "The complete pool copilot",
            "features": {
                "1pool": "1 pool",
                "unlimitedTests": "Unlimited analyses",
                "personalizedRecos": "Personalized recommendations",
                "dosageCalc": "Dosage calculations",
                "stripAssisted": "Strip-assisted analysis",
                "advancedWeather": "Advanced weather alerts",
                "smartReminders": "Smart reminders",
                "unlimitedHistory": "Unlimited history",
                "allGuidesVideos": "All guides + videos",
                "stockMgmt": "Stock management",
                "careRecos": "AQWELIA Care recommendations",
                "startupPlan": "Startup plan",
                "winteringPlan": "Wintering plan",
                "aiChat": "Smart assistant (AI chat)",
                "pdfReport": "PDF report",
                "proMode": "Pro mode (advanced LSI)",
            },
        },
        "wellness": {
            "name": "Wellness",
            "tagline": "Pool + Spa, worry-free",
            "features": {
                "1pool1spa": "1 pool + 1 spa",
                "allOasis": "Everything in Oasis",
                "spaTreatments": "Spa-specific treatments (bromine, active oxygen)",
                "warmWater": "Warm water",
                "separatedHistory": "Separate unlimited histories",
                "pdfReports": "PDF reports",
                "separatedProfiles": "Separate water profiles",
                "spaAlerts": "Spa-specific alerts",
            },
        },
        "year": "12 months",
        "perYear": "/year",
        "emergencyPass": "Emergency pass",
        "comparison_spa": "Spa",
        "settings_planDecouverte": "Discovery",
        "settings_planOasis": "Oasis",
        "settings_planWellness": "Wellness",
        "gates_multi_pool": "Multi-pool reserved for Oasis and Wellness.",
        "gates_pdf_report": "PDF report reserved for Oasis and Wellness.",
        "gates_pro_mode": "Pro mode reserved for Oasis and Wellness.",
        "gates_spa_support": "Spa support is reserved for the Wellness plan.",
    },
    "es": {
        "decouverte": {
            "name": "Descubrimiento",
            "tagline": "Gratis — para probar",
            "features": {
                "poolProfile": "Creación de un perfil de piscina",
                "5guides": "Acceso limitado a guías (5 guías básicas)",
                "2tests": "Análisis manual limitado (2 pruebas/mes)",
                "basicWeather": "Vista previa de alertas meteorológicas (básico)",
                "history14": "Vista previa del historial (14 días)",
                "2scans": "2 escaneos con foto / mes",
                "lockedPremium": "Funciones premium visibles pero bloqueadas",
            },
        },
        "oasis": {
            "name": "Oasis",
            "tagline": "El copiloto de piscina completo",
            "features": {
                "1pool": "1 piscina",
                "unlimitedTests": "Análisis ilimitados",
                "personalizedRecos": "Recomendaciones personalizadas",
                "dosageCalc": "Cálculos de dosificación",
                "stripAssisted": "Análisis asistido por tiras",
                "advancedWeather": "Alertas meteorológicas avanzadas",
                "smartReminders": "Recordatorios inteligentes",
                "unlimitedHistory": "Historial ilimitado",
                "allGuidesVideos": "Todas las guías + vídeos",
                "stockMgmt": "Gestión de stock",
                "careRecos": "Recomendaciones AQWELIA Care",
                "startupPlan": "Plan de puesta en marcha",
                "winteringPlan": "Plan de hibernación",
                "aiChat": "Asistente inteligente (chat IA)",
                "pdfReport": "Informe PDF",
                "proMode": "Modo pro (LSI avanzado)",
            },
        },
        "wellness": {
            "name": "Wellness",
            "tagline": "Piscina + Spa, sin preocupaciones",
            "features": {
                "1pool1spa": "1 piscina + 1 spa",
                "allOasis": "Todo Oasis",
                "spaTreatments": "Tratamientos específicos de spa (bromo, oxígeno activo)",
                "warmWater": "Agua caliente",
                "separatedHistory": "Historiales ilimitados separados",
                "pdfReports": "Informes PDF",
                "separatedProfiles": "Perfiles de agua separados",
                "spaAlerts": "Alertas específicas de spa",
            },
        },
        "year": "12 meses",
        "perYear": "/año",
        "emergencyPass": "Pass urgencia",
        "comparison_spa": "Spa",
        "settings_planDecouverte": "Descubrimiento",
        "settings_planOasis": "Oasis",
        "settings_planWellness": "Wellness",
        "gates_multi_pool": "Multi-piscinas reservado a Oasis y Wellness.",
        "gates_pdf_report": "Informe PDF reservado a Oasis y Wellness.",
        "gates_pro_mode": "Modo pro reservado a Oasis y Wellness.",
        "gates_spa_support": "El soporte de spas está reservado al plan Wellness.",
    },
    "de": {
        "decouverte": {
            "name": "Entdeckung",
            "tagline": "Kostenlos — zum Testen",
            "features": {
                "poolProfile": "Erstellung eines Pool-Profils",
                "5guides": "Eingeschränkter Zugang zu Leitfäden (5 Basis-Leitfäden)",
                "2tests": "Eingeschränkte manuelle Analyse (2 Tests/Monat)",
                "basicWeather": "Vorschau der Wetterwarnungen (Basis)",
                "history14": "Verlauf-Vorschau (14 Tage)",
                "2scans": "2 Foto-Scans / Monat",
                "lockedPremium": "Premium-Funktionen sichtbar, aber gesperrt",
            },
        },
        "oasis": {
            "name": "Oasis",
            "tagline": "Der komplette Pool-Copilot",
            "features": {
                "1pool": "1 Pool",
                "unlimitedTests": "Unbegrenzte Analysen",
                "personalizedRecos": "Personalisierte Empfehlungen",
                "dosageCalc": "Dosierungsberechnungen",
                "stripAssisted": "Streifen-gestützte Analyse",
                "advancedWeather": "Erweiterte Wetterwarnungen",
                "smartReminders": "Intelligente Erinnerungen",
                "unlimitedHistory": "Unbegrenzter Verlauf",
                "allGuidesVideos": "Alle Leitfäden + Videos",
                "stockMgmt": "Bestandsverwaltung",
                "careRecos": "AQWELIA Care Empfehlungen",
                "startupPlan": "Inbetriebnahme-Plan",
                "winteringPlan": "Winterisierungs-Plan",
                "aiChat": "Intelligenter Assistent (KI-Chat)",
                "pdfReport": "PDF-Bericht",
                "proMode": "Pro-Modus (erweitertes LSI)",
            },
        },
        "wellness": {
            "name": "Wellness",
            "tagline": "Pool + Spa, sorgenfrei",
            "features": {
                "1pool1spa": "1 Pool + 1 Spa",
                "allOasis": "Alles aus Oasis",
                "spaTreatments": "Spa-spezifische Behandlungen (Brom, Aktivsauerstoff)",
                "warmWater": "Warmes Wasser",
                "separatedHistory": "Getrennte unbegrenzte Verläufe",
                "pdfReports": "PDF-Berichte",
                "separatedProfiles": "Getrennte Wasserprofile",
                "spaAlerts": "Spa-spezifische Warnungen",
            },
        },
        "year": "12 Monate",
        "perYear": "/Jahr",
        "emergencyPass": "Notfall-Pass",
        "comparison_spa": "Spa",
        "settings_planDecouverte": "Entdeckung",
        "settings_planOasis": "Oasis",
        "settings_planWellness": "Wellness",
        "gates_multi_pool": "Multi-Pool reserviert für Oasis und Wellness.",
        "gates_pdf_report": "PDF-Bericht reserviert für Oasis und Wellness.",
        "gates_pro_mode": "Pro-Modus reserviert für Oasis und Wellness.",
        "gates_spa_support": "Spa-Unterstützung ist dem Wellness-Plan vorbehalten.",
    },
    "it": {
        "decouverte": {
            "name": "Scoperta",
            "tagline": "Gratuito — per provare",
            "features": {
                "poolProfile": "Creazione di un profilo piscina",
                "5guides": "Accesso limitato alle guide (5 guide di base)",
                "2tests": "Analisi manuale limitata (2 test/mese)",
                "basicWeather": "Anteprima degli avvisi meteo (base)",
                "history14": "Anteprima dello storico (14 giorni)",
                "2scans": "2 scansioni foto / mese",
                "lockedPremium": "Funzioni premium visibili ma bloccate",
            },
        },
        "oasis": {
            "name": "Oasis",
            "tagline": "Il copilota piscina completo",
            "features": {
                "1pool": "1 piscina",
                "unlimitedTests": "Analisi illimitate",
                "personalizedRecos": "Consigli personalizzati",
                "dosageCalc": "Calcoli del dosaggio",
                "stripAssisted": "Analisi assistita con strisce",
                "advancedWeather": "Avvisi meteo avanzati",
                "smartReminders": "Promemoria intelligenti",
                "unlimitedHistory": "Storico illimitato",
                "allGuidesVideos": "Tutte le guide + video",
                "stockMgmt": "Gestione magazzino",
                "careRecos": "Consigli AQWELIA Care",
                "startupPlan": "Piano di avvio",
                "winteringPlan": "Piano di svernamento",
                "aiChat": "Assistente intelligente (chat IA)",
                "pdfReport": "Report PDF",
                "proMode": "Modalità pro (LSI avanzato)",
            },
        },
        "wellness": {
            "name": "Wellness",
            "tagline": "Piscina + Spa, senza preoccupazioni",
            "features": {
                "1pool1spa": "1 piscina + 1 spa",
                "allOasis": "Tutto Oasis",
                "spaTreatments": "Trattamenti specifici spa (bromo, ossigeno attivo)",
                "warmWater": "Acqua calda",
                "separatedHistory": "Storici illimitati separati",
                "pdfReports": "Report PDF",
                "separatedProfiles": "Profili acqua separati",
                "spaAlerts": "Avvisi specifici spa",
            },
        },
        "year": "12 mesi",
        "perYear": "/anno",
        "emergencyPass": "Pass emergenza",
        "comparison_spa": "Spa",
        "settings_planDecouverte": "Scoperta",
        "settings_planOasis": "Oasis",
        "settings_planWellness": "Wellness",
        "gates_multi_pool": "Multi-piscine riservato a Oasis e Wellness.",
        "gates_pdf_report": "Report PDF riservato a Oasis e Wellness.",
        "gates_pro_mode": "Modalità pro riservata a Oasis e Wellness.",
        "gates_spa_support": "Il supporto spa è riservato al piano Wellness.",
    },
    "pt": {
        "decouverte": {
            "name": "Descoberta",
            "tagline": "Grátis — para experimentar",
            "features": {
                "poolProfile": "Criação de um perfil de piscina",
                "5guides": "Acesso limitado a guias (5 guias básicos)",
                "2tests": "Análise manual limitada (2 testes/mês)",
                "basicWeather": "Pré-visualização de alertas meteorológicos (básico)",
                "history14": "Pré-visualização do histórico (14 dias)",
                "2scans": "2 digitalizações com foto / mês",
                "lockedPremium": "Funções premium visíveis, mas bloqueadas",
            },
        },
        "oasis": {
            "name": "Oasis",
            "tagline": "O copiloto de piscina completo",
            "features": {
                "1pool": "1 piscina",
                "unlimitedTests": "Análises ilimitadas",
                "personalizedRecos": "Recomendações personalizadas",
                "dosageCalc": "Cálculos de dosagem",
                "stripAssisted": "Análise assistida por tiras",
                "advancedWeather": "Alertas meteorológicos avançados",
                "smartReminders": "Lembretes inteligentes",
                "unlimitedHistory": "Histórico ilimitado",
                "allGuidesVideos": "Todos os guias + vídeos",
                "stockMgmt": "Gestão de stock",
                "careRecos": "Recomendações AQWELIA Care",
                "startupPlan": "Plano de arranque",
                "winteringPlan": "Plano de invernagem",
                "aiChat": "Assistente inteligente (chat IA)",
                "pdfReport": "Relatório PDF",
                "proMode": "Modo pro (LSI avançado)",
            },
        },
        "wellness": {
            "name": "Wellness",
            "tagline": "Piscina + Spa, sem preocupações",
            "features": {
                "1pool1spa": "1 piscina + 1 spa",
                "allOasis": "Tudo Oasis",
                "spaTreatments": "Tratamentos específicos de spa (bromo, oxigénio ativo)",
                "warmWater": "Água quente",
                "separatedHistory": "Históricos ilimitados separados",
                "pdfReports": "Relatórios PDF",
                "separatedProfiles": "Perfis de água separados",
                "spaAlerts": "Alertas específicos de spa",
            },
        },
        "year": "12 meses",
        "perYear": "/ano",
        "emergencyPass": "Pass emergência",
        "comparison_spa": "Spa",
        "settings_planDecouverte": "Descoberta",
        "settings_planOasis": "Oasis",
        "settings_planWellness": "Wellness",
        "gates_multi_pool": "Multi-piscinas reservado a Oasis e Wellness.",
        "gates_pdf_report": "Relatório PDF reservado a Oasis e Wellness.",
        "gates_pro_mode": "Modo pro reservado a Oasis e Wellness.",
        "gates_spa_support": "O suporte de spas está reservado ao plano Wellness.",
    },
    "nl": {
        "decouverte": {
            "name": "Ontdekking",
            "tagline": "Gratis — om te testen",
            "features": {
                "poolProfile": "Aanmaken van een zwembadprofiel",
                "5guides": "Beperkte toegang tot gidsen (5 basisgidsen)",
                "2tests": "Beperkte handmatige analyse (2 tests/maand)",
                "basicWeather": "Voorvertoning van weeralarmen (basis)",
                "history14": "Voorvertoning van geschiedenis (14 dagen)",
                "2scans": "2 foto-scans / maand",
                "lockedPremium": "Premium-functies zichtbaar maar vergrendeld",
            },
        },
        "oasis": {
            "name": "Oasis",
            "tagline": "De complete zwembad-copiloot",
            "features": {
                "1pool": "1 zwembad",
                "unlimitedTests": "Onbeperkte analyses",
                "personalizedRecos": "Gepersonaliseerde aanbevelingen",
                "dosageCalc": "Doseringen berekenen",
                "stripAssisted": "Strip-ondersteunde analyse",
                "advancedWeather": "Geavanceerde weeralarmen",
                "smartReminders": "Slimme herinneringen",
                "unlimitedHistory": "Onbeperkte geschiedenis",
                "allGuidesVideos": "Alle gidsen + video's",
                "stockMgmt": "Voorraadbeheer",
                "careRecos": "AQWELIA Care-aanbevelingen",
                "startupPlan": "Opstartplan",
                "winteringPlan": "Winterplan",
                "aiChat": "Slimme assistent (AI-chat)",
                "pdfReport": "PDF-rapport",
                "proMode": "Pro-modus (geavanceerde LSI)",
            },
        },
        "wellness": {
            "name": "Wellness",
            "tagline": "Zwembad + Spa, zorgeloos",
            "features": {
                "1pool1spa": "1 zwembad + 1 spa",
                "allOasis": "Alles uit Oasis",
                "spaTreatments": "Spa-specifieke behandelingen (broom, actieve zuurstof)",
                "warmWater": "Warm water",
                "separatedHistory": "Gescheiden onbeperkte geschiedenissen",
                "pdfReports": "PDF-rapporten",
                "separatedProfiles": "Gescheiden waterprofielen",
                "spaAlerts": "Spa-specifieke alarmen",
            },
        },
        "year": "12 maanden",
        "perYear": "/jaar",
        "emergencyPass": "Spoedpass",
        "comparison_spa": "Spa",
        "settings_planDecouverte": "Ontdekking",
        "settings_planOasis": "Oasis",
        "settings_planWellness": "Wellness",
        "gates_multi_pool": "Multi-zwembad voorbehouden aan Oasis en Wellness.",
        "gates_pdf_report": "PDF-rapport voorbehouden aan Oasis en Wellness.",
        "gates_pro_mode": "Pro-modus voorbehouden aan Oasis en Wellness.",
        "gates_spa_support": "Spa-ondersteuning is voorbehouden aan het Wellness-abonnement.",
    },
}


def update_locale(locale: str, data: dict) -> tuple[int, int]:
    """Update one locale dict in-place. Returns (added, updated) counts."""
    added = 0
    updated = 0
    tr = LOCALE_DATA[locale]
    plans = data.setdefault("plans", {})
    settings = data.setdefault("settings", {})
    gates = plans.setdefault("gates", {})
    comparison = plans.setdefault("comparison", {})

    # New plan blocks (decouverte / oasis / wellness) — replace wholesale if present.
    for plan_id in ("decouverte", "oasis", "wellness"):
        if plan_id in plans:
            updated += 1
        else:
            added += 1
        plans[plan_id] = tr[plan_id]

    # New duration keys
    for k in ("year", "perYear", "emergencyPass"):
        if k in plans:
            updated += 1
        else:
            added += 1
        plans[k] = tr[k]

    # Comparison row label for spa
    if "spa" in comparison:
        updated += 1
    else:
        added += 1
    comparison["spa"] = tr["comparison_spa"]

    # Update gates messages that mention old plan names
    for k, msg in (
        ("multi_pool", tr["gates_multi_pool"]),
        ("pdf_report", tr["gates_pdf_report"]),
        ("pro_mode", tr["gates_pro_mode"]),
        ("spa_support", tr["gates_spa_support"]),
    ):
        if k in gates:
            updated += 1
        else:
            added += 1
        gates[k] = msg

    # Settings plan label keys
    for k, val in (
        ("planDecouverte", tr["settings_planDecouverte"]),
        ("planOasis", tr["settings_planOasis"]),
        ("planWellness", tr["settings_planWellness"]),
    ):
        if k in settings:
            updated += 1
        else:
            added += 1
        settings[k] = val

    return added, updated


def main():
    if not LOCALES_DIR.is_dir():
        print(f"ERROR: locales dir not found: {LOCALES_DIR}", file=sys.stderr)
        return 1

    total_added = 0
    total_updated = 0
    summary = []

    for locale in ("fr", "en", "es", "de", "it", "pt", "nl"):
        path = LOCALES_DIR / f"{locale}.json"
        if not path.exists():
            print(f"  ! missing: {path}", file=sys.stderr)
            continue
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        added, updated = update_locale(locale, data)
        with path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        total_added += added
        total_updated += updated
        summary.append(f"  {locale}.json: +{added} added, ~{updated} updated")
        print(f"  {locale}.json: +{added} added, ~{updated} updated")

    print(f"\nTotal: +{total_added} added, ~{total_updated} updated across 7 locales")
    return 0


if __name__ == "__main__":
    sys.exit(main())
