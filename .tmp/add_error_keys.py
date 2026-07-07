#!/usr/bin/env python3
"""Add all missing error keys to common.errors.* in all 7 locale files."""
import json
from pathlib import Path

LOCALE_DIR = Path('/home/z/my-project/src/i18n/locales')

ERRORS = {
    'unauthorized': {
        'fr': 'Non autorisé', 'en': 'Unauthorized', 'es': 'No autorizado',
        'de': 'Nicht autorisiert', 'it': 'Non autorizzato', 'pt': 'Não autorizado', 'nl': 'Niet geautoriseerd'
    },
    'notFound': {
        'fr': 'Non trouvé', 'en': 'Not found', 'es': 'No encontrado',
        'de': 'Nicht gefunden', 'it': 'Non trovato', 'pt': 'Não encontrado', 'nl': 'Niet gevonden'
    },
    'emailInvalid': {
        'fr': 'Email invalide', 'en': 'Invalid email', 'es': 'Email no válido',
        'de': 'Ungültige E-Mail', 'it': 'Email non valida', 'pt': 'Email inválido', 'nl': 'Ongeldig e-mailadres'
    },
    'passwordTooShort': {
        'fr': 'Le mot de passe doit contenir au moins 8 caractères',
        'en': 'Password must be at least 8 characters',
        'es': 'La contraseña debe tener al menos 8 caracteres',
        'de': 'Das Passwort muss mindestens 8 Zeichen lang sein',
        'it': 'La password deve contenere almeno 8 caratteri',
        'pt': 'A palavra-passe deve ter pelo menos 8 caracteres',
        'nl': 'Het wachtwoord moet minimaal 8 tekens bevatten'
    },
    'guideNotFound': {
        'fr': 'Guide introuvable', 'en': 'Guide not found', 'es': 'Guía no encontrada',
        'de': 'Anleitung nicht gefunden', 'it': 'Guida non trovata', 'pt': 'Guia não encontrado', 'nl': 'Gids niet gevonden'
    },
    'equipmentNotFound': {
        'fr': 'Équipement introuvable', 'en': 'Equipment not found', 'es': 'Equipo no encontrado',
        'de': 'Gerät nicht gefunden', 'it': 'Attrezzatura non trovata', 'pt': 'Equipamento não encontrado', 'nl': 'Apparatuur niet gevonden'
    },
    'exportError': {
        'fr': "Erreur lors de l'export des données", 'en': 'Error exporting data',
        'es': 'Error al exportar los datos', 'de': 'Fehler beim Exportieren der Daten',
        'it': "Errore durante l'esportazione dei dati", 'pt': 'Erro ao exportar os dados', 'nl': 'Fout bij exporteren van gegevens'
    },
    'chatError': {
        'fr': "Désolé, je n'ai pas pu générer de réponse.",
        'en': "Sorry, I couldn't generate a response.",
        'es': 'Lo siento, no he podido generar una respuesta.',
        'de': 'Entschuldigung, ich konnte keine Antwort generieren.',
        'it': 'Spiacente, non ho potuto generare una risposta.',
        'pt': 'Desculpe, não consegui gerar uma resposta.',
        'nl': 'Sorry, ik kon geen antwoord genereren.'
    },
    'demoLoginMessage': {
        'fr': 'Utilisez ces identifiants pour vous connecter',
        'en': 'Use these credentials to sign in',
        'es': 'Use estas credenciales para iniciar sesión',
        'de': 'Verwenden Sie diese Anmeldedaten zur Anmeldung',
        'it': 'Usa queste credenziali per accedere',
        'pt': 'Use estas credenciais para iniciar sessão',
        'nl': 'Gebruik deze inloggegevens om aan te melden'
    },
    'regionSudEst': {
        'fr': 'Sud-Est / PACA', 'en': 'South-East / PACA',
        'es': 'Sureste / PACA', 'de': 'Südosten / PACA',
        'it': 'Sud-Est / PACA', 'pt': 'Sudeste / PACA', 'nl': 'Zuidoost / PACA'
    },
}

for lang in ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']:
    with open(LOCALE_DIR / f'{lang}.json') as f:
        d = json.load(f)
    common = d.setdefault('common', {})
    errors = common.setdefault('errors', {})
    added = 0
    for k, translations in ERRORS.items():
        if k not in errors:
            errors[k] = translations[lang]
            added += 1
    common['errors'] = errors
    d['common'] = common
    with open(LOCALE_DIR / f'{lang}.json', 'w') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'{lang}.json: added {added} error keys (total errors: {len(errors)})')
