import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import {
  normalizeImageForAi,
  privateImageReference,
  publicImageUrl,
  SecureImageError,
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
    ).rejects.toMatchObject<Partial<SecureImageError>>({ statusCode: 415 })
  })

  it('rejects images above the server limit', async () => {
    const oversized = Buffer.alloc(6 * 1024 * 1024 + 1, 1).toString('base64')
    await expect(normalizeImageForAi(oversized)).rejects.toMatchObject<Partial<SecureImageError>>({
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
})
