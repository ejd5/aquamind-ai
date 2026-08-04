/**
 * AQWELIA Lot 2 — inpainting canvas preparation (1024x1024 working canvas).
 *
 * Implements the announced strategy for adapting a non-square source photo
 * (e.g. 1536x1024) to the SDXL inpainting working resolution (1024x1024):
 *   - proportional resize (fit inside, never stretched);
 *   - centered padding to the working canvas (black for the image, black=0 for
 *     the mask so padding is treated as PRESERVE);
 *   - the SAME transform (scale + offsets) applied to the mask;
 *   - nearest-neighbour interpolation for the mask (no anti-aliasing on the
 *     mask edges);
 *   - the exact mapping (scale, offsetX, offsetY, original/working dims) is
 *     returned so the original geometry can be documented / restored later.
 *
 * GUARANTEE (honest): unmasked pixels are preserved EXACTLY on the 1024x1024
 * canvas. Restoring the ORIGINAL 1536x1024 aspect ratio may require a
 * resampling step; we do NOT claim bit-for-bit identity with the original file
 * after resizing/padding.
 */

import { createHash } from 'node:crypto'
import sharp from 'sharp'
import {
  validateArqweliaInpaintingMask,
  ARQWELIA_MASK_MIN_RATIO_DEFAULT,
  ARQWELIA_MASK_MAX_RATIO_DEFAULT,
} from './mask-validator'

export const ARQWELIA_WORKING_WIDTH_DEFAULT = 1024
export const ARQWELIA_WORKING_HEIGHT_DEFAULT = 1024

export interface ArqweliaInpaintingCanvasMapping {
  scale: number
  offsetX: number
  offsetY: number
  originalWidth: number
  originalHeight: number
  workingWidth: number
  workingHeight: number
}

export interface ArqweliaInpaintingCanvas {
  imageBuffer: Buffer
  maskBuffer: Buffer
  width: number
  height: number
  mapping: ArqweliaInpaintingCanvasMapping
  imageSha256: string
  maskSha256: string
}

export interface ArqweliaCanvasPrepareOptions {
  workingWidth?: number
  workingHeight?: number
  minimumMaskedRatio?: number
  maximumMaskedRatio?: number
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Prepares the 1024x1024 working image + mask with a shared proportional
 * transform. The mask is re-validated AFTER the transform (dims must match the
 * working canvas and the masked ratio must stay inside bounds).
 *
 * @throws Error if the mask becomes invalid after the transform.
 */
export async function prepareArqweliaInpaintingCanvas(
  sourceImageBuffer: Buffer,
  sourceMaskBuffer: Buffer,
  opts: ArqweliaCanvasPrepareOptions = {},
): Promise<ArqweliaInpaintingCanvas> {
  const workingWidth = opts.workingWidth ?? ARQWELIA_WORKING_WIDTH_DEFAULT
  const workingHeight = opts.workingHeight ?? ARQWELIA_WORKING_HEIGHT_DEFAULT

  const srcMeta = await sharp(sourceImageBuffer, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata()
  const originalWidth = srcMeta.width || 0
  const originalHeight = srcMeta.height || 0
  if (!originalWidth || !originalHeight) {
    throw new Error('Canvas prep: source image has no dimensions')
  }

  // Proportional scale to fit INSIDE the working canvas (never stretched).
  const scale = Math.min(workingWidth / originalWidth, workingHeight / originalHeight)
  const resizedWidth = Math.max(1, Math.round(originalWidth * scale))
  const resizedHeight = Math.max(1, Math.round(originalHeight * scale))
  const offsetX = Math.max(0, Math.floor((workingWidth - resizedWidth) / 2))
  const offsetY = Math.max(0, Math.floor((workingHeight - resizedHeight) / 2))

  // 1) Image: resize (fit inside) then embed centered on black canvas.
  const imageBuffer = await sharp(sourceImageBuffer, { failOn: 'error', limitInputPixels: 40_000_000 })
    .resize(resizedWidth, resizedHeight, { fit: 'fill' })
    .extend({
      top: offsetY,
      bottom: workingHeight - resizedHeight - offsetY,
      left: offsetX,
      right: workingWidth - resizedWidth - offsetX,
      background: { r: 0, g: 0, b: 0 },
    })
    .png()
    .toBuffer()

  // 2) Mask: same scale + offsets, nearest-neighbour, grayscale, black=0 (preserve).
  const maskBuffer = await sharp(sourceMaskBuffer, { failOn: 'error', limitInputPixels: 40_000_000 })
    .resize(resizedWidth, resizedHeight, { fit: 'fill', kernel: 'nearest' })
    .extend({
      top: offsetY,
      bottom: workingHeight - resizedHeight - offsetY,
      left: offsetX,
      right: workingWidth - resizedWidth - offsetX,
      background: { r: 0, g: 0, b: 0 },
    })
    .grayscale()
    .png()
    .toBuffer()

  // 3) Re-validate the mask AFTER the transform.
  const { data, info } = await sharp(maskBuffer).raw().toBuffer({ resolveWithObject: true })
  const channels = info.channels || 1
  const pixels = new Uint8Array(info.width * info.height)
  for (let i = 0; i < info.width * info.height; i += 1) pixels[i] = data[i * channels]

  const validation = validateArqweliaInpaintingMask(
    pixels,
    info.width,
    info.height,
    workingWidth,
    workingHeight,
    {
      minimumMaskedRatio: opts.minimumMaskedRatio ?? ARQWELIA_MASK_MIN_RATIO_DEFAULT,
      maximumMaskedRatio: opts.maximumMaskedRatio ?? ARQWELIA_MASK_MAX_RATIO_DEFAULT,
    },
  )
  if (!validation.ok) {
    throw new Error(`Canvas prep: mask rejected after transform — ${validation.error}`)
  }

  return {
    imageBuffer,
    maskBuffer,
    width: workingWidth,
    height: workingHeight,
    mapping: {
      scale,
      offsetX,
      offsetY,
      originalWidth,
      originalHeight,
      workingWidth,
      workingHeight,
    },
    imageSha256: sha256(imageBuffer),
    maskSha256: sha256(maskBuffer),
  }
}
