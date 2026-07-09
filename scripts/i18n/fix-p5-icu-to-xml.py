#!/usr/bin/env python3
"""
Fix P5-PAGES i18n bug: ICU {name} placeholders were used in locale strings but
the pages call t.rich(key, { name: (chunks) => <element>{chunks}</element> })
which requires XML tags <name>text</name> in the locale string.

Without this fix, next-intl treats the function as a value to render directly,
causing "Functions are not valid as a child of Client Components" errors and
500s on /legal/cgv, /legal/cookies, /legal/securite, /legal/accessibilite.

This script also fixes the plain t() calls on strings that DO contain
placeholders (article12Body1, article14Body1 in cgv, section6Body1 in cookies)
— those were calling t('key') but the FR string contains {link}/{alink} which
causes FORMATTING_ERROR. The code in those pages already uses t.rich() in
other places, so the bug was inconsistent: some calls used t.rich() and others
used plain t(). The plain-t() calls happen because the FR/EN string contained
{placeholders} but the code path didn't pass values. Since we're now converting
to XML tags, the plain t() calls must be updated to t.rich() too — that is
handled by a separate patch to the page source files.

This script rewrites the locale strings:
  - fr, en: full rewrite of the broken strings with proper inner text
  - es, de, it: same fix with translated inner text per language
  - pt, nl: re-set to __TRANSLATE_NEEDED__ matching the new EN structure
            (a follow-up script can translate them via the ZAI API)

Idempotent: only touches the 4 legal sub-namespaces (cgv, cookies, securite,
accessibilite) and only the specific broken keys.
"""
import json
from pathlib import Path

ROOT = Path('/home/z/my-project/src/i18n/locales')
PLACEHOLDER = '__TRANSLATE_NEEDED__'

