#!/usr/bin/env python3
"""Translate 37 remaining keys (common.*, common.errors.*, targets.*) to ES/DE/IT/PT/NL."""
import json
from pathlib import Path

LOCALE_DIR = Path('/home/z/my-project/src/i18n/locales')

# Translations for all 5 languages
TRANSLATIONS = {
    # === common.* (3 keys) ===
    'common.defaultPoolName': {
        'es': 'Mi piscina', 'de': 'Mein Pool', 'it': 'La mia piscina', 'pt': 'A minha piscina', 'nl': 'Mijn zwembad'
    },
    'common.demoAccountName': {
        'es': 'Cuenta de demostración', 'de': 'Demo-Konto', 'it': 'Account dimostrativo', 'pt': 'Conta de demonstração', 'nl': 'Demo-account'
    },
    'common.demoPoolName': {
        'es': 'Piscina de demo', 'de': 'Demo-Pool', 'it': 'Piscina demo', 'pt': 'Piscina de demo', 'nl': 'Demo-zwembad'
    },
    # === common.errors.* (6 keys) ===
    'common.errors.accountCreateError': {
        'es': 'Error al crear la cuenta', 'de': 'Fehler beim Erstellen des Kontos', 'it': 'Errore durante la creazione dell\'account', 'pt': 'Erro ao criar a conta', 'nl': 'Fout bij aanmaken account'
    },
    'common.errors.accountDeleteError': {
        'es': 'Error al eliminar la cuenta', 'de': 'Fehler beim Löschen des Kontos', 'it': 'Errore durante l\'eliminazione dell\'account', 'pt': 'Erro ao eliminar a conta', 'nl': 'Fout bij verwijderen account'
    },
    'common.errors.accountExists': {
        'es': 'Ya existe una cuenta con este email', 'de': 'Ein Konto mit dieser E-Mail existiert bereits', 'it': 'Un account con questa email esiste già', 'pt': 'Já existe uma conta com este email', 'nl': 'Er bestaat al een account met dit e-mailadres'
    },
    'common.errors.demoCreateError': {
        'es': 'Error al crear la cuenta de demo', 'de': 'Fehler beim Erstellen des Demo-Kontos', 'it': 'Errore durante la creazione dell\'account demo', 'pt': 'Erro ao criar a conta de demo', 'nl': 'Fout bij aanmaken demo-account'
    },
    'common.errors.phRequired': {
        'es': 'pH obligatorio', 'de': 'pH erforderlich', 'it': 'pH obbligatorio', 'pt': 'pH obrigatório', 'nl': 'pH vereist'
    },
    'common.errors.poolProfileRequired': {
        'es': 'Perfil de piscina requerido', 'de': 'Poolprofil erforderlich', 'it': 'Profilo piscina obbligatorio', 'pt': 'Perfil de piscina obrigatório', 'nl': 'Zwembadprofiel vereist'
    },
    # === targets.* (28 keys) ===
    'targets.ph.label': {
        'es': 'pH', 'de': 'pH-Wert', 'it': 'pH', 'pt': 'pH', 'nl': 'pH'
    },
    'targets.ph.consequenceLow': {
        'es': 'Agua ácida: irritación, corrosión de equipos, cloro inestable.', 'de': 'Säurehaltiges Wasser: Reizung, Korrosion der Geräte, instabiles Chlor.', 'it': 'Acqua acida: irritazione, corrosione delle attrezzature, cloro instabile.', 'pt': 'Água ácida: irritação, corrosão dos equipamentos, cloro instável.', 'nl': 'Zuur water: irritatie, corrosie van apparatuur, onstabiele chloor.'
    },
    'targets.ph.consequenceHigh': {
        'es': 'Agua básica: cloro menos eficaz, sarro, agua turbia.', 'de': 'Basisches Wasser: Chlor weniger wirksam, Kalk, trübes Wasser.', 'it': 'Acqua basica: cloro meno efficace, calcare, acqua torbida.', 'pt': 'Água básica: cloro menos eficaz, calcário, água turva.', 'nl': 'Basisch water: chloor minder effectief, kalkaanslag, troebel water.'
    },
    'targets.freeChlorine.label': {
        'es': 'Cloro libre', 'de': 'Freies Chlor', 'it': 'Cloro libero', 'pt': 'Cloro livre', 'nl': 'Vrije chloor'
    },
    'targets.freeChlorine.consequenceLow': {
        'es': 'Desinfección insuficiente: riesgo de algas y bacterias.', 'de': 'Unzureichende Desinfektion: Algen- und Bakterienrisiko.', 'it': 'Disinfezione insufficiente: rischio alghe e batteri.', 'pt': 'Desinfeção insuficiente: risco de algas e bactérias.', 'nl': 'Onvoldoende desinfectie: risico op algen en bacteriën.'
    },
    'targets.freeChlorine.consequenceHigh': {
        'es': 'Cloro libre en el límite alto.', 'de': 'Freies Chlor an der Obergrenze.', 'it': 'Cloro libero al limite alto.', 'pt': 'Cloro livre no limite alto.', 'nl': 'Vrije chloor op de bovengrens.'
    },
    'targets.combinedChlorine.label': {
        'es': 'Cloro combinado', 'de': 'Gebundenes Chlor', 'it': 'Cloro combinato', 'pt': 'Cloro combinado', 'nl': 'Gebonden chloor'
    },
    'targets.combinedChlorine.consequenceHigh': {
        'es': 'Cloro combinado alto: olor fuerte, irritación de ojos, cloraminas.', 'de': 'Hohes gebundenes Chlor: starker Geruch, Augenreizung, Chloramine.', 'it': 'Cloro combinato alto: forte odore, irritazione degli occhi, clorammine.', 'pt': 'Cloro combinado alto: cheiro forte, irritação dos olhos, cloraminas.', 'nl': 'Hoog gebonden chloor: sterke geur, oogirritatie, chloramines.'
    },
    'targets.alkalinity.label': {
        'es': 'Alcalinidad (TAC)', 'de': 'Alkalinität (TAC)', 'it': 'Alcalinità (TAC)', 'pt': 'Alcalinidade (TAC)', 'nl': 'Alkaliniteit (TAC)'
    },
    'targets.alkalinity.consequenceLow': {
        'es': 'pH inestable, variaciones rápidas.', 'de': 'Instabiler pH-Wert, schnelle Schwankungen.', 'it': 'pH instabile, variazioni rapide.', 'pt': 'pH instável, variações rápidas.', 'nl': 'Onstabiele pH, snelle schommelingen.'
    },
    'targets.alkalinity.consequenceHigh': {
        'es': 'pH difícil de ajustar, agua turbia.', 'de': 'pH-Wert schwer einzustellen, trübes Wasser.', 'it': 'pH difficile da regolare, acqua torbida.', 'pt': 'pH difícil de ajustar, água turva.', 'nl': 'pH moeilijk af te stellen, troebel water.'
    },
    'targets.calciumHardness.label': {
        'es': 'Dureza calcio (TH)', 'de': 'Calciumhärte (TH)', 'it': 'Durezza calcica (TH)', 'pt': 'Dureza cálcica (TH)', 'nl': 'Calciumhardheid (TH)'
    },
    'targets.calciumHardness.consequenceLow': {
        'es': 'Agua agresiva: corrosión, espuma.', 'de': 'Aggressives Wasser: Korrosion, Schaum.', 'it': 'Acqua aggressiva: corrosione, schiuma.', 'pt': 'Água agressiva: corrosão, espuma.', 'nl': 'Agressief water: corrosie, schuim.'
    },
    'targets.calciumHardness.consequenceHigh': {
        'es': 'Sarro, depósitos, agua turbia.', 'de': 'Kalk, Ablagerungen, trübes Wasser.', 'it': 'Calcare, depositi, acqua torbida.', 'pt': 'Calcário, depósitos, água turva.', 'nl': 'Kalkaanslag, afzettingen, troebel water.'
    },
    'targets.cyanuricAcid.label': {
        'es': 'Estabilizante (CYA)', 'de': 'Stabilisator (CYA)', 'it': 'Stabilizzante (CYA)', 'pt': 'Estabilizante (CYA)', 'nl': 'Stabilisator (CYA)'
    },
    'targets.cyanuricAcid.consequenceLow': {
        'es': 'Cloro degradado rápido por el sol.', 'de': 'Chlor durch Sonne schnell abgebaut.', 'it': 'Cloro degradato velocemente dal sole.', 'pt': 'Cloro degradado rapidamente pelo sol.', 'nl': 'Chloor wordt snel door de zon afgebroken.'
    },
    'targets.cyanuricAcid.consequenceHigh': {
        'es': 'Cloro bloqueado: tratamiento ineficaz, riesgo de algas.', 'de': 'Chlor blockiert: Behandlung unwirksam, Algenrisiko.', 'it': 'Cloro bloccato: trattamento inefficace, rischio alghe.', 'pt': 'Cloro bloqueado: tratamento ineficaz, risco de algas.', 'nl': 'Chloor geblokkeerd: behandeling ineffectief, risico op algen.'
    },
    'targets.salt.label': {
        'es': 'Sal', 'de': 'Salz', 'it': 'Sale', 'pt': 'Sal', 'nl': 'Zout'
    },
    'targets.salt.consequenceLow': {
        'es': 'Electrolizador no produce suficiente cloro.', 'de': 'Elektrolysegerät produziert nicht genug Chlor.', 'it': 'L\'elettrolizzatore non produce abbastanza cloro.', 'pt': 'O eletrolisador não produz cloro suficiente.', 'nl': 'Elektrolyseapparaat produceert niet genoeg chloor.'
    },
    'targets.bromine.label': {
        'es': 'Bromo', 'de': 'Brom', 'it': 'Bromo', 'pt': 'Bromo', 'nl': 'Broom'
    },
    'targets.bromine.consequenceLow': {
        'es': 'Desinfección insuficiente.', 'de': 'Unzureichende Desinfektion.', 'it': 'Disinfezione insufficiente.', 'pt': 'Desinfeção insuficiente.', 'nl': 'Onvoldoende desinfectie.'
    },
    'targets.bromine.consequenceHigh': {
        'es': 'Sobredosis, irritación.', 'de': 'Überdosierung, Reizung.', 'it': 'Sovradosaggio, irritazione.', 'pt': 'Sobredosagem, irritação.', 'nl': 'Overdosis, irritatie.'
    },
    'targets.phosphates.label': {
        'es': 'Fosfatos', 'de': 'Phosphate', 'it': 'Fosfati', 'pt': 'Fosfatos', 'nl': 'Fosfaten'
    },
    'targets.phosphates.consequenceHigh': {
        'es': 'Nutre las algas: riesgo alto de agua verde.', 'de': 'Nährt Algen: hohes Risiko für grünes Wasser.', 'it': 'Nutre le alghe: alto rischio di acqua verde.', 'pt': 'Nutre as algas: risco elevado de água verde.', 'nl': 'Voedt algen: hoog risico op groen water.'
    },
    'targets.temperature.label': {
        'es': 'Temperatura', 'de': 'Temperatur', 'it': 'Temperatura', 'pt': 'Temperatura', 'nl': 'Temperatuur'
    },
    'targets.temperature.consequenceHigh': {
        'es': 'Evaporación, algas, sobreconsumo de cloro.', 'de': 'Verdunstung, Algen, übermäßiger Chlorverbrauch.', 'it': 'Evaporazione, alghe, sovraconsumo di cloro.', 'pt': 'Evaporação, algas, consumo excessivo de cloro.', 'nl': 'Verdamping, algen, overmatig chloorverbruik.'
    },
}

def set_nested(d, dotted_key, value):
    parts = dotted_key.split('.')
    current = d
    for part in parts[:-1]:
        if part not in current or not isinstance(current[part], dict):
            current[part] = {}
        current = current[part]
    current[parts[-1]] = value

for lang in ['es', 'de', 'it', 'pt', 'nl']:
    locale_file = LOCALE_DIR / f'{lang}.json'
    with open(locale_file) as f:
        d = json.load(f)
    
    added = 0
    for dotted_key, translations in TRANSLATIONS.items():
        value = translations[lang]
        set_nested(d, dotted_key, value)
        added += 1
    
    with open(locale_file, 'w') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'{lang}.json: added {added} keys')

# Verify all langs now have same key count
print('\n=== FINAL KEY COUNT ===')
def flatten_count(d):
    count = 0
    for v in d.values():
        if isinstance(v, dict):
            count += flatten_count(v)
        else:
            count += 1
    return count

for lang in ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']:
    with open(LOCALE_DIR / f'{lang}.json') as f:
        d = json.load(f)
    print(f'{lang}: {flatten_count(d)} total keys')
