#!/usr/bin/env python3
"""
Translate __TRANSLATE_NEEDED__ placeholders in locale files using the ZAI
chat completions API. Python companion to scripts/translate-i18n.mjs.

Strategy:
  - Reads /etc/.z-ai-config for baseUrl + apiKey + headers.
  - Processes one language at a time (es → de → it → pt → nl).
  - Batches strings (BATCH_SIZE=80) per LLM call to minimize API calls.
  - Respects rate limit (30 calls / 10 min) with explicit sleep.
  - Validates ICU placeholders + HTML tags between EN and translated string.
  - Falls back to EN string on validation failure or API error.
  - Saves progress after each batch (safe to resume).

Usage:
  python3 scripts/i18n/translate-pages-p5.py es    # one language
  python3 scripts/i18n/translate-pages-p5.py all   # es → de → it → pt → nl
"""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path('/home/z/my-project/src/i18n/locales')
PLACEHOLDER = '__TRANSLATE_NEEDED__'
BATCH_SIZE = 80
INTER_CALL_DELAY_S = 1.5
RATE_LIMIT_WINDOW_S = 10 * 60
RATE_LIMIT_MAX = 28  # conservative: 30/max - 2 safety

LANG_NAMES = {
    'es': 'Spanish',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'nl': 'Dutch',
}

# Recent API call timestamps (for rate-limit tracking)
call_timestamps = []

def recent_call_count():
    cutoff = time.time() - RATE_LIMIT_WINDOW_S
    while call_timestamps and call_timestamps[0] < cutoff:
        call_timestamps.pop(0)
    return len(call_timestamps)

def wait_for_rate_limit_slot():
    while recent_call_count() >= RATE_LIMIT_MAX:
        oldest = call_timestamps[0]
        wait_s = RATE_LIMIT_WINDOW_S - (time.time() - oldest) + 2
        print(f'    [rate-limit] at {RATE_LIMIT_MAX} calls in 10min; waiting {wait_s:.0f}s...')
        time.sleep(wait_s)

def get_config():
    with open('/etc/.z-ai-config', 'r') as f:
        return json.load(f)

CONFIG = get_config()

