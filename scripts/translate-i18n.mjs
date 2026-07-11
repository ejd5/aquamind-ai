/**
 * translate-i18n.mjs
 *
 * Replaces __TRANSLATE_NEEDED__ placeholders in a locale file with real
 * translations produced by the z-ai-web-dev-sdk LLM (called via direct
 * fetch to access rate-limit headers).
 *
 * Usage:
 *   node scripts/translate-i18n.mjs es      # Spanish
 *   node scripts/translate-i18n.mjs de      # German
 *   node scripts/translate-i18n.mjs all     # es → de → it → pt → nl
 *
 * Rate limit: API enforces 30 calls / 10 min / user. We:
 *   - Read x-ratelimit-user-10min-remaining header on every response.
 *   - If remaining is 0 or we get 429, sleep until the 10-min window
 *     resets (we conservatively wait 60-120s then retry).
 *   - Use BATCH_SIZE=60 to minimize call count (~15 batches / language
 *     × 5 languages = ~75 calls total = ~3 ten-minute windows).
 *
 * Validation:
 *   - Same set of ICU placeholders {xxx} as EN — else retry once, else
 *     fall back to EN string.
 *   - Same set of HTML tags as EN — else fall back to EN string.
 *
 * Saves progress after each batch — safe to resume.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'locales');

const PLACEHOLDER = '__TRANSLATE_NEEDED__';
const BATCH_SIZE = 60;
const INTER_CALL_DELAY_MS = 2000; // baseline delay between successful calls
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 30; // 30 calls per 10 min per user

const LANG_NAMES = {
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
};

// Load ZAI config
const ZAI_CONFIG = JSON.parse(fs.readFileSync('/etc/.z-ai-config', 'utf8'));

// === Helpers =============================================================

function collectPlaceholders(targetObj, enObj, basePath = '', acc = []) {
  for (const [k, v] of Object.entries(targetObj)) {
    const p = basePath ? `${basePath}.${k}` : k;
    if (typeof v === 'string' && v === PLACEHOLDER) {
      const enVal = getAtPath(enObj, p);
      acc.push({ path: p, en: enVal ?? '', ns: basePath || k });
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      collectPlaceholders(v, enObj, p, acc);
    }
  }
  return acc;
}

function getAtPath(obj, dotPath) {
  const segs = dotPath.split('.');
  let cur = obj;
  for (const s of segs) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[s];
  }
  return cur;
}

function setAtPath(obj, dotPath, value) {
  const segs = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (typeof cur[segs[i]] !== 'object' || cur[segs[i]] === null) {
      cur[segs[i]] = {};
    }
    cur = cur[segs[i]];
  }
  cur[segs[segs.length - 1]] = value;
}

function extractIcu(str) {
  if (typeof str !== 'string') return [];
  const m = str.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g);
  return m ? m.sort() : [];
}

function extractHtmlTags(str) {
  if (typeof str !== 'string') return [];
  const m = str.match(/<\/?[a-zA-Z0-9]+>/g);
  return m ? m.sort() : [];
}

function stripCodeFences(text) {
  if (typeof text !== 'string') return text;
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (m) return m[1].trim();
  return trimmed;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Track recent API call timestamps to avoid hitting the 30/10min rate limit.
const callTimestamps = [];
function recentCallCount() {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  while (callTimestamps.length && callTimestamps[0] < cutoff) {
    callTimestamps.shift();
  }
  return callTimestamps.length;
}

async function waitForRateLimitSlot() {
  // If we're at the limit, wait until the oldest call ages out.
  while (recentCallCount() >= RATE_LIMIT_MAX - 1) {
    const oldest = callTimestamps[0];
    const waitMs = RATE_LIMIT_WINDOW_MS - (Date.now() - oldest) + 2000;
    console.log(
      `    [rate-limit] at ${RATE_LIMIT_MAX - 1}/${RATE_LIMIT_MAX} calls in last 10min; waiting ${Math.round(
        waitMs / 1000
      )}s for slot...`
    );
    await delay(waitMs);
  }
}

// === Direct LLM call (bypasses SDK to read rate-limit headers) ===========

async function callLlmRaw(targetLang, items) {
  const inputObj = {};
  for (const item of items) inputObj[item.id] = item.en;

  const systemPrompt = `You are a professional translator for a pool/spa maintenance mobile app called AQWELIA.

Translate the following JSON values from English to ${LANG_NAMES[targetLang]}.

PRESERVE EXACTLY (do NOT translate or modify):
- ICU format placeholders: {param}, {temp}, {days}, {count}, {n}, {qty}, {volume}, {ph}, {delta}, {tablets}, {liters}, {measures}, {title}, {issues}, {done}, {total}, {percent}, {wind}, {location}, {hours}, {months}, {name}, {type}, {value}, etc. — keep them as {xxx}
- HTML-like tags: <bold>, </bold>, <link>, </link>, <alink>, </alink>, <link2>, </link2>
- Brand names: AQWELIA
- Scientific units and abbreviations: pH, TAC, CYA, ppm, mg/L, °C, m³, m², kg, L
- Emoji characters (✅, ⚠️, ❌, ☀️, 💧, etc.)
- Arrows (←, →, ↑, ↓)

TRANSLATE these technical terms appropriately for ${LANG_NAMES[targetLang]}:
- "chlore" / "chlorine" → translated term for chlorine
- "algues" / "algae" → translated term for algae
- "filtration" → translated term for filtration
- "électrolyse au sel" / "salt electrolysis" → translated term
- "pH-", "pH+" → keep as-is (product names)
- "TAC" → keep as-is (French abbreviation for Total Alkalinity; some languages use TA)
- "skimmer", "pompe", "filtre" → translate appropriately

Return ONLY a JSON object mapping each input key to its ${LANG_NAMES[targetLang]} translation.
No explanations, no markdown fences, no comments — just the JSON object.`;

  const userMsg = JSON.stringify(inputObj, null, 2);

  const url = ZAI_CONFIG.baseUrl + '/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ZAI_CONFIG.apiKey}`,
    'X-Z-AI-From': 'Z',
    'X-Chat-Id': ZAI_CONFIG.chatId,
    'X-User-Id': ZAI_CONFIG.userId,
    'X-Token': ZAI_CONFIG.token,
  };
  const body = JSON.stringify({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.3,
    thinking: { type: 'disabled' },
  });

  const r = await fetch(url, { method: 'POST', headers, body });
  // Track this call in the rate-limit window (even if 429 — server counts attempts).
  callTimestamps.push(Date.now());

  if (r.status === 429) {
    const remaining = r.headers.get('x-ratelimit-user-10min-remaining');
    const limit = r.headers.get('x-ratelimit-user-10min-limit');
    throw new Error(
      `429 rate limited (remaining=${remaining}, limit=${limit})`
    );
  }
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
  }
  const data = await r.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM returned empty content');
  const cleaned = stripCodeFences(content);
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `JSON parse failed: ${e.message}. First 200 chars: ${cleaned.slice(0, 200)}`
    );
  }
  return parsed;
}

// === Orchestration =======================================================

async function callWithRateLimit(targetLang, batch) {
  // Wraps callLlmRaw with rate-limit-aware retry logic.
  const MAX_ATTEMPTS = 6;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await waitForRateLimitSlot();
    try {
      const result = await callLlmRaw(targetLang, batch);
      return result;
    } catch (e) {
      const msg = e.message || '';
      const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('rate limit');
      if (isRateLimit) {
        // Wait for the 10-min window to roll forward.
        const waitMs = attempt < MAX_ATTEMPTS ? 60_000 : 0; // 60s between rate-limit retries
        if (attempt < MAX_ATTEMPTS) {
          process.stdout.write(`(429, wait ${waitMs / 1000}s) `);
          await delay(waitMs);
        }
      } else {
        // Generic error — short retry.
        const waitMs = attempt < MAX_ATTEMPTS ? 5000 : 0;
        if (attempt < MAX_ATTEMPTS) {
          process.stdout.write(`(err: ${msg.slice(0, 60)}, wait ${waitMs / 1000}s) `);
          await delay(waitMs);
        }
      }
      if (attempt === MAX_ATTEMPTS) throw e;
    }
  }
}

async function translateOneLang(targetLang) {
  console.log(`\n=== Translating ${targetLang} (${LANG_NAMES[targetLang]}) ===`);
  const localePath = path.join(LOCALES_DIR, `${targetLang}.json`);
  const enPath = path.join(LOCALES_DIR, `en.json`);
  const target = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  const items = collectPlaceholders(target, en);
  console.log(`Found ${items.length} placeholders to translate`);

  if (items.length === 0) {
    console.log('Nothing to do.');
    return { translated: 0, fallback: 0, errors: 0 };
  }

  const nsCounts = {};
  for (const item of items) nsCounts[item.ns] = (nsCounts[item.ns] || 0) + 1;
  console.log(
    `Grouped into ${Object.keys(nsCounts).length} namespaces (top 10): ` +
      Object.entries(nsCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ns, n]) => `${ns}(${n})`)
        .join(', ')
  );

  const batches = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const slice = items.slice(i, i + BATCH_SIZE);
    const batch = slice.map((it, idx) => ({
      id: `k${batches.length}_${idx}`,
      path: it.path,
      en: it.en,
      ns: it.ns,
    }));
    batches.push(batch);
  }
  console.log(`Created ${batches.length} batches (max ${BATCH_SIZE} strings each).`);

  let totalTranslated = 0;
  let totalFallback = 0;
  let totalErrors = 0;
  const failedBatches = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const nsSet = new Set(batch.map((b) => b.ns));
    const nsLabel = nsSet.size === 1 ? batch[0].ns : `mixed(${nsSet.size} ns)`;
    process.stdout.write(
      `  [${i + 1}/${batches.length}] (${batch.length} strings, ns=${nsLabel})... `
    );

    let translations = null;
    try {
      translations = await callWithRateLimit(targetLang, batch);
    } catch (e) {
      console.log(`FAILED: ${e.message?.slice(0, 120)}`);
      for (const item of batch) {
        setAtPath(target, item.path, item.en);
        totalFallback++;
      }
      totalErrors += batch.length;
      failedBatches.push({ ns: nsLabel, count: batch.length, err: e.message });
      // Save progress.
      fs.writeFileSync(localePath, JSON.stringify(target, null, 2) + '\n', 'utf8');
      await delay(INTER_CALL_DELAY_MS);
      continue;
    }

    let batchTranslated = 0;
    let batchFallback = 0;
    for (const item of batch) {
      const translated = translations[item.id];
      if (typeof translated !== 'string' || translated.length === 0) {
        setAtPath(target, item.path, item.en);
        batchFallback++;
        continue;
      }
      const enIcu = extractIcu(item.en);
      const trIcu = extractIcu(translated);
      if (JSON.stringify(enIcu) !== JSON.stringify(trIcu)) {
        // Try one retry with a hint to preserve placeholders
        try {
          const hintPrompt = `IMPORTANT: The original English text contains the ICU placeholders ${JSON.stringify(
            enIcu
          )}. Your previous translation was missing or modifying some. Please re-translate and preserve all placeholders EXACTLY. Text: ${JSON.stringify(
            item.en
          )}`;
          const singleRetry = await callWithRateLimit(targetLang, [
            { id: 's', en: hintPrompt },
          ]);
          const retryTr = singleRetry['s'];
          if (
            typeof retryTr === 'string' &&
            JSON.stringify(extractIcu(retryTr)) === JSON.stringify(enIcu) &&
            JSON.stringify(extractHtmlTags(retryTr)) ===
              JSON.stringify(extractHtmlTags(item.en))
          ) {
            setAtPath(target, item.path, retryTr);
            batchTranslated++;
            continue;
          }
        } catch (_) {
          // fall through to fallback
        }
        setAtPath(target, item.path, item.en);
        batchFallback++;
        continue;
      }
      const enTags = extractHtmlTags(item.en);
      const trTags = extractHtmlTags(translated);
      if (JSON.stringify(enTags) !== JSON.stringify(trTags)) {
        setAtPath(target, item.path, item.en);
        batchFallback++;
        continue;
      }
      setAtPath(target, item.path, translated);
      batchTranslated++;
    }

    totalTranslated += batchTranslated;
    totalFallback += batchFallback;
    console.log(`${batchTranslated} translated, ${batchFallback} fallback`);

    // Save progress after each batch.
    fs.writeFileSync(localePath, JSON.stringify(target, null, 2) + '\n', 'utf8');

    await delay(INTER_CALL_DELAY_MS);
  }

  console.log(`--- ${targetLang} summary ---`);
  console.log(`  translated: ${totalTranslated}`);
  console.log(`  fallback (EN used): ${totalFallback}`);
  console.log(`  errors: ${totalErrors}`);
  if (failedBatches.length) {
    console.log(`  failed batches:`);
    for (const fb of failedBatches) {
      console.log(`    - ${fb.ns} (${fb.count} strings): ${fb.err?.slice(0, 80)}`);
    }
  }
  return { translated: totalTranslated, fallback: totalFallback, errors: totalErrors };
}

// === Main ================================================================

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/translate-i18n.mjs <es|de|it|pt|nl|all>');
  process.exit(1);
}

const targets = arg === 'all' ? ['es', 'de', 'it', 'pt', 'nl'] : [arg];
const results = {};
for (const t of targets) {
  if (!LANG_NAMES[t]) {
    console.error(`Unknown language: ${t}. Supported: ${Object.keys(LANG_NAMES).join(', ')}`);
    process.exit(1);
  }
  results[t] = await translateOneLang(t);
}

console.log('\n=== Final summary ===');
for (const [lang, r] of Object.entries(results)) {
  console.log(
    `${lang}: ${r.translated} translated, ${r.fallback} fallback, ${r.errors} errors`
  );
}
