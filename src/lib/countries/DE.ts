import type { CountryConfig } from './index'

/**
 * Germany — DIN 19643 (swimming pool water treatment).
 *
 * Note: DIN 19643 is stricter than the rest of the EU — the upper chlorine
 * bound is 0.6 mg/L for standard pools (free chlorine) because the German
 * norm requires a tighter combined-chlorine limit.
 *
 * Legal: DSGVO (DSGVO = GDPR, German transposition) + BDSG.
 */
export const GERMANY: CountryConfig = {
  code: 'DE',
  name: 'Deutschland',
  locale: 'de',
  currency: 'EUR',
  currencySymbol: '€',
  units: 'metric',
  poolNorms: {
    phRange: [7.0, 7.6],
    chlorineRange: [0.3, 0.6],
    bromineRange: [1.0, 2.0],
    tacRange: [80, 120],
    cyaRange: [0, 25], // CYA heavily restricted / discouraged in DE
    maxWaterTemp: 28,
  },
  spaNorms: {
    phRange: [7.0, 7.6],
    bromineRange: [3.0, 5.0],
    maxTemp: 38,
    mandatoryDrain: 90,
  },
  partners: [
    { id: 'amazon-de', name: 'Amazon.de', url: 'https://www.amazon.de', affiliate: 'aqwelia-de-21' },
    { id: 'poolpowershop', name: 'Poolpowershop', url: 'https://www.poolpowershop.com', affiliate: 'aqwelia-pp' },
    { id: 'wasser-store', name: 'Wasser-Store', url: 'https://www.wasser-store.de', affiliate: 'aqwelia-ws' },
  ],
  legal: {
    privacyLaw: 'DSGVO',
    consentRequired: true,
    dataRetentionDays: 1095, // 3 years
    minAge: 16, // Germany requires 16 for GDPR consent (unless guardian approves)
  },
}
