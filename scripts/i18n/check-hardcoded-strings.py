#!/usr/bin/env python3
"""
Pre-commit hook v2: Bloque les commits contenant du texte français codé en dur.
Approche précise : cherche UNIQUEMENT les chaînes littérales avec des accents français
qui ne sont PAS des arguments de t() ou translate().

Règle : zéro texte visible écrit directement dans les composants.
"""
import os
import re
import sys
from pathlib import Path

# Caractères accentués français (les vrais indicateurs de français)
FRENCH_ACCENTS = set('àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ')

# Mots français sans accent mais très spécifiques (pour détecter les erreurs API)
FRENCH_ERROR_PATTERNS = [
    r"error:\s*['\"](?:Non\s+autoris|Erreur\s+lors|Email\s+invalide|introuvable|requis|invalide)",
    r"['\"](?:Body\s+invalide|event\s+requis|Message\s+requis|testId\s+ou\s+values\s+requis|id\s+requis|ID\s+requis|pH\s+requis|Plan\s+invalide|Produit\s+invalide|Prix\s+non\s+configuré|Aucun\s+client)",
]

# Dossiers à ignorer
SKIP_DIRS = {
    'node_modules', '.next', '.git', '.tmp', 'tool-results', 'upload',
    'public', 'skills', 'download', 'scripts', '.husky',
}

# Fichiers lib/pool/* ont des fallbacks français légitimes (à côté de *Key fields)
SKIP_PATTERNS = [
    r'src/lib/pool/',           # All pool lib files have French fallbacks by design
    r'src/lib/i18n-api\.ts',    # translate() fallbacks
    r'src/lib/preferences/',    # Country/language names (fallbacks)
    r'src/i18n/locales/',       # Locale files themselves
    r'src/components/ui/',      # shadcn/ui components (no French, just code)
    r'src/hooks/',              # Toast types
    r'mini-services/',          # Separate services
]

# Fichiers avec détection multilingue IA (patterns en toutes langues)
MULTILINGUAL_FILES = {
    'src/components/aquamind/module-diagnostic.tsx',
    'src/components/aquamind/diagnostic-action-plan.tsx',
    'src/app/api/pool/strip-scan/route.ts',
    'src/components/aquamind/strip-scanner-v2.tsx',
}

def should_skip(filepath):
    """Détermine si un fichier doit être ignoré."""
    rel = str(filepath).replace('\\', '/')
    if rel in MULTILINGUAL_FILES:
        return True
    for pattern in SKIP_PATTERNS:
        if re.search(pattern, rel):
            return True
    return False

I18N_CALL_RE = re.compile(
    r"\b(t|tAct|tr|trAct|tTargets|td|tWeather|tReminders|tReminderMod|tGuides|tHealthLog|useTranslations|translate)\s*\("
)


def compute_i18n_regions(content):
    """Renvoie la liste des régions (start_offset, end_offset) couvertes par les
    appels aux fonctions i18n (t(), translate(), etc.) dans tout le fichier.

    S'étend sur plusieurs lignes : on parcourt tout le contenu en tenant compte
    des chaînes de caractères (', ", `) et de l'échappement \\ pour ne pas
    compter les parenthèses à l'intérieur des strings.
    """
    regions = []
    for m in I18N_CALL_RE.finditer(content):
        open_pos = m.end() - 1  # position du `(`
        depth = 1
        i = open_pos + 1
        in_str = False
        str_char = None
        while i < len(content) and depth > 0:
            c = content[i]
            if in_str:
                if c == '\\':
                    i += 2
                    continue
                if c == str_char:
                    in_str = False
            else:
                if c in ('"', "'", '`'):
                    in_str = True
                    str_char = c
                elif c == '(':
                    depth += 1
                elif c == ')':
                    depth -= 1
            i += 1
        close_pos = i - 1  # position de `)` (ou fin de fichier)
        regions.append((open_pos, close_pos))
    return regions


