#!/usr/bin/env python3
"""Check for missing i18n keys referenced in source code."""
import json, re, os

def flatten(d, prefix=''):
    out = {}
    for k, v in d.items():
        key = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out

with open('src/i18n/locales/fr.json') as f:
    fr = flatten(json.load(f))

missing = set()
for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d not in {'__pycache__'}]
    for fname in files:
        if not fname.endswith(('.tsx', '.ts')):
            continue
        path = os.path.join(root, fname)
        with open(path) as f:
            content = f.read()
        for m in re.finditer(r"\bt\(\s*['\"]([a-zA-Z][a-zA-Z0-9_.]*)['\"]", content):
            key = m.group(1)
            if key not in fr:
                found = False
                for ns in ['common', 'modules', 'nav', 'settings', 'diagnostic', 'weather', 'reminders', 'guidesData', 'plans', 'spaData', 'landing', 'onboarding', 'actionPlan', 'targets', 'spa', 'admin', 'auth', 'metadata', 'mobile', 'navGroups', 'legal']:
                    if f'{ns}.{key}' in fr:
                        found = True
                        break
                if not found:
                    missing.add((key, path))

if missing:
    print(f'Found {len(missing)} potentially missing keys:')
    for key, path in sorted(missing):
        print(f'  {key} in {path}')
else:
    print('No missing keys found!')
