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
 *
 * The POC is gated by TWO independent flags:
 *  - ARQWELIA_AR_POC_ENABLED (SERVER, runtime): the authority flag enforced by
 *    the /arqwelia/lab/ar-poc Server Component at request time. When false the
 *    page renders a clearly disabled state with ZERO viewer.
 *  - NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED (CLIENT, build-time): enforced by the
 *    <ArqweliaArViewer> client component. When false the component renders
 *    ZERO DOM. Because NEXT_PUBLIC_* is inlined by Next.js at build time, a
 *    rebuild is required to change it, while the server flag is read at
 *    runtime (no rebuild).
 */
export const ARQWELIA_AR_POC_ENABLED =
  process.env.ARQWELIA_AR_POC_ENABLED === 'true'

/** Client flag (build-time, NEXT_PUBLIC). Kept as a const so tests can reset it. */
export const NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED =
  process.env.NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED === 'true'

/** Server authority flag, read at request time (runtime env, not inlined). */
export function isArqweliaArPocServerEnabled(): boolean {
  return process.env.ARQWELIA_AR_POC_ENABLED === 'true'
}

/** Client flag (build-time NEXT_PUBLIC). Enforced by the AR viewer component. */
export function isArqweliaArPocEnabled(): boolean {
  return NEXT_PUBLIC_ARQWELIA_AR_POC_ENABLED
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
