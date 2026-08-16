/**
 * AQWELIA PR #97 — sharp native runtime availability.
 *
 * The Vercel linux-x64 runtime failed with:
 *   Could not load the "sharp" module using the linux-x64 runtime
 *   ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: cannot open shared object file
 *
 * Root cause (proven in the build): Next.js `output:'standalone'` copied sharp's
 * JS entry points but DROPPED the platform-native libvips binary (the
 * libvips-cpp shared object under @img/sharp-libvips-* / lib) that sharp's .node
 * binding dlopens at runtime. Fixed via `outputFileTracingIncludes` in
 * next.config.ts.
 *
 * These tests FAIL if the native binary is missing (e.g. running against a
 * stripped standalone output), proving the runtime can actually process images.
 */
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { normalizeImageForAi } from '@/lib/images/secure-image'

async function makeInput(mime: 'jpeg' | 'png' | 'webp', width = 900, height = 600): Promise<string> {
  const src = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 130, b: 200 },
    },
  })
  const buf =
    mime === 'jpeg' ? await src.jpeg({ quality: 90 }).toBuffer()
    : mime === 'png' ? await src.png().toBuffer()
    : await src.webp().toBuffer()
  return `data:image/${mime};base64,${buf.toString('base64')}`
}

describe('PR #97 — sharp native runtime loads and processes images', () => {
  it('creates an image, resizes it and emits a valid JPEG (native libvips works)', async () => {
    const src = await sharp({
      create: { width: 200, height: 100, channels: 3, background: { r: 12, g: 200, b: 90 } },
    }).png().toBuffer()

    const res = await sharp(src)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true })

    expect(res.info.format).toBe('jpeg')
    expect(res.info.width).toBe(200)
    expect(res.info.height).toBe(100)
    expect(res.data.length).toBeGreaterThan(0)

    // Re-read the output: metadata/dimensions must be valid.
    const meta = await sharp(res.data).metadata()
    expect(meta.width).toBe(200)
    expect(meta.height).toBe(100)
    expect(meta.format).toBe('jpeg')
  })
})

describe('PR #97 — normalizeImageForAi JPEG / PNG / WebP', () => {
  for (const mime of ['jpeg', 'png', 'webp'] as const) {
    it(`${mime} => normalized JPEG output with valid dimensions + sha256, no metadata copied`, async () => {
      const input = await makeInput(mime)
      const result = await normalizeImageForAi(input)

      expect(result.mimeType).toBe('image/jpeg')
      expect(result.width).toBeLessThanOrEqual(1600)
      expect(result.height).toBeLessThanOrEqual(1600)
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
      expect(result.outputBytes).toBeGreaterThan(0)
      expect(result.sha256).toMatch(/^[a-f0-9]{64}$/)

      // EXIF/GPS/device metadata are NOT copied to the normalized output.
      const meta = await sharp(result.buffer).metadata()
      expect(meta.exif).toBeUndefined()
      expect(meta.orientation).toBeUndefined()
    })
  }

  it('a large image is resized down to ≤ 1600px on the longest side', async () => {
    const input = await makeInput('png', 4000, 2000)
    const result = await normalizeImageForAi(input)
    expect(result.width).toBeLessThanOrEqual(1600)
    expect(result.height).toBeLessThanOrEqual(1600)
  })
})
