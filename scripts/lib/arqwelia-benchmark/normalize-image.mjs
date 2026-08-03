/**
 * ARQWELIA Lot 2 — harness-local image preflight (plain ESM mirror).
 *
 * Mirrors `src/lib/images/secure-image.ts` `normalizeImageForAi` for the
 * benchmark CLI, which must run under a plain `node` runtime and therefore
 * cannot import the TypeScript module directly.
 *
 * The benchmark enforces a stricter policy than the app pipeline: the SOURCE
 * photo must already be free of EXIF/GPS/IPTC/XMP metadata. If the source
 * still carries such metadata, `clean` is `false` and the caller must refuse
 * to proceed — no third-party provider ever sees a photo we cannot prove is
 * clean.
 */

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

const MAX_INPUT_PIXELS = 40_000_000
const MAX_OUTPUT_SIDE = 1600
const JPEG_QUALITY = 82

export class BenchmarkImageError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.name = 'BenchmarkImageError'
    this.statusCode = statusCode
  }
}

/**
 * Reads `imagePath`, verifies the source is metadata-clean, then normalizes it
 * (rotate, fit inside 1600px, JPEG q82, no metadata copied).
 *
 * @param {string} imagePath
 * @returns {Promise<{ clean: boolean, dataUrl: string, buffer: Buffer, mimeType: 'image/jpeg', width: number, height: number, sha256: string, inputBytes: number, outputBytes: number }>}
 */
export async function normalizeBenchmarkImage(imagePath) {
  let inputBuffer
  try {
    inputBuffer = await readFile(imagePath)
  } catch {
    throw new BenchmarkImageError('Image file could not be read', 400)
  }
  if (inputBuffer.length === 0) {
    throw new BenchmarkImageError('Image file is empty', 400)
  }

  let sourceMeta
  try {
    sourceMeta = await sharp(inputBuffer, {
      failOn: 'error',
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata()
  } catch {
    throw new BenchmarkImageError('Unreadable or corrupted image', 400)
  }

  const clean = !sourceMeta.exif && !sourceMeta.iptc && !sourceMeta.xmp

  let result
  try {
    const pipeline = await sharp(inputBuffer, {
      failOn: 'error',
      limitInputPixels: MAX_INPUT_PIXELS,
      sequentialRead: true,
    })
      .rotate()
      .resize({
        width: MAX_OUTPUT_SIDE,
        height: MAX_OUTPUT_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true })

    const width = pipeline.info.width || 0
    const height = pipeline.info.height || 0
    if (!width || !height) {
      throw new BenchmarkImageError('Invalid image dimensions', 400)
    }
    result = {
      clean,
      dataUrl: `data:image/jpeg;base64,${pipeline.data.toString('base64')}`,
      buffer: pipeline.data,
      mimeType: 'image/jpeg',
      width,
      height,
      sha256: createHash('sha256').update(pipeline.data).digest('hex'),
      inputBytes: inputBuffer.length,
      outputBytes: pipeline.data.length,
    }
  } catch (error) {
    if (error instanceof BenchmarkImageError) throw error
    throw new BenchmarkImageError('Unreadable or corrupted image', 400)
  }

  return result
}
