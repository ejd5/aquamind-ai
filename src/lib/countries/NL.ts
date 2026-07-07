import type { CountryConfig } from './index'

/**
 * Netherlands — Warenwetbesstamp Zwembadwater / Drinkwaterbesluit norms.
 *
 * Legal: AVG (Uitvoeringswet AVG, the Dutch GDPR).
 */
export const NETHERLANDS: CountryConfig = {
  code: 'NL',
  name: 'Nederland',
  locale: 'nl',
  currency: 'EUR',
  currencySymbol: '€',
  units: 'metric',
  poolNorms: {
    phRange: [7.0, 7.6],
    chlorineRange: [1.0, 2.0],
    bromineRange: [1.0, 2.0],
    tacRange: [80, 120],
    cyaRange: [20, 50],
    maxWaterTemp: 28,
  },
  spaNorms: {
    phRange: [7.0, 7.6],
    bromineRange: [3.0, 5.0],
    maxTemp: 38,
    mandatoryDrain: 90,
  },
  partners: [
    { id: 'amazon-nl', name: 'Amazon.nl', url: 'https://www.amazon.nl', affiliate: 'aqwelia-nl-21' },
    { id: 'zwembadbenodigdheden', name: 'Zwembadbenodigdheden', url: 'https://www.zwembadbenodigdheden.nl', affiliate: 'aqwelia-zb' },
    { id: 'pool-supplies-nl', name: 'Pool Supplies NL', url: 'https://www.poolsupplies.nl', affiliate: 'aqwelia-psnl' },
  ],
  legal: {
    privacyLaw: 'AVG',
    consentRequired: true,
    dataRetentionDays: 1095, // 3 years
    minAge: 16,
  },
}
