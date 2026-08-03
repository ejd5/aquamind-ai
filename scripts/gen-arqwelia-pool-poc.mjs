#!/usr/bin/env node
/**
 * gen-arqwelia-pool-poc.mjs
 *
 * Generates public/models/arqwelia-pool-poc.glb — an ORIGINAL, project-created
 * minimal glTF 2.0 Binary (GLB) asset representing a simple rectangular pool
 * for the ARQWELIA Lot 2 A2 AR POC.
 *
 * The model is hand-encoded (JSON chunk + BIN chunk) with NO external
 * dependencies: a box geometry for the pool deck/water body + a flat
 * "water surface" plate on top, using a single blue-tinted PBR material.
 *
 * Units: METERS. Overall bounds 8.0 m (x) × 4.0 m (z), height 0.32 m.
 * Origin is at floor level: the lowest vertex sits at y = 0 (pool bottom /
 * ground contact), which matches <model-viewer> ar-placement="floor".
 *
 * Usage:  node scripts/gen-arqwelia-pool-poc.mjs [output]
 * Default output: public/models/arqwelia-pool-poc.glb
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DEFAULT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'models',
  'arqwelia-pool-poc.glb',
)

/* ── Geometry helpers (box = 6 faces × 4 vertices, CCW winding) ─────────── */

/**
 * Builds an axis-aligned box centered at (cx, cy, cz) with half-extents
 * (hx, hy, hz). Returns typed arrays ready for the GLB BIN chunk.
 */
function box({ cx = 0, cy = 0, cz = 0, hx, hy, hz }) {
  const positions = []
  const normals = []
  const faces = [
    { n: [1, 0, 0], v: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
    { n: [-1, 0, 0], v: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] },
    { n: [0, 1, 0], v: [[-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz]] },
    { n: [0, -1, 0], v: [[-hx, -hy, hz], [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz]] },
    { n: [0, 0, 1], v: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
    { n: [0, 0, -1], v: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
  ]
  const indices = []
  for (const f of faces) {
    const base = positions.length / 3
    for (const v of f.v) {
      positions.push(cx + v[0], cy + v[1], cz + v[2])
      normals.push(...f.n)
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
  }
}

function minMax(arr) {
  let min = [Infinity, Infinity, Infinity]
  let max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < arr.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      min[j] = Math.min(min[j], arr[i + j])
      max[j] = Math.max(max[j], arr[i + j])
    }
  }
  return { min, max }
}

/* ── Scene: 8 m × 4 m rectangular pool ─────────────────────────────────── */

// Pool deck / water body: 8.0 m (x) × 0.30 m (y) × 4.0 m (z), sitting on the
// floor (bottom at y = 0). Origin at floor level.
const deck = box({ cy: 0.15, hx: 4.0, hy: 0.15, hz: 2.0 })

// Water surface plate: slightly inset, resting on top of the deck at y = 0.31.
const water = box({ cy: 0.31, hx: 3.7, hy: 0.01, hz: 1.7 })

const deckMinMax = minMax(deck.positions)
const waterMinMax = minMax(water.positions)

/* ── BIN chunk layout (all 4-byte aligned) ─────────────────────────────── */

const parts = [
  { data: deck.positions },
  { data: deck.normals },
  { data: deck.indices },
  { data: water.positions },
  { data: water.normals },
  { data: water.indices },
]

let byteOffset = 0
const buffers = parts.map((p) => {
  const entry = { byteOffset, byteLength: p.data.byteLength, data: p.data }
  byteOffset += p.data.byteLength
  return entry
})

const BIN = new Uint8Array(byteOffset)
for (const b of buffers) {
  BIN.set(new Uint8Array(b.data.buffer, b.data.byteOffset, b.data.byteLength), b.byteOffset)
}

/* ── glTF JSON chunk ────────────────────────────────────────────────────── */

const gltf = {
  asset: { version: '2.0', generator: 'aqwelia-ar-poc (gen-arqwelia-pool-poc.mjs)' },
  scene: 0,
  scenes: [{ nodes: [0, 1] }],
  nodes: [
    { mesh: 0, name: 'arqwelia_pool_deck' },
    { mesh: 1, name: 'arqwelia_water_surface' },
  ],
  meshes: [
    {
      name: 'arqwelia_pool_deck',
      primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }],
    },
    {
      name: 'arqwelia_water_surface',
      primitives: [{ attributes: { POSITION: 3, NORMAL: 4 }, indices: 5, material: 1 }],
    },
  ],
  materials: [
    {
      name: 'aqwelia_pool_concrete',
      pbrMetallicRoughness: {
        baseColorFactor: [0.42, 0.45, 0.48, 1.0],
        metallicFactor: 0.0,
        roughnessFactor: 0.9,
      },
    },
    {
      name: 'aqwelia_water_blue',
      pbrMetallicRoughness: {
        baseColorFactor: [0.02, 0.55, 0.78, 1.0],
        metallicFactor: 0.05,
        roughnessFactor: 0.15,
      },
    },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: deck.positions.length / 3, type: 'VEC3', min: deckMinMax.min, max: deckMinMax.max },
    { bufferView: 1, componentType: 5126, count: deck.normals.length / 3, type: 'VEC3' },
    { bufferView: 2, componentType: 5125, count: deck.indices.length, type: 'SCALAR' },
    { bufferView: 3, componentType: 5126, count: water.positions.length / 3, type: 'VEC3', min: waterMinMax.min, max: waterMinMax.max },
    { bufferView: 4, componentType: 5126, count: water.normals.length / 3, type: 'VEC3' },
    { bufferView: 5, componentType: 5125, count: water.indices.length, type: 'SCALAR' },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: buffers[0].byteOffset, byteLength: buffers[0].byteLength, target: 34962 },
    { buffer: 0, byteOffset: buffers[1].byteOffset, byteLength: buffers[1].byteLength, target: 34962 },
    { buffer: 0, byteOffset: buffers[2].byteOffset, byteLength: buffers[2].byteLength, target: 34963 },
    { buffer: 0, byteOffset: buffers[3].byteOffset, byteLength: buffers[3].byteLength, target: 34962 },
    { buffer: 0, byteOffset: buffers[4].byteOffset, byteLength: buffers[4].byteLength, target: 34962 },
    { buffer: 0, byteOffset: buffers[5].byteOffset, byteLength: buffers[5].byteLength, target: 34963 },
  ],
  buffers: [{ byteLength: byteOffset }],
}

