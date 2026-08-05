# ARQWELIA Lot 2 — Geometry-guided visual insertion POC plan

Status: **planning only — no generation authorized, no Production usage**.

This branch starts from `feature/arqwelia-lot2-ai-ar-mvp` and intentionally does not inherit the rejected plain-SDXL benchmark branch.

## Background

Two controlled Concept A benchmarks using plain text-guided SDXL inpainting completed technically but failed visually: the masked lawn was regenerated as grass and no swimming pool was visible. The next POC must therefore change the generation method, not merely the seed or sampler parameters.

## Objective

Produce one clearly visible, photorealistic, in-ground residential swimming pool that:

- occupies the authorized pool footprint;
- follows the camera perspective and lawn plane;
- includes a basin, clear water, and coping;
- has coherent scale, boundaries, reflections, shadows, and sunlight;
- preserves the source image outside the final approved composite mask;
- is accepted manually before any feature is considered viable.

## Proposed architecture

1. **Deterministic pool-layout conditioning**
   - Generate a simple perspective-aware pool layout from controlled geometry.
   - Represent basin edges, coping footprint, and orientation explicitly.
   - Keep this conditioning synthetic and reproducible.

2. **Expanded semantic mask**
   - Use separate logical regions for basin and coping.
   - The combined generation footprint must include enough context for architectural insertion.
   - The final preservation mask remains explicit and measurable.

3. **Geometry guidance**
   - Evaluate depth, edge, line, or equivalent structural conditioning.
   - The chosen implementation must be version-pinned and license-documented.
   - No undocumented remote image service is allowed.

4. **Optional appearance reference**
   - A synthetic or licensed pool reference may guide water/coping appearance.
   - Reference data must be declared, hashed, and excluded from personal data.

5. **Engine abstraction**
   - Preserve the existing `ArqweliaVisualBrief` boundary where practical.
   - Add a distinct geometry-guided engine/version rather than silently changing V1 behavior.
   - Plain SDXL V1 remains documented as visually rejected.

## Mandatory safety gates

- exact SHA-256 validation for every source, mask, layout, and reference asset;
- fail-closed environment and model preflight before generation;
- exactly one authorized generation per benchmark;
- no retry and no hidden resubmission;
- no paid image API unless separately and explicitly authorized;
- no secrets or personal metadata in reports;
- no modification of `main` or Production;
- no merge while visual acceptance is pending or rejected.

## Required report fields

- engine ID and immutable model revisions;
- source, mask, layout, and reference hashes;
- configured and effective inference settings;
- generation attempt count and retry status;
- raw and final outside-mask preservation metrics;
- output dimensions and file SHA-256;
- `generationStatus`;
- `visualAcceptance`;
- `rejectionReason`;
- manual reviewer notes.

## Visual acceptance criteria

A result is accepted only if all conditions are met:

1. A swimming pool is immediately identifiable without explanation.
2. The basin has a closed, coherent perimeter.
3. Coping or an equivalent pool boundary is visible.
4. Water is present and visually plausible.
5. Perspective aligns with the lawn and house.
6. Pool scale is plausible for the garden.
7. No grass remains inside the basin.
8. No severe seam, floating edge, duplicated pool, warped house, or broken boundary is present.
9. Pixels outside the approved final mask are preserved exactly.
10. A human reviewer sets `visualAcceptance=accepted`.

## Milestones

### G0 — architecture and asset contract

- define geometry-conditioning asset schema;
- define basin/coping masks;
- define hashes, provenance, and licenses;
- no model download and no generation.

### G1 — versioned dry-run workflow

- build the geometry-guided workflow graph;
- add static and functional tests;
- validate single-use and preflight gates;
- no real generation.

### G2 — one benchmark authorization

- requires a new explicit owner authorization;
- run exactly once on synthetic benchmark data;
- record full report and manual visual verdict.

## Explicit non-goals

- no customer photos;
- no mobile or Production integration;
- no public Kaggle dataset;
- no repeated seed search;
- no automatic claim that pixel changes prove semantic success;
- no merge based only on technical execution.