def call_llm(target_lang, items):
    """Call ZAI chat completions API. items is a list of {id, en} dicts.
    Returns dict {id: translated_string}.
    """
    input_obj = {it['id']: it['en'] for it in items}
    system_prompt = (
        f"You are a professional translator for a pool/spa maintenance app called AQWELIA.\n"
        f"Translate the following JSON values from English to {LANG_NAMES[target_lang]}.\n"
        f"PRESERVE EXACTLY (do NOT translate or modify):\n"
        f"- ICU format placeholders: {{param}}, {{n}}, {{bold}}, etc. — keep as {{xxx}}\n"
        f"- HTML-like tags: <bold>, </bold>, <link>, </link>, <alink>, </alink>, <link2>, </link2>\n"
        f"- Brand names: AQWELIA, Aquamind, Stripe, RevenueCat, Vercel, NextAuth, Let's Encrypt\n"
        f"- Scientific units: pH, TAC, TH, CYA, ppm, mg/L, °C, m³, kg, L, mL, g\n"
        f"- Currency: €, EUR\n"
        f"- Emoji characters\n"
        f"Return ONLY a JSON object mapping each input key to its {LANG_NAMES[target_lang]} translation.\n"
        f"No explanations, no markdown fences — just the JSON object."
    )
    body = json.dumps({
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': json.dumps(input_obj, ensure_ascii=False, indent=2)},
        ],
        'temperature': 0.3,
        'thinking': {'type': 'disabled'},
    }).encode('utf-8')

    url = CONFIG['baseUrl'] + '/chat/completions'
    req = urllib.request.Request(url, data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Authorization', f"Bearer {CONFIG['apiKey']}")
    req.add_header('X-Z-AI-From', 'Z')
    req.add_header('X-Chat-Id', CONFIG.get('chatId', ''))
    req.add_header('X-User-Id', CONFIG.get('userId', ''))
    req.add_header('X-Token', CONFIG.get('token', ''))

    call_timestamps.append(time.time())
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        body_text = e.read().decode('utf-8', errors='replace')[:200]
        raise RuntimeError(f"HTTP {e.code}: {body_text}")
    except Exception as e:
        raise RuntimeError(f"Network error: {e}")

    data = json.loads(raw)
    content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
    if not content:
        raise RuntimeError('Empty LLM response')
    # Strip code fences if present
    content = content.strip()
    m = re.match(r'^```(?:json)?\s*\n?([\s\S]*?)\n?```$', content)
    if m:
        content = m.group(1).strip()
    return json.loads(content)


def extract_icu(s):
    if not isinstance(s, str):
        return []
    matches = re.findall(r'\{[a-zA-Z_][a-zA-Z0-9_]*\}', s)
    return sorted(matches)


def extract_html_tags(s):
    if not isinstance(s, str):
        return []
    matches = re.findall(r'</?[a-zA-Z0-9]+>', s)
    return sorted(matches)


def collect_placeholders(target_obj, en_obj, base_path='', acc=None):
    if acc is None:
        acc = []
    for k, v in target_obj.items():
        p = f"{base_path}.{k}" if base_path else k
        if isinstance(v, str) and v == PLACEHOLDER:
            en_val = get_at_path(en_obj, p)
            acc.append({'path': p, 'en': en_val or '', 'ns': base_path or k})
        elif isinstance(v, dict) and not isinstance(v, list):
            collect_placeholders(v, en_obj, p, acc)
    return acc


def get_at_path(obj, dot_path):
    cur = obj
    for seg in dot_path.split('.'):
        if not isinstance(cur, dict) or seg not in cur:
            return None
        cur = cur[seg]
    return cur


def set_at_path(obj, dot_path, value):
    cur = obj
    segs = dot_path.split('.')
    for seg in segs[:-1]:
        if not isinstance(cur.get(seg), dict):
            cur[seg] = {}
        cur = cur[seg]
    cur[segs[-1]] = value


def translate_one_lang(target_lang):
    print(f"\n=== Translating {target_lang} ({LANG_NAMES[target_lang]}) ===")
    locale_path = ROOT / f'{target_lang}.json'
    en_path = ROOT / 'en.json'
    target = json.loads(locale_path.read_text(encoding='utf-8'))
    en = json.loads(en_path.read_text(encoding='utf-8'))

    items = collect_placeholders(target, en)
    print(f"Found {len(items)} placeholders to translate")
    if not items:
        print("Nothing to do.")
        return {'translated': 0, 'fallback': 0}

    # Group into batches
    batches = []
    for i in range(0, len(items), BATCH_SIZE):
        slice_ = items[i:i + BATCH_SIZE]
        batch = [{'id': f'k{len(batches)}_{j}', 'path': it['path'], 'en': it['en']} for j, it in enumerate(slice_)]
        batches.append(batch)
    print(f"Created {len(batches)} batches (max {BATCH_SIZE} strings each).")

    total_translated = 0
    total_fallback = 0

    for i, batch in enumerate(batches):
        print(f"  [{i+1}/{len(batches)}] ({len(batch)} strings)...", end=' ', flush=True)
        try:
            wait_for_rate_limit_slot()
            translations = call_llm(target_lang, batch)
        except Exception as e:
            print(f"FAILED: {str(e)[:120]}")
            # Fallback: use EN strings for the whole batch
            for it in batch:
                set_at_path(target, it['path'], it['en'])
                total_fallback += 1
            locale_path.write_text(json.dumps(target, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            time.sleep(INTER_CALL_DELAY_S)
            continue

        batch_translated = 0
        batch_fallback = 0
        for it in batch:
            translated = translations.get(it['id'])
            if not isinstance(translated, str) or not translated:
                set_at_path(target, it['path'], it['en'])
                batch_fallback += 1
                continue
            # Validate ICU placeholders
            if extract_icu(it['en']) != extract_icu(translated):
                set_at_path(target, it['path'], it['en'])
                batch_fallback += 1
                continue
            # Validate HTML tags
            if extract_html_tags(it['en']) != extract_html_tags(translated):
                set_at_path(target, it['path'], it['en'])
                batch_fallback += 1
                continue
            set_at_path(target, it['path'], translated)
            batch_translated += 1

        total_translated += batch_translated
        total_fallback += batch_fallback
        print(f"{batch_translated} ok, {batch_fallback} fallback")

        # Save progress
        locale_path.write_text(json.dumps(target, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        time.sleep(INTER_CALL_DELAY_S)

    print(f"--- {target_lang} summary: {total_translated} translated, {total_fallback} fallback ---")
    return {'translated': total_translated, 'fallback': total_fallback}


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 translate-pages-p5.py <es|de|it|pt|nl|all>")
        sys.exit(1)
    arg = sys.argv[1]
    targets = ['es', 'de', 'it', 'pt', 'nl'] if arg == 'all' else [arg]
    for t in targets:
        if t not in LANG_NAMES:
            print(f"Unknown language: {t}")
            sys.exit(1)
        translate_one_lang(t)


if __name__ == '__main__':
    main()
