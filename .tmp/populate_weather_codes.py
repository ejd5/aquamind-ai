#!/usr/bin/env python3
"""
Populate weather.codes.* in all 7 locale files with translated weather descriptions.
Uses a comprehensive translation map (manually verified for accuracy).
"""
import json
from pathlib import Path

LOCALE_DIR = Path('/home/z/my-project/src/i18n/locales')

# Weather codes -> French description (from weather-engine.ts wttrCodeToFr)
# Note: some codes are duplicated in the original map; we keep the first occurrence
WEATHER_CODES_FR = {
    113: 'Ensoleillé',
    116: 'Partiellement nuageux',
    119: 'Nuageux',
    122: 'Très nuageux',
    143: 'Brume',
    176: 'Pluies éparses',
    179: 'Neige éparses',
    182: 'Grésil épars',
    185: 'Pluie verglaçante éparses',
    200: 'Orageux',
    227: 'Neige',
    230: 'Fortes chutes de neige',
    248: 'Brouillard',
    260: 'Brouillard givrant',
    263: 'Pluie légère',
    266: 'Pluie légère',
    281: 'Pluie verglaçante',
    284: 'Forte pluie verglaçante',
    293: 'Pluies éparses',
    296: 'Pluie',
    299: 'Forte pluie',
    302: 'Très forte pluie',
    305: 'Pluies violentes',
    308: 'Pluies torrentielles',
    311: 'Pluie verglaçante',
    314: 'Pluie verglaçante forte',
    317: 'Grésil',
    320: 'Neige',
    323: 'Neige éparses',
    326: 'Neige',
    329: 'Fortes chutes',
    332: 'Fortes chutes',
    335: 'Très fortes chutes',
    338: 'Blizzard',
    350: 'Grésil',
    353: 'Averses',
    356: 'Forte averse',
    359: 'Averse violente',
    362: 'Averse grésil',
    365: 'Forte averse grésil',
    368: 'Averse neige',
    371: 'Forte averse neige',
    374: 'Averse grésil',
    377: 'Averse pluie verglaçante',
    386: 'Orage épars',
    389: 'Orage fort',
    392: 'Orage neige',
    395: 'Fort orage neige',
}

