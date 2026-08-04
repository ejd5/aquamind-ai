# ARQWELIA Lot 2 — DeepSeek + ComfyUI SDXL Inpainting POC

Status: **POC only — no Production usage at this stage.**

## Pipeline

```
Photo normalisée
    ↓
Masque de la zone piscine
    ↓
Questionnaire ARQWELIA (closed vocabulary)
    ↓
DeepSeek Visual Planner (JSON brief)
    ↓
ArqweliaVisualBrief (strict JSON, Zod-validated)
    ↓
Workflow ComfyUI SDXL Inpainting (versioned, API format)
    ↓
Image Concept A ou B
    ↓
Contrôle et rapport local
```

Separation of concerns:

- **A. Semantic planning** — DeepSeek produces a strict `ArqweliaVisualBrief`
  JSON from controlled enum inputs. It never receives a photo.
- **B. Visual generation** — ComfyUI **local** runs the SDXL inpainting
  workflow. No paid image API.
- **C. Storage / orchestration** — future AQWELIA persistence (NOT part of this
  PR).

## Roles

| Component | Role |
| --- | --- |
| DeepSeek | Text/JSON planning only. Receives NO photo, NO address, NO GPS, NO name, NO email. |
| ComfyUI local | Local visual orchestration (loopback only). |
| SDXL Inpainting | POC image engine (`diffusers/stable-diffusion-xl-1.0-inpainting-0.1`). |
| Source image + mask | Stay **local** during the POC; never sent to any remote provider. |

## Cost

- DeepSeek planning: **0 calls / 0 cost** in `mock` mode (default). The `api`
  mode is gated by `DEEPSEEK_API_KEY` + `ARQWELIA_VISUAL_PLANNER_AUTHORIZED=true`.
- ComfyUI local: **no per-image provider API charge**. A local GPU generation
  still consumes compute resources — we do NOT claim it is free; we only report
  that there is no per-image provider API charge.
- SDXL model license: **CreativeML Open RAIL++-M** (documented, not vendored).

## GPU requirement

A local GPU (or a free GPU notebook) is required for real generation. A free
GPU environment is acceptable **for benchmarking only**, never Production.

## Quality limits (SDXL)

- POC resolution: **1024x1024**.
- The source photo (e.g. 1536x1024) is adapted with an explicit strategy:
  proportional resize + padding if needed, original mapping preserved, never
  stretched. The report restores the original ratio.
- SDXL inpainting quality is not the final Production level. The POC validates:
  unmasked-pixel preservation, a plausible pool insertion, and the
  DeepSeek → workflow → result chain.

## Replacing the engine later

The `ArqweliaVisualEngine` contract is engine-agnostic: a future engine can
replace the SDXL inpainting backend **without changing the `ArqweliaVisualBrief`
contract**. The versioned workflow file
(`workflows/arqwelia-sdxl-inpainting-v1.api.json`) is the single source of
truth for the V1 node graph (ComfyUI Core nodes only, no undocumented custom
nodes).

## Local-only security

- ComfyUI base URL is allowlisted to loopback only:
  `http://127.0.0.1:8188` | `http://localhost:8188` | `http://[::1]:8188`.
- No HTTPS-external, no LAN IP, no public domain, no Comfy Cloud, no
  credentials in the URL, no query/fragment, no external redirect.
- No ComfyUI API key is required for the local server.
- The report never contains absolute user paths, API keys, free user prompts,
  or base64 photos/masks.

## Env

See `.env.example`:

```bash
DEEPSEEK_VISUAL_PLANNER_MODE=mock
ARQWELIA_VISUAL_PLANNER_AUTHORIZED=false
COMFYUI_BASE_URL=http://127.0.0.1:8188
ARQWELIA_LOCAL_VISUAL_EXECUTE=false
```

## Orchestrator

```bash
bun scripts/arqwelia-local-visual-poc.mjs \
  --image dataset/photos/synthetic01.png \
  --mask dataset/masks/synthetic01-pool-mask.png \
  --dataset-id synthetic01 \
  --concept A \
  --planner mock \
  --engine comfyui-local \
  --out ./benchmark-out/deepseek-comfyui-poc
```

Default is a **dry-run**. Set `ARQWELIA_LOCAL_VISUAL_EXECUTE=true` to run a real
local generation (exactly one `/prompt`, no retry, stop after first result).
During this POC task the execute gate is **never** enabled.
