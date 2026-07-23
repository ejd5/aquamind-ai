import { createHash } from 'node:crypto'
import sharp from 'sharp'

const MAX_INPUT_BYTES = 6 * 1024 * 1024
const MAX_INPUT_PIXELS = 40_000_000
const MAX_OUTPUT_SIDE = 1600
const JPEG_QUALITY = 82
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export class SecureImageError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 413 | 415,
  ) {
    super(message)
    this.name = 'SecureImageError'
  }
}

export interface NormalizedImage {
  dataUrl: string
  buffer: Buffer
  mimeType: 'image/jpeg'
  sha256: string
  width: number
  height: number
  inputBytes: number
  outputBytes: number
}

function decodeImageData(input: string): { buffer: Buffer; mimeType: string } {
  const dataUrlMatch = input.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/)
  const mimeType = dataUrlMatch?.[1]?.toLowerCase() || 'image/jpeg'
  const encoded = dataUrlMatch?.[2] || input

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new SecureImageError('Format d’image non pris en charge. Utilisez JPEG, PNG ou WebP.', 415)
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(encoded.replace(/\s/g, ''), 'base64')
  } catch {
    throw new SecureImageError('Image encodée invalide.', 400)
  }

  if (buffer.length === 0) {
    throw new SecureImageError('Image vide ou invalide.', 400)
  }
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new SecureImageError('Image trop volumineuse. Taille maximale : 6 Mo.', 413)
  }

  return { buffer, mimeType }
}

/**
 * Normalizes a user image before any persistence or third-party AI call.
 *
 * `rotate()` applies the EXIF orientation. The JPEG output is generated without
 * `withMetadata()`, so EXIF, GPS, embedded thumbnails and device metadata are
 * not copied to the normalized result.
 */
export async function normalizeImageForAi(input: string): Promise<NormalizedImage> {
  const decoded = decodeImageData(input)

  try {
    const pipeline = sharp(decoded.buffer, {
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

    const result = await pipeline.toBuffer({ resolveWithObject: true })
    const width = result.info.width || 0
    const height = result.info.height || 0

    if (!width || !height) {
      throw new SecureImageError('Dimensions de l’image non valides.', 400)
    }

    const sha256 = createHash('sha256').update(result.data).digest('hex')

    return {
      dataUrl: `data:image/jpeg;base64,${result.data.toString('base64')}`,
      buffer: result.data,
      mimeType: 'image/jpeg',
      sha256,
      width,
      height,
      inputBytes: decoded.buffer.length,
      outputBytes: result.data.length,
    }
  } catch (error) {
    if (error instanceof SecureImageError) throw error
    throw new SecureImageError('Image illisible ou corrompue.', 400)
  }
}

export function privateImageReference(sha256: string): string {
  return `redacted://sha256/${sha256}`
}

export function publicImageUrl(value: string): string | null {
  if (!value || value.startsWith('data:') || value.startsWith('redacted://')) return null
  return value
}
