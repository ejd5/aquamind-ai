#!/usr/bin/env python3
"""
AQWELIA i18n Toolkit — Gratuit, illimité, local
==============================================

Remplace Crowdin par une solution 100% gratuite utilisant notre LLM GLM.

Utilisation :
  python3 scripts/i18n/toolkit.py status          # Voir l'état des traductions
  python3 scripts/i18n/toolkit.py translate       # Traduire les nouvelles clés
  python3 scripts/i18n/toolkit.py validate        # Vérifier la couverture
  python3 scripts/i18n/toolkit.py translate-key "nouvelle.cle" "Texte en français"

Fonctionnalités :
  ✅ Détection automatique des clés manquantes
  ✅ Traduction par GLM (gratuit, illimité)
  ✅ Validation des placeholders {param}
  ✅ Vérification de couverture 7 langues
  ✅ 100% local, aucun compte requis
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

LOCALE_DIR = Path(__file__).parent.parent.parent / 'src' / 'i18n' / 'locales'
LANGS = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']
TARGET_LANGS = ['en', 'es', 'de', 'it', 'pt', 'nl']  # fr is source

LANG_NAMES = {
    'en': 'English', 'es': 'Spanish', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'nl': 'Dutch'
}

def load_locale(lang):
    with open(LOCALE_DIR / f'{lang}.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def save_locale(lang, data):
    with open(LOCALE_DIR / f'{lang}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

def flatten(d, prefix=''):
    out = {}
    for k, v in d.items():
        key = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out

def count_keys(d):
    return sum(count_keys(v) if isinstance(v, dict) else 1 for v in d.values())

def cmd_status():
    """Affiche l'état des traductions."""
    print('=' * 70)
    print('📊 ÉTAT DES TRADUCTIONS AQWELIA')
    print('=' * 70)
    print()
    
    locales = {lang: load_locale(lang) for lang in LANGS}
    fr_flat = flatten(locales['fr'])
    fr_keys = set(fr_flat.keys())
    
    print(f'Langue source : Français ({len(fr_keys)} clés)')
    print()
    print(f'{"Langue":<12} {"Clés":<8} {"Manquantes":<12} {"Couverture":<12} {"Status"}')
    print('-' * 60)
    
    all_good = True
    for lang in LANGS:
        flat = flatten(locales[lang])
        keys = set(flat.keys())
        missing = fr_keys - keys
        coverage = len(keys & fr_keys) / len(fr_keys) * 100 if fr_keys else 0
        status = '✅' if not missing else f'❌ {len(missing)} manquantes'
        if missing:
            all_good = False
        print(f'{lang:<12} {len(keys):<8} {len(missing):<12} {coverage:.1f}%        {status}')
    
    print()
    if all_good:
        print('✅ Toutes les langues ont 100% de couverture !')
    else:
        print('⚠️  Des clés sont manquantes. Exécutez : python3 scripts/i18n/toolkit.py translate')
    
    # Vérifier les placeholders
    print()
    print('🔍 Vérification des placeholders {param}...')
    placeholder_issues = 0
    for lang in TARGET_LANGS:
        flat = flatten(locales[lang])
        for key, value in flat.items():
            if key in fr_flat:
                fr_params = set(re.findall(r'\{(\w+)\}', str(fr_flat[key])))
                lang_params = set(re.findall(r'\{(\w+)\}', str(value)))
                if fr_params != lang_params:
                    print(f'  ❌ {lang}.{key}: FR={fr_params} {lang.upper()}={lang_params}')
                    placeholder_issues += 1
    if placeholder_issues == 0:
        print('  ✅ Tous les placeholders sont corrects !')
    else:
        print(f'  ⚠️  {placeholder_issues} problèmes de placeholders')

def translate_with_glm(text, target_lang):
    """Traduit un texte avec GLM via z-ai CLI."""
    lang_name = LANG_NAMES.get(target_lang, target_lang)
    prompt = f"""Translate the following French text to {lang_name}.
Rules:
- Keep ICU parameters like {{param}} exactly as-is (do not translate them)
- Keep brand names like AQWELIA, TAC, CYA, pH as-is
- Keep technical terms: skimmer, backwash, ppm, mg/L
- Translate naturally, not word-by-word
- Return ONLY the translation, no explanation

Text to translate:
{text}"""
    
    try:
        # Use -o to save to temp file, then read it
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp:
            tmp_path = tmp.name
        
        result = subprocess.run(
            ['z-ai', 'chat', '-p', prompt, '-o', tmp_path],
            capture_output=True, text=True, timeout=30
        )
        
        if result.returncode == 0 and os.path.exists(tmp_path):
            with open(tmp_path, 'r') as f:
                data = json.load(f)
            os.unlink(tmp_path)
            return data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        else:
            # Fallback: parse stdout
            if result.stdout:
                try:
                    # Find JSON in output
                    json_start = result.stdout.find('{')
                    if json_start >= 0:
                        data = json.loads(result.stdout[json_start:])
                        return data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
                except:
                    pass
    except Exception as e:
        print(f'  Error: {e}', file=sys.stderr)
    return None

