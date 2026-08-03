# ARQWELIA Lot 2 — Benchmark dataset

## Where the photos live

The photo dataset lives **outside git**. Put your photos here:

```
dataset/photos/
```

`dataset/photos/` and `benchmark-out/` are gitignored — they must never be
committed. Only this README is versioned.

## Expected dataset (10 photos)

The benchmark expects **10 photos** named like `01-small-garden.png`,
`02-large-garden.png`, …, covering:

| # | Scene | Purpose |
| --- | --- | --- |
| 01 | small garden | tight framing, low input variance |
| 02 | large garden | wide framing, high variance |
| 03 | narrow | elongated geometry |
| 04 | slope | perspective / terrain |
| 05 | terrace | hard surfaces |
| 06 | trees | vegetation density |
| 07 | fences | boundaries / perimeter |
| 08 | contemporary house | modern architecture |
| 09 | traditional house | classic architecture |
| 10 | hard light | harsh midday shadows |

These scenes map directly to Phase 0B (10 photos × Concept A + Concept B).

## Privacy — no PII

- **No people, no faces, no license plates, no readable mailboxes.**
- **EXIF / GPS is fine**: the harness normalizes every source photo through
  `normalizeImageForAi()`, which strips EXIF/GPS, rotates, resizes to ≤1600 px
  and re-encodes as JPEG q82. Only the EXIF-free normalized output is ever
  eligible to reach a third-party provider, the raw source buffer/path is never
  passed to an adapter, and the raw source is never copied into the results
  dir. You do **not** need to strip metadata beforehand.
- **Reports are PII-free**: the local file name is never stored. Each photo is
  recorded as `datasetItemId` — pass the controlled alphanumeric id with
  `--dataset-id <id>` (e.g. `--dataset-id item01`), or a truncated hash of the
  normalized image is used.

## Photo requirements

- JPEG, PNG or WebP (the `normalizeImageForAi` accepted formats).
- ≤ 6 MB input, any pixel size ≥ 1024 px on the short side recommended
  (the harness resizes to ≤ 1600 px, JPEG q82, itself).
- Landscape or portrait is fine; the harness rotates/centers via `fit: inside`.

## Preflight

You can verify a photo is accepted before benchmarking (requires **Bun**):

```bash
bun scripts/benchmark-arqwelia-smoke.mjs --provider mock \
  --image dataset/photos/01-small-garden.png --dataset-id item01 \
  --out ./benchmark-out
```

Exit `0` with `image=normalized` means the photo was normalized successfully
(the report records it as `datasetItemId=item01`, never the file name).
Exit `1` means the photo could not be normalized (unreadable, unsupported
format, or corrupted) — the error never contains the file path.
