# ARQWELIA Lot 2 — AI Provider Benchmark Harness (A1 round 2)

## Purpose

A1 is the **benchmark harness** for ARQWELIA Lot 2: it lets the team compare
AI image-generation / image-edit providers on real ARQWELIA garden photos —
without ever spending money accidentally.

The harness is **dry-run safe by default**. Nothing in this harness performs a
real provider network call unless **two independent env guards** are armed
(see [Guard rails](#guard-rails)). Even then, the real-provider adapters are
still stubbed with `NOT IMPLEMENTED — awaiting Gate`, so no paid call can
occur in this build.

Scope decisions honored by this harness:

- `src/lib/ai/nvidia.ts` only implements **vision-to-text** and **chat**. It
  does **not** prove image generation. Therefore NVIDIA is **never** chosen by
  default and its `supportsImageEditing` stays `false` until verified.
- `z-ai-web-dev-sdk` (installed `^0.0.18`) exposes `images.generations.create`
  (text-to-image) and `images.generations.edit` (image-to-image), both
  returning base64. It requires a **`.z-ai-config`** file (not an env var).
- `src/lib/images/secure-image.ts` `normalizeImageForAi()` strips
  EXIF/GPS, resizes to ≤1600 px, JPEG q82, and returns
  `{ dataUrl, buffer, mimeType, width, height, sha256, inputBytes, outputBytes }`.
  The harness **reuses this module** — there is no harness-local copy of the
  normalization logic.
- No `@vercel/blob`, no other provider SDK.

## Files

| File | Role |
| --- | --- |
| `scripts/lib/arqwelia-benchmark/provider.ts` | Benchmark-only provider interface + runtime guard helpers + billing contract |
| `scripts/lib/arqwelia-benchmark/candidates.ts` | Typed candidate registry |
| `scripts/lib/arqwelia-benchmark/candidates-registry.mjs` | Single source of truth (plain ESM, shared with the CLI): candidates, `ensureNoRealCall`, `redactSecrets`, billing derivation |
| `scripts/benchmark-arqwelia-smoke.mjs` | CLI entry point (**requires Bun**) |
| `tests/arqwelia-lot2-benchmark.test.ts` | Vitest suite (no real calls, no keys) |
| `dataset/README.md` | Benchmark photo dataset instructions (lives outside git) |

The CLI runs under **Bun** because it imports the canonical TypeScript module
`src/lib/images/secure-image.ts` (a plain Node 20 runtime cannot load TS):

```bash
bun scripts/benchmark-arqwelia-smoke.mjs --provider mock --out ./benchmark-out
# or
bun run benchmark:smoke -- --provider mock --out ./benchmark-out
```

## Guard rails (authorization is ENV-ONLY)

A real provider call requires **BOTH** of these environment variables:

| Env var | Meaning |
| --- | --- |
| `ARQWELIA_BENCHMARK_AUTHORIZED=true` | Explicit human authorization flag |
| `ARQWELIA_BENCHMARK_MAX_BUDGET_EUR>0` | Owner-approved budget cap (EUR) |

**The CLI can never authorize a real call and can never raise the budget:**

- There is **no `--authorized` flag** — passing one is rejected as an unknown
  flag. Authorization comes exclusively from the environment.
- `--budget` may **only reduce** the budget below
  `ARQWELIA_BENCHMARK_MAX_BUDGET_EUR`. A `--budget` above the env ceiling is
  rejected with a clear error; `--budget <= 0` is rejected.
- With no env ceiling configured, `--budget` only clamps the *reported* budget
  for the dry run — it never unlocks a real call.

Without both env vars the CLI prints `DRY RUN — NO EXTERNAL CALL` and exits
`0`. On top of that, the real-provider adapters throw `NOT IMPLEMENTED —
awaiting Gate` even when authorized, so no real call can happen in this build.

The harness **never prints API keys**. Any env value whose name matches
`/KEY|TOKEN|SECRET/i` is redacted before it can reach stdout or a report.

## Billing contract (reliable, never invented)

Every `SmokeResult` carries billing fields that the console line, the JSON
report and the Markdown report are all derived from:

| Field | Meaning |
| --- | --- |
| `externalCalls` | Number of external provider calls actually made (`0` for dry run / not implemented) |
| `actualCostEur` | Proven cost in EUR, or `null` when the cost of a real call was not proven |
| `billingStatus` | `not_called` \| `measured` \| `unknown` |
| `officialPricingSource` | Public pricing doc for a measured cost, else `null` |

Billing rules:

- Dry run / not implemented (`not_called`): `externalCalls=0`,
  `actualCostEur=0`, console prints `PAID_COST=0` — legitimate because nothing
  was ever billed.
- Measured: `actualCostEur` is the proven cost, printed as `PAID_COST=<value>`.
- Real call without billing proof (`unknown`): `actualCostEur=null` and the
  console prints `PAID_COST=UNKNOWN` — the harness **never claims
  `PAID_COST=0` after a real call whose cost is not proven**.

`estimateOfficialCost()` returns `known: false` with note
`UNKNOWN — TO BE MEASURED IN LOT 0` for every candidate. There is **no
official or measured pricing** for image-edit on these providers at this
point, and the harness **refuses to invent a cost-per-image number**. Real
cost per image will be measured during the authorized smoke phase (Lot 0) and
back-filled into `estimateOfficialCost()`.

## Candidates

| id | Model | Image edit | Config check | Official cost |
| --- | --- | --- | --- | --- |
| `nvidia-nim` | `tbd` | ❌ `false` until verified (nvidia.ts is vision/chat only) | `NVIDIA_API_KEY` present | `UNKNOWN` |
| `zai-glm` | `tbd` | ✅ via `z-ai-web-dev-sdk` `images.generations.edit` | `.z-ai-config` file (cwd or home) or `Z_AI_API_KEY` | `UNKNOWN` |
| `openai-gpt-image` | `gpt-image-1` | ✅ placeholder | `OPENAI_API_KEY` present | `UNKNOWN` |
| `mock` | `mock-image-v1` | ✅ | always ok | `UNKNOWN` |

NVIDIA's image model is a `tbd` placeholder because image generation on
NVIDIA NIM is **not verified** by this repo. The `mock` candidate never calls
out — it writes a local placeholder PNG so the pipeline can be tested end to
end.

## Image handling — normalize, don't refuse (EXIF is allowed)

Photos **with EXIF/GPS are accepted** and normalized. The CLI:

1. reads the local source file and builds a data URL;
2. calls the canonical `normalizeImageForAi()` (EXIF/GPS stripped, rotated,
   resized to ≤1600 px, JPEG q82);
3. verifies the **normalized output** is free of EXIF/IPTC/XMP via
   `sharp.metadata()` (asserts `exif`, `orientation`, `iptc`, `xmp` absent);
4. only the normalized output is eligible to be sent to a future provider;
5. **never copies the raw source** into the results dir.

If normalization fails (`SecureImageError`), the CLI reports a clear error and
exits non-zero.

## PII-free report

The JSON report, Markdown report and console never store: absolute paths,
local usernames, the raw free prompt, API keys/tokens, or addresses. The
report keeps only:

- sanitized `sourceFileName` (basename only, no path) — or a dataset id;
- `normalizedSha256`, width/height, input/output bytes, mimeType;
- `promptVersion` (`arqwelia-lot2-v1`) and `promptSha256` (a SHA-256 **hash of
  the prompt text**, never the prompt itself);
- provider, model, and technical results (`durationMs`, `externalCalls`,
  `actualCostEur`, `billingStatus`, `officialPricingSource`, output
  width/height, output file name only).

The report never writes the `--image` path or the `--promptA` text.

## Run the dry run (default)

```bash
# mock provider — no key needed, no cost, no external call
bun scripts/benchmark-arqwelia-smoke.mjs --provider mock --out ./benchmark-out

# with a source photo (EXIF/GPS is fine — it is normalized away)
bun scripts/benchmark-arqwelia-smoke.mjs --provider mock \
  --image dataset/photos/01-small-garden.png --promptA "Concept A..." \
  --out ./benchmark-out

# non-mock providers still dry-run (report says "skipped in dry run")
bun scripts/benchmark-arqwelia-smoke.mjs --provider zai-glm --out ./benchmark-out
```

Expected output always ends with:

```text
DRY RUN — NO EXTERNAL CALL
external_calls=0
billing_status=not_called
paid_eur=0
REAL_PROVIDER_CALLS=0, PAID_COST=0
```

Reports are written to the `--out` dir (default `./benchmark-out`): one JSON
and one Markdown summary per run, plus the mock placeholder PNG.

## Run an authorized smoke (owner budget only)

Authorized smoke **spends money**. It can only be triggered by the owner with
an explicit env budget — there is no CLI override:

```bash
export ARQWELIA_BENCHMARK_AUTHORIZED=true
export ARQWELIA_BENCHMARK_MAX_BUDGET_EUR=5
bun scripts/benchmark-arqwelia-smoke.mjs --provider zai-glm \
  --image dataset/photos/01-small-garden.png --promptA "Concept A..." --out ./benchmark-out
```

`--budget` may cap below that ceiling (never above):

```bash
# same run, capped to 3 EUR
ARQWELIA_BENCHMARK_AUTHORIZED=true ARQWELIA_BENCHMARK_MAX_BUDGET_EUR=5 \
  bun scripts/benchmark-arqwelia-smoke.mjs --provider zai-glm \
  --budget 3 --out ./benchmark-out
```

In this build, real providers still answer `NOT IMPLEMENTED — awaiting Gate`
(no call is made); the report records `REAL_PROVIDER_CALLS=0, PAID_COST=0`.
`--provider mock` remains the only provider whose smoke produces an artifact.

## Phase 0 methodology

### Phase 0A — feasibility (2 photos, Concept A only)

- Pick **2 photos** from `dataset/photos/` that best cover the input variance
  (recommended: `01-small-garden` and `08-contemporary-house`).
- Run **Concept A** only against every candidate that supports image edit.
- Goal: prove that each candidate can ingest a normalized JPEG and return a
  base64 edit with acceptable geometry, and measure wall-clock time.
- Budget: smallest possible (2 edits per candidate).

### Phase 0B — ranking (2 best candidates, 10 photos, A + B)

- Down-select to the **2 best** candidates from 0A (quality + cost + latency).
- Run the full **10-photo** dataset with both **Concept A** and **Concept B**
  prompts (20 edits per candidate).
- Record per-image `durationMs`, output size, and qualitative comparison.
- Compute the measured `costPerImageEur` from the provider invoice/usage to
  replace the `UNKNOWN` marker (this populates `actualCostEur` +
  `billingStatus: 'measured'`).

## GO / NO-GO threshold proposal

- **GO** if the top candidate passes all of:
  1. ≥ 8/10 photos produce a usable edit for Concept A and ≥ 6/10 for B;
  2. median latency under 60 s per edit;
  3. measured `costPerImageEur` within owner budget (default ≤ 0.10 EUR/edit);
  4. output is a valid base64 JPEG/PNG that passes `normalizeImageForAi()`.
- **NO-GO** otherwise; the owner reviews the candidate table and may change
  the shortlist or re-run Phase 0A.

These thresholds are a **proposal** to be validated by the Lot 2 owner before
any authorized run.

## Keys/accounts needed (values never printed)

Required-later, in order of priority. The harness **never prints or stores the
values** — it only checks presence.

| Credential | Form | Status |
| --- | --- | --- |
| `NVIDIA_API_KEY` | env var | REQUIRED-LATER (image gen unverified) |
| Z.ai config | `.z-ai-config` file (cwd or home) | REQUIRED-LATER (SDK requires a file, not an env var) |
| `OPENAI_API_KEY` | env var | REQUIRED-LATER |

`.env.example` already documents `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`,
`NVIDIA_VISION_MODEL`, `NVIDIA_CHAT_MODEL`; `Z_AI_API_KEY` is present but
commented out (the SDK reads `.z-ai-config` instead).
