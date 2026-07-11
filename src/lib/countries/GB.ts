import type { CountryConfig } from './index'

/**
 * United Kingdom — Pool Water Treatment Advisory Group (PWTAG) norms.
 *
 * Legal: UK GDPR + Data Protection Act 2018.
 */
export const UK: CountryConfig = {
  code: 'GB',
  name: 'United Kingdom',
  locale: 'en',
  currency: 'GBP',
  currencySymbol: '£',
  units: 'metric',
  poolNorms: {
    phRange: [7.0, 7.6],
    chlorineRange: [1.0, 3.0],
    bromineRange: [2.0, 4.0],
    tacRange: [80, 120],
    cyaRange: [30, 60],
    maxWaterTemp: 28,
  },
  spaNorms: {
    phRange: [7.0, 7.6],
    bromineRange: [3.0, 5.0],
    maxTemp: 38,
    mandatoryDrain: 90,
  },
  partners: [
    { id: 'amazon-co-uk', name: 'Amazon.co.uk', url: 'https://www.amazon.co.uk', affiliate: 'aqwelia-uk-21' },
    { id: 'poolstore-uk', name: 'PoolStore UK', url: 'https://www.poolstore.co.uk', affiliate: 'aqwelia-psuk' },
    { id: '1st-direct', name: '1st Direct Pools', url: 'https://www.1st-direct.com', affiliate: 'aqwelia-1st' },
  ],
  legal: {
    privacyLaw: 'UK GDPR',
    consentRequired: true,
    dataRetentionDays: 1095, // 3 years
    minAge: 13,
  },
}