const jsonText = JSON.stringify(gltf)
const jsonChunk = Buffer.from(jsonText, 'utf8')
const jsonPadded = Buffer.alloc(Math.ceil(jsonChunk.length / 4) * 4)
jsonChunk.copy(jsonPadded)
for (let i = jsonChunk.length; i < jsonPadded.length; i++) jsonPadded[i] = 0x20 // space pad

const binPaddedLen = Math.ceil(BIN.length / 4) * 4
const totalLen = 12 + 8 + jsonPadded.length + 8 + binPaddedLen

/* ── GLB container ──────────────────────────────────────────────────────── */

const out = Buffer.alloc(totalLen)
let off = 0
out.writeUInt32LE(0x46546c67, off); off += 4 // 'glTF'
out.writeUInt32LE(2, off); off += 4 // version
out.writeUInt32LE(totalLen, off); off += 4 // total length
out.writeUInt32LE(jsonPadded.length, off); off += 4 // JSON chunk length
out.writeUInt32LE(0x4e4f534a, off); off += 4 // 'JSON'
jsonPadded.copy(out, off); off += jsonPadded.length
out.writeUInt32LE(binPaddedLen, off); off += 4 // BIN chunk length
out.writeUInt32LE(0x004e4942, off); off += 4 // 'BIN\0'
out.set(BIN, off) // BIN chunk (already multiple of 4)

/* ── Write ──────────────────────────────────────────────────────────────── */

const target = process.argv[2] ? join(process.cwd(), process.argv[2]) : OUT_DEFAULT
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, out)

console.log(`Wrote ${target}`)
console.log(`GLB byte size: ${out.length} bytes`)
console.log(
  `Bounds: ${deckMinMax.min[0]}..${deckMinMax.max[0]} m (x) x ${deckMinMax.min[1]}..${deckMinMax.max[1]} m (y) x ${deckMinMax.min[2]}..${deckMinMax.max[2]} m (z)`,
)