# Translations for all 6 non-FR languages
# Format: { code: { 'en': ..., 'es': ..., 'de': ..., 'it': ..., 'pt': ..., 'nl': ... } }
# Built from the FR source with careful translation of each weather term.
TRANSLATIONS = {
    113: {  # Ensoleillé
        'en': 'Sunny', 'es': 'Soleado', 'de': 'Sonnig', 'it': 'Soleggiato', 'pt': 'Ensolarado', 'nl': 'Zonnig'
    },
    116: {  # Partiellement nuageux
        'en': 'Partly cloudy', 'es': 'Parcialmente nublado', 'de': 'Teilweise bewölkt', 'it': 'Parzialmente nuvoloso', 'pt': 'Parcialmente nublado', 'nl': 'Half bewolkt'
    },
    119: {  # Nuageux
        'en': 'Cloudy', 'es': 'Nublado', 'de': 'Bewölkt', 'it': 'Nuvoloso', 'pt': 'Nublado', 'nl': 'Bewolkt'
    },
    122: {  # Très nuageux
        'en': 'Very cloudy', 'es': 'Muy nublado', 'de': 'Sehr bewölkt', 'it': 'Molto nuvoloso', 'pt': 'Muito nublado', 'nl': 'Zwaar bewolkt'
    },
    143: {  # Brume
        'en': 'Mist', 'es': 'Bruma', 'de': 'Dunst', 'it': 'Foschia', 'pt': 'Névoa', 'nl': 'Nevel'
    },
    176: {  # Pluies éparses
        'en': 'Scattered showers', 'es': 'Chubascos dispersos', 'de': 'Vereinzelte Schauer', 'it': 'Rovesci sparsi', 'pt': 'Aguaceiros dispersos', 'nl': 'Verspreide buien'
    },
    179: {  # Neige éparses
        'en': 'Scattered snow', 'es': 'Nieve dispersa', 'de': 'Vereinzelter Schnee', 'it': 'Neve sparsa', 'pt': 'Neve dispersa', 'nl': 'Verspreide sneeuw'
    },
    182: {  # Grésil épars
        'en': 'Scattered sleet', 'es': 'Aguanieve dispersa', 'de': 'Vereinzelter Graupel', 'it': 'Nevischio sparso', 'pt': 'Granizo disperso', 'nl': 'Verspreide ijzel'
    },
    185: {  # Pluie verglaçante éparses
        'en': 'Scattered freezing rain', 'es': 'Lluvia helada dispersa', 'de': 'Vereinzelter gefrierender Regen', 'it': 'Pioggia gelata sparsa', 'pt': 'Chuva gelada dispersa', 'nl': 'Verspreide ijzelregen'
    },
    200: {  # Orageux
        'en': 'Thundery', 'es': 'Tormentoso', 'de': 'Gewittrig', 'it': 'Temporalesco', 'pt': 'Tempestuoso', 'nl': 'Onweerachtig'
    },
    227: {  # Neige
        'en': 'Snow', 'es': 'Nieve', 'de': 'Schnee', 'it': 'Neve', 'pt': 'Neve', 'nl': 'Sneeuw'
    },
    230: {  # Fortes chutes de neige
        'en': 'Heavy snowfall', 'es': 'Fuertes nevadas', 'de': 'Starker Schneefall', 'it': 'Forti nevicate', 'pt': 'Nevascas fortes', 'nl': 'Zware sneeuwval'
    },
    248: {  # Brouillard
        'en': 'Fog', 'es': 'Niebla', 'de': 'Nebel', 'it': 'Nebbia', 'pt': 'Nevoeiro', 'nl': 'Mist'
    },
    260: {  # Brouillard givrant
        'en': 'Freezing fog', 'es': 'Niebla helada', 'de': 'Gefrierender Nebel', 'it': 'Nebbia gelata', 'pt': 'Nevoeiro gelado', 'nl': 'IJsnevel'
    },
    263: {  # Pluie légère
        'en': 'Light rain', 'es': 'Lluvia ligera', 'de': 'Leichter Regen', 'it': 'Pioggia leggera', 'pt': 'Chuva ligeira', 'nl': 'Lichte regen'
    },
    266: {  # Pluie légère
        'en': 'Light rain', 'es': 'Lluvia ligera', 'de': 'Leichter Regen', 'it': 'Pioggia leggera', 'pt': 'Chuva ligeira', 'nl': 'Lichte regen'
    },
    281: {  # Pluie verglaçante
        'en': 'Freezing rain', 'es': 'Lluvia helada', 'de': 'Gefrierender Regen', 'it': 'Pioggia gelata', 'pt': 'Chuva gelada', 'nl': 'Ijsregen'
    },
    284: {  # Forte pluie verglaçante
        'en': 'Heavy freezing rain', 'es': 'Lluvia helada fuerte', 'de': 'Starker gefrierender Regen', 'it': 'Pioggia gelata forte', 'pt': 'Chuva gelada forte', 'nl': 'Zware ijzelregen'
    },
    293: {  # Pluies éparses
        'en': 'Scattered showers', 'es': 'Chubascos dispersos', 'de': 'Vereinzelte Schauer', 'it': 'Rovesci sparsi', 'pt': 'Aguaceiros dispersos', 'nl': 'Verspreide buien'
    },
    296: {  # Pluie
        'en': 'Rain', 'es': 'Lluvia', 'de': 'Regen', 'it': 'Pioggia', 'pt': 'Chuva', 'nl': 'Regen'
    },
    299: {  # Forte pluie
        'en': 'Heavy rain', 'es': 'Lluvia fuerte', 'de': 'Starker Regen', 'it': 'Pioggia forte', 'pt': 'Chuva forte', 'nl': 'Zware regen'
    },
    302: {  # Très forte pluie
        'en': 'Very heavy rain', 'es': 'Lluvia muy fuerte', 'de': 'Sehr starker Regen', 'it': 'Pioggia molto forte', 'pt': 'Chuva muito forte', 'nl': 'Zeer zware regen'
    },
    305: {  # Pluies violentes
        'en': 'Violent rain', 'es': 'Lluvia violenta', 'de': 'Heftiger Regen', 'it': 'Pioggia violenta', 'pt': 'Chuva violenta', 'nl': 'Gewelddadige regen'
    },
    308: {  # Pluies torrentielles
        'en': 'Torrential rain', 'es': 'Lluvia torrencial', 'de': 'Wolkenbruch', 'it': 'Pioggia torrenziale', 'pt': 'Chuva torrencial', 'nl': 'Stortregen'
    },
    311: {  # Pluie verglaçante
        'en': 'Freezing rain', 'es': 'Lluvia helada', 'de': 'Gefrierender Regen', 'it': 'Pioggia gelata', 'pt': 'Chuva gelada', 'nl': 'Ijsregen'
    },
    314: {  # Pluie verglaçante forte
        'en': 'Heavy freezing rain', 'es': 'Lluvia helada fuerte', 'de': 'Starker gefrierender Regen', 'it': 'Pioggia gelata forte', 'pt': 'Chuva gelada forte', 'nl': 'Zware ijzelregen'
    },
    317: {  # Grésil
        'en': 'Sleet', 'es': 'Aguanieve', 'de': 'Graupel', 'it': 'Nevischio', 'pt': 'Granizo', 'nl': 'IJzel'
    },
    320: {  # Neige
        'en': 'Snow', 'es': 'Nieve', 'de': 'Schnee', 'it': 'Neve', 'pt': 'Neve', 'nl': 'Sneeuw'
    },
    323: {  # Neige éparses
        'en': 'Scattered snow', 'es': 'Nieve dispersa', 'de': 'Vereinzelter Schnee', 'it': 'Neve sparsa', 'pt': 'Neve dispersa', 'nl': 'Verspreide sneeuw'
    },
    326: {  # Neige
        'en': 'Snow', 'es': 'Nieve', 'de': 'Schnee', 'it': 'Neve', 'pt': 'Neve', 'nl': 'Sneeuw'
    },
    329: {  # Fortes chutes
        'en': 'Heavy snow', 'es': 'Nieve fuerte', 'de': 'Starker Schnee', 'it': 'Forte neve', 'pt': 'Neve forte', 'nl': 'Zware sneeuw'
    },
    332: {  # Fortes chutes
        'en': 'Heavy snow', 'es': 'Nieve fuerte', 'de': 'Starker Schnee', 'it': 'Forte neve', 'pt': 'Neve forte', 'nl': 'Zware sneeuw'
    },
    335: {  # Très fortes chutes
        'en': 'Very heavy snow', 'es': 'Nieve muy fuerte', 'de': 'Sehr starker Schnee', 'it': 'Neve molto forte', 'pt': 'Neve muito forte', 'nl': 'Zeer zware sneeuw'
    },
    338: {  # Blizzard
        'en': 'Blizzard', 'es': 'Ventisca', 'de': 'Schneesturm', 'it': 'Bufera', 'pt': 'Nevasca', 'nl': 'Sneeuwstorm'
    },
    350: {  # Grésil
        'en': 'Sleet', 'es': 'Aguanieve', 'de': 'Graupel', 'it': 'Nevischio', 'pt': 'Granizo', 'nl': 'IJzel'
    },
    353: {  # Averses
        'en': 'Showers', 'es': 'Aguaceros', 'de': 'Schauer', 'it': 'Rovesci', 'pt': 'Aguaceiros', 'nl': 'Buien'
    },
    356: {  # Forte averse
        'en': 'Heavy showers', 'es': 'Aguaceros fuertes', 'de': 'Starke Schauer', 'it': 'Rovesci forti', 'pt': 'Aguaceiros fortes', 'nl': 'Zware buien'
    },
    359: {  # Averse violente
        'en': 'Violent shower', 'es': 'Aguacero violento', 'de': 'Heftiger Schauer', 'it': 'Rovescio violento', 'pt': 'Aguaceiro violento', 'nl': 'Gewelddadige bui'
    },
    362: {  # Averse grésil
        'en': 'Sleet showers', 'es': 'Aguanieve dispersa', 'de': 'Graupelschauer', 'it': 'Rovesci di nevischio', 'pt': 'Aguaceiros de granizo', 'nl': 'IJzelbuien'
    },
    365: {  # Forte averse grésil
        'en': 'Heavy sleet showers', 'es': 'Aguanieve fuerte dispersa', 'de': 'Starke Graupelschauer', 'it': 'Rovesci forti di nevischio', 'pt': 'Aguaceiros fortes de granizo', 'nl': 'Zware ijzelbuien'
    },
    368: {  # Averse neige
        'en': 'Snow showers', 'es': 'Chubascos de nieve', 'de': 'Schneeschauer', 'it': 'Rovesci di neve', 'pt': 'Aguaceiros de neve', 'nl': 'Sneeuwbuien'
    },
    371: {  # Forte averse neige
        'en': 'Heavy snow showers', 'es': 'Chubascos de nieve fuertes', 'de': 'Starke Schneeschauer', 'it': 'Rovesci forti di neve', 'pt': 'Aguaceiros fortes de neve', 'nl': 'Zware sneeuwbuien'
    },
    374: {  # Averse grésil
        'en': 'Sleet showers', 'es': 'Aguanieve dispersa', 'de': 'Graupelschauer', 'it': 'Rovesci di nevischio', 'pt': 'Aguaceiros de granizo', 'nl': 'IJzelbuien'
    },
    377: {  # Averse pluie verglaçante
        'en': 'Freezing rain showers', 'es': 'Chubascos de lluvia helada', 'de': 'Gefrierregen-Schauer', 'it': 'Rovesci di pioggia gelata', 'pt': 'Aguaceiros de chuva gelada', 'nl': 'Ijsregenbuien'
    },
    386: {  # Orage épars
        'en': 'Scattered thunderstorm', 'es': 'Tormenta dispersa', 'de': 'Vereinzeltes Gewitter', 'it': 'Temporale sparso', 'pt': 'Tempestade dispersa', 'nl': 'Verspreid onweer'
    },
    389: {  # Orage fort
        'en': 'Severe thunderstorm', 'es': 'Tormenta fuerte', 'de': 'Schweres Gewitter', 'it': 'Temporale forte', 'pt': 'Tempestade forte', 'nl': 'Zwaar onweer'
    },
    392: {  # Orage neige
        'en': 'Thunderstorm with snow', 'es': 'Tormenta con nieve', 'de': 'Gewitter mit Schnee', 'it': 'Temporale con neve', 'pt': 'Tempestade com neve', 'nl': 'Onweer met sneeuw'
    },
    395: {  # Fort orage neige
        'en': 'Severe thunderstorm with snow', 'es': 'Tormenta fuerte con nieve', 'de': 'Schweres Gewitter mit Schnee', 'it': 'Temporale forte con neve', 'pt': 'Tempestade forte com neve', 'nl': 'Zwaar onweer met sneeuw'
    },
}

