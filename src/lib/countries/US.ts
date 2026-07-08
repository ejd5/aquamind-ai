import type { CountryConfig } from './index'

/**
 * United States — APSP / CDC Model Aquatic Health Code norms.
 *
 * Legal: CCPA (California) + state-level privacy laws; COPPA for under-13.
 */
export const USA: CountryConfig = {
  code: 'US',
  name: 'United States',
  locale: 'en',
  currency: 'USD',
  currencySymbol: '$',
  units: 'imperial',
  poolNorms: {
    phRange: [7.2, 7.8],
    chlorineRange: [1.0, 3.0],
    bromineRange: [2.0, 4.0],
    tacRange: [80, 120],
    cyaRange: [30, 100],
    maxWaterTemp: 30,
  },
  spaNorms: {
    phRange: [7.2, 7.8],
    bromineRange: [2.0, 6.0],
    maxTemp: 40, // 104°F
    mandatoryDrain: 90,
  },
  partners: [
    { id: 'amazon-com', name: 'Amazon.com', url: 'https://www.amazon.com', affiliate: 'aqwelia-us-20' },
    { id: 'leslies', name: "Leslie's Pool Supplies", url: 'https://www.lesliespool.com', affiliate: 'aqwelia-leslies' },
    { id: 'doheny', name: 'Doheny Water Depot', url: 'https://www.doheny.com', affiliate: 'aqwelia-doheny' },
  ],
  legal: {
    privacyLaw: 'CCPA',
    consentRequired: false,
    dataRetentionDays: 730, // 2 years
    minAge: 13,
  },
}
