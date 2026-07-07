import type { CountryConfig } from './index'

/**
 * Italy — Circolare Ministeriale 16/2003 + D.Lgs. 82/2011 (Codice della
 * Pubblica Amministrazione, which references pool water norms).
 *
 * Legal: RGPD + Codice in materia di protezione dei dati personali (D.Lgs. 196/2003).
 */
export const ITALY: CountryConfig = {
  code: 'IT',
  name: 'Italia',
  locale: 'it',
  currency: 'EUR',
  currencySymbol: '€',
  units: 'metric',
  poolNorms: {
    phRange: [7.0, 7.4],
    chlorineRange: [1.0, 1.5],
    bromineRange: [1.0, 2.0],
    tacRange: [80, 120],
    cyaRange: [25, 50],
    maxWaterTemp: 28,
  },
  spaNorms: {
    phRange: [7.0, 7.4],
    bromineRange: [3.0, 5.0],
    maxTemp: 38,
    mandatoryDrain: 90,
  },
  partners: [
    { id: 'amazon-it', name: 'Amazon.it', url: 'https://www.amazon.it', affiliate: 'aqwelia-it-21' },
    { id: 'piscine-online', name: 'Piscine Online', url: 'https://www.piscineonline.it', affiliate: 'aqwelia-pol' },
    { id: 'idropiscine', name: 'Idropiscine', url: 'https://www.idropiscine.com', affiliate: 'aqwelia-idro' },
  ],
  legal: {
    privacyLaw: 'RGPD',
    consentRequired: true,
    dataRetentionDays: 1095, // 3 years
    minAge: 14,
  },
}
