# ARQWELIA Lot 2 — AI Provider Benchmark Harness (A1 round 3 + Phase 0A adapters)

## Purpose

A1 is the **benchmark harness** for ARQWELIA Lot 2: it lets the team compare
AI image-generation / image-edit providers on real ARQWELIA garden photos —
without ever spending money accidentally.

The harness is **dry-run safe by default**. Nothing in this harness performs a
real provider network call unless **three independent env guards** are armed
(see [Guard rails](#guard-rails)). Even then, the real-provider adapters never
receive a transport from the CLI, so no paid call can occur in this build.

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
| `scripts/lib/arqwelia-benchmark/provider.ts` | Benchmark-only provider interface + runtime guard helpers + billing contract + `computeGate` |
| `scripts/lib/arqwelia-benchmark/candidates.ts` | Typed candidate registry |
| `scripts/lib/arqwelia-benchmark/candidates-registry.mjs` | Single source of truth (plain ESM, shared with the CLI): candidates, `computeGate`, `ArqweliaProviderError`, `billingFromCaughtError`, `ensureNoRealCall`, `redactSecrets`, billing derivation |
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

## Guard rails (authorization, budget AND execution intent are ENV-ONLY)

A real provider call requires **ALL THREE** of these environment variables:

| Env var | Meaning |
| --- | --- |
| `ARQWELIA_BENCHMARK_AUTHORIZED=true` | Explicit human authorization flag |
| `ARQWELIA_BENCHMARK_MAX_BUDGET_EUR>0` | Owner-approved budget cap (EUR) — the **only** source of a usable budget |
| `ARQWELIA_BENCHMARK_PHASE0A_EXECUTE=true` | Explicit Phase 0A execution intent (third gate) |

**The CLI can never authorize a real call and can never create a budget.** The
budget gate is a single helper `computeGate()` with these exact rules:

```
envAuthorized   = ARQWELIA_BENCHMARK_AUTHORIZED === true
envBudget       = a finite strictly-positive number supplied ONLY by the
                  environment (absent/invalid/NaN/<=0 => envBudget = 0)
envGateOpen     = envAuthorized && envBudget > 0
effectiveBudget = --budget absent => envBudget;
                  --budget present => min(cliBudget, envBudget)
realCallAuthorized = envGateOpen && effectiveBudget > 0
```

- There is **no `--authorized` flag** — passing one is rejected as an unknown
  flag. Authorization comes exclusively from the environment.
- `--budget` may **only reduce** the env budget (`min(cliBudget, envBudget)`).
  A `--budget` above a valid env ceiling is rejected with a clear error;
  `--budget <= 0` is rejected.
- With no env budget (absent, `0`, `NaN`, or invalid), the **effective budget
  is `0`** and the gate stays closed — `--budget` never unlocks a call and the
  CLI prints `DRY RUN` with `realCallAuthorized=false`.

Without all three env vars (or with a non-positive/invalid env budget) the CLI
prints `DRY RUN — NO EXTERNAL CALL` and exits `0`. On top of that, the
real-provider adapters enforce a **three-gate block** via `ensurePhase0AGate`
(see `scripts/lib/arqwelia-benchmark/adapters/`): a real transport is
impossible unless authorization AND budget AND Phase 0A execution intent are
all present, and even then the CLI never injects a transport, so no paid call
can happen in this build.

The harness **never prints API keys**. Any env value whose name matches
`/KEY|TOKEN|SECRET/i` is redacted before it can reach stdout or a report.

### Provider receives ONLY the normalized image

`runSmoke` never receives the raw source buffer or the user-supplied path. The
CLI normalizes first (reusing the canonical `normalizeImageForAi`) and hands the
adapter **only** these normalized fields:

`normalizedImageBuffer`, `normalizedImageDataUrl`, `normalizedMimeType`,
`normalizedSha256`, `normalizedWidth`, `normalizedHeight`, `promptVersion`,
`sanitizedPrompt`, plus `providerId`, `model`, `outDir`, `budgetMaxEur`,
`realCallAuthorized`. There is no `imagePath` and no `promptConceptA` key —
the raw source and its path never reach an adapter.

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

### Conservative billing on error

A caught adapter error is **never auto-converted** into `externalCalls=0 /
actualCostEur=0 / not_called`. Adapters signal what actually happened by
throwing `ArqweliaProviderError(message, billing)`:

- error **before** any proven external call → `externalCalls=0`,
  `actualCostEur=0`, `billingStatus='not_called'`;
- error **after** an external call started → `externalCalls>=1`,
  `actualCostEur=null` (if unknown), `billingStatus='unknown'`;
- officially measured cost → `billingStatus='measured'` + the real value.

Any **generic** error thrown inside a real-adapter block — when the system
cannot prove no call was made — gets the conservative default
`externalCalls=1`, `actualCostEur=null`, `billingStatus='unknown'`. The CLI
catch path applies the error's carried billing (or that default).

`estimateOfficialCost()` returns `known: false` with note
`UNKNOWN — TO BE MEASURED IN LOT 0` for every candidate. There is **no
official or measured pricing** for image-edit on these providers at this
point, and the harness **refuses to invent a cost-per-image number**. Real
cost per image will be measured during the authorized smoke phase (Lot 0) and
back-filled into `estimateOfficialCost()`.

## Candidates

| id | Model | Image edit | Config check | Official cost | Status |
| --- | --- | --- | --- | --- | --- |
| `nvidia-nim` | `tbd` | ❌ `false` until verified (nvidia.ts is vision/chat only) | `NVIDIA_API_KEY` present | `UNKNOWN` | `blocked_missing_capability` |
| `zai-glm` | `tbd` (not verified) | ✅ via `z-ai-web-dev-sdk` `images.generations.edit` (JSON body, base64 PNG out) | `.z-ai-config` file (cwd or home) or `ZAI_BASE_URL` + `Z_AI_API_KEY` | `UNKNOWN` | `ready_for_authorized_smoke` |
| `openai-gpt-image` | `gpt-image-1` (official) | ✅ official `images/edits` multipart endpoint (base64 PNG out) | `OPENAI_API_KEY` present | `UNKNOWN` | `ready_for_authorized_smoke` |
| `mock` | `mock-image-v1` | ✅ local placeholder PNG | always ok | `UNKNOWN` | `ready_for_authorized_smoke` |

NVIDIA's image model is a `tbd` placeholder because image generation on
NVIDIA NIM is **not verified** by this repo (state `blocked_missing_capability`
— no image-edit endpoint is verified). The `mock` candidate never calls out —
it writes a local placeholder PNG so the pipeline can be tested end to end.

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
local usernames, the raw free prompt, API keys/tokens, addresses, or the
original local file name. The report keeps only:

- `datasetItemId` — the controlled alphanumeric `--dataset-id`, or a truncated
  hash of the normalized image when not provided (never the local basename);
- `normalizedSha256`, width/height, input/output bytes, mimeType.
- `promptVersion` (`arqwelia-lot2-v1`) and `promptSha256` (a SHA-256 **hash of
  the prompt text**, never the prompt itself);
- provider, model, and technical results (`durationMs`, `externalCalls`,
  `actualCostEur`, `billingStatus`, `officialPricingSource`, output
  width/height, output file name only).

The report never writes the `--image` path or the `--promptA` text, and never
stores the local file basename (no `sourceFileName`). A failure to read an
image reports exactly `Image file could not be read` — without the path.

```bash
# controlled dataset id (alphanumeric only); a missing id falls back to a
# truncated hash of the normalized image
bun scripts/benchmark-arqwelia-smoke.mjs --provider mock \
  --image dataset/photos/01-small-garden.png --dataset-id item001 \
  --out ./benchmark-out
```

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
realCallAuthorized=false
mode=dry-run
DRY RUN — NO EXTERNAL CALL
external_calls=0
billing_status=not_called
paid_eur=0
REAL_PROVIDER_CALLS=0, PAID_COST=0
```

`realCallAuthorized` is `true` only when the env gate is open (authorized AND
`ARQWELIA_BENCHMARK_MAX_BUDGET_EUR>0`); it is never derived from `--budget`.

Reports are written to the `--out` dir (default `./benchmark-out`): one JSON
and one Markdown summary per run, plus the mock placeholder PNG.

## Run an authorized smoke (owner budget only + Phase 0A intent)

Authorized smoke **spends money**. It can only be triggered by the owner with
an explicit env budget AND Phase 0A execution intent — there is no CLI
override, and a real call still requires a transport that the CLI never
injects:

```bash
export ARQWELIA_BENCHMARK_AUTHORIZED=true
export ARQWELIA_BENCHMARK_MAX_BUDGET_EUR=5
export ARQWELIA_BENCHMARK_PHASE0A_EXECUTE=true
bun scripts/benchmark-arqwelia-smoke.mjs --provider zai-glm \
  --image dataset/photos/01-small-garden.png --concept A --out ./benchmark-out
```

`--budget` may cap below that ceiling (never above):

```bash
# same run, capped to 3 EUR
ARQWELIA_BENCHMARK_AUTHORIZED=true ARQWELIA_BENCHMARK_MAX_BUDGET_EUR=5 \
ARQWELIA_BENCHMARK_PHASE0A_EXECUTE=true \
  bun scripts/benchmark-arqwelia-smoke.mjs --provider zai-glm \
  --budget 3 --out ./benchmark-out
```

In this build, real providers still answer `NOT IMPLEMENTED — awaiting Phase 0A
execution` (no transport is ever injected, so no call is made); the report
records `REAL_PROVIDER_CALLS=0, PAID_COST=0`. `--provider mock` remains the
only provider whose smoke produces an artifact.

## Phase 0A — benchmark provider adapters (this build)

Phase 0A prepares the two image-edit provider adapters (`zai-glm`,
`openai-gpt-image`) plus versioned, PII-free prompts and a three-gate block.
**No real provider call happens in this build.** All request bodies are built
deterministically and the transports are injectable — tests inject mock
transports and the CLI never injects one, so the default transport always
answers `NOT IMPLEMENTED — awaiting Phase 0A execution`.

### Versioned prompts (`scripts/lib/arqwelia-benchmark/prompts/`)

- `concept-a-v1.ts` / `concept-b-v1.ts` — the two STATIC concept templates
  (v1). Concept A is realistic and sober (preserves house, fences, trees,
  perspective; minimal garden changes; no people/text/logo). Concept B is a
  premium, inspirational render (house + perspective preserved; ambitious
  landscaping; no people/text/logo).
- `vocabulary.ts` — closed lists for `style`, `shape`, `budgetRange`,
  `declaredConstraints` and the terrace phrasing. Only these values can ever be
  interpolated into a prompt.
- `prompt-builder.ts` — `buildArqweliaPrompt` / `buildDefaultArqweliaPrompt`
  produce `{ promptVersion: 'arqwelia-lot2-v1', concept, prompt, promptSha256 }`
  and reject any non-controlled input. The prompt can NEVER include
  name/firstName/email/phone/address/GPS/postalCode/publicId/projectToken or
  free-form user text.
- `pii-guard.ts` — `scanForPii`, `assertPromptPiiFree` (applied by the builder
  and again by the adapters) and `assertNoPersonalData` (applied by the report
  writer as a final gate). Messages never echo the offending value.

### Per-candidate Phase 0A status

| Candidate | `zai-glm` | `openai-gpt-image` |
| --- | --- | --- |
| **Model** | `tbd` — NOT verified (see below) | `gpt-image-1` — documented official |
| **Model status** | `tbd` (blocked_missing_capability for the exact model string) | verified from official contract |
| **Image-editing method** | Z.ai SDK `images.generations.edit` — JSON body `{ model, prompt, image, size? }`, `image` is a base64 data URL | OpenAI `POST https://api.openai.com/v1/images/edits` — `multipart/form-data` (`image` file, `prompt`, `model`, optional `size`) |
| **Input formats** | normalized JPEG (EXIF-free `normalizeImageForAi` output), sent as `data:image/jpeg;base64,…` | normalized JPEG (EXIF-free) as the `image` file part (`image/jpeg`, filename `image.jpg`) |
| **Output formats** | base64-encoded PNG (`data[0].base64`), decoded to a `.png` file | base64-encoded PNG (`b64_json`), decoded to a `.png` file |
| **Config needed** | `.z-ai-config` file (cwd/home) OR `ZAI_BASE_URL` + `Z_AI_API_KEY` env (harness materializes a config for an authorized run) | `OPENAI_API_KEY` env |
| **Data retention to verify** | MUST be verified from the Z.ai console before an authorized run | MUST be verified — EU/GDPR consideration |
| **Region to verify** | MUST be verified (no assumption hard-coded) | MUST be verified (no assumption hard-coded) |
| **Official pricing to verify** | `UNKNOWN — TO BE MEASURED IN LOT 0` | `UNKNOWN — TO BE MEASURED IN LOT 0` |
| **Status** | `ready_for_authorized_smoke` | `ready_for_authorized_smoke` |

**Z.ai model string is `tbd` (not verified):** `z-ai-web-dev-sdk` v0.0.18
declares `CreateImageEditBody.model` as **optional** and `createImageEdit`
forwards `{ ...body }` unchanged — the SDK never injects a default edit model,
and no `glm` / default-edit-model constant exists in its `dist/`. The concrete
edit model must be confirmed from the Z.ai console during Phase 0A provisioning
before any authorized execution. NVIDIA remains `blocked_missing_capability`
(documentary only, no adapter).

### Request bodies (deterministic, unit-tested)

- `zaiImageAdapter.prepareRequest({ normalizedImageBuffer?, normalizedImageDataUrl?, builtPrompt, model, size? })`
  returns exactly the JSON body the SDK edit call would receive, without
  calling the SDK.
- `openaiImageAdapter.prepareMultipartBody({ normalizedImageBuffer, builtPrompt, model, size? })`
  returns a plain multipart descriptor (`method`, `endpoint`, `parts`) plus a
  `toFormData()` builder for the official `images/edits` contract.

The adapters receive ONLY normalized fields (never `imagePath`, never a raw
source buffer, never CLI free text). `--promptA` is reserved for the
mock/diagnostic path and never reaches a real adapter; real adapters receive
the versioned prompt built from `--concept A|B`.

### Conservative billing on a would-be real call

When a mock transport is injected (tests only) a successful would-be real call
is reported as `externalCalls=1`, `actualCostEur=null`,
`billingStatus='unknown'` — never `PAID_COST=0`. Transport errors are sanitized
(no secret, no path) and any generic transport failure keeps the conservative
`unknown / 1 / null` billing.

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
| `NVIDIA_API_KEY` | env var | REQUIRED-LATER (image gen unverified — `blocked_missing_capability`) |
| Z.ai config | `.z-ai-config` file (cwd or home), or `ZAI_BASE_URL` + `Z_AI_API_KEY` env | REQUIRED-LATER (SDK requires a file; the harness can materialize one from env for an authorized run) |
| `OPENAI_API_KEY` | env var | REQUIRED-LATER (data retention / region MUST be verified) |

`.env.example` already documents `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`,
`NVIDIA_VISION_MODEL`, `NVIDIA_CHAT_MODEL`; `Z_AI_API_KEY` is present but
commented out (the SDK reads `.z-ai-config` instead). Values are never printed
or stored — the harness only checks presence.
