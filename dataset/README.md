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
- **No EXIF / GPS metadata.** The harness refuses (exit non-zero) any photo
  that still carries EXIF/IPTC/XMP metadata, because the benchmark must never
  hand a third-party provider a photo we cannot prove is clean.
- Recommended minimum: `exiftool -all= photo.png` or macOS `sips -g all` +
  re-export, or any "remove metadata" export option in your editor.

## Photo requirements

- JPEG, PNG or WebP (the `normalizeImageForAi` accepted formats).
- ≤ 6 MB input, any pixel size ≥ 1024 px on the short side recommended
  (the harness resizes to ≤ 1600 px, JPEG q82, itself).
- Landscape or portrait is fine; the harness rotates/centers via `fit: inside`.

## Preflight

You can verify a photo is acceptable before benchmarking:

```bash
node scripts/benchmark-arqwelia-smoke.mjs --provider mock \
  --image dataset/photos/01-small-garden.png --out ./benchmark-out
```

Exit `0` with `image=normalized` means the photo is clean and accepted.
Exit `1` means the photo carries un-normalized metadata — strip it first.
