import { describe, expect, it } from 'vitest'
import { selectRuntimeContent, type RuntimeContext } from '@/lib/admin-runtime/content'

const NOW = new Date('2026-08-22T00:00:00.000Z')

const translations = (fr = 'Bonjour', en = 'Hello') =>
  JSON.stringify({ fr, en, es: 'Hola', pt: 'Olá', de: 'Hallo', it: 'Ciao', nl: 'Hallo NL' })

const popupTranslations = JSON.stringify({
  fr: { title: 'Titre FR', body: 'Corps FR' },
  en: { title: 'Title EN', body: 'Body EN' },
  es: { title: 'Título ES', body: 'Cuerpo ES' },
  pt: { title: 'Título PT', body: 'Corpo PT' },
  de: { title: 'Titel DE', body: 'Text DE' },
  it: { title: 'Titolo IT', body: 'Corpo IT' },
  nl: { title: 'Titel NL', body: 'Tekst NL' },
})

function banner(overrides: Record<string, unknown> = {}) {
  return {
    id: 'banner-1',
    status: 'PUBLISHED',
    translations: translations(),
    variant: 'LAGOON',
    ctaTranslations: translations('Voir', 'See'),
    ctaUrl: '/tarifs',
    targeting: null,
    startAt: null,
    endAt: null,
    priority: 10,
    version: 2,
    approvedById: 'admin-1',
    approvedAt: new Date('2026-08-21T00:00:00.000Z'),
    updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
  }
}

function popup(overrides: Record<string, unknown> = {}) {
  return {
    id: 'popup-1',
    status: 'PUBLISHED',
    translations: popupTranslations,
    imageUrl: '/branding/aqwelia-logo-main.png',
    ctaTranslations: translations('Découvrir', 'Discover'),
    ctaUrl: '/tarifs',
    trigger: 'ON_LOAD',
    frequency: 'ONCE',
    reminderDays: 0,
    targeting: null,
    startAt: null,
    endAt: null,
    priority: 5,
    version: 1,
    approvedById: 'admin-1',
    approvedAt: new Date('2026-08-21T00:00:00.000Z'),
    updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
  }
}

const CTX: RuntimeContext = {
  locale: 'fr',
  country: 'FR',
  plan: 'oasis',
  platform: 'WEB',
  zone: 'LANDING',
  isNewUser: false,
}

describe('admin marketing runtime — publication humaine et fenêtres', () => {
  it('ne sert jamais DRAFT/PAUSED/ARCHIVED ni une ligne sans approbation humaine', () => {
    for (const status of ['DRAFT', 'PAUSED', 'ARCHIVED']) {
      const result = selectRuntimeContent([banner({ status })] as any, [], CTX, NOW)
      expect(result.banner).toBeNull()
    }
    expect(
      selectRuntimeContent([banner({ approvedById: null })] as any, [], CTX, NOW).banner
    ).toBeNull()
    expect(
      selectRuntimeContent([banner({ approvedAt: null })] as any, [], CTX, NOW).banner
    ).toBeNull()
  })

  it('sert PUBLISHED/SCHEDULED uniquement dans la fenêtre serveur', () => {
    const future = banner({ status: 'SCHEDULED', startAt: new Date('2026-08-23T00:00:00.000Z') })
    const active = banner({
      id: 'active',
      status: 'SCHEDULED',
      startAt: new Date('2026-08-21T00:00:00.000Z'),
      endAt: new Date('2026-08-23T00:00:00.000Z'),
    })
    expect(selectRuntimeContent([future] as any, [], CTX, NOW).banner).toBeNull()
    expect(selectRuntimeContent([active] as any, [], CTX, NOW).banner?.id).toBe('active')
  })
})

describe('admin marketing runtime — ciblage canonique', () => {
  it('applique locale, pays, plan, plateforme, zone et segment', () => {
    const targeted = banner({
      targeting: JSON.stringify({
        locales: ['fr'],
        countries: ['FR'],
        plans: ['oasis'],
        platforms: ['WEB'],
        zones: ['LANDING'],
        userSegments: ['EXISTING'],
      }),
    })
    expect(selectRuntimeContent([targeted] as any, [], CTX, NOW).banner).not.toBeNull()
    expect(
      selectRuntimeContent([targeted] as any, [], { ...CTX, country: 'ZZ' }, NOW).banner
    ).toBeNull()
    expect(
      selectRuntimeContent([targeted] as any, [], { ...CTX, plan: 'decouverte' }, NOW).banner
    ).toBeNull()
    expect(
      selectRuntimeContent([targeted] as any, [], { ...CTX, zone: 'APP' }, NOW).banner
    ).toBeNull()
  })

  it('échoue fermé si le JSON de ciblage est corrompu ou hors schéma', () => {
    expect(
      selectRuntimeContent([banner({ targeting: '{bad json' })] as any, [], CTX, NOW).banner
    ).toBeNull()
    expect(
      selectRuntimeContent(
        [banner({ targeting: JSON.stringify({ admin: true }) })] as any,
        [],
        CTX,
        NOW
      ).banner
    ).toBeNull()
  })
})

describe('admin marketing runtime — projection publique minimale', () => {
  it('prend la bannière éligible de priorité la plus haute', () => {
    const result = selectRuntimeContent(
      [
        banner({ id: 'low', priority: 1 }),
        banner({ id: 'high', priority: 50 }),
      ] as any,
      [],
      CTX,
      NOW
    )
    expect(result.banner?.id).toBe('high')
  })

  it('localise avec fallback FR et ne sert jamais une URL CTA dangereuse', () => {
    const row = banner({
      translations: translations('Texte FR', ''),
      ctaUrl: 'javascript:alert(1)',
    })
    const result = selectRuntimeContent([row] as any, [], { ...CTX, locale: 'en' }, NOW)
    expect(result.banner?.text).toBe('Texte FR')
    expect(result.banner?.ctaUrl).toBeNull()
    expect(result.banner?.ctaLabel).toBeNull()
  })

  it('projette les popups éligibles par priorité avec trigger/frequency', () => {
    const result = selectRuntimeContent(
      [],
      [
        popup({ id: 'low', priority: 1, trigger: 'ON_EXIT', frequency: 'PER_SESSION' }),
        popup({ id: 'high', priority: 10, trigger: 'ON_LOAD', frequency: 'REMIND_DAYS', reminderDays: 7 }),
      ] as any,
      { ...CTX, locale: 'en' },
      NOW
    )
    expect(result.popups.map((item) => item.id)).toEqual(['high', 'low'])
    expect(result.popups[0]).toMatchObject({
      title: 'Title EN',
      body: 'Body EN',
      trigger: 'ON_LOAD',
      frequency: 'REMIND_DAYS',
      reminderDays: 7,
    })
  })

  it('retire une image dangereuse sans supprimer le popup sûr', () => {
    const result = selectRuntimeContent(
      [],
      [popup({ imageUrl: 'data:text/html,bad' })] as any,
      CTX,
      NOW
    )
    expect(result.popups).toHaveLength(1)
    expect(result.popups[0].imageUrl).toBeNull()
  })
})
