#!/usr/bin/env python3
"""
Clean up the API route fixes: remove duplicate translate() calls and locale declarations.
The previous script created nested translate() calls and duplicate const locale.
"""
import re
from pathlib import Path

API_FILES = [
    'src/app/api/account/delete/route.ts',
    'src/app/api/account/export/route.ts',
    'src/app/api/account/notifications/route.ts',
    'src/app/api/analytics/route.ts',
    'src/app/api/auth/register/route.ts',
    'src/app/api/chat/route.ts',
    'src/app/api/dashboard/route.ts',
    'src/app/api/demo/login/route.ts',
    'src/app/api/guides/route.ts',
    'src/app/api/pool/action-plan/route.ts',
    'src/app/api/pool/equipment/route.ts',
    'src/app/api/pool/inventory/route.ts',
    'src/app/api/pool/photo-diagnostic/route.ts',
    'src/app/api/pool/profile/route.ts',
    'src/app/api/pool/reminders/route.ts',
    'src/app/api/pool/water-test/route.ts',
    'src/app/api/pool/weather/route.ts',
    'src/app/api/subscription/route.ts',
    'src/app/api/stripe/checkout/route.ts',
    'src/app/api/stripe/portal/route.ts',
]

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix nested translate() calls:
    # Pattern: await translate(locale, 'key', await translate(locale, 'key', 'French'))
    # Should be: await translate(locale, 'key', 'French')
    nested_pattern = r"await translate\((locale, '[^']+', )await translate\((locale, '[^']+', )([^)]+)\)\)"
    while re.search(nested_pattern, content):
        content = re.sub(nested_pattern, r"await translate(\1\3)", content)
    
    # Remove duplicate 'const locale = pickLocale(req)' lines
    # Keep only the first one in each function
    lines = content.split('\n')
    new_lines = []
    seen_locale_in_func = False
    in_func = False
    
    for line in lines:
        stripped = line.strip()
        
        # Detect function start
        if re.match(r'\s*export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)', line):
            in_func = True
            seen_locale_in_func = False
        
        # Detect 'const locale = pickLocale(req)'
        if 'const locale = pickLocale(req)' in stripped:
            if in_func and not seen_locale_in_func:
                seen_locale_in_func = True
                new_lines.append(line)
            # Skip duplicate
            continue
        
        new_lines.append(line)
    
    content = '\n'.join(new_lines)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  Cleaned: {filepath}')
    else:
        print(f'  No changes: {filepath}')

print('=== Cleaning API routes ===')
for filepath in API_FILES:
    if Path(filepath).exists():
        clean_file(filepath)