# ─────────────────────────────────────────────────────────────────────────────
# Inner-text mappings per locale.
# These are the strings that get wrapped by <bold>, <link>, <alink>, <link2>
# in the locale message. The wrapping renders them as <strong>, <Link>, <a>.
# ─────────────────────────────────────────────────────────────────────────────
INNER_TEXT = {
    # ─── legal.cgv ──────────────────────────────────────────────────────
    'cgv.article8Body2.link': {
        'fr': 'politique de confidentialité',
        'en': 'privacy policy',
        'es': 'política de privacidad',
        'de': 'Datenschutzerklärung',
        'it': 'politica sulla privacy',
        'pt': 'política de privacidade',
        'nl': 'privacybeleid',
    },
    'cgv.article12Body1.link': {
        'fr': 'politique de confidentialité',
        'en': 'privacy policy',
        'es': 'política de privacidad',
        'de': 'Datenschutzerklärung',
        'it': 'politica sulla privacy',
        'pt': 'política de privacidade',
        'nl': 'privacybeleid',
    },
    'cgv.article12Body2.link': {  # links to /legal/cgu
        'fr': 'Conditions Générales d\'Utilisation',
        'en': 'Terms of Use',
        'es': 'Condiciones de Uso',
        'de': 'Nutzungsbedingungen',
        'it': 'Termini di Utilizzo',
        'pt': 'Termos de Uso',
        'nl': 'Gebruiksvoorwaarden',
    },
    'cgv.article12Body2.link2': {
        'fr': 'politique de confidentialité',
        'en': 'privacy policy',
        'es': 'política de privacidad',
        'de': 'Datenschutzerklärung',
        'it': 'politica sulla privacy',
        'pt': 'política de privacidade',
        'nl': 'privacybeleid',
    },
    'cgv.article14Body1.alink': {  # mailto:legal@aqwelia.app
        'fr': 'legal@aqwelia.app',
        'en': 'legal@aqwelia.app',
        'es': 'legal@aqwelia.app',
        'de': 'legal@aqwelia.app',
        'it': 'legal@aqwelia.app',
        'pt': 'legal@aqwelia.app',
        'nl': 'legal@aqwelia.app',
    },
    'cgv.article14Body1.link': {  # /legal/support
        'fr': 'page support',
        'en': 'support page',
        'es': 'página de soporte',
        'de': 'Support-Seite',
        'it': 'pagina di supporto',
        'pt': 'página de suporte',
        'nl': 'ondersteuningspagina',
    },

    # ─── legal.cookies ──────────────────────────────────────────────────
    'cookies.section1Body2.bold': {
        'fr': 'les modifier ou les refuser',
        'en': 'modify or refuse them',
        'es': 'modificarlos o rechazarlos',
        'de': 'sie zu ändern oder abzulehnen',
        'it': 'modificarli o rifiutarli',
        'pt': 'modificá-los ou recusá-los',
        'nl': 'ze te wijzigen of te weigeren',
    },
    'cookies.section2Item1.bold': {
        'fr': 'Cookies essentiels',
        'en': 'Essential cookies',
        'es': 'Cookies esenciales',
        'de': 'Essenzielle Cookies',
        'it': 'Cookie essenziali',
        'pt': 'Cookies essenciais',
        'nl': 'Essentiële cookies',
    },
    'cookies.section2Item2.bold': {
        'fr': 'Cookies statistiques',
        'en': 'Statistics cookies',
        'es': 'Cookies estadísticas',
        'de': 'Statistik-Cookies',
        'it': 'Cookie statistici',
        'pt': 'Cookies estatísticos',
        'nl': 'Statistiekcookies',
    },
    'cookies.section2Item3.bold': {
        'fr': 'Cookies fonctionnels',
        'en': 'Functional cookies',
        'es': 'Cookies funcionales',
        'de': 'Funktionale Cookies',
        'it': 'Cookie funzionali',
        'pt': 'Cookies funcionais',
        'nl': 'Functionele cookies',
    },
    'cookies.section2Item4.bold': {
        'fr': 'Cookies publicitaires',
        'en': 'Advertising cookies',
        'es': 'Cookies publicitarias',
        'de': 'Werbe-Cookies',
        'it': 'Cookie pubblicitari',
        'pt': 'Cookies publicitários',
        'nl': 'Reclamecookies',
    },
    'cookies.section4Body2.link': {  # /settings
        'fr': 'réglages',
        'en': 'settings',
        'es': 'ajustes',
        'de': 'Einstellungen',
        'it': 'impostazioni',
        'pt': 'configurações',
        'nl': 'instellingen',
    },
    'cookies.section5Item1.bold': {
        'fr': 'Réinitialisation',
        'en': 'Reset',
        'es': 'Restablecimiento',
        'de': 'Zurücksetzen',
        'it': 'Ripristino',
        'pt': 'Reposição',
        'nl': 'Resetten',
    },
    'cookies.section5Item2.bold': {
        'fr': 'Personnalisation',
        'en': 'Customization',
        'es': 'Personalización',
        'de': 'Anpassung',
        'it': 'Personalizzazione',
        'pt': 'Personalização',
        'nl': 'Aanpassing',
    },
    'cookies.section5Item3.bold': {
        'fr': 'Mode navigation privée',
        'en': 'Private browsing mode',
        'es': 'Modo de navegación privada',
        'de': 'Privater Modus',
        'it': 'Modalità di navigazione privata',
        'pt': 'Modo de navegação privada',
        'nl': 'Privénavigatiemodus',
    },
    'cookies.section6Body1.link': {  # /contact
        'fr': 'formulaire de contact',
        'en': 'contact form',
        'es': 'formulario de contacto',
        'de': 'Kontaktformular',
        'it': 'modulo di contatto',
        'pt': 'formulário de contato',
        'nl': 'contactformulier',
    },
    'cookies.section6Body2.link': {  # /legal/privacy
        'fr': 'politique de confidentialité',
        'en': 'privacy policy',
        'es': 'política de privacidad',
        'de': 'Datenschutzerklärung',
        'it': 'politica sulla privacy',
        'pt': 'política de privacidade',
        'nl': 'privacybeleid',
    },
    'cookies.section6Body3.alink': {  # mailto:privacy@aqwelia.app
        'fr': 'privacy@aqwelia.app',
        'en': 'privacy@aqwelia.app',
        'es': 'privacy@aqwelia.app',
        'de': 'privacy@aqwelia.app',
        'it': 'privacy@aqwelia.app',
        'pt': 'privacy@aqwelia.app',
        'nl': 'privacy@aqwelia.app',
    },

    # ─── legal.securite ─────────────────────────────────────────────────
    'securite.section1Body1.bold': {
        'fr': 'priorité absolue',
        'en': 'top priority',
        'es': 'prioridad absoluta',
        'de': 'oberste Priorität',
        'it': 'priorità assoluta',
        'pt': 'prioridade absoluta',
        'nl': 'top prioriteit',
    },
    'securite.section2Item1.bold': {
        'fr': 'Droit d\'accès',
        'en': 'Right of access',
        'es': 'Derecho de acceso',
        'de': 'Auskunftsrecht',
        'it': 'Diritto di accesso',
        'pt': 'Direito de acesso',
        'nl': 'Recht op toegang',
    },
    'securite.section2Item2.bold': {
        'fr': 'Droit de rectification',
        'en': 'Right to rectification',
        'es': 'Derecho de rectificación',
        'de': 'Recht auf Berichtigung',
        'it': 'Diritto di rettifica',
        'pt': 'Direito de retificação',
        'nl': 'Recht op rectificatie',
    },
    'securite.section2Item3.bold': {
        'fr': 'Droit à l\'effacement',
        'en': 'Right to erasure',
        'es': 'Derecho de supresión',
        'de': 'Recht auf Löschung',
        'it': 'Diritto alla cancellazione',
        'pt': 'Direito ao apagamento',
        'nl': 'Recht op vergetelheid',
    },
    'securite.section2Item4.bold': {
        'fr': 'Droit à la limitation',
        'en': 'Right to restriction',
        'es': 'Derecho a la limitación',
        'de': 'Recht auf Einschränkung',
        'it': 'Diritto alla limitazione',
        'pt': 'Direito à limitação',
        'nl': 'Recht op beperking',
    },
    'securite.section2Item5.bold': {
        'fr': 'Droit à la portabilité',
        'en': 'Right to data portability',
        'es': 'Derecho a la portabilidad',
        'de': 'Recht auf Datenübertragbarkeit',
        'it': 'Diritto alla portabilità',
        'pt': 'Direito à portabilidade',
        'nl': 'Recht op gegevensoverdraagbaarheid',
    },
    'securite.section3Body2.link': {  # /legal/privacy
        'fr': 'politique de confidentialité',
        'en': 'privacy policy',
        'es': 'política de privacidad',
        'de': 'Datenschutzerklärung',
        'it': 'politica sulla privacy',
        'pt': 'política de privacidade',
        'nl': 'privacybeleid',
    },
    'securite.section5Item1.bold': {
        'fr': 'Notification à la CNIL',
        'en': 'CNIL notification',
        'es': 'Notificación a la CNIL',
        'de': 'Meldung an die CNIL',
        'it': 'Notifica alla CNIL',
        'pt': 'Notificação à CNIL',
        'nl': 'Melding aan de CNIL',
    },
    'securite.section5Item2.bold': {
        'fr': 'Notification aux personnes concernées',
        'en': 'Notification to data subjects',
        'es': 'Notificación a los interesados',
        'de': 'Benachrichtigung der Betroffenen',
        'it': 'Notifica agli interessati',
        'pt': 'Notificação aos titulares',
        'nl': 'Melding aan betrokkenen',
    },
    'securite.section5Item3.bold': {
        'fr': 'Communication publique',
        'en': 'Public communication',
        'es': 'Comunicación pública',
        'de': 'Öffentliche Kommunikation',
        'it': 'Comunicazione pubblica',
        'pt': 'Comunicação pública',
        'nl': 'Openbare communicatie',
    },
    'securite.section5Item4.bold': {
        'fr': 'Assistance',
        'en': 'Assistance',
        'es': 'Asistencia',
        'de': 'Unterstützung',
        'it': 'Assistenza',
        'pt': 'Assistência',
        'nl': 'Bijstand',
    },
    'securite.section6Body1.bold': {  # mailto:security@aqwelia.app
        'fr': 'security@aqwelia.app',
        'en': 'security@aqwelia.app',
        'es': 'security@aqwelia.app',
        'de': 'security@aqwelia.app',
        'it': 'security@aqwelia.app',
        'pt': 'security@aqwelia.app',
        'nl': 'security@aqwelia.app',
    },
    'securite.section6Body2.link': {  # /legal/privacy
        'fr': 'politique de confidentialité',
        'en': 'privacy policy',
        'es': 'política de privacidad',
        'de': 'Datenschutzerklärung',
        'it': 'politica sulla privacy',
        'pt': 'política de privacidade',
        'nl': 'privacybeleid',
    },
    'securite.section6Body2.alink': {  # mailto:dpo@aqwelia.app
        'fr': 'dpo@aqwelia.app',
        'en': 'dpo@aqwelia.app',
        'es': 'dpo@aqwelia.app',
        'de': 'dpo@aqwelia.app',
        'it': 'dpo@aqwelia.app',
        'pt': 'dpo@aqwelia.app',
        'nl': 'dpo@aqwelia.app',
    },

    # ─── legal.accessibilite ────────────────────────────────────────────
    'accessibilite.section1Body1.bold': {
        'fr': 'article 12 du RGAA',
        'en': 'Article 12 of the RGAA',
        'es': 'artículo 12 del RGAA',
        'de': 'Artikel 12 der RGAA',
        'it': 'articolo 12 del RGAA',
        'pt': 'artigo 12 do RGAA',
        'nl': 'artikel 12 van de RGAA',
    },
    'accessibilite.section2Body1.bold': {
        'fr': 'partiellement conforme',
        'en': 'partially conformant',
        'es': 'parcialmente conforme',
        'de': 'teilweise konform',
        'it': 'parzialmente conforme',
        'pt': 'parcialmente conforme',
        'nl': 'gedeeltelijk conform',
    },
    'accessibilite.section6Body1.bold': {
        'fr': 'outils suivants',
        'en': 'following tools',
        'es': 'siguientes herramientas',
        'de': 'folgenden Werkzeuge',
        'it': 'seguenti strumenti',
        'pt': 'seguintes ferramentas',
        'nl': 'volgende hulpmiddelen',
    },
    'accessibilite.section7Body1.alink': {  # mailto:a11y@aqwelia.app
        'fr': 'a11y@aqwelia.app',
        'en': 'a11y@aqwelia.app',
        'es': 'a11y@aqwelia.app',
        'de': 'a11y@aqwelia.app',
        'it': 'a11y@aqwelia.app',
        'pt': 'a11y@aqwelia.app',
        'nl': 'a11y@aqwelia.app',
    },
    'accessibilite.section7Body2.link': {  # /contact
        'fr': 'formulaire de contact',
        'en': 'contact form',
        'es': 'formulario de contacto',
        'de': 'Kontaktformular',
        'it': 'modulo di contatto',
        'pt': 'formulário de contato',
        'nl': 'contactformulier',
    },
    'accessibilite.section7Body2.link2': {  # /legal/support
        'fr': 'support',
        'en': 'support',
        'es': 'soporte',
        'de': 'Support',
        'it': 'supporto',
        'pt': 'suporte',
        'nl': 'ondersteuning',
    },
    'accessibilite.section8Item1.alink': {  # external link
        'fr': 'formulaire dédié',
        'en': 'dedicated form',
        'es': 'formulario dedicado',
        'de': 'dediziertes Formular',
        'it': 'modulo dedicato',
        'pt': 'formulário dedicado',
        'nl': 'toegewijd formulier',
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Helper: build a list of (key, placeholders_in_order_of_appearance) for each
# broken string. We use this to know how to substitute the {name} → <name>...</name>.
# ─────────────────────────────────────────────────────────────────────────────
import re
ICU = re.compile(r'\{(\w+)\}')

# Hard-coded ordered placeholder lists per (namespace, key). We need order
# because some strings have multiple placeholders of different names.
PLACEHOLDERS_PER_KEY = {
    ('cgv', 'article8Body2'): ['link'],
    ('cgv', 'article12Body1'): ['link'],
    ('cgv', 'article12Body2'): ['link', 'link2'],
    ('cgv', 'article14Body1'): ['alink', 'link'],
    ('cookies', 'section1Body2'): ['bold'],
    ('cookies', 'section2Item1'): ['bold'],
    ('cookies', 'section2Item2'): ['bold'],
    ('cookies', 'section2Item3'): ['bold'],
    ('cookies', 'section2Item4'): ['bold'],
    ('cookies', 'section4Body2'): ['link'],
    ('cookies', 'section5Item1'): ['bold'],
    ('cookies', 'section5Item2'): ['bold'],
    ('cookies', 'section5Item3'): ['bold'],
    ('cookies', 'section6Body1'): ['link'],
    ('cookies', 'section6Body2'): ['link'],
    ('cookies', 'section6Body3'): ['alink'],
    ('securite', 'section1Body1'): ['bold'],
    ('securite', 'section2Item1'): ['bold'],
    ('securite', 'section2Item2'): ['bold'],
    ('securite', 'section2Item3'): ['bold'],
    ('securite', 'section2Item4'): ['bold'],
    ('securite', 'section2Item5'): ['bold'],
    ('securite', 'section3Body2'): ['link'],
    ('securite', 'section5Item1'): ['bold'],
    ('securite', 'section5Item2'): ['bold'],
    ('securite', 'section5Item3'): ['bold'],
    ('securite', 'section5Item4'): ['bold'],
    ('securite', 'section6Body1'): ['bold'],
    ('securite', 'section6Body2'): ['link', 'alink'],
    ('accessibilite', 'section1Body1'): ['bold'],
    ('accessibilite', 'section2Body1'): ['bold'],
    ('accessibilite', 'section6Body1'): ['bold'],
    ('accessibilite', 'section7Body1'): ['alink'],
    ('accessibilite', 'section7Body2'): ['link', 'link2'],
    ('accessibilite', 'section8Item1'): ['alink'],
}


def convert_string(s: str, ns: str, key: str, locale: str) -> str:
    """Replace ICU {name} placeholders with XML <name>inner_text</name> tags.

    If a string contains NO {placeholders} (e.g. pt/nl where the entire value
    is __TRANSLATE_NEEDED__), returns PLACEHOLDER unchanged.
    """
    if s == PLACEHOLDER or '__TRANSLATE_NEEDED__' in s:
        # For pt/nl, we re-init with __TRANSLATE_NEEDED__ — handled separately.
        return s

    # Find all {name} placeholders and replace them in order.
    placeholders = PLACEHOLDERS_PER_KEY.get((ns, key), [])
    if not placeholders:
        # No known placeholders; double-check there are none in the string.
        if ICU.search(s):
            print(f"  WARN unexpected ICU placeholder in {ns}.{key}: {s!r}")
        return s

    # Replace placeholders in order. We use a substitution marker to avoid
    # double-replacement issues.
    result = s
    for ph in placeholders:
        inner_key = f'{ns}.{key}.{ph}'
        inner_map = INNER_TEXT.get(inner_key, {})
        if locale not in inner_map:
            print(f"  WARN missing inner text for {inner_key} [{locale}]")
            inner_text = inner_map.get('en', ph)
        else:
            inner_text = inner_map[locale]
        # Replace the FIRST occurrence of {ph} with <ph>inner_text</ph>
        needle = '{' + ph + '}'
        if needle in result:
            result = result.replace(needle, f'<{ph}>{inner_text}</{ph}>', 1)
        else:
            print(f"  WARN {needle} not found in {ns}.{key} ({locale}): {result!r}")

    # Sanity-check: no remaining {placeholders}
    leftover = ICU.findall(result)
    if leftover:
        print(f"  WARN leftover ICU placeholders in {ns}.{key} ({locale}): {leftover}")
    return result


def main():
    locales = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl']
    fixed_count = 0
    for loc in locales:
        path = ROOT / f'{loc}.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        legal = data.get('legal', {})
        if not isinstance(legal, dict):
            data['legal'] = {}
            legal = data['legal']

        # For pt/nl: first, re-init the 4 sub-namespaces to match EN structure
        # (with __TRANSLATE_NEEDED__ everywhere). Then we'll handle the special
        # case below where the broken strings need XML tags.
        if loc in ('pt', 'nl'):
            en_data = json.loads((ROOT / 'en.json').read_text(encoding='utf-8'))
            for ns in ['cgv', 'cookies', 'securite', 'accessibilite']:
                if ns not in en_data['legal']:
                    continue
                en_ns = en_data['legal'][ns]
                placeholder_ns = {}
                for k, v in en_ns.items():
                    if isinstance(v, str):
                        placeholder_ns[k] = PLACEHOLDER
                    else:
                        placeholder_ns[k] = v
                legal[ns] = placeholder_ns
            data['legal'] = legal
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            print(f"{loc}.json: re-init legal.{{cgv,cookies,securite,accessibilite}} with {PLACEHOLDER}")
            continue

        # For fr, en, es, de, it: convert ICU {name} → <name>text</name>
        for ns in ['cgv', 'cookies', 'securite', 'accessibilite']:
            ns_data = legal.get(ns, {})
            for key in list(ns_data.keys()):
                if (ns, key) not in PLACEHOLDERS_PER_KEY:
                    continue
                old = ns_data[key]
                if not isinstance(old, str):
                    continue
                new = convert_string(old, ns, key, loc)
                if new != old:
                    ns_data[key] = new
                    fixed_count += 1
            legal[ns] = ns_data
        data['legal'] = legal
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f"{loc}.json: fixed {sum(1 for ns in ['cgv','cookies','securite','accessibilite'] for k in legal.get(ns,{}) if (ns,k) in PLACEHOLDERS_PER_KEY)} candidate strings")

    print(f"\nTotal strings fixed across fr/en/es/de/it: {fixed_count}")
    print("pt/nl were re-init with __TRANSLATE_NEEDED__; run translate-pages-p5.py pt / nl next.")


if __name__ == '__main__':
    main()
