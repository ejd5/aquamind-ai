#!/usr/bin/env python3
"""Merge translated worksheets back into locale files.

For each locale in es/de/it/pt/nl:
  - Load src/i18n/locales/<loc>.json (nested)
  - Load .tmp/translated/<loc>.json  ({ "dotted.key.path": "translated value" })
  - For each key, set the nested value in the locale file
  - Write back with ensure_ascii=False, indent=2
"""
import json, os, glob

LOCALES_DIR = "src/i18n/locales"
TRANS_DIR = ".tmp/translated"
TARGETS = ["es", "de", "it", "pt", "nl"]

def set_nested(root, dotted_key, value):
    parts = dotted_key.split(".")
    node = root
    for part in parts[:-1]:
        if part not in node or not isinstance(node[part], dict):
            node[part] = {}
        node = node[part]
    node[parts[-1]] = value

for loc in TARGETS:
    # Collect all translated part files for this locale: <loc>.json, <loc>-part1.json, <loc>-part2.json, ...
    trans_files = sorted(glob.glob(f"{TRANS_DIR}/{loc}.json") + glob.glob(f"{TRANS_DIR}/{loc}-part*.json"))
    if not trans_files:
        print(f"!! {loc}: no translated files, skipping")
        continue
    locale_path = f"{LOCALES_DIR}/{loc}.json"
    with open(locale_path, encoding="utf-8") as f:
        data = json.load(f)
    translations = {}
    for tf in trans_files:
        with open(tf, encoding="utf-8") as f:
            translations.update(json.load(f))
    n_applied = 0
    n_missing_source = 0
    n_placeholder_remaining = 0
    for key, val in translations.items():
        if val is None or val == "":
            n_missing_source += 1
            continue
        if val == "__TRANSLATE_NEEDED__":
            n_placeholder_remaining += 1
            continue
        set_nested(data, key, val)
        n_applied += 1
    with open(locale_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{loc}: applied {n_applied} translations from {len(trans_files)} file(s) ({n_missing_source} empty skipped, {n_placeholder_remaining} placeholder skipped)")

print("Merge done.")
