# ARQWELIA Lot 2 — AI Provider Benchmark Harness (A1 round 3 + Phase 0A corrections)

## Purpose

A1 is the **benchmark harness** for ARQWELIA Lot 2: it lets the team compare
AI image-generation / image-edit providers on real ARQWELIA garden photos —
without ever spending money accidentally.

The harness is **dry-run safe by default**. Nothing in this harness performs a
real provider network call unless **three independent env guards** are armed
(see [Guard rails](#guard-rails)) — and even then a real call can only be
triggered deliberately: it requires a key, an allowed base URL, the controlled
synthetic dataset inputs and a lockable manifest, as documented under
[When can a real call technically occur?](#when-can-a-real-call-technically-occur).

Scope decisions honored by this harness (Phase 0A final corrections):

- **Z.AI is BLOCKED for Phase 0A.** The installed `z-ai-web-dev-sdk` exposes an
  `images.generations.edit` SDK method, but official Z.AI documentation only
  documents `POST /api/paas/v4/images/generations` (text-to-image) with
  `{model, prompt, quality, size, user_id}` and a response `data[0].url`
  (NOT base64). No photo-input image-edit contract is verified. Status:
  > "SDK method detected but no current official API/model contract proving
  > photo-to-photo editing."
  `zai-glm` is therefore **documentary-only**: `supportsImageEditing=false`,
  `state=blocked_missing_capability`, NO `runSmoke`, and it is NOT listed in the
  executable `arqweliaBenchmarkCandidates`. It may be re-enabled later ONLY when
  official docs specify: endpoint, exact model, input image, output format,
  price and data policy.
- **OpenAI `gpt-image-2` is the primary Phase 0A adapter.** Controlled
  constants (`OPENAI_IMAGE_EDIT_MODELS = ['gpt-image-2', 'gpt-image-1']`,
  default `gpt-image-2`, `1536x1024`, `medium`, `png`); any model/size/quality/
  output_format outside the controlled lists is rejected. `gpt-image-2` never
  sends `input_fidelity` (it uses high fidelity automatically for input images).
- `src/lib/ai/nvidia.ts` only implements **vision-to-text** and **chat**. It
  does **not** prove image generation. Therefore NVIDIA is **never** chosen by
  default and its `supportsImageEditing` stays `false` until verified.
- `src/lib/images/secure-image.ts` `normalizeImageForAi()` strips
  EXIF/GPS, resizes to ≤1600 px, JPEG q82, and returns
  `{ dataUrl, buffer, mimeType, width, height, sha256, inputBytes, outputBytes }`.
  The harness **reuses this module** — there is no harness-local copy of the
  normalization logic.
- **No `@vercel/blob`, no other provider SDK.**
- **Execution-safety (Phase 0A corrections)**: a single canonical transport
  contract, atomic `reserve → markStarted → call → finalize` manifest lifecycle
  behind a local lock file, a FAIL-CLOSED manifest, a SYNTHETIC-only dataset
  gate, coherent response limits (JSON ≤ 48 MiB, decoded image ≤ 32 MiB) and a
  `pricingCheckedAt` stamp that must be re-checked on the official pricing page
  immediately before any smoke. See
  [Execution-safety contract](#execution-safety-contract).

## Files

| File | Role |
| --- | --- |
| `scripts/lib/arqwelia-benchmark/provider.ts` | Benchmark-only provider interface + typed re-exports of the shared runtime helpers |
| `scripts/lib/arqwelia-benchmark/provider-runtime.mjs` | **Shared runtime (plain ESM)**: authorization constants, `PHASE0A_OWNER_BUDGET_CAP_EUR` (the SINGLE owner-cap source), `computeGate`, `computeExecuteGate`, `ensureNoRealCall`, `ensurePhase0AGate`, `ArqweliaProviderError`, billing derivation, secret redaction |
| `scripts/lib/arqwelia-benchmark/candidates.ts` | Typed candidate registry |
| `scripts/lib/arqwelia-benchmark/candidates-registry.mjs` | Single source of truth (plain ESM, shared with the CLI): executable candidates, `mockRunSmoke`, documentary candidates, `getArqweliaBenchmarkCandidate`, `registerArqweliaBenchmarkCandidate` |
| `scripts/lib/arqwelia-benchmark/adapters/openai-image-adapter.mjs` | OpenAI `gpt-image-2` adapter: controlled constants, endpoint validation (EU), PURE response parser, real transport (dry-run by default) |
| `scripts/lib/arqwelia-benchmark/adapters/zai-image-adapter.mjs` | Z.AI **documentary only** (blocked — no `runSmoke`) |
| `scripts/lib/arqwelia-benchmark/phase0a-manifest.mjs` | Phase 0A retention config + STRICT 4-call counter + idempotence, persisted in a local manifest |
| `scripts/lib/arqwelia-benchmark/prompts/` | Versioned PII-free prompt builder + PII guard |
| `scripts/benchmark-arqwelia-smoke.mjs` | CLI entry point (**requires Bun**) |
| `tests/arqwelia-lot2-benchmark.test.ts` | A1 harness Vitest suite (no real calls, no keys) |
| `tests/arqwelia-lot2-phase0a-adapters.test.ts` | Phase 0A adapters suite (no real calls, global fetch spy = 0) |
| `tests/arqwelia-lot2-phase0a-correction.test.ts` | Phase 0A final-correction suite (32 tests) |
| `tests/arqwelia-lot2-phase0a-execution-safety.test.ts` | Phase 0A EXECUTION-SAFETY suite — full integration (runSmoke → real transport → mock fetch → image), canonical contract, atomic reservation + local lock + concurrency, FAIL-CLOSED manifest, synthetic-only dataset gate, coherent response limits, zero real network, PII-free reports |
| `dataset/README.md` | Benchmark photo dataset instructions + Phase 0A dataset rules (lives outside git) |

### Circular import removed

All shared runtime helpers live in `provider-runtime.mjs`. The registry imports
`provider-runtime.mjs`, the adapters import `provider-runtime.mjs`, and the
adapters **NEVER** import `candidates-registry.mjs` (the previous
`registry → adapter → registry` cycle is gone — a static test asserts this).
`provider.ts` re-exports from `provider-runtime.mjs` (never from the registry).

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

### Third lock — the Phase 0A execution gate (8-combination matrix)

```
executeAuthorized = realCallAuthorized === true && phase0aExecute === true
dryRun            = !executeAuthorized
```

| authorized | budget>0 | phase0aExecute | executeAuthorized | dryRun |
| --- | --- | --- | --- | --- |
| false | false | false | false | true |
| false | false | true | false | true |
| false | true | false | false | true |
| false | true | true | false | true |
| true | false | false | false | true |
| true | false | true | false | true |
| true | true | false | false | true |
| true | true | true | **true** | false |

ONLY `(true, true, true)` may technically allow a transport to be initialized.
When ANY lock is missing the CLI **never** invokes `runSmoke` of a real
provider, never initializes a transport, prints `DRY RUN`, and reports
`externalCalls=0 / actualCostEur=0 / billingStatus=not_called`.

- There is **no `--authorized` flag** — passing one is rejected as an unknown
  flag. Authorization comes exclusively from the environment.
- **HARD OWNER BUDGET CAP (Phase 0A):** `PHASE0A_OWNER_BUDGET_CAP_EUR`
  (**2 EUR**, defined once in `scripts/lib/arqwelia-benchmark/provider-runtime.mjs`;
  `PHASE0A_RETENTION_CONFIG.maximumBudgetEur` is **derived from it**) is the
  ABSOLUTE owner cap. The environment can NEVER configure a budget above it,
  and `--budget` can never exceed it either. Any over-cap budget (env OR CLI)
  is **refused with a non-zero exit** BEFORE any reservation, manifest item or
  transport construction — an over-budget config is never merely documented or
  ignored:
  - `env=2`, no `--budget` → `effectiveBudget=2` (allowed);
  - `env=2`, `--budget=1` → `effectiveBudget=1` (allowed);
  - `env=2`, `--budget=3` → refusal;
  - `env=10`, no `--budget` → refusal (env exceeds owner cap);
  - `env=10`, `--budget=2` → refusal ALSO (env config exceeds owner cap).
- `--budget` may **only reduce** the env budget (`min(cliBudget, envBudget)`).
  A `--budget` above a valid env ceiling is rejected with a clear error;
  `--budget <= 0` is rejected.
- With no env budget (absent, `0`, `NaN`, or invalid), the **effective budget
  is `0`** and the gate stays closed — `--budget` never unlocks a call and the
  CLI prints `DRY RUN` with `realCallAuthorized=false`.

Without all three env vars (or with a non-positive/invalid env budget) the CLI
prints `DRY RUN — NO EXTERNAL CALL` and exits `0`. On top of that, the
real-provider adapters enforce a **three-gate block** via `ensurePhase0AGate`
(see `scripts/lib/arqwelia-benchmark/provider-runtime.mjs`): a real transport
is only constructed when authorization AND budget (`0 < budget ≤ owner cap`)
AND Phase 0A execution intent are all present.

### When can a real call technically occur?

The default is a **dry run**: no transport is built, the CLI never reads
`OPENAI_API_KEY`, no `fetch` happens and no cost is incurred. A real execution
becomes technically possible **ONLY when ALL** of the following hold at the
same time:

1. `ARQWELIA_BENCHMARK_AUTHORIZED=true`;
2. `ARQWELIA_BENCHMARK_MAX_BUDGET_EUR >0` **AND** `<=2` (the Phase 0A owner cap
   `PHASE0A_OWNER_BUDGET_CAP_EUR`);
3. `ARQWELIA_BENCHMARK_PHASE0A_EXECUTE=true`;
4. `OPENAI_API_KEY` present;
5. `OPENAI_BASE_URL` in the allowlist (`https://api.openai.com/v1` or
   `https://eu.api.openai.com/v1`);
6. `--dataset-id <controlled>` present;
7. `--dataset-kind synthetic` present (Phase 0A is **synthetic only**);
8. `--image <photo>` present;
9. the local `phase0a-manifest.json` is valid and lockable (fail-closed);
10. the 4-call limit is not reached;
11. the idempotence key is not a duplicate (or an explicit retry is passed).

If any one of these is missing the CLI is a dry run or refuses with
`externalCalls=0 / billingStatus='not_called'` and no cost.

> **No real call has been performed during the development or tests of PR #79.**
> The test suites exercise transports **only** with an injected `fetchImpl`
> mock — the global `fetch` stays at ZERO across every Phase 0A suite.

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

### Official cost (OpenAI gpt-image-2) — documented, NOT converted

The OpenAI adapter's `estimateOfficialCost()` now returns the **official**
gpt-image-2 pricing for a **1536x1024 OUTPUT image** (these prices **exclude
input tokens for the photo + prompt**):

| Quality | Official price (USD, per output image at 1536x1024) |
| --- | --- |
| `low` | 0.005 USD |
| `medium` (Phase 0A default) | 0.041 USD |
| `high` | 0.165 USD |

- `officialPricingSource` references the official docs
  (`https://openai.com/api/pricing/`).
- **`pricingCheckedAt` = `2026-08-03`.** These USD values MUST be re-checked on
  the official pricing page/calculator immediately before any authorized smoke
  (prices change; `pricingCheckedAt` must be bumped to the re-check date).
- **No USD→EUR conversion is ever invented.** `actualCostEur` stays `null`
  until real billing is measured during the authorized smoke phase. Exact cost
  is never derived from `quality` alone, and `PAID_COST=0` is never written
  after an external call.
- Recommended first smoke **owner budget = 2 EUR max**
  (`ARQWELIA_BENCHMARK_MAX_BUDGET_EUR=2`, Phase 0A retention config).

NVIDIA and mock keep `known: false` (`UNKNOWN — TO BE MEASURED IN LOT 0`).

## Candidates

| id | Model | Image edit | Config check | Official cost | Status |
| --- | --- | --- | --- | --- | --- |
| `nvidia-nim` | `tbd` | ❌ `false` until verified (nvidia.ts is vision/chat only) | `NVIDIA_API_KEY` present | `UNKNOWN` | `blocked_missing_capability` |
| `zai-glm` | `tbd` | ❌ **BLOCKED** — documentary only, no `runSmoke` | always `false` | `UNKNOWN` | `blocked_missing_capability` |
| `openai-gpt-image` | `gpt-image-2` (default, official) | ✅ official `images/edits` multipart endpoint (base64 out via `data[0].b64_json`) | `OPENAI_API_KEY` present | official gpt-image-2 table | `ready_for_authorized_smoke` |
| `mock` | `mock-image-v1` | ✅ local placeholder PNG | always ok | `UNKNOWN` | `ready_for_authorized_smoke` |

`zai-glm` is NOT in `arqweliaBenchmarkCandidates` (the executable list). It
exists in `arqweliaBenchmarkDocumentaryCandidates` only. NVIDIA's image model
is a `tbd` placeholder because image generation on NVIDIA NIM is **not
verified** by this repo. The `mock` candidate never calls out — it writes a
local placeholder PNG so the pipeline can be tested end to end.

## OpenAI adapter details (Phase 0A)

### Controlled constants (`openai-image-adapter.mjs`)

- `OPENAI_IMAGE_EDIT_MODELS = ['gpt-image-2', 'gpt-image-1']`
- `OPENAI_PHASE0A_DEFAULT_MODEL = 'gpt-image-2'`
- `OPENAI_PHASE0A_DEFAULT_SIZE = '1536x1024'`
- `OPENAI_PHASE0A_DEFAULT_QUALITY = 'medium'`
- `OPENAI_PHASE0A_DEFAULT_OUTPUT_FORMAT = 'png'`
- `OPENAI_BASE_URL_ALLOWLIST = ['https://api.openai.com/v1', 'https://eu.api.openai.com/v1']`

Any model / size / quality / output_format outside the controlled lists is
rejected by `prepareMultipartBody`. For `gpt-image-2` the adapter does **NOT**
send `input_fidelity` (high fidelity is applied automatically to input images).

### Response parser — official `data[0].b64_json` shape

`parseOpenAiImageEditResponse(response)` is a PURE function that:

- requires a plain object with a **non-empty `data` array** whose
  `data[0].b64_json` is a **non-empty string**;
- decodes base64 and verifies the decoded payload is a real image via
  `sharp.metadata()` (records width/height/mimeType);
- **REJECTS**: `b64_json` at the ROOT (`response.b64_json`), an empty `data`
  array, invalid base64, valid base64 that is not an image (HTML/JSON/text),
  and arbitrary JSON;
- **NEVER logs the raw response body or the raw error body**; error messages
  never echo the content;
- returns a sanitized `{ buffer, width, height, mimeType }`.

The old code read `response.b64_json` incorrectly — that shape is now rejected.
Tests MUST use the official `{ data: [ { b64_json: "…" } ] }` shape.

### Configurable endpoint + EU

- Hard-coded `https://api.openai.com/v1/images/edits` is removed.
- `OPENAI_BASE_URL` (default `https://api.openai.com/v1`) drives the endpoint:
  `endpoint = ${OPENAI_BASE_URL without trailing slash}/images/edits`.
- `validateOpenAiBaseUrl(url)` allowlists exactly
  `https://api.openai.com/v1` and `https://eu.api.openai.com/v1`.
- **REJECTS**: non-HTTPS, URL with username/password, `localhost`, private IPs,
  a query string, a fragment, and any disallowed host.
- `resolveOpenAiImagesEditEndpoint(baseUrl)` validates then appends
  `/images/edits`.
- The EU endpoint requires an **organization with compatible data controls**;
  no real home photo until EU eligibility is confirmed.

### Real transport (`createOpenAiImageEditTransport`) — dry-run by default

A real OpenAI transport is only constructed when every gate is open; the default
is a dry run (no transport built, no key read, no fetch, no cost):

- Only constructible when the three locks are active and the budget is
  `0 < budget ≤ PHASE0A_OWNER_BUDGET_CAP_EUR` (it calls `ensurePhase0AGate`);
  all other combinations throw before any fetch.
- Uses `OPENAI_API_KEY` (server/CLI only — never logged, never stored).
- **CANONICAL CONTRACT (single source of truth):** the transport receives
  exactly `{ normalizedImageBuffer, builtPrompt, model, size, quality,
  outputFormat }` and is SOLELY responsible for building the multipart body +
  `FormData`, building the endpoint, doing the fetch, reading the response and
  calling `parseOpenAiImageEditResponse`. `runSmoke` forwards these normalized
  fields and NEVER pre-computes a multipart descriptor — there is NO second
  contract and NO shape auto-detection. Mock transports in tests follow the
  same contract and return the parsed
  `{ buffer, width, height, mimeType, requestId, externalCallStarted,
  responseReceived }`.
- POSTs `multipart/form-data` to the validated `/images/edits` endpoint with
  `image`, `prompt`, `model=gpt-image-2`, `size=1536x1024`,
  `quality=medium`, `output_format=png`.
- The multipart boundary is left to `fetch`/`FormData` (never set manually).
- `AbortController` with a configurable timeout (default 120 s).
- Checks `response.ok`, reads `x-request-id` (sanitized — a non-secret, safe
  token only), parses JSON behind a **max-size guard** (48 MiB), and validates
  the payload with `parseOpenAiImageEditResponse` (decoded image ≤ 32 MiB).
- Returns/attaches sanitized `requestId`, `externalCallStarted` and
  `responseReceived`; after a started fetch the billing is always
  `externalCalls=1, actualCostEur=null, billingStatus='unknown'` even on a
  fetch timeout, HTTP 400/401/429/500, invalid response, parse failure or image
  write failure.
- **Never logs** the `Authorization` header, the full prompt, or the source
  photo; errors never contain them.
- The test suites make no real call: all responses are mocked, global `fetch`
  stays ZERO across the normal suites, and transports are exercised only with
  an injected `fetchImpl` mock. No real call has been performed during the
  development or tests of PR #79.

## Execution-safety contract

### Atomic reservation before network (`phase0a-manifest.mjs`)

The CLI (when `executeAuthorized`) replaces `check→call→record-if-success` with
an atomic lifecycle:

```
reservePhase0aCall → markPhase0aCallStarted → call → finalizePhase0aCall
```

- `reservePhase0aCall` (BEFORE any transport): reads the manifest under a local
  lock, enforces the 4-call cap + idempotence, and records a `reserved` attempt
  (`{ attemptId, idempotenceKey, datasetItemId, concept, model, promptSha256,
  status:'reserved', reservedAt }`). A `reserved` attempt **provisionally
  occupies one of the 4 slots (it counts)** until it is finalized.
- `markPhase0aCallStarted` (immediately before the real fetch invocation):
  status → `in_flight` (external call started or about to start), `startedAt` —
  the attempt is **definitively** counted toward the 4-call limit.
- `finalizePhase0aCall`: `succeeded` / `failed` / `unknown` all definitively
  consume a slot (`externalCalls=1, actualCostEur=null, billingStatus='unknown'`);
  `cancelled_before_call` (`externalCalls=0, billingStatus='not_called'`)
  **releases** the slot — it is the ONLY status that frees capacity. A failed
  call AFTER fetch consumes one of the four slots.

### Capacity accounting (status lifecycle)

| Status | Meaning | Counts toward the 4-call cap? |
| --- | --- | --- |
| `reserved` | capacity provisionally occupied | **yes** (until finalized) |
| `in_flight` | external call started or about to start | yes |
| `succeeded` / `failed` / `unknown` | capacity definitively consumed | yes |
| `cancelled_before_call` | capacity released (never made a call) | **no** |

### Local lock + concurrency

Every manifest read-modify-write is guarded by a local lock file
`phase0a-manifest.lock`, created with `open(lockPath, 'wx')` (atomically fails
with `EEXIST` when another process owns it), released in a `finally`, with a max
wait timeout. We never delete a lock owned by another process and refuse
execution on doubt (inode check before unlink). The lock's **parent directory is
created first** (`mkdir(dirname(lockPath), { recursive: true })`), so a
completely new nested `--out` path works on the very first run. Because
`reserved` occupies capacity, 8 concurrent reservations yield **EXACTLY 4
successes** — a 5th reserved attempt can never be recorded.

### FAIL-CLOSED manifest

- manifest ABSENT → creation allowed;
- PRESENT + VALID → normal read;
- PRESENT but CORRUPT → **blocking error**;
- permission / read / write error → **blocking error**.

In `executeAuthorized` the CLI never silently returns an empty manifest, never
ignores a manifest error and never launches a transport when a manifest
operation failed. In a dry run a manifest failure produces a diagnostic without
a call and is never presented as reliable.

### Dataset authorization (explicit synthetic only)

`ARQWELIA_BENCHMARK_AUTHORIZED` concerns **spend** authorization, NOT photo
authorization. Phase 0A smoke accepts ONLY an **explicit** `--dataset-kind
synthetic` (`authorized` / `user` / `home` / `real` are REJECTED). The default
is `null` — an absent declaration is **NEVER** recorded as synthetic:

- When `executeAuthorized===true` the CLI REQUIRES `--dataset-id <controlled>`,
  `--dataset-kind synthetic` AND `--image <photo>`. These are verified **BEFORE**
  `upsertPhase0aItem` / `reservePhase0aCall` / any transport — on failure there
  is NO manifest item, NO reservation, NO transport, and the result is
  `externalCalls=0 / billingStatus='not_called'`.
- In a dry run, the manifest records the item only when the explicit
  `--dataset-kind synthetic` declaration is present; an absent declaration
  writes **no item** and the report keeps `datasetKind=null`.
- When recorded, the item carries `datasetKind:'synthetic'`,
  `authorizationBasis:'synthetic'`, `normalizedSha256`,
  `noExif:true`, `noFacesDeclared:true`, `noPlatesDeclared:true`,
  `noHouseNumberDeclared:true`, `noAddressDeclared:true`, `noGps:true` — never
  derived from `envAuthorized`.

### Coherent response limits

- `OPENAI_MAX_RESPONSE_BODY_BYTES = 48 MiB` (covers the 32 MiB decoded image ≈
  42.7 MiB base64 + the JSON envelope + a small technical margin);
- `OPENAI_MAX_DECODED_IMAGE_BYTES = 32 MiB` (authoritative image-size guard).

A JSON body between 5 MiB and 48 MiB is accepted when it contains a valid image;
a JSON body > 48 MiB is rejected by the body limit; a decoded image > 32 MiB is
rejected by the image guard. Errors never include the raw response body.

## Phase 0A retention config (no execution) + strict counter

The Phase 0A retention configuration (`phase0a-manifest.mjs`,
`PHASE0A_RETENTION_CONFIG`) is:

| Field | Value |
| --- | --- |
| provider | `openai-gpt-image` |
| model | `gpt-image-2` |
| size | `1536x1024` |
| quality | `medium` |
| output_format | `png` |
| photos | 2 |
| concepts | A and B |
| maximumCalls | **4** (2 photos × 2 concepts) |
| maximumBudgetEur | **2 EUR** — ABSOLUTE owner cap, defined once as `PHASE0A_OWNER_BUDGET_CAP_EUR` in `provider-runtime.mjs`; the manifest value is **derived from it**. Enforced by the CLI and by `ensurePhase0AGate` (an env or CLI budget above it is refused with a non-zero exit) |

**STRICT counter** (persisted, not process-memory only):

- max **4 calls**; one call per photo+concept;
- idempotence key = `datasetItemId + concept + model + promptSha256`;
- refuses a 5th call;
- refuses a duplicate unless an explicit `retry` option is passed;
- the execute path uses the atomic
  [reserve → markStarted → call → finalize lifecycle](#atomic-reservation-before-network)
  with the local lock file (see [Execution-safety contract](#execution-safety-contract)).

The counter reads/writes a local, **NON-versioned** JSON manifest
(`phase0a-manifest.json`) in the benchmark output directory. For each dataset
item the manifest records `datasetItemId`, `datasetKind='synthetic'`,
`authorizationBasis='synthetic'`, `normalizedSha256`, `noExif`,
`noFacesDeclared`, `noPlatesDeclared`, `noHouseNumberDeclared`,
`noAddressDeclared`, `noGps`, `date`, `statusA` and `statusB`. The
manifest is gitignored via `benchmark-out/` (explicit patterns were also added
to `.gitignore`).

### Phase 0A dataset rules

**PHASE 0A DATASET MODE: SYNTHETIC ONLY:**

- only **synthetic images created for the benchmark**;
- **no real homes**, **no user photos**, **no people**, **no faces**,
  **no license plates**, **no house numbers**, **no addresses**, **no GPS
  coordinates**, **no identifying filenames**;
- never commit real photos (`dataset/photos/` and `benchmark-out/` are
  gitignored).

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
bun scripts/benchmark-arqwelia-smoke.mjs --provider openai-gpt-image --out ./benchmark-out
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
When ANY of the three locks is missing the run is a DRY RUN (see the
8-combination matrix above) — `runSmoke` of a real provider is never invoked.

Reports are written to the `--out` dir (default `./benchmark-out`): one JSON
and one Markdown summary per run, plus the mock placeholder PNG. When the
`openai-gpt-image` provider runs with a source photo, a local
`phase0a-manifest.json` is also written (retention record; gitignored).

## Run an authorized smoke (owner budget only + Phase 0A intent)

Authorized smoke **spends money**. It can only be triggered by the owner with
an explicit env budget AND Phase 0A execution intent — there is no CLI
override, and a real call still requires the transport, the key, the allowed
base URL, the synthetic dataset inputs and a lockable manifest listed in
[When can a real call technically occur?](#when-can-a-real-call-technically-occur):

```bash
export ARQWELIA_BENCHMARK_AUTHORIZED=true
export ARQWELIA_BENCHMARK_MAX_BUDGET_EUR=2
export ARQWELIA_BENCHMARK_PHASE0A_EXECUTE=true
bun scripts/benchmark-arqwelia-smoke.mjs --provider openai-gpt-image \
  --image dataset/photos/01-small-garden.png --concept A --out ./benchmark-out
```

`--budget` may cap below that ceiling (never above — and never above the
2 EUR owner cap):

```bash
# same run, capped to 1 EUR
ARQWELIA_BENCHMARK_AUTHORIZED=true ARQWELIA_BENCHMARK_MAX_BUDGET_EUR=2 \
ARQWELIA_BENCHMARK_PHASE0A_EXECUTE=true \
  bun scripts/benchmark-arqwelia-smoke.mjs --provider openai-gpt-image \
  --budget 1 --out ./benchmark-out
```

An environment budget above **2 EUR** (e.g. `ARQWELIA_BENCHMARK_MAX_BUDGET_EUR=10`)
is **refused** with a non-zero exit — the environment can never configure a
budget above the Phase 0A owner cap.

With no `OPENAI_API_KEY` a real provider answers `NOT IMPLEMENTED — awaiting
Phase 0A execution` (no transport can be built, so no call is made); the report
records `REAL_PROVIDER_CALLS=0, PAID_COST=0`. `--provider mock` remains the
only provider whose smoke produces an artifact. No real call has been performed
during the development or tests of PR #79.

## Phase 0A — benchmark provider adapters (this build)

Phase 0A prepares the OpenAI image-edit adapter (`openai-gpt-image`,
`gpt-image-2`) plus versioned, PII-free prompts and a three-gate block.
**The default is a dry run: no real provider call is made unless every gate in
[When can a real call technically occur?](#when-can-a-real-call-technically-occur)
is open at the same time.** All request bodies are built deterministically and
the transports are injectable — tests inject mock transports, and the CLI
builds the real transport only when the key AND all three gates are present;
without the key the default transport answers `NOT IMPLEMENTED — awaiting
Phase 0A execution`. No real call has been performed during the development or
tests of PR #79.

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

### Request bodies (deterministic, unit-tested)

- `openaiImageAdapter.prepareMultipartBody({ normalizedImageBuffer, builtPrompt, model?, size?, quality?, outputFormat? })`
  returns a plain multipart descriptor (`method`, `endpoint`, `parts`, resolved
  `model`/`size`/`quality`/`outputFormat`) plus a `toFormData()` builder for the
  official `images/edits` contract. `endpoint` is resolved from
  `OPENAI_BASE_URL`. Any value outside the controlled lists is rejected.

The adapter receives ONLY normalized fields (never `imagePath`, never a raw
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

### Phase 0A — feasibility (2 photos, Concepts A + B, 4 calls max)

- Pick **2 photos** from `dataset/photos/` that best cover the input variance
  (recommended: `01-small-garden` and `08-contemporary-house`). The photos must
  satisfy the [Phase 0A dataset rules](#phase-0a-dataset-rules).
- Run both **Concept A** and **Concept B** (one call per photo+concept,
  **max 4 calls**, owner budget **2 EUR max**) against the candidate that
  supports image edit.
- Goal: prove the candidate can ingest a normalized JPEG and return a base64
  edit with acceptable geometry, and measure wall-clock time.
- The STRICT counter (persisted in `phase0a-manifest.json`) refuses a 5th call
  and refuses a duplicate without an explicit retry option.

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
| Z.ai config | — | **BLOCKED** for Phase 0A (documentary only — no runnable transport) |
| `OPENAI_API_KEY` | env var | REQUIRED-LATER (data retention / region MUST be verified; EU endpoint needs compatible data controls) |
| `OPENAI_BASE_URL` | env var | optional, allowlisted (`api.openai.com/v1` default, `eu.api.openai.com/v1`) |

`.env.example` documents `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`,
`NVIDIA_VISION_MODEL`, `NVIDIA_CHAT_MODEL`; the Z.AI vars are present but
flagged BLOCKED, and the OpenAI Phase 0A vars (`OPENAI_API_KEY`,
`OPENAI_BASE_URL`, the Phase 0A defaults and the 4-call / 2-EUR retention
config) are documented. Values are never printed or stored — the harness only
checks presence.
