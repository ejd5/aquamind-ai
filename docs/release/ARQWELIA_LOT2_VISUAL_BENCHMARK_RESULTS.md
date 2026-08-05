# ARQWELIA Lot 2 — Visual benchmark results

Status: **technical execution validated / visual acceptance rejected**.

This document records the two authorized Concept A benchmark runs performed with the official Diffusers SDXL inpainting pipeline. It contains no source image, no mask bytes, no secret, and no personal metadata.

## Decision

- `generationStatus`: `succeeded`
- `visualAcceptance`: `rejected`
- `rejectionReason`: `no_pool_visible_grass_regenerated_second_run`
- PR #80 must remain **Draft** and **must not be merged**.
- No additional generation using the same plain SDXL inpainting approach is approved.

The technical pipeline is accepted for file validation, single-use execution safety, output restoration, reporting, and deterministic preservation outside the mask. The product requirement — inserting a plausible swimming pool — is not met.

## Benchmark 1

- GPU: Tesla T4
- Model: `diffusers/stable-diffusion-xl-1.0-inpainting-0.1`
- Immutable revision: `115134f363124c53c7d878647567d04daf26e41e`
- Seed: `42`
- Configured steps: `25`
- CFG: `7.0`
- Strength: `0.82`
- Retry: `false`
- Technical status: `succeeded`
- Visual result: rejected — the masked area was regenerated as grass; no visible pool.
- Final file SHA-256: `5a93bd02b231fad3e278a7e9202c27c021748839bd4b2afb76cad643fb3e9eb1`

## Benchmark 2

- GPU: Tesla T4
- VRAM: `14.56 GB`
- Model: `diffusers/stable-diffusion-xl-1.0-inpainting-0.1`
- Immutable revision: `115134f363124c53c7d878647567d04daf26e41e`
- Source SHA-256: `fe52d460e8bf9180ba7fd96b3d860d3dbac4d3103ce57957ea35a1a13d97d467`
- Mask SHA-256: `d9d3f1a947fd6ade465f3da7bd6943a97dbfc871e37bd40f983c2b4f42ce032e`
- Seed: `43`
- Configured steps: `35`
- Effective steps: `34`
- CFG: `8.0`
- Strength: `0.99`
- `padding_mask_crop`: `64`
- Positive token counts: `35 / 35`
- Negative token counts: `30 / 30`
- Generation attempts: `1`
- Retry: `false`
- Raw changed-pixel ratio inside mask: `0.9477194456110878`
- Raw unchanged-pixel ratio outside mask: `1.0`
- Final unchanged-pixel ratio outside mask: `1.0`
- Final dimensions: `1536 x 1024`
- Final file SHA-256: `7f871db98405cdf9b15e33506c77365ce511f367063bf4f8f054bb8eaa22d83e`
- Technical status: `succeeded`
- Visual result: rejected — the masked area was regenerated as grass with a dark shadow; no visible pool, water, coping, or pool geometry.

## What is validated

1. Exact source and mask SHA-256 verification before model load.
2. CUDA and environment preflight before consuming the single attempt.
3. Exactly one `pipe(...)` call, no retry, honest failure reporting.
4. CLIP token counts checked on both SDXL tokenizers.
5. Working-canvas mapping and restoration to `1536 x 1024`.
6. Deterministic preservation of unmasked pixels in the final composite.
7. Reproducible run report with immutable model revision and file hashes.

## What is rejected

1. Plain text-guided SDXL inpainting as the sole method for architectural pool insertion.
2. Further seed-only or parameter-only retries on the same workflow.
3. Any claim that pixel-change metrics prove that a pool is visible.
4. Any Production or customer-facing use of this POC.

## Required next POC

The next experiment must change the generation method rather than only tuning parameters. It must be developed on a separate branch from the integration base and should evaluate geometry-guided insertion with explicit visual structure, for example:

- a pool-layout conditioning image or depth/edge guidance;
- a mask that includes both basin and coping footprint;
- an optional reference image adapter for pool appearance;
- a geometry-aware ComfyUI or Diffusers workflow;
- the same exact source/mask hashing, no-retry gate, outside-mask preservation, and manual visual acceptance gate.

Acceptance requires a clearly visible in-ground swimming pool with coherent perspective, water, coping, boundaries, scale, and lighting. Technical success alone is insufficient.
