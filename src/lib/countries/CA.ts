import type { CountryConfig } from './index'

/**
 * Canada — provincial pool regulations (Ontario Reg. 565, Québec RQSHA,
 * BC Pool Regulation). Federal norms: Health Canada Guidelines for
 * Canadian Recreational Water Quality.
 *
 * Legal: PIPEDA (federal) + provincial privacy laws (e.g. Québec Law 25).
 */
export const CANADA: CountryConfig = {
  code: 'CA',
  name: 'Canada',
  locale: 'en',
  currency: 'CAD',
  currencySymbol: '$',
  units: 'metric', // CA officially metric; volume in litres / m³
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
    bromineRange: [3.0, 6.0],
    maxTemp: 40, // 104°F, provincial max varies 38–40°C
    mandatoryDrain: 90,
  },
  partners: [
    { id: 'amazon-ca', name: 'Amazon.ca', url: 'https://www.amazon.ca', affiliate: 'aqwelia-ca-20' },
    { id: 'pool-supplies-ca', name: 'Pool Supplies Canada', url: 'https://www.poolsuppliescanada.ca', affiliate: 'aqwelia-psc' },
    { id: 'leslies-ca', name: "Backyard Poolstore", url: 'https://www.backyardpoolstore.ca', affiliate: 'aqwelia-bps' },
  ],
  legal: {
    privacyLaw: 'PIPEDA',
    consentRequired: true,
    dataRetentionDays: 1095, // 3 years
    minAge: 13, // varies by province (16 in Québec for consent without guardian)
  },
}
