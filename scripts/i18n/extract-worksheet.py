#!/usr/bin/env python3
"""Extract translation worksheets for ES/DE/IT/PT/NL.

For each locale, collect keys that need translation:
  (a) value === '__TRANSLATE_NEEDED__'
  (b) value === EN value AND value looks translatable (not a brand/acronym/number/url)
Output: .tmp/worksheets/<locale>.json  -> { "dotted.key.path": { "fr": ..., "en": ... } }
"""
import json, os, re

LOCALES_DIR = "src/i18n/locales"
OUT_DIR = ".tmp/worksheets"
TARGETS = ["es", "de", "it", "pt", "nl"]
os.makedirs(OUT_DIR, exist_ok=True)

def flatten(o, p=""):
    out = {}
    if isinstance(o, dict):
        for k, v in o.items():
            out.update(flatten(v, f"{p}{k}."))
    else:
        out[p[:-1]] = o
    return out

BRAND = {"AQWELIA", "AquaMind", "AquaMind AI"}
ACRONYMS = {"pH", "TAC", "CYA", "TH", "OK", "TDS", "ORP", "ppm", "kPa", "kWh",
            "API", "URL", "JSON", "CSV", "PDF", "HTML", "CSS", "JS", "TS", "UI",
            "UX", "iOS", "SSH", "VPN", "WC", "PR", "RGPD", "GDPR", "VAT", "TVA"}

def is_translatable(s):
    if not isinstance(s, str):
        return False
    v = s.strip()
    if v == "":
        return False
    if v in BRAND or v in ACRONYMS:
        return False
    if re.fullmatch(r"[\d\s.,+\-°%CLmg/lkWh]+", v):
        return False
    if re.search(r"https?://|www\.|@|\.com|\.fr|\.json|\.tsx?", v):
        return False
    if len(v) <= 2 and not re.search(r"[a-zA-Z]{2,}", v):
        return False
    letters = sum(1 for c in v if c.isalpha())
    if letters <= 1:
        return False
    return True

fr = flatten(json.load(open(f"{LOCALES_DIR}/fr.json")))
en = flatten(json.load(open(f"{LOCALES_DIR}/en.json")))

for loc in TARGETS:
    d = flatten(json.load(open(f"{LOCALES_DIR}/{loc}.json")))
    worksheet = {}
    n_placeholder = 0
    n_identical = 0
    for key, val in d.items():
        if val == "__TRANSLATE_NEEDED__":
            n_placeholder += 1
            worksheet[key] = {"fr": fr.get(key, ""), "en": en.get(key, ""), "reason": "placeholder"}
        elif val == en.get(key) and is_translatable(val):
            n_identical += 1
            worksheet[key] = {"fr": fr.get(key, ""), "en": en.get(key, ""), "reason": "identical_to_en"}
    out_path = f"{OUT_DIR}/{loc}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(worksheet, f, ensure_ascii=False, indent=2)
    print(f"{loc}: {len(worksheet)} keys to translate ({n_placeholder} placeholder + {n_identical} identical-to-EN) -> {out_path}")

print("Done.")
