import type { CountryConfig } from './index'

/**
 * France — AQWELIA's home market.
 *
 * Norms follow ANSES / DGS recommendations for private pools and spas.
 * Legal: RGPD (EU 2016/679) + Loi Informatique et Libertés.
 */
export const FRANCE: CountryConfig = {
  code: 'FR',
  name: 'France',
  locale: 'fr',
  currency: 'EUR',
  currencySymbol: '€',
  units: 'metric',
  poolNorms: {
    phRange: [7.0, 7.4],
    chlorineRange: [0.4, 1.4],
    bromineRange: [1.0, 2.0],
    tacRange: [80, 120],
    cyaRange: [30, 50],
    maxWaterTemp: 28,
  },
  spaNorms: {
    phRange: [7.0, 7.4],
    bromineRange: [3.0, 5.0],
    maxTemp: 38,
    mandatoryDrain: 90,
  },
  partners: [
    { id: 'amazon-fr', name: 'Amazon.fr', url: 'https://www.amazon.fr', affiliate: 'aqwelia-fr-21' },
    { id: 'hth-distri', name: 'HTH Distri', url: 'https://www.hth-distri.fr', affiliate: 'aqwelia-hth' },
    { id: 'piscine-center', name: 'Piscine Center', url: 'https://www.piscine-center.com', affiliate: 'aqwelia-pc' },
  ],
  legal: {
    privacyLaw: 'RGPD',
    consentRequired: true,
    dataRetentionDays: 1095, // 3 years
    minAge: 15,
  },
}
