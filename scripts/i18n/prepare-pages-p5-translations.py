#!/usr/bin/env python3
"""
Prepare the 5 other locale files (es, de, it, pt, nl) for translation of the
new P5-PAGES namespaces by adding `__TRANSLATE_NEEDED__` placeholders matching
the EN structure.

After running this script, run:
  node scripts/translate-i18n.mjs all
to translate the placeholders via the LLM (uses z-ai-web-dev-sdk with rate
limit handling — see scripts/translate-i18n.mjs).

Idempotent: overwrites the P5 namespaces if present.
"""
import json
from pathlib import Path

ROOT = Path('/home/z/my-project/src/i18n/locales')
PLACEHOLDER = '__TRANSLATE_NEEDED__'

# Namespaces added in P5-PAGES + the 4 legal sub-namespaces
P5_TOP = ['publicNav', 'fonctionnalites', 'commentCaMarche', 'tarifs', 'aPropos', 'contact']
P5_LEGAL_SUB = ['cgv', 'cookies', 'securite', 'accessibilite']

EN_PATH = ROOT / 'en.json'

def make_placeholders(obj):
    """Recursively replace all string values with PLACEHOLDER, preserving structure."""
    if isinstance(obj, dict):
        return {k: make_placeholders(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [make_placeholders(v) for v in obj]
    if isinstance(obj, str):
        return PLACEHOLDER
    return obj

def main():
    en = json.loads(EN_PATH.read_text(encoding='utf-8'))
    # Snapshot the EN structures for each P5 namespace
    en_structs = {ns: en[ns] for ns in P5_TOP}
    en_legal = {ns: en['legal'][ns] for ns in P5_LEGAL_SUB}

    for lang in ['es', 'de', 'it', 'pt', 'nl']:
        path = ROOT / f'{lang}.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        n_added = 0
        for ns in P5_TOP:
            struct = make_placeholders(en_structs[ns])
            data[ns] = struct
            n_added += len(en_structs[ns]) if isinstance(en_structs[ns], dict) else 1
        if 'legal' not in data or not isinstance(data['legal'], dict):
            data['legal'] = {}
        for ns in P5_LEGAL_SUB:
            data['legal'][ns] = make_placeholders(en_legal[ns])
            n_added += len(en_legal[ns])
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f"Prepared {lang}.json with {n_added} __TRANSLATE_NEEDED__ placeholders")
    print("Done. Run `node scripts/translate-i18n.mjs all` next.")

if __name__ == '__main__':
    main()
