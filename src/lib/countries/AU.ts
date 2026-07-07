import type { CountryConfig } from './index'

/**
 * Australia — Australian Standards AS 3633 (private swimming pools)
 * + state-level Public Health Regulations (e.g. NSW Public Swimming Pools
 * and Spas Code).
 *
 * Legal: Privacy Act 1988 (Cth) + Australian Privacy Principles (APPs).
 */
export const AUSTRALIA: CountryConfig = {
  code: 'AU',
  name: 'Australia',
  locale: 'en',
  currency: 'AUD',
  currencySymbol: '$',
  units: 'metric',
  poolNorms: {
    phRange: [7.0, 7.6],
    chlorineRange: [1.0, 3.0],
    bromineRange: [2.0, 4.0],
    tacRange: [80, 120],
    cyaRange: [30, 50],
    maxWaterTemp: 28,
  },
  spaNorms: {
    phRange: [7.0, 7.6],
    bromineRange: [3.0, 6.0],
    maxTemp: 40,
    mandatoryDrain: 90,
  },
  partners: [
    { id: 'amazon-com-au', name: 'Amazon.com.au', url: 'https://www.amazon.com.au', affiliate: 'aqwelia-au-22' },
    { id: 'pool-zone', name: 'Pool Zone', url: 'https://www.poolzone.com.au', affiliate: 'aqwelia-pz' },
    { id: 'swim-in', name: 'Swim-In', url: 'https://www.swim-in.com.au', affiliate: 'aqwelia-si' },
  ],
  legal: {
    privacyLaw: 'Privacy Act',
    consentRequired: true,
    dataRetentionDays: 1095, // 3 years
    minAge: 13,
  },
}
