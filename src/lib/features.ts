/** AQWELIA runtime feature flags. Disabled by default unless explicitly enabled. */
export const PRO_GPS_ENABLED = process.env.NEXT_PUBLIC_PRO_GPS_ENABLED === 'true'

export function isProGpsEnabled(): boolean {
  return PRO_GPS_ENABLED
}
