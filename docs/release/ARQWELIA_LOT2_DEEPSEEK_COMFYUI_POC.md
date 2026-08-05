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

- POC resolution: **1024x1024** working canvas.
- The source photo (e.g. 1536x1024) is adapted with the implemented strategy
  (`prepareArqweliaInpaintingCanvas`): proportional resize (fit inside, never
  stretched), centered padding to 1024x1024, the SAME scale + offsets applied to
  the grayscale mask with nearest-neighbour interpolation. The exact mapping
  (scale, offsetX, offsetY, original/working dims) is returned and recorded.
  Unmasked pixels are preserved EXACTLY on the 1024x1024 canvas; restoring the
  original aspect ratio may require resampling (no bit-for-bit identity claim).
- SDXL inpainting quality is not the final Production level. The POC validates:
  unmasked-pixel preservation (deterministic `ImageCompositeMasked`), a plausible
  pool insertion, and the DeepSeek → workflow → result chain.

## True SDXL inpainting graph (Round 2)

The versioned workflow (`workflows/arqwelia-sdxl-inpainting-v1.api.json`) is a
REAL SDXL inpainting graph (ComfyUI Core nodes only):

```
CheckpointLoaderSimple
  MODEL  -> KSampler.model
  CLIP   -> CLIPTextEncode (positive) / CLIPTextEncode (negative)
  VAE(2) -> VAEEncodeForInpaint.vae AND VAEDecode.vae
LoadImage (source)
  IMAGE -> VAEEncodeForInpaint.pixels
  IMAGE -> ImageCompositeMasked.destination
LoadImageMask (grayscale mask, channel=red)
  MASK  -> VAEEncodeForInpaint.mask
  MASK  -> ImageCompositeMasked.mask
VAEEncodeForInpaint -> KSampler.latent_image
KSampler -> VAEDecode.samples
VAEDecode -> ImageCompositeMasked.source
ImageCompositeMasked -> SaveImage.images  (SaveImage receives ONLY the composite)
```

- **No `EmptySD3LatentImage`** (incompatible with SDXL); no `SetLatentNoiseMask`
  on an empty latent.
- The source image is genuinely connected to the sampler via
  `VAEEncodeForInpaint`; the mask is a real `MASK` (never an IMAGE used as MASK).
- Deterministic preservation: `ImageCompositeMasked` composites the decoded
  output onto the source image using the same mask, so masked pixels = generated
  and unmasked pixels = the real source.

### Expected checkpoint (BLOCKED — unresolved_not_installed)

- Expected file: `sdxl-inpainting-v1/sdxl-inpainting-0.1-fp16.safetensors`
  (in `ComfyUI/models/checkpoints/`).
- **Status: `unresolved_not_installed`.** The official repository is a
  multi-file **Diffusers** pipeline, NOT a single `.safetensors`. No community
  checkpoint may be treated as official.
- The **first free benchmark** runs through the official **Diffusers notebook**
  (`StableDiffusionXLInpaintPipeline.from_pretrained(...)`), not ComfyUI.
- Before ANY future ComfyUI smoke, ALL of these must be provided for the
  installed checkpoint: exact source, real file name, byte size, verified
  SHA-256, license (RAIL++-M), and verification that it loads via
  `CheckpointLoaderSimple`.
- VAE: bundled inside the checkpoint (output index 2 of
  `CheckpointLoaderSimple`); no separate VAE file required.

A read-only preflight (`client.preflight(checkpointName)`) checks ComfyUI
reachability, the required `object_info/*` nodes, and `/models/checkpoints`
**before any upload / workflow build / /prompt**. It is BLOCKING: if ComfyUI is
unreachable, a required node is missing, or the verified checkpoint is absent,
the engine returns `status=preflight_failed`, `promptId=null`, and performs
ZERO uploads and ZERO `/prompt` submissions. No weight is downloaded during this
POC.

## Mask upload contract

The POC uploads BOTH the source and the grayscale mask via `POST /upload/image`
(`uploadInputImage` / `uploadInputMaskImage`) — NOT `/upload/mask`. The mask is
read back with `LoadImageMask channel=red`.

## Output validation (real, measured)

After `GET /view` the engine performs real validation: size limits, Content-Type
allowlist (png/jpeg/webp), mandatory sharp decode (HTML/garbage refused), real
format + real dimensions (source dims are NEVER used as output dims), max
dimensions, non-empty non-uniform content, metadata strip, output SHA-256.
**The final output is ALWAYS normalized to PNG** — even if `/view` returns JPEG
or WebP, the pixels are decoded and re-encoded to PNG and the SHA-256 is
computed AFTER that conversion. Invalid content => `failed`, no false success,
invalid file never saved.

## Restore to the original aspect ratio (Round 3)

`restoreArqweliaInpaintingOutput()` restores the 1024x1024 canvas output to the
ORIGINAL source dimensions:

1. crops the USEFUL area out of the canvas using `offsetX/offsetY/resizedWidth/resizedHeight`;
2. resizes it to `originalWidth x originalHeight`;
3. resizes the ORIGINAL mask to the original dims with nearest-neighbour;
4. composites the generated area onto the ORIGINAL normalized source image
   (mask >= 128 => generated, otherwise original — pixel-level).

For synthetic01: input 1536x1024 -> canvas 1024x1024 -> **final output 1536x1024**,
no black padding bands. The report distinguishes `workingWidth/workingHeight`,
`finalWidth/finalHeight`, `mapping`, `workingOutputSha256`, `finalOutputSha256`.
Invalid mapping or an out-of-limits crop is refused.

## Status model

`not_run | preflight_failed | queued | processing | succeeded | failed |
timed_out | interrupted`. `promptId` is preserved as soon as `/prompt` accepts
it. On polling timeout the engine calls `POST /interrupt` exactly once and
reports `timed_out` with **honest interrupt fields**: `interruptAttempted`,
`interruptSucceeded`, `interrupted` (interrupt failure => `interrupted=false`,
no resubmit, no retry).

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
- EVERY request uses `redirect: 'error'` — a 3xx redirect is refused (the upload
  body is never re-sent to a different host).
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