def find_french_strings(filepath):
    """Trouve les chaînes littérales avec accents français qui ne sont PAS des t() calls."""
    violations = []

    if should_skip(filepath):
        return violations

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return violations

    # Pré-calcul : décalages absolus de début de chaque ligne (pour mapper
    # colonne ligne → offset absolu dans `content`).
    lines = content.split('\n')
    line_starts = [0]
    for ln in lines[:-1]:
        line_starts.append(line_starts[-1] + len(ln) + 1)  # +1 pour `\n`

    # Pré-calcul : régions couvertes par les appels i18n (t(), translate(), …).
    # Toute chaîne française située à l'intérieur d'une de ces régions est
    # considérée comme un fallback explicite et n'est PAS une violation.
    i18n_regions = compute_i18n_regions(content)

    def inside_i18n_call(abs_offset):
        for start, end in i18n_regions:
            if start < abs_offset < end:
                return True
        return False

    for line_num, line in enumerate(lines, 1):
        stripped = line.lstrip()
        # Skip commentaires
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            continue
        if stripped.startswith('import ') or stripped.startswith('export type'):
            continue

        line_start = line_starts[line_num - 1]

        # Trouver toutes les chaînes littérales
        for m in re.finditer(r'(["\'])((?:(?!\1).){4,})\1', line):
            s = m.group(2)
            start = m.start()
            abs_offset = line_start + start

            # Skip si la chaîne se trouve à l'intérieur d'un appel i18n
            # (cela couvre le 1er argument — clé — et le 3ème argument —
            # fallback français — de translate(locale, key, fallback)).
            if inside_i18n_call(abs_offset):
                continue

            # Vérifier ce qui précède — si c'est un argument de t() ou translate(), skip
            before = line[:start].rstrip()
            if re.search(r"\b(t|tAct|tr|trAct|tTargets|td|tWeather|tReminders|tReminderMod|tGuides|tHealthLog|useTranslations|translate)\s*\(\s*$", before):
                continue

            # Skip les clés (snake_case ou camelCase sans espaces ni accents)
            if re.match(r'^[a-z][a-zA-Z0-9_.]*$', s) and ' ' not in s:
                continue
            # Skip les chemins/URLs
            if s.startswith('/') or s.startswith('http') or s.startswith('./') or s.startswith('../'):
                continue
            # Skip les classes CSS
            if re.match(r'^[a-z][a-z0-9\-:\/\[\] ]+$', s) and not any(c in FRENCH_ACCENTS for c in s):
                continue
            # Skip les enums UPPER_CASE
            if re.match(r'^[A-Z][A-Z0-9_]+$', s):
                continue
            # Skip les noms propres seuls (capitalized single word)
            if re.match(r'^[A-ZÉÈÊË][a-zàâäçéèêëîïôöùûüÿœæ]+$', s):
                continue

            # Si la chaîne contient des accents français → c'est du texte affiché
            if any(c in FRENCH_ACCENTS for c in s):
                violations.append({
                    'file': str(filepath).replace('\\', '/'),
                    'line': line_num,
                    'string': s[:80],
                    'context': stripped.strip()[:100],
                })

        # Vérifier aussi les patterns d'erreur API sans accent
        for pattern in FRENCH_ERROR_PATTERNS:
            # Trouver toutes les occurrences du pattern sur la ligne ; chaque
            # match situé à l'intérieur d'un appel i18n est ignoré (fallback).
            flagged = False
            for pm in re.finditer(pattern, line, re.IGNORECASE):
                abs_offset = line_start + pm.start()
                if not inside_i18n_call(abs_offset):
                    violations.append({
                        'file': str(filepath).replace('\\', '/'),
                        'line': line_num,
                        'string': '(API error pattern)',
                        'context': stripped.strip()[:100],
                    })
                    flagged = True
                    break
            if flagged:
                break

    return violations

def main():
    src_dir = Path('src')
    all_violations = []
    
    for filepath in sorted(src_dir.rglob('*')):
        if filepath.suffix not in ('.tsx', '.ts'):
            continue
        if any(skip in str(filepath) for skip in SKIP_DIRS):
            continue
        all_violations.extend(find_french_strings(filepath))
    
    if all_violations:
        print('=' * 70)
        print('❌ COMMIT BLOQUÉ : Chaînes françaises codées en dur détectées')
        print('=' * 70)
        print()
        print('Règle : zéro texte visible écrit directement dans les composants.')
        print('Chaque texte doit passer par une clé de traduction t("key").')
        print()
        print(f'{"Fichier":<55} {"Ligne":<6} Chaîne')
        print('-' * 120)
        for v in all_violations:
            print(f'{v["file"]:<55} L{v["line"]:<5} {v["string"]!r}')
        print()
        print(f'Total : {len(all_violations)} violation(s)')
        print()
        print('Pour corriger :')
        print('  1. Remplacez la chaîne par t("cle.de.traduction")')
        print('  2. Ajoutez la clé dans src/i18n/locales/fr.json et en.json')
        print('  3. Ajoutez la traduction dans es, de, it, pt, nl')
        print()
        sys.exit(1)
    else:
        print('✅ Aucune chaîne française codée en dur détectée.')
        sys.exit(0)

if __name__ == '__main__':
    main()
