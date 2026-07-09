#!/usr/bin/env python3
"""
AQWELIA i18n — Add trial-period keys to the `plans` namespace in all 7 locales.

Adds the following keys to the `plans` object in every locale file:
  - trialBadge:      short label for badges (e.g. "7 jours gratuits")
  - trialLabel:      "Essai gratuit" / "Free trial" / ...
  - trialDisclaimer: "Puis {price}/mois. Annulable à tout moment."
  - trialEndingDays: "{days} jours restants" (used in trial-ending email subject)
  - trialNoCharge:   "Aucun débit pendant l'essai"

Idempotent: re-running the script overwrites the same keys with the same values.

Run:  python3 scripts/i18n/add-trial-keys.py
"""
from __future__ import annotations
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
LOCALES_DIR = ROOT / "src" / "i18n" / "locales"

# Per-locale values for the trial keys.
# French is the source of truth; the others are reviewed translations.
TRIAL_KEYS: dict[str, dict[str, str]] = {
    "fr": {
        "trialBadge":      "7 jours gratuits",
        "trialLabel":      "Essai gratuit",
        "trialDisclaimer": "Puis {price}/mois. Annulable à tout moment.",
        "trialEndingDays": "{days} jours restants",
        "trialNoCharge":   "Aucun débit pendant l'essai",
    },
    "en": {
        "trialBadge":      "7 days free",
        "trialLabel":      "Free trial",
        "trialDisclaimer": "Then {price}/mo. Cancel anytime.",
        "trialEndingDays": "{days} days left",
        "trialNoCharge":   "No charge during the trial",
    },
    "es": {
        "trialBadge":      "7 días gratis",
        "trialLabel":      "Prueba gratis",
        "trialDisclaimer": "Luego {price}/mes. Cancela cuando quieras.",
        "trialEndingDays": "Quedan {days} días",
        "trialNoCharge":   "Sin cargo durante la prueba",
    },
    "de": {
        "trialBadge":      "7 Tage kostenlos",
        "trialLabel":      "Kostenlose Testphase",
        "trialDisclaimer": "Danach {price}/Monat. Jederzeit kündbar.",
        "trialEndingDays": "Noch {days} Tage",
        "trialNoCharge":   "Keine Abbuchung während der Testphase",
    },
    "it": {
        "trialBadge":      "7 giorni gratis",
        "trialLabel":      "Prova gratuita",
        "trialDisclaimer": "Poi {price}/mese. Cancellabile in qualsiasi momento.",
        "trialEndingDays": "Mancano {days} giorni",
        "trialNoCharge":   "Nessun addebito durante la prova",
    },
    "pt": {
        "trialBadge":      "7 dias grátis",
        "trialLabel":      "Teste gratuito",
        "trialDisclaimer": "Depois {price}/mês. Cancele quando quiser.",
        "trialEndingDays": "Faltam {days} dias",
        "trialNoCharge":   "Sem cobrança durante o teste",
    },
    "nl": {
        "trialBadge":      "7 dagen gratis",
        "trialLabel":      "Gratis proefperiode",
        "trialDisclaimer": "Daarna {price}/maand. Op elk moment opzegbaar.",
        "trialEndingDays": "Nog {days} dagen",
        "trialNoCharge":   "Geen afschrijving tijdens de proefperiode",
    },
}

EXPECTED_KEYS = set(TRIAL_KEYS["fr"].keys())


def load_locale(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_locale(path: Path, data: dict) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def add_trial_keys(locale: str, values: dict[str, str]) -> tuple[bool, str]:
    """Add trial keys to the `plans` namespace of the given locale.

    Returns (changed, message).
    """
    path = LOCALES_DIR / f"{locale}.json"
    if not path.exists():
        return False, f"  [skip] {path.name}: file not found"
    data = load_locale(path)
    plans = data.get("plans")
    if not isinstance(plans, dict):
        return False, f"  [skip] {path.name}: no `plans` namespace"
    # Verify the existing keys match expected (so we don't accidentally overwrite
    # unrelated stuff). We only ADD new keys.
    changed = False
    for key, value in values.items():
        if plans.get(key) != value:
            plans[key] = value
            changed = True
    if changed:
        save_locale(path, data)
    return changed, f"  [{'updated' if changed else 'ok'}] {locale}.json: {len(values)} trial keys"


def main() -> int:
    print(f"Adding trial keys to {len(TRIAL_KEYS)} locales…")
    any_changed = False
    for locale, values in TRIAL_KEYS.items():
        # Sanity: every locale must define the same set of keys as FR.
        if set(values.keys()) != EXPECTED_KEYS:
            print(f"  [ERROR] locale {locale}: key mismatch — {set(values.keys())} != {EXPECTED_KEYS}", file=sys.stderr)
            return 1
        changed, msg = add_trial_keys(locale, values)
        print(msg)
        if changed:
            any_changed = True

    # Verify each locale JSON is still valid + the plans namespace now has the trial keys.
    print("\nVerification:")
    for locale in TRIAL_KEYS:
        path = LOCALES_DIR / f"{locale}.json"
        try:
            data = load_locale(path)
            plans = data.get("plans", {})
            missing = [k for k in EXPECTED_KEYS if k not in plans]
            if missing:
                print(f"  [FAIL] {locale}.json: missing keys {missing}")
                return 1
            sample = plans.get("trialBadge", "<MISSING>")
            print(f"  [ok] {locale}.json: trialBadge = {sample!r}")
        except Exception as e:
            print(f"  [FAIL] {locale}.json: invalid JSON — {e}")
            return 1

    print(f"\nDone. Files {'changed' if any_changed else 'already up to date'}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
