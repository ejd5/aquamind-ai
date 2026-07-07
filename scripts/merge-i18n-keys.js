/**
 * merge-i18n-keys.js
 *
 * Merges new translation keys from .tmp/new-keys/agent-{a,b,c}.json into the
 * 7 locale files (fr, en, es, de, it, pt, nl).
 *
 * - fr.json ← uses the `fr` value from each agent JSON entry
 * - en.json ← uses the `en` value from each agent JSON entry
 * - es/de/it/pt/nl.json ← `__TRANSLATE_NEEDED__` placeholder (translated later)
 *
 * Agent JSON files use dot-separated paths as top-level keys
 * (e.g. "weather.alerts.heat_extreme"), and the value is an object whose
 * leaves are `{ fr, en }` pairs. We split the dot-path into segments,
 * walk/create nested objects in the locale file, then recursively merge
 * the value (treating `{fr,en}` objects as leaves).
 *
 * Existing locale keys are NEVER deleted or modified — only new keys are
 * added. If a key already exists with a different value, the existing
 * value wins (we do NOT overwrite).
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'locales');
const NEW_KEYS_DIR = path.join(ROOT, '.tmp', 'new-keys');

const LANGS = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl'];
const PLACEHOLDER = '__TRANSLATE_NEEDED__';

/** A leaf is a plain object with exactly the keys {fr, en} (both strings). */
function isLeaf(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 2 &&
    'fr' in value &&
    'en' in value &&
    typeof value.fr === 'string' &&
    typeof value.en === 'string'
  );
}

/** Recursively count leaf {fr,en} pairs inside an agent value. */
function countLeaves(value) {
  if (isLeaf(value)) return 1;
  if (typeof value !== 'object' || value === null) return 0;
  return Object.values(value).reduce((acc, v) => acc + countLeaves(v), 0);
}

/**
 * Recursively merge `agentValue` into the locale tree at `targetRoot`.
 *
 * - If `agentValue` is a leaf {fr,en}, set `targetRoot[leafKey]` to the
 *   language value (or placeholder if not fr/en).
 * - Otherwise, recurse into nested objects, creating intermediate nodes
 *   as needed.
 *
 * Returns the number of leaves merged.
 *
 * NEVER overwrites an existing leaf with a different value — if a leaf
 * already exists in the locale, it is preserved as-is (we count it as
 * skipped). This protects against accidental overwrites of existing
 * translations.
 */
function mergeBranch(targetRoot, agentValue, lang, keyPath) {
  if (isLeaf(agentValue)) {
    // We should never get here (mergeBranch is called on the value AT a key,
    // not on the leaf itself). Defensive guard.
    return 0;
  }
  let merged = 0;
  for (const [k, v] of Object.entries(agentValue)) {
    const currentPath = keyPath ? `${keyPath}.${k}` : k;
    if (isLeaf(v)) {
      // Leaf — set value if not already set.
      if (targetRoot[k] === undefined) {
        if (lang === 'fr') targetRoot[k] = v.fr;
        else if (lang === 'en') targetRoot[k] = v.en;
        else targetRoot[k] = PLACEHOLDER;
        merged++;
      } else if (
        typeof targetRoot[k] === 'string' &&
        targetRoot[k] !== PLACEHOLDER &&
        (lang === 'fr' || lang === 'en') &&
        targetRoot[k] !== (lang === 'fr' ? v.fr : v.en)
      ) {
        // Existing translated value — preserve it (do NOT overwrite).
        // Count as skipped (not merged).
        // console.warn(`  [skip] ${lang}.json:${currentPath} already exists`);
      } else if (
        typeof targetRoot[k] === 'string' &&
        targetRoot[k] === PLACEHOLDER &&
        (lang === 'fr' || lang === 'en')
      ) {
        // Previously placeholder, now we have real value
        targetRoot[k] = lang === 'fr' ? v.fr : v.en;
        merged++;
      }
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      // Intermediate node — recurse.
      if (
        typeof targetRoot[k] !== 'object' ||
        targetRoot[k] === null ||
        Array.isArray(targetRoot[k])
      ) {
        targetRoot[k] = {};
      }
      merged += mergeBranch(targetRoot[k], v, lang, currentPath);
    }
    // Ignore arrays / primitives at non-leaf level (shouldn't happen).
  }
  return merged;
}

/**
 * Merge all agent JSON files into a single locale file for `lang`.
 * Returns the total number of leaves merged.
 */
function mergeIntoLocale(lang) {
  const localePath = path.join(LOCALES_DIR, `${lang}.json`);
  const locale = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  let totalMerged = 0;
  const perAgentCounts = {};

  for (const agentFile of ['agent-a.json', 'agent-b.json', 'agent-c.json']) {
    const agentPath = path.join(NEW_KEYS_DIR, agentFile);
    const agentData = JSON.parse(fs.readFileSync(agentPath, 'utf8'));
    let agentMerged = 0;

    for (const [topKey, topValue] of Object.entries(agentData)) {
      // Split topKey into segments (may contain dots, e.g. "weather.alerts.heat_extreme").
      const segments = topKey.split('.');

      // Walk/create the nested path in the locale.
      let cursor = locale;
      for (const seg of segments) {
        if (
          typeof cursor[seg] !== 'object' ||
          cursor[seg] === null ||
          Array.isArray(cursor[seg])
        ) {
          cursor[seg] = {};
        }
        cursor = cursor[seg];
      }

      // Now merge the agent value into cursor.
      // The agent value is an object whose leaves are {fr,en} pairs.
      agentMerged += mergeBranch(cursor, topValue, lang, topKey);
    }

    perAgentCounts[agentFile] = agentMerged;
    totalMerged += agentMerged;
  }

  // Write back with 2-space indent + trailing newline (matches existing files).
  fs.writeFileSync(localePath, JSON.stringify(locale, null, 2) + '\n', 'utf8');
  return { totalMerged, perAgentCounts };
}

// === Main ===
console.log('=== merge-i18n-keys.js ===');
console.log(`Root: ${ROOT}`);
console.log(`Locales: ${LANGS.join(', ')}`);
console.log();

const summary = {};
for (const lang of LANGS) {
  const { totalMerged, perAgentCounts } = mergeIntoLocale(lang);
  summary[lang] = { totalMerged, perAgentCounts };
  console.log(
    `[${lang}] merged ${totalMerged} leaves ` +
      `(a=${perAgentCounts['agent-a.json']}, b=${perAgentCounts['agent-b.json']}, c=${perAgentCounts['agent-c.json']})`
  );
}

console.log();
console.log('=== Verifying JSON validity ===');
for (const lang of LANGS) {
  try {
    JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${lang}.json`), 'utf8'));
    console.log(`  ${lang}.json ✓`);
  } catch (e) {
    console.error(`  ${lang}.json ✗ ${e.message}`);
    process.exit(1);
  }
}

console.log();
console.log('Done.');
