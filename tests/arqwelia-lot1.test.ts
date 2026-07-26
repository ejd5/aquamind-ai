/**
 * ARQWELIA Lot 1 — Unit tests (pure functions, no DB/server).
 * Covers: fixtures, publicId, types limits, consent version, reality score.
 */
import { describe, it, expect } from 'vitest'
import {
  ARQ_PHOTO_MAX,
  ARQ_PHOTO_MAX_BYTES,
  ARQ_CONSENT_VERSION,
  ARQ_PARTNER_CONSENT_VERSION,
} from '@/lib/arqwelia/types'
import {
  buildConcepts,
  demoRealityScore,
  DEMO_PRO_OPPORTUNITY,
} from '@/lib/arqwelia/fixtures'
import { generateArqweliaPublicId } from '@/lib/arqwelia/public-id'

describe('ARQWELIA Lot 1 — fixtures & helpers', () => {
  it('buildConcepts returns exactly 2 concepts (A realiste, B inspiration)', () => {
    const out = buildConcepts({ projectType: 'piscine_enterrée', budget: '25-40k', style: 'contemporary' })
    expect(out).toHaveLength(2)
    expect(out[0].id).toBe('A')
    expect(out[0].tone).toBe('realiste')
    expect(out[1].id).toBe('B')
    expect(out[1].tone).toBe('inspiration')
  })

  it('surfaceByType scales dimensions per project type', () => {
    const enterrée = buildConcepts({ projectType: 'piscine_enterrée' })[0]
    const mini = buildConcepts({ projectType: 'mini_piscine' })[0]
    expect(enterrée.dimensions).toContain('8 × 4 m')
    expect(mini.dimensions).toContain('4 × 2.5 m')
  })

  it('demoRealityScore is deterministic and bounded [0,100]', () => {
    const empty = demoRealityScore({})
    const full = demoRealityScore({
      projectType: 'piscine_enterrée',
      timeline: '6-12m',
      budget: '25-40k',
      style: 'contemporary',
      knownMeasureValue: 8,
    })
    expect(empty).toBe(40)
    expect(full).toBe(90)
    expect(full).toBeGreaterThanOrEqual(0)
    expect(full).toBeLessThanOrEqual(100)
  })

  it('DEMO_PRO_OPPORTUNITY has contactRevealed=false', () => {
    expect(DEMO_PRO_OPPORTUNITY.contactRevealed).toBe(false)
  })

  it('photo limits: max 4, 10 Mo each', () => {
    expect(ARQ_PHOTO_MAX).toBe(4)
    expect(ARQ_PHOTO_MAX_BYTES).toBe(10 * 1024 * 1024)
  })

  it('consent versions are non-empty and distinct', () => {
    expect(ARQ_CONSENT_VERSION).toMatch(/^arqwelia-lot1-v1$/)
    expect(ARQ_PARTNER_CONSENT_VERSION).toMatch(/^arqwelia-partner-lot1-v1$/)
    expect(ARQ_CONSENT_VERSION).not.toBe(ARQ_PARTNER_CONSENT_VERSION)
  })

  it('generateArqweliaPublicId is ARQ-NNN-NNN format, non-sequential', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const id = generateArqweliaPublicId()
      expect(id).toMatch(/^ARQ-[A-Z0-9]{3}-[A-Z0-9]{3}$/)
      ids.add(id)
    }
    // Extremely unlikely to collide for 50 draws from a 30^6 space.
    expect(ids.size).toBeGreaterThanOrEqual(49)
  })
})