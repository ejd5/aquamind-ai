import type { CountryConfig } from './index'

/**
 * Spain — Real Decreto 742/2010 (normas de calidad del agua de piscina)
 * + UNE-EN norms.
 *
 * Legal: RGPD + LOPDGDD (Ley Orgánica 3/2018).
 */
export const SPAIN: CountryConfig = {
  code: 'ES',
  name: 'España',
  locale: 'es',
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
    { id: 'amazon-es', name: 'Amazon.es', url: 'https://www.amazon.es', affiliate: 'aqwelia-es-21' },
    { id: 'piscinas-jardines', name: 'Piscinas y Jardines', url: 'https://www.piscinasyjardines.com', affiliate: 'aqwelia-pyj' },
    { id: 'poolstar-es', name: 'Poolstar España', url: 'https://www.poolstar.es', affiliate: 'aqwelia-pse' },
  ],
  legal: {
    privacyLaw: 'RGPD',
    consentRequired: true,
    dataRetentionDays: 1095, // 3 years
    minAge: 14,
  },
}
