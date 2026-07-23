import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  normalizeImageForAi,
  privateImageReference,
  publicImageUrl,
} from '@/lib/images/secure-image'

describe('P0-B secure image normalization', () => {
  it('normalizes orientation, bounds dimensions and removes metadata', async () => {
    const input = await sharp({
      create: {
        width: 2400,
        height: 1200,
        channels: 3,
        background: { r: 30, g: 140, b: 210 },
      },
    })
      .jpeg({ quality: 90 })
      .withMetadata({ orientation: 6 })
      .toBuffer()

    const result = await normalizeImageForAi(`data:image/jpeg;base64,${input.toString('base64')}`)
    const metadata = await sharp(result.buffer).metadata()

    expect(result.mimeType).toBe('image/jpeg')
    expect(result.width).toBeLessThanOrEqual(1600)
    expect(result.height).toBeLessThanOrEqual(1600)
    expect(result.outputBytes).toBeGreaterThan(0)
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(metadata.exif).toBeUndefined()
    expect(metadata.orientation).toBeUndefined()
  })

  it('rejects unsupported formats before any AI call', async () => {
    await expect(
      normalizeImageForAi('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='),
    ).rejects.toMatchObject({ statusCode: 415 })
  })

  it('rejects malformed base64 payloads', async () => {
    await expect(normalizeImageForAi('%%%not-base64%%%')).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects images above the server limit', async () => {
    const oversized = Buffer.alloc(6 * 1024 * 1024 + 1, 1).toString('base64')
    await expect(normalizeImageForAi(oversized)).rejects.toMatchObject({
      statusCode: 413,
    })
  })

  it('never exposes legacy base64 or redacted references through history', () => {
    const reference = privateImageReference('a'.repeat(64))
    expect(reference).toBe(`redacted://sha256/${'a'.repeat(64)}`)
    expect(publicImageUrl(reference)).toBeNull()
    expect(publicImageUrl('data:image/jpeg;base64,abc')).toBeNull()
    expect(publicImageUrl('https://private-storage.example/signed')).toBe(
      'https://private-storage.example/signed',
    )
  })

  it('routes never persist or forward the original image bytes', () => {
    const photoRoute = readFileSync(
      join(process.cwd(), 'src/app/api/pool/photo-diagnostic/route.ts'),
      'utf8',
    )
    const stripRoute = readFileSync(
      join(process.cwd(), 'src/app/api/pool/strip-scan/route.ts'),
      'utf8',
    )

    expect(photoRoute).not.toContain('imageUrl: image')
    expect(photoRoute).toContain('nvidiaVision(prompt, normalized.dataUrl)')
    expect(photoRoute).toContain('privateImageReference(normalized.sha256)')
    expect(stripRoute).toContain('nvidiaVision(STRIP_SCAN_PROMPT, normalized.dataUrl')
    expect(stripRoute).not.toContain('nvidiaVision(STRIP_SCAN_PROMPT, image,')
  })
})