# Undefined code fallback
UNDEFINED = {
    'fr': 'Indéterminé',
    'en': 'Undefined',
    'es': 'Indefinido',
    'de': 'Undefiniert',
    'it': 'Indefinito',
    'pt': 'Indefinido',
    'nl': 'Ongedefinieerd',
}

for lang in ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']:
    locale_file = LOCALE_DIR / f'{lang}.json'
    with open(locale_file) as f:
        d = json.load(f)
    
    # Get or create weather.codes namespace
    weather = d.setdefault('weather', {})
    codes = weather.setdefault('codes', {})
    
    added = 0
    # Add all weather codes
    for code, fr_desc in WEATHER_CODES_FR.items():
        code_str = str(code)
        if lang == 'fr':
            value = fr_desc
        else:
            value = TRANSLATIONS[code][lang]
        if codes.get(code_str) != value:
            codes[code_str] = value
            added += 1
    
    # Add undefined fallback
    if 'undefined' not in codes:
        codes['undefined'] = UNDEFINED[lang]
        added += 1
    
    weather['codes'] = codes
    d['weather'] = weather
    
    with open(locale_file, 'w') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write('\n')
    
    print(f'{lang}.json: populated {len(codes)} weather codes ({added} new)')

# Verify
print('\n=== VERIFICATION ===')
for lang in ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']:
    with open(LOCALE_DIR / f'{lang}.json') as f:
        d = json.load(f)
    codes = d.get('weather', {}).get('codes', {})
    # Check a few codes
    sample = [codes.get(str(c), 'MISSING') for c in [113, 116, 302, 389]]
    print(f'{lang}: {len(codes)} codes | sample: {sample}')
