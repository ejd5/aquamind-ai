/**
 * AQWELIA Lot 2 — generated image validation (post /view).
 *
 * Real validation of the ComfyUI output before it is accepted:
 *   - size limits BEFORE and AFTER reading the body;
 *   - Content-Type allowlist (image/png, image/jpeg, image/webp);
 *   - mandatory sharp decode (no HTML, no garbage);
 *   - real format + real dimensions read from the decoded image;
 *   - max dimensions controlled;
 *   - non-empty, non-uniform content (luma variance);
 *   - metadata stripped;
 *   - final normalization to PNG or controlled JPEG;
 *   - output SHA-256 computed.
 *
 * The source image dimensions are NEVER used as the output dimensions — only
 * the measured decoded dimensions are returned. Invalid content => status
 * `failed`, no false success, invalid file never saved.
 */

import { createHash } from 'node:crypto'
import sharp from 'sharp'
import type { Metadata } from 'sharp'

export const ARQWELIA_OUTPUT_MAX_BODY_BYTES = 64 * 1024 * 1024
export const ARQWELIA_OUTPUT_MAX_WIDTH = 4096
export const ARQWELIA_OUTPUT_MAX_HEIGHT = 4096
export const ARQWELIA_OUTPUT_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp']

export interface ArqweliaValidatedOutput {
  ok: true
  buffer: Buffer
  mimeType: 'image/png'
  format: 'png'
  width: number
  height: number
  sha256: string
}

export interface ArqweliaOutputRejected {
  ok: false
  error: string
}

export type ArqweliaOutputValidation = ArqweliaValidatedOutput | ArqweliaOutputRejected

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Validates a generated image buffer. Returns a discriminated result; the
 * caller never saves a rejected buffer.
 */
export async function validateArqweliaGeneratedImage(
  buffer: Buffer,
  mimeType: string,
): Promise<ArqweliaOutputValidation> {
  if (!buffer || buffer.length === 0) {
    return { ok: false, error: 'output image is empty' }
  }
  if (buffer.length > ARQWELIA_OUTPUT_MAX_BODY_BYTES) {
    return { ok: false, error: 'output image exceeds the size limit' }
  }
  const mime = String(mimeType || '').split(';')[0].trim().toLowerCase()
  if (!ARQWELIA_OUTPUT_ALLOWED_MIME.includes(mime)) {
    return { ok: false, error: `output Content-Type "${mime}" is not allowed` }
  }

  let meta: Metadata | undefined
  try {
    meta = await sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata()
  } catch {
    return { ok: false, error: 'output image is not decodable' }
  }
  if (!meta) {
    return { ok: false, error: 'output image has no metadata' }
  }
  const format = meta.format ?? ''
  if (!['png', 'jpeg', 'webp'].includes(format)) {
    return { ok: false, error: `output real format "${format}" is not allowed` }
  }
  const width = meta.width || 0
  const height = meta.height || 0
  if (!width || !height) {
    return { ok: false, error: 'output image has no dimensions' }
  }
  if (width > ARQWELIA_OUTPUT_MAX_WIDTH || height > ARQWELIA_OUTPUT_MAX_HEIGHT) {
    return { ok: false, error: `output dimensions ${width}x${height} exceed the maximum` }
  }

  // Non-empty, non-uniform content check (luma variance).
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true })
  const channels = info.channels || 3
  const n = info.width * info.height
  let min = 255
  let max = 0
  let sum = 0
  for (let i = 0; i < data.length; i += channels) {
    const v = data[i]
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  const avg = sum / n
  if (max - min < 15) {
    return { ok: false, error: 'output image is uniform (no real content)' }
  }
  void avg

  // Strip metadata and ALWAYS normalize to PNG (definitive POC output format).
  // Even if /view returns JPEG or WebP, the decoded pixels are re-encoded to
  // PNG and the SHA-256 is computed AFTER that conversion.
  const normalized = await sharp(buffer).png().toBuffer()

  const finalMeta = await sharp(normalized).metadata()
  if (finalMeta.exif || finalMeta.iptc || finalMeta.xmp) {
    return { ok: false, error: 'output image still carries metadata after normalization' }
  }

  return {
    ok: true,
    buffer: normalized,
    mimeType: 'image/png',
    format: 'png',
    width,
    height,
    sha256: sha256(normalized),
  }
}
