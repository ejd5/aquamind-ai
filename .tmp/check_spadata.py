#!/usr/bin/env python3
"""Check spa-data.ts keys against locale files."""
import json, re

with open('src/i18n/locales/fr.json') as f:
    d = json.load(f)
sd = d.get('spaData', {})

with open('src/lib/pool/spa-data.ts') as f:
    content = f.read()

keys = set()
for m in re.finditer(r"Key:\s*['\"]([^'\"]+)['\"]", content):
    keys.add(m.group(1))

print(f'spaData namespace has {len(sd)} keys')
print(f'Found {len(keys)} *Key references in spa-data.ts')
print()
missing = [k for k in keys if k not in sd]
if missing:
    print(f'MISSING ({len(missing)}):')
    for k in sorted(missing):
        print(f'  {k}')
else:
    print('All spaData keys present!')
