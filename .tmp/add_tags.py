#!/usr/bin/env python3
"""Add 32 missing guide tag_* keys to all 7 locale files."""
import json
from pathlib import Path

LOCALE_DIR = Path('/home/z/my-project/src/i18n/locales')

# 32 missing tags with translations for all 7 languages
TAGS = {
    'tag_absence': {
        'fr': 'Absence', 'en': 'Absence', 'es': 'Ausencia', 'de': 'Abwesenheit', 'it': 'Assenza', 'pt': 'Ausência', 'nl': 'Afwezigheid'
    },
    'tag_alcalinite': {
        'fr': 'Alcalinité', 'en': 'Alkalinity', 'es': 'Alcalinidad', 'de': 'Alkalinität', 'it': 'Alcalinità', 'pt': 'Alcalinidade', 'nl': 'Alkaliniteit'
    },
    'tag_baignade': {
        'fr': 'Baignade', 'en': 'Swimming', 'es': 'Baño', 'de': 'Baden', 'it': 'Balneazione', 'pt': 'Banho', 'nl': 'Zwemmen'
    },
    'tag_base': {
        'fr': 'Base', 'en': 'Base', 'es': 'Base', 'de': 'Basisch', 'it': 'Basico', 'pt': 'Básico', 'nl': 'Basisch'
    },
    'tag_brome': {
        'fr': 'Brome', 'en': 'Bromine', 'es': 'Bromo', 'de': 'Brom', 'it': 'Bromo', 'pt': 'Bromo', 'nl': 'Broom'
    },
    'tag_cellule': {
        'fr': 'Cellule', 'en': 'Cell', 'es': 'Célula', 'de': 'Zelle', 'it': 'Cellula', 'pt': 'Célula', 'nl': 'Cel'
    },
    'tag_chaud': {
        'fr': 'Chaud', 'en': 'Hot', 'es': 'Caliente', 'de': 'Heiß', 'it': 'Caldo', 'pt': 'Quente', 'nl': 'Heet'
    },
    'tag_cya': {
        'fr': 'CYA', 'en': 'CYA', 'es': 'CYA', 'de': 'CYA', 'it': 'CYA', 'pt': 'CYA', 'nl': 'CYA'
    },
    'tag_dilution': {
        'fr': 'Dilution', 'en': 'Dilution', 'es': 'Dilución', 'de': 'Verdünnung', 'it': 'Diluizione', 'pt': 'Diluição', 'nl': 'Verdunning'
    },
    'tag_faq': {
        'fr': 'FAQ', 'en': 'FAQ', 'es': 'FAQ', 'de': 'FAQ', 'it': 'FAQ', 'pt': 'FAQ', 'nl': 'FAQ'
    },
    'tag_frequence': {
        'fr': 'Fréquence', 'en': 'Frequency', 'es': 'Frecuencia', 'de': 'Häufigkeit', 'it': 'Frequenza', 'pt': 'Frequência', 'nl': 'Frequentie'
    },
    'tag_hiver': {
        'fr': 'Hiver', 'en': 'Winter', 'es': 'Invierno', 'de': 'Winter', 'it': 'Inverno', 'pt': 'Inverno', 'nl': 'Winter'
    },
    'tag_hivernage': {
        'fr': 'Hivernage', 'en': 'Winterization', 'es': 'Hibernación', 'de': 'Überwinterung', 'it': 'Svernamento', 'pt': 'Invernagem', 'nl': 'Overwintering'
    },
    'tag_meteo': {
        'fr': 'Météo', 'en': 'Weather', 'es': 'Clima', 'de': 'Wetter', 'it': 'Meteo', 'pt': 'Meteorologia', 'nl': 'Weer'
    },
    'tag_nettoyage': {
        'fr': 'Nettoyage', 'en': 'Cleaning', 'es': 'Limpieza', 'de': 'Reinigung', 'it': 'Pulizia', 'pt': 'Limpeza', 'nl': 'Reiniging'
    },
    'tag_orage': {
        'fr': 'Orage', 'en': 'Storm', 'es': 'Tormenta', 'de': 'Gewitter', 'it': 'Temporale', 'pt': 'Tempestade', 'nl': 'Onweer'
    },
    'tag_parcours': {
        'fr': 'Parcours', 'en': 'Path', 'es': 'Recorrido', 'de': 'Pfad', 'it': 'Percorso', 'pt': 'Percurso', 'nl': 'Pad'
    },
    'tag_printemps': {
        'fr': 'Printemps', 'en': 'Spring', 'es': 'Primavera', 'de': 'Frühling', 'it': 'Primavera', 'pt': 'Primavera', 'nl': 'Lente'
    },
    'tag_produits': {
        'fr': 'Produits', 'en': 'Products', 'es': 'Productos', 'de': 'Produkte', 'it': 'Prodotti', 'pt': 'Produtos', 'nl': 'Producten'
    },
    'tag_prevention': {
        'fr': 'Prévention', 'en': 'Prevention', 'es': 'Prevención', 'de': 'Prävention', 'it': 'Prevenzione', 'pt': 'Prevenção', 'nl': 'Preventie'
    },
    'tag_remise_en_route': {
        'fr': 'Remise en route', 'en': 'Restart', 'es': 'Puesta en marcha', 'de': 'Inbetriebnahme', 'it': 'Riavvio', 'pt': 'Reinício', 'nl': 'Herstart'
    },
    'tag_sable': {
        'fr': 'Sable', 'en': 'Sand', 'es': 'Arena', 'de': 'Sand', 'it': 'Sabbia', 'pt': 'Areia', 'nl': 'Zand'
    },
    'tag_saison': {
        'fr': 'Saison', 'en': 'Season', 'es': 'Temporada', 'de': 'Saison', 'it': 'Stagione', 'pt': 'Época', 'nl': 'Seizoen'
    },
    'tag_spa': {
        'fr': 'Spa', 'en': 'Spa', 'es': 'Spa', 'de': 'Spa', 'it': 'Spa', 'pt': 'Spa', 'nl': 'Spa'
    },
    'tag_stabilisant': {
        'fr': 'Stabilisant', 'en': 'Stabilizer', 'es': 'Estabilizante', 'de': 'Stabilisator', 'it': 'Stabilizzante', 'pt': 'Estabilizante', 'nl': 'Stabilisator'
    },
    'tag_stockage': {
        'fr': 'Stockage', 'en': 'Storage', 'es': 'Almacenamiento', 'de': 'Lagerung', 'it': 'Conservazione', 'pt': 'Armazenamento', 'nl': 'Opslag'
    },
    'tag_tac': {
        'fr': 'TAC', 'en': 'TAC', 'es': 'TAC', 'de': 'TAC', 'it': 'TAC', 'pt': 'TAC', 'nl': 'TAC'
    },
    'tag_tartre': {
        'fr': 'Tartre', 'en': 'Scale', 'es': 'Sarro', 'de': 'Kalk', 'it': 'Calcare', 'pt': 'Calcário', 'nl': 'Kalkaanslag'
    },
    'tag_test': {
        'fr': 'Test', 'en': 'Test', 'es': 'Test', 'de': 'Test', 'it': 'Test', 'pt': 'Teste', 'nl': 'Test'
    },
    'tag_traitement': {
        'fr': 'Traitement', 'en': 'Treatment', 'es': 'Tratamiento', 'de': 'Behandlung', 'it': 'Trattamento', 'pt': 'Tratamento', 'nl': 'Behandeling'
    },
    'tag_vacances': {
        'fr': 'Vacances', 'en': 'Vacation', 'es': 'Vacaciones', 'de': 'Urlaub', 'it': 'Vacanza', 'pt': 'Férias', 'nl': 'Vakantie'
    },
    'tag_equilibrage': {
        'fr': 'Équilibrage', 'en': 'Balancing', 'es': 'Equilibrio', 'de': 'Ausgleich', 'it': 'Equilibratura', 'pt': 'Equilíbrio', 'nl': 'Balancering'
    },
}

for lang in ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']:
    locale_file = LOCALE_DIR / f'{lang}.json'
    with open(locale_file) as f:
        d = json.load(f)
    gd = d.setdefault('guidesData', {})
    added = 0
    for key, translations in TAGS.items():
        if key not in gd:
            gd[key] = translations[lang]
            added += 1
    d['guidesData'] = gd
    with open(locale_file, 'w') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'{lang}.json: added {added} tag keys (guidesData total: {len(gd)})')

# Verify
print('\n=== FINAL guidesData key counts ===')
def count(d):
    c = 0
    for v in d.values():
        c += count(v) if isinstance(v, dict) else 1
    return c
for lang in ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']:
    with open(LOCALE_DIR / f'{lang}.json') as f:
        d = json.load(f)
    print(f'{lang}: {count(d)} total keys, guidesData={len(d.get("guidesData", {}))} keys')