def set_nested(d, dotted_key, value):
    parts = dotted_key.split('.')
    current = d
    for part in parts[:-1]:
        if part not in current or not isinstance(current[part], dict):
            current[part] = {}
        current = current[part]
    current[parts[-1]] = value

def cmd_translate():
    """Traduit les clés manquantes avec GLM."""
    print('=' * 70)
    print('🌐 TRADUCTION AUTOMATIQUE PAR GLM')
    print('=' * 70)
    print()
    
    locales = {lang: load_locale(lang) for lang in LANGS}
    fr_flat = flatten(locales['fr'])
    fr_keys = set(fr_flat.keys())
    
    total_translated = 0
    for lang in TARGET_LANGS:
        flat = flatten(locales[lang])
        missing = fr_keys - set(flat.keys())
        if not missing:
            print(f'{lang}: ✅ Aucune clé manquante')
            continue
        
        print(f'{lang}: {len(missing)} clés à traduire')
        for i, key in enumerate(sorted(missing), 1):
            fr_value = str(fr_flat[key])
            print(f'  [{i}/{len(missing)}] {key}: {fr_value[:50]}...', end=' ')
            
            translation = translate_with_glm(fr_value, lang)
            if translation:
                set_nested(locales[lang], key, translation)
                print(f'→ {translation[:50]}')
                total_translated += 1
            else:
                print('❌ Échec')
        
        save_locale(lang, locales[lang])
        print(f'  ✅ {lang}.json sauvegardé')
        print()
    
    print(f'Total : {total_translated} traductions ajoutées')

def cmd_translate_key(key, fr_value):
    """Traduit une clé spécifique dans les 6 langues."""
    print(f'🌐 Traduction de la clé "{key}"')
    print(f'   FR: {fr_value}')
    print()
    
    for lang in TARGET_LANGS:
        translation = translate_with_glm(fr_value, lang)
        if translation:
            locale_data = load_locale(lang)
            set_nested(locale_data, key, translation)
            save_locale(lang, locale_data)
            print(f'   {lang.upper()}: {translation}')
        else:
            print(f'   {lang.upper()}: ❌ Échec')

def cmd_validate():
    """Valide la couverture et la qualité."""
    print('=' * 70)
    print('🔍 VALIDATION DES TRADUCTIONS')
    print('=' * 70)
    print()
    
    locales = {lang: load_locale(lang) for lang in LANGS}
    fr_flat = flatten(locales['fr'])
    fr_keys = set(fr_flat.keys())
    
    issues = 0
    
    # 1. Couverture
    print('1️⃣  Couverture des clés')
    for lang in TARGET_LANGS:
        flat = flatten(locales[lang])
        missing = fr_keys - set(flat.keys())
        extra = set(flat.keys()) - fr_keys
        if missing:
            print(f'   ❌ {lang}: {len(missing)} manquantes')
            for k in list(missing)[:5]:
                print(f'      - {k}')
            issues += len(missing)
        if extra:
            print(f'   ⚠️  {lang}: {len(extra)} clés en trop')
        if not missing and not extra:
            print(f'   ✅ {lang}: OK')
    
    # 2. Valeurs vides
    print()
    print('2️⃣  Valeurs vides')
    for lang in LANGS:
        flat = flatten(locales[lang])
        empty = [k for k, v in flat.items() if not v or (isinstance(v, str) and not v.strip())]
        if empty:
            print(f'   ❌ {lang}: {len(empty)} valeurs vides')
            issues += len(empty)
        else:
            print(f'   ✅ {lang}: OK')
    
    # 3. Placeholders
    print()
    print('3️⃣  Placeholders {param}')
    for lang in TARGET_LANGS:
        flat = flatten(locales[lang])
        bad = 0
        for key, value in flat.items():
            if key in fr_flat:
                fr_params = set(re.findall(r'\{(\w+)\}', str(fr_flat[key])))
                lang_params = set(re.findall(r'\{(\w+)\}', str(value)))
                if fr_params != lang_params:
                    bad += 1
        if bad:
            print(f'   ❌ {lang}: {bad} placeholders cassés')
            issues += bad
        else:
            print(f'   ✅ {lang}: OK')
    
    print()
    print('=' * 70)
    if issues == 0:
        print('✅ AUCUN PROBLÈME — Tout est parfait !')
    else:
        print(f'⚠️  {issues} problème(s) détecté(s)')
    print('=' * 70)

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    cmd = sys.argv[1]
    if cmd == 'status':
        cmd_status()
    elif cmd == 'translate':
        cmd_translate()
    elif cmd == 'validate':
        cmd_validate()
    elif cmd == 'translate-key':
        if len(sys.argv) < 4:
            print('Usage: python3 toolkit.py translate-key "key.path" "Texte français"')
            sys.exit(1)
        cmd_translate_key(sys.argv[2], sys.argv[3])
    else:
        print(f'Commande inconnue: {cmd}')
        print(__doc__)
        sys.exit(1)

if __name__ == '__main__':
    main()
