/**
 * AQWELIA Lot 2 — inpainting mask validation (SDXL inpainting).
 *
 * The POC requires two distinct local files: a source image and a mask image.
 * The mask MUST:
 *   - have the same dimensions as the working image;
 *   - use black = preserve, white = area to modify (explicit grayscale PNG);
 *   - never be missing, fully black, or (for this POC) fully white;
 *   - keep the modified-area ratio inside configurable bounds
 *     (minimumMaskedRatio=0.05, maximumMaskedRatio=0.45).
 *
 * The POC never invents a pool zone: a user-drawn mask is required. A later
 * module will let the UI draw the mask — not part of this PR.
 */

export const ARQWELIA_MASK_MIN_RATIO_DEFAULT = 0.05
export const ARQWELIA_MASK_MAX_RATIO_DEFAULT = 0.45

export interface ArqweliaMaskValidationOptions {
  minimumMaskedRatio?: number
  maximumMaskedRatio?: number
}

export interface ArqweliaMaskValidationResult {
  ok: boolean
  width: number
  height: number
  maskedRatio: number
  error?: string
}

/**
 * Pure validator over decoded grayscale mask pixels (Uint8Array of
 * width*height, 0=black preserve, 255=white modify). Returns the masked ratio
 * and ok/error. Never throws for a mask problem — it reports a controlled
 * result (the caller refuses to run a workflow on a failed mask).
 *
 * @param pixels length must equal width*height
 * @param width working image width (source + mask must match)
 * @param height working image height
 * @param imageWidth expected image width
 * @param imageHeight expected image height
 * @param opts bounds
 */
export function validateArqweliaInpaintingMask(
  pixels: Uint8Array,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
  opts: ArqweliaMaskValidationOptions = {},
): ArqweliaMaskValidationResult {
  const minimumMaskedRatio = opts.minimumMaskedRatio ?? ARQWELIA_MASK_MIN_RATIO_DEFAULT
  const maximumMaskedRatio = opts.maximumMaskedRatio ?? ARQWELIA_MASK_MAX_RATIO_DEFAULT

  if (pixels == null || pixels.length === 0) {
    return { ok: false, width, height, maskedRatio: 0, error: 'mask is empty' }
  }
  if (width !== imageWidth || height !== imageHeight) {
    return {
      ok: false,
      width,
      height,
      maskedRatio: 0,
      error: `mask dimensions ${width}x${height} do not match image dimensions ${imageWidth}x${imageHeight}`,
    }
  }
  if (pixels.length !== width * height) {
    return {
      ok: false,
      width,
      height,
      maskedRatio: 0,
      error: 'mask pixel buffer length does not match width*height',
    }
  }

  let masked = 0
  for (let i = 0; i < pixels.length; i += 1) {
    // 128+ counts as modified (explicit single-channel intent).
    if (pixels[i] >= 128) masked += 1
  }
  const maskedRatio = masked / pixels.length

  if (masked === 0) {
    return { ok: false, width, height, maskedRatio, error: 'mask is fully black (nothing to modify)' }
  }
  if (masked === pixels.length) {
    return { ok: false, width, height, maskedRatio, error: 'mask is fully white (refused for this POC)' }
  }
  if (maskedRatio < minimumMaskedRatio) {
    return {
      ok: false,
      width,
      height,
      maskedRatio,
      error: `masked ratio ${maskedRatio.toFixed(3)} is below minimum ${minimumMaskedRatio}`,
    }
  }
  if (maskedRatio > maximumMaskedRatio) {
    return {
      ok: false,
      width,
      height,
      maskedRatio,
      error: `masked ratio ${maskedRatio.toFixed(3)} exceeds maximum ${maximumMaskedRatio}`,
    }
  }
  return { ok: true, width, height, maskedRatio }
}
