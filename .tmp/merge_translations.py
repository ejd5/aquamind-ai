#!/usr/bin/env python3
"""Merge translated new-keys-{lang}.json files into actual locale files."""
import json
from pathlib import Path

LOCALE_DIR = Path('/home/z/my-project/src/i18n/locales')
TRANSLATED_DIR = Path('/home/z/my-project/.tmp/translated')

LANGS = ['es', 'de', 'it', 'pt', 'nl']

def set_nested(d, dotted_key, value):
    """Set a value in nested dict using dotted key. e.g. 'actionPlan.iaAdjustTac' -> d['actionPlan']['iaAdjustTac']"""
    parts = dotted_key.split('.')
    current = d
    for part in parts[:-1]:
        if part not in current or not isinstance(current[part], dict):
            current[part] = {}
        current = current[part]
    current[parts[-1]] = value

for lang in LANGS:
    translated_file = TRANSLATED_DIR / f'new-keys-{lang}.json'
    if not translated_file.exists():
        print(f'SKIP {lang}: {translated_file} not found')
        continue
    
    with open(translated_file) as f:
        translations = json.load(f)
    
    locale_file = LOCALE_DIR / f'{lang}.json'
    with open(locale_file) as f:
        d = json.load(f)
    
    added = 0
    for dotted_key, value in translations.items():
        # Split by namespace: actionPlan.* or diagnostic.*
        if dotted_key.startswith('actionPlan.'):
            key = dotted_key[len('actionPlan.'):]
            if 'actionPlan' not in d:
                d['actionPlan'] = {}
            if key not in d['actionPlan']:
                d['actionPlan'][key] = value
                added += 1
            elif d['actionPlan'][key] != value:
                # Overwrite placeholder if exists
                d['actionPlan'][key] = value
                added += 1
        elif dotted_key.startswith('diagnostic.'):
            key = dotted_key[len('diagnostic.'):]
            if 'diagnostic' not in d:
                d['diagnostic'] = {}
            if key not in d['diagnostic']:
                d['diagnostic'][key] = value
                added += 1
            elif d['diagnostic'][key] != value:
                d['diagnostic'][key] = value
                added += 1
        else:
            set_nested(d, dotted_key, value)
            added += 1
    
    with open(locale_file, 'w') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write('\n')
    
    # Verify
    with open(locale_file) as f:
        d = json.load(f)
    ap_count = len(d.get('actionPlan', {}))
    diag_count = len(d.get('diagnostic', {}))
    print(f'{lang}.json: merged {added} keys. actionPlan={ap_count}, diagnostic={diag_count}')

# Verify all langs have actionPlan and diagnostic with correct counts
print('\n=== FINAL VERIFICATION ===')
for lang in ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']:
    with open(LOCALE_DIR / f'{lang}.json') as f:
        d = json.load(f)
    ap = d.get('actionPlan', {})
    diag = d.get('diagnostic', {})
    targets = d.get('targets', {})
    print(f'{lang}: actionPlan={len(ap)}, diagnostic={len(diag)}, targets={len(targets)}')
