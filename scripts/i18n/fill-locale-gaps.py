#!/usr/bin/env python3
"""Fill i18n gaps in es/de/it/pt/nl by copying missing keys from the EN fallback.

This script:
  1. Loads `fr.json` as the reference structure (superset of all keys).
  2. Loads `en.json` as the fallback value source.
  3. For each of the 5 secondary locales (es/de/it/pt/nl), recursively walks
     the reference structure. For each leaf key missing from the target locale,
     inserts the EN value as a fallback (so users see English instead of the
     raw translation key on screen).
  4. Preserves existing translated values; only adds missing ones.
  5. Writes back each locale file with `ensure_ascii=False, indent=2` + trailing newline.

Idempotent: re-running on already-filled files is a no-op.

Usage:  python3 scripts/i18n/fill-locale-gaps.py
"""
import json
from pathlib import Path

LOCALES_DIR = Path('/home/z/my-project/src/i18n/locales')
REFERENCE_LOCALE = 'fr'
FALLBACK_LOCALE = 'en'
TARGET_LOCALES = ['es', 'de', 'it', 'pt', 'nl']


def fill_missing(reference: object, fallback: object, target: object) -> tuple[int, int]:
    """Recursively copy missing keys from `fallback` into `target`.

    Walks `reference` for the full expected structure. For each leaf key in
    `reference` that is absent (or whose parent dict is absent) in `target`,
    copies the value from `fallback`.

    Returns (filled_count, skipped_count).
    """
    filled = 0
    skipped = 0

    if isinstance(reference, dict):
        if not isinstance(target, dict):
            # Target is wrong type — replace with the fallback structure
            # (shouldn't happen in practice, but be defensive)
            return 0, 0
        for key, ref_val in reference.items():
            if isinstance(ref_val, dict):
                # Recurse into nested dict
                if key not in target or not isinstance(target[key], dict):
                    # The nested dict is entirely missing — copy the whole subtree from fallback
                    target[key] = json.loads(json.dumps(fallback.get(key, {})))
                    fb_sub = fallback.get(key, {})
                    ref_sub = ref_val
                    if isinstance(fb_sub, dict):
                        for _k in ref_sub.keys():
                            filled += 1
                else:
                    sub_filled, sub_skipped = fill_missing(
                        ref_val, fallback.get(key, {}), target[key]
                    )
                    filled += sub_filled
                    skipped += sub_skipped
            else:
                # Leaf
                if key not in target:
                    target[key] = fallback.get(key, ref_val)
                    filled += 1
                else:
                    skipped += 1
    return filled, skipped


def main() -> int:
    ref_path = LOCALES_DIR / f'{REFERENCE_LOCALE}.json'
    fb_path = LOCALES_DIR / f'{FALLBACK_LOCALE}.json'

    with ref_path.open(encoding='utf-8') as f:
        reference = json.load(f)
    with fb_path.open(encoding='utf-8') as f:
        fallback = json.load(f)

    print(f'Reference: {REFERENCE_LOCALE} ({count_leaves(reference)} leaf keys)')
    print(f'Fallback:  {FALLBACK_LOCALE} ({count_leaves(fallback)} leaf keys)')
    print()

    total_filled = 0
    for loc in TARGET_LOCALES:
        path = LOCALES_DIR / f'{loc}.json'
        with path.open(encoding='utf-8') as f:
            data = json.load(f)

        before = count_leaves(data)
        filled, skipped = fill_missing(reference, fallback, data)
        after = count_leaves(data)

        # Write back (stable ordering: preserve existing key order, new keys appended)
        with path.open('w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')

        print(f'{loc}: {before} → {after} leaf keys (+{filled} filled, {skipped} already present)')
        total_filled += filled

    print()
    print(f'TOTAL: {total_filled} keys filled across {len(TARGET_LOCALES)} locales')
    return 0


def count_leaves(obj: object) -> int:
    if isinstance(obj, dict):
        return sum(count_leaves(v) for v in obj.values())
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
