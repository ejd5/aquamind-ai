/** AQWELIA runtime feature flags. Disabled by default unless explicitly enabled. */
export const PRO_GPS_ENABLED = process.env.NEXT_PUBLIC_PRO_GPS_ENABLED === 'true'

/**
 * ARQWELIA Lot 1 — visual prototype + acquisition tunnel.
 * When false, no ARQWELIA public route is indexed or visible in main nav.
 * Routes still resolve (for QA) but sitemap/robots exclude them and the
 * landing nav hides the entry point.
 */
export const ARQWELIA_LOT1_ENABLED =
  process.env.NEXT_PUBLIC_ARQWELIA_LOT1_ENABLED === 'true'

export function isProGpsEnabled(): boolean {
  return PRO_GPS_ENABLED
}

export function isArqweliaLot1Enabled(): boolean {
  return ARQWELIA_LOT1_ENABLED
}

/**
 * ARQWELIA Lot 2 — A2 web-mobile AR POC (@google/model-viewer).
 * Build-time client flag (NEXT_PUBLIC_*). When false (the default), the AR
 * viewer component renders ZERO DOM and the /arqwelia/lab/ar-poc page shows
 * a non-functional "Fonction future" disabled state.
 *
 * The server-side ARQWELIA_AR_POC_ENABLED var is documented in .env.example as
 * a future authority flag — it is NOT wired to any API in this POC.
 */
export const ARQWELIA_AR_POC_ENABLED =
  process.env.NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED === 'true'

export function isArqweliaArPocEnabled(): boolean {
  return ARQWELIA_AR_POC_ENABLED
}

/**
 * Demo mode — when true, the ARQWELIA analysis shows a "Démo - analyse simulée"
 * badge and the "Voir la démonstration" path injects fixtures. Defaults to true
 * in dev (NODE_ENV !== 'production') and false in prod unless explicitly enabled.
 */
export const ARQWELIA_DEMO_MODE =
  process.env.NEXT_PUBLIC_ARQWELIA_DEMO_MODE === 'true' ||
  process.env.NODE_ENV !== 'production'

export function isArqweliaDemoMode(): boolean {
  return ARQWELIA_DEMO_MODE
}
