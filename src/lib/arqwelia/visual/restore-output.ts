/**
 * AQWELIA Lot 2 — restore the generated output to the ORIGINAL aspect ratio.
 *
 * The SDXL inpainting engine works on a 1024x1024 canvas (proportional resize +
 * centered padding). This module crops the USEFUL area back out of the canvas,
 * resizes it to the ORIGINAL source dimensions (originalWidth x originalHeight),
 * resizes the mask with nearest-neighbour, and composites the generated area
 * onto the ORIGINAL normalized source image — so unmasked pixels are preserved
 * exactly and the final output has NO black padding bands.
 *
 * For synthetic01: input 1536x1024, canvas 1024x1024, final output 1536x1024.
 */

import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { ArqweliaInpaintingCanvasMapping } from './canvas-prep'

export interface ArqweliaRestoreInput {
  generatedCanvasBuffer: Buffer
  mapping: ArqweliaInpaintingCanvasMapping
  originalSourceBuffer: Buffer
  originalMaskBuffer: Buffer
}

export interface ArqweliaRestoredOutput {
  buffer: Buffer
  width: number
  height: number
  sha256: string
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

function assertValidMapping(mapping: ArqweliaInpaintingCanvasMapping, canvasWidth: number, canvasHeight: number): void {
  if (!mapping || typeof mapping !== 'object') {
    throw new Error('Restore: invalid mapping')
  }
  const {
    scale,
    offsetX,
    offsetY,
    resizedWidth,
    resizedHeight,
    originalWidth,
    originalHeight,
    workingWidth,
    workingHeight,
  } = mapping
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error('Restore: invalid scale')
  }
  if (originalWidth <= 0 || originalHeight <= 0 || workingWidth <= 0 || workingHeight <= 0) {
    throw new Error('Restore: invalid original/working dimensions')
  }
  if (resizedWidth <= 0 || resizedHeight <= 0) {
    throw new Error('Restore: invalid resized dimensions')
  }
  if (offsetX < 0 || offsetY < 0) {
    throw new Error('Restore: invalid negative offset')
  }
  // Crop bounds must stay inside the canvas.
  if (offsetX + resizedWidth > canvasWidth || offsetY + resizedHeight > canvasHeight) {
    throw new Error('Restore: crop bounds exceed the canvas (out of limits)')
  }
  if (offsetX + resizedWidth > workingWidth || offsetY + resizedHeight > workingHeight) {
    throw new Error('Restore: crop bounds exceed the working canvas')
  }
}

/**
 * Restores the generated canvas output to the ORIGINAL aspect ratio.
 *
 * @throws Error on an invalid mapping or an out-of-bounds crop.
 */
export async function restoreArqweliaInpaintingOutput(
  input: ArqweliaRestoreInput,
): Promise<ArqweliaRestoredOutput> {
  const { generatedCanvasBuffer, mapping, originalSourceBuffer, originalMaskBuffer } = input

  const canvasMeta = await sharp(generatedCanvasBuffer, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata()
  const canvasWidth = canvasMeta.width || 0
  const canvasHeight = canvasMeta.height || 0
  if (!canvasWidth || !canvasHeight) {
    throw new Error('Restore: generated canvas has no dimensions')
  }

  assertValidMapping(mapping, canvasWidth, canvasHeight)

  const { offsetX, offsetY, resizedWidth, resizedHeight, originalWidth, originalHeight } = mapping

  // 1) Crop the USEFUL area out of the canvas (removes black padding bands).
  const cropped = await sharp(generatedCanvasBuffer, { failOn: 'error' })
    .extract({ left: offsetX, top: offsetY, width: resizedWidth, height: resizedHeight })
    .png()
    .toBuffer()

  // 2) Resize the cropped generated area to the ORIGINAL dimensions.
  const generatedOriginal = await sharp(cropped, { failOn: 'error' })
    .resize(originalWidth, originalHeight, { fit: 'fill' })
    .png()
    .toBuffer()

  // 3) Resize the ORIGINAL mask to the original dimensions with nearest-neighbour
  //    so the composite mask matches the final output geometry.
  const maskOriginal = await sharp(originalMaskBuffer, { failOn: 'error', limitInputPixels: 40_000_000 })
    .resize(originalWidth, originalHeight, { fit: 'fill', kernel: 'nearest' })
    .grayscale()
    .png()
    .toBuffer()

  // 4) Composite the generated area onto the ORIGINAL normalized source image.
  //    Pixel-level blend: mask >= 128 => generated, otherwise original.
  const [srcRaw, genRaw, maskRaw] = await Promise.all([
    sharp(originalSourceBuffer, { failOn: 'error', limitInputPixels: 40_000_000 })
      .raw()
      .toBuffer({ resolveWithObject: true }),
    sharp(generatedOriginal, { failOn: 'error' }).raw().toBuffer({ resolveWithObject: true }),
    sharp(maskOriginal, { failOn: 'error' }).raw().toBuffer({ resolveWithObject: true }),
  ])
  const srcChannels = srcRaw.info.channels || 3
  const genChannels = genRaw.info.channels || 3
  const maskChannels = maskRaw.info.channels || 1
  const pixelCount = srcRaw.info.width * srcRaw.info.height
  const out = Buffer.alloc(pixelCount * 3)
  for (let i = 0; i < pixelCount; i += 1) {
    const maskValue = maskRaw.data[i * maskChannels]
    const from = maskValue >= 128 ? genRaw.data : srcRaw.data
    const fromChannels = maskValue >= 128 ? genChannels : srcChannels
    out[i * 3] = from[i * fromChannels]
    out[i * 3 + 1] = from[i * fromChannels + 1]
    out[i * 3 + 2] = from[i * fromChannels + 2]
  }

  const finalBuffer = await sharp(out, {
    raw: { width: srcRaw.info.width, height: srcRaw.info.height, channels: 3 },
  })
    .png()
    .toBuffer()

  const finalMeta = await sharp(finalBuffer).metadata()
  return {
    buffer: finalBuffer,
    width: finalMeta.width || originalWidth,
    height: finalMeta.height || originalHeight,
    sha256: sha256(finalBuffer),
  }
}
