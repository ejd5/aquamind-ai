#!/usr/bin/env python3
"""
AUDIT EXHAUSTIF — Trouve TOUTES les chaînes françaises hardcoded dans le code.
Approche différente : au lieu de chercher les t() calls, on cherche TOUTES les
chaînes littérales qui ressemblent à du français et qui ne sont PAS dans un t().
"""
import os
import re
from pathlib import Path
from collections import defaultdict

# Mots/clés qui indiquent du français
FRENCH_WORDS = [
    # Mots communs
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'à', 'au', 'aux',
    'et', 'ou', 'mais', 'donc', 'car', 'ni', 'or',
    'dans', 'sur', 'sous', 'vers', 'chez', 'dans', 'pour', 'par', 'avec',
    'sans', 'contre', 'entre', 'parmi', 'devant', 'derrière', 'avant', 'après',
    'pendant', 'depuis', 'jusqu', 'vers',
    'est', 'sont', 'été', 'être', 'avoir', 'fait', 'faire',
    'ce', 'cette', 'ces', 'cet', 'son', 'sa', 'ses', 'leur', 'leurs',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'notre', 'nos', 'votre', 'vos',
    'qui', 'que', 'quoi', 'dont', 'où', 'quand', 'comment', 'pourquoi',
    'ne', 'pas', 'plus', 'moins', 'très', 'trop', 'peu', 'beaucoup',
    'tout', 'tous', 'toute', 'toutes', 'rien', 'personne',
    'aussi', 'encore', 'déjà', 'toujours', 'jamais', 'souvent',
    # Vocabulaire piscine
    'piscine', 'pisciniste', 'eau', 'filtration', 'filtre', 'pompe', 'skimmer',
    'chlore', 'chloré', 'brome', 'sel', 'sélectif', 'algues', 'algicide',
    'ph', 'tac', 'cya', 'th', 'stabilisant', 'électrolyseur', 'électrolyse',
    'backwash', 'contre-lavage', 'rinçage', 'floculant', 'flocculant',
    'cartouche', 'sable', 'verre', 'liner', 'membrane', 'coque',
    'robot', 'aspirateur', 'balai', 'brosse',
    'ph', 'acidité', 'alcalinité', 'calcaire', 'tartre', 'calcaire',
    'température', 'gel', 'hiver', 'hivernage', 'printemps', 'été', 'automne',
    'baignade', 'baigner', 'baigneur', 'nage',
    'produit', 'produits', 'traitement', 'désinfection', 'désinfectant',
    'dose', 'dosage', 'doser', 'surdosage', 'sous-dosage',
    'test', 'tester', 'mesure', 'mesurer', 'mesure',
    'action', 'plan', 'plan d\'action', 'étape', 'étapes', 'marche',
    'rappel', 'rappels', 'alerte', 'alertes', 'avertissement',
    'sécurité', 'danger', 'attention', 'prudence',
    'guide', 'guides', 'tutoriel', 'conseil', 'conseils', 'astuce',
    'erreur', 'erreurs', 'problème', 'problèmes', 'bug',
    'compte', 'comptes', 'connexion', 'inscription', 'déconnexion',
    'profil', 'paramètre', 'paramètres', 'réglage', 'réglages',
    'tableau', 'bord', 'dashboard',
    'résumé', 'détail', 'détails', 'description',
    'nom', 'prénom', 'email', 'mot de passe',
    'sauvegarder', 'annuler', 'confirmer', 'valider', 'supprimer',
    'ajouter', 'modifier', 'éditer', 'créer',
    'voir', 'afficher', 'montrer', 'cacher', 'masquer',
    'ouvrir', 'fermer', 'démarrer', 'arrêter',
    'jour', 'semaine', 'mois', 'année', 'heure', 'minute',
    'aujourd\'hui', 'demain', 'hier', 'maintenant', 'bientôt',
    # Verbes communs
    'peut', 'peuvent', 'doit', 'doivent', 'faut', 'faudra',
    'vérifier', 'ajouter', 'retirer', 'mettre', 'enlever',
    'attendre', 'patienter', 'laisser', 'continuer',
    'indiquer', 'montrer', 'afficher', 'présenter',
    'permettre', 'autoriser', 'interdire', 'empêcher',
    # Adjectifs
    'clair', 'claire', 'trouble', 'verte', 'vert', 'bleu', 'bleue',
    'propre', 'sale', 'vide', 'plein', 'pleine',
    'bon', 'bonne', 'mauvais', 'mauvaise', 'excellent', 'excellente',
    'grand', 'grande', 'petit', 'petite', 'gros', 'grosse',
    'chaud', 'chaude', 'froid', 'froide', 'tiède',
    'rapide', 'lent', 'lente', 'facile', 'difficile',
    # Connecteurs
    'car', 'donc', 'alors', 'puis', 'ensuite', 'après',
    'si', 'sinon', 'lorsque', 'quand', 'pendant',
]

# Caractères accentués français
FRENCH_ACCENTS = set('àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ')

