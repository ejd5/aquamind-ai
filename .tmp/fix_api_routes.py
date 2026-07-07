#!/usr/bin/env python3
"""
Fix all API routes: replace hardcoded French error strings with translate() calls.
This script modifies each route file to:
1. Add import for pickLocale/translate from @/lib/i18n-api
2. Replace French error strings with translate() calls
"""
import re
from pathlib import Path

# Mapping of French strings -> translation key + fallback
# Format: (french_string, key_path)
STRING_KEY_MAP = {
    "Non autorisé": "common.errors.unauthorized",
    "Non trouvé": "common.errors.notFound",
    "Email invalide": "common.errors.emailInvalid",
    "Le mot de passe doit contenir au moins 8 caractères": "common.errors.passwordTooShort",
    "Guide introuvable": "common.errors.guideNotFound",
    "Équipement introuvable": "common.errors.equipmentNotFound",
    "Erreur lors de l'export des données": "common.errors.exportError",
    "Erreur lors de l’export des données": "common.errors.exportError",
    "Désolé, je n'ai pas pu générer de réponse.": "common.errors.chatError",
    "Utilisez ces identifiants pour vous connecter": "common.errors.demoLoginMessage",
    "Sud-Est / PACA": "common.errors.regionSudEst",
}

# Files to process
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

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changes = 0
    
    # Check if file already imports from i18n-api
    has_import = "from '@/lib/i18n-api'" in content or 'from "@/lib/i18n-api"' in content
    
    # Add import if missing
    if not has_import:
        # Find the last import line
        import_match = re.search(r"(import [^\n]+\n)(?=\n|export|const|async)", content)
        if import_match:
            insert_pos = import_match.end()
            content = content[:insert_pos] + "import { pickLocale, translate } from '@/lib/i18n-api'\n" + content[insert_pos:]
    
    # For each French string, replace with translate() call
    # We need to handle two patterns:
    # 1. { error: 'French string' } -> { error: errMsg } where errMsg = await translate(...)
    # 2. const x = 'French string' -> const x = await translate(...)
    
    # Strategy: Replace inline string literals with translate() calls
    # Since translate is async, we need to use await. Most API routes are async already.
    
    # Pattern 1: error: 'French string' (in NextResponse.json)
    for fr_str, key in STRING_KEY_MAP.items():
        # Escape special regex chars in the French string
        escaped = re.escape(fr_str)
        # Handle both single and double quotes, and the exact string
        # Pattern: 'French string' or "French string"
        pattern = r"(['\"])(" + escaped + r")\1"
        
        # Check if this string appears in the content
        if re.search(pattern, content):
            # We need to replace the string with a template literal that calls translate
            # But since translate is async, we can't use it inline in a JSON object easily.
            # Better approach: declare a variable before the return statement.
            
            # Actually, the cleanest approach for NextResponse.json is to pre-compute the error message.
            # But that requires understanding the context. Let's use a simpler approach:
            # Replace the string with an await expression in the JSON object.
            
            # Pattern: { error: 'French string' } -> { error: await translate(locale, 'common.errors.xxx', 'French string') }
            content = re.sub(
                pattern,
                lambda m: f'` + await translate(locale, \'{key}\', {m.group(1)}{fr_str}{m.group(1)}) + `',
                content
            )
            # This creates: ` + await translate(locale, 'key', 'French') + `
            # But this only works inside template literals. Let's use a different approach.
            # Actually, let's just replace the string with the translate call directly.
    
    # Reset and use a cleaner approach
    content = original
    
    # Add import
    if not has_import:
        import_match = re.search(r"(import [^\n]+\n)(?=\n|export|const|async)", content)
        if import_match:
            insert_pos = import_match.end()
            content = content[:insert_pos] + "import { pickLocale, translate } from '@/lib/i18n-api'\n" + content[insert_pos:]
    
    # Add locale variable at the start of each async function
    # Pattern: async function GET(req: Request) or async function POST(req: Request)
    # Add: const locale = pickLocale(req) at the start
    
    # For each function, add locale variable
    def add_locale(match):
        func_sig = match.group(0)
        return func_sig + '\n  const locale = pickLocale(req)'
    
    # This is complex. Let's use a simpler line-by-line approach.
    lines = content.split('\n')
    new_lines = []
    in_function = False
    function_indent = ''
    locale_added = False
    
    for i, line in enumerate(lines):
        new_lines.append(line)
        
        # Detect async function with req parameter
        if re.match(r'\s*export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(\s*req', line):
            in_function = True
            locale_added = False
            # Get indentation
            function_indent = re.match(r'(\s*)', line).group(1)
        
        # Add locale after the opening brace of the function
        if in_function and not locale_added and '{' in line:
            # Check if this line has the opening brace
            brace_idx = line.index('{')
            indent = '  ' + function_indent
            new_lines.append(f'{indent}const locale = pickLocale(req)')
            locale_added = True
            in_function = False
    
    content = '\n'.join(new_lines)
    
    # Now replace French strings with translate calls
    for fr_str, key in STRING_KEY_MAP.items():
        escaped = re.escape(fr_str)
        # Pattern: 'French string' or "French string"
        pattern = r"(['\"])(" + escaped + r")\1"
        
        def replace_str(m):
            nonlocal changes
            changes += 1
            quote = m.group(1)
            return f'await translate(locale, \'{key}\', {quote}{fr_str}{quote})'
        
        content = re.sub(pattern, replace_str, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  {filepath}: {changes} strings replaced')
        return changes
    else:
        print(f'  {filepath}: no changes')
        return 0

print('=== Fixing API routes ===')
total = 0
for filepath in API_FILES:
    if Path(filepath).exists():
        total += fix_file(filepath)
    else:
        print(f'  {filepath}: FILE NOT FOUND')

print(f'\nTotal: {total} strings replaced')
