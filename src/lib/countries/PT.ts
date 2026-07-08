import type { CountryConfig } from './index'

/**
 * Portugal — Decreto-Lei n.º 37/2010 + Portaria n.º 113/2011
 * (normas de qualidade da água de piscinas).
 *
 * Legal: RGPD + Lei n.º 58/2019.
 */
export const PORTUGAL: CountryConfig = {
  code: 'PT',
  name: 'Portugal',
  locale: 'pt',
  currency: 'EUR',
  currencySymbol: '€',
  units: 'metric',
  poolNorms: {
    phRange: [7.0, 7.8],
    chlorineRange: [1.0, 3.0],
    bromineRange: [2.0, 4.0],
    tacRange: [80, 120],
    cyaRange: [30, 75],
    maxWaterTemp: 28,
  },
  spaNorms: {
    phRange: [7.0, 7.8],
    bromineRange: [3.0, 5.0],
    maxTemp: 38,
    mandatoryDrain: 90,
  },
  partners: [
    { id: 'amazon-es-pt', name: 'Amazon.es (PT)', url: 'https://www.amazon.es', affiliate: 'aqwelia-pt-21' },
    { id: 'piscinas-portugal', name: 'Piscinas Portugal', url: 'https://www.piscinasportugal.com', affiliate: 'aqwelia-pp' },
    { id: 'poolcenter-pt', name: 'Poolcenter Portugal', url: 'https://www.poolcenter.pt', affiliate: 'aqwelia-pcptr' },
  ],
  legal: {
    privacyLaw: 'RGPD',
    consentRequired: true,
    dataRetentionDays: 1095, // 3 years
    minAge: 13,
  },
}