def is_french_string(s):
    """Détermine si une chaîne ressemble à du français."""
    if not s or len(s) < 3:
        return False
    # Si contient des accents français → très probablement français
    if any(c in FRENCH_ACCENTS for c in s):
        return True
    # Compter les mots français
    s_lower = s.lower()
    words = re.findall(r'\b[a-zàâäçéèêëîïôöùûüÿœæ]+\b', s_lower)
    if len(words) < 2:
        return False
    french_count = 0
    for w in words:
        if w in FRENCH_WORDS:
            french_count += 1
    # Si au moins 2 mots français OU 30% des mots sont français
    return french_count >= 2 or (len(words) > 0 and french_count / len(words) >= 0.3)

def scan_file(filepath):
    """Scanne un fichier et retourne les chaînes françaises hardcoded."""
    results = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except:
        return results
    
    for line_num, line in enumerate(lines, 1):
        stripped = line.lstrip()
        # Skip commentaires
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            continue
        # Skip imports
        if stripped.startswith('import ') or stripped.startswith('export type'):
            continue
        # Skip lignes avec t() call (déjà traduit)
        # On cherche les chaînes qui sont des arguments de t() ou tXxx()
        # Si la ligne contient t('...') ou t("..."), on skip ces chaînes spécifiques
        
        # Trouver toutes les chaînes littérales dans la ligne
        # Chaînes entre guillemets doubles ou simples, ou backticks
        string_literals = []
        for m in re.finditer(r'(["\'])((?:(?!\1).){3,})\1', line):
            string_literals.append((m.start(), m.end(), m.group(2), m.group(1)))
        
        # Pour chaque chaîne, vérifier si elle est un argument de t()
        for start, end, s, quote in string_literals:
            # Vérifier ce qui précède la chaîne
            before = line[:start].rstrip()
            # Si la chaîne est un argument de t(), useTranslations, etc., skip
            if re.search(r'\b(t|tAct|tr|trAct|tTargets|td|tWeather|tReminders|tReminderMod|tGuides|tHealthLog|useTranslations|translate|tAct)\s*\(\s*$', before):
                continue
            # Skip si c'est une clé (commence par une lettre, snake_case, pas d'espaces)
            if re.match(r'^[a-z][a-zA-Z0-9_.]*$', s) and ' ' not in s:
                continue
            # Skip les chemins de fichiers, URLs
            if s.startswith('/') or s.startswith('http') or s.startswith('./') or s.startswith('../'):
                continue
            # Skip les classes CSS
            if re.match(r'^[a-z][a-z0-9\-:\/\[\]]+$', s) and ('-' in s or '/' in s):
                continue
            # Skip les enums courts (UPPER_CASE)
            if re.match(r'^[A-Z][A-Z0-9_]+$', s):
                continue
            # Vérifier si c'est du français
            if is_french_string(s):
                results.append({
                    'line': line_num,
                    'string': s,
                    'context': stripped.strip()[:120],
                })
    
    return results

def main():
    src_dir = Path('src')
    all_results = defaultdict(list)
    total_count = 0
    
    for filepath in sorted(src_dir.rglob('*')):
        if filepath.suffix not in ('.tsx', '.ts'):
            continue
        if 'node_modules' in str(filepath) or '.next' in str(filepath):
            continue
        results = scan_file(filepath)
        if results:
            all_results[str(filepath)] = results
            total_count += len(results)
    
    print(f'=== AUDIT EXHAUSTIF : {total_count} chaînes françaises hardcoded dans {len(all_results)} fichiers ===\n')
    
    for filepath, results in sorted(all_results.items()):
        print(f'\n--- {filepath} ({len(results)} chaînes) ---')
        for r in results:
            print(f'  L{r["line"]}: {r["string"][:80]!r}')
            print(f'         {r["context"]}')
    
    # Résumé par type de fichier
    print(f'\n\n=== RÉSUMÉ PAR TYPE ===')
    by_type = defaultdict(int)
    for filepath, results in all_results.items():
        if '/api/' in filepath:
            by_type['API routes'] += len(results)
        elif '/components/' in filepath:
            by_type['Components'] += len(results)
        elif '/lib/' in filepath:
            by_type['Lib'] += len(results)
        elif '/app/' in filepath:
            by_type['App pages'] += len(results)
        else:
            by_type['Other'] += len(results)
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f'  {t}: {c}')
    
    print(f'\nTOTAL: {total_count} chaînes à traduire')
    
    # Sauvegarder le rapport
    with open('/home/z/my-project/.tmp/audit-exhaustif.txt', 'w') as f:
        f.write(f'=== AUDIT EXHAUSTIF : {total_count} chaînes françaises hardcoded ===\n\n')
        for filepath, results in sorted(all_results.items()):
            f.write(f'\n--- {filepath} ({len(results)} chaînes) ---\n')
            for r in results:
                f.write(f'  L{r["line"]}: {r["string"][:80]!r}\n')
                f.write(f'         {r["context"]}\n')
    print(f'\nRapport sauvegardé : /home/z/my-project/.tmp/audit-exhaustif.txt')

if __name__ == '__main__':
    main()
