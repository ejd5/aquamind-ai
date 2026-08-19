export const aqweliaColors = {
  lagoon: "#18CFC3",
  aqua: "#72E8DF",
  deepTeal: "#073C45",
  night: "#061F2B",
  mist: "#EAFBF8",
  silver: "#A8BDC1",
  ivory: "#FAFCFB",
  champagne: "#C6A56B",
} as const;

/**
 * LAGON VIVANT — opt-in semantic tokens (foundation PR).
 *
 * Mirrors the `--aqwelia-*` variables declared in `src/app/globals.css`
 * (light values). Additive only: the P6-DESIGN `aqweliaColors` palette and
 * the legacy `--gold` token are preserved as-is.
 */
export const aqweliaLagonTokens = {
  aquaVivid: "#22D8C8",
  aquaVividInk: "#0A6E69",
  lagoonInk: "#0A6E69",
  coral: "#FF8A5C",
  coralInk: "#9A3A12",
  champagneInk: "#8A6A2F",
  surfaceTint: "#EFFAF8",
  success: "#16A34A",
  successInk: "#0F5C2E",
  warning: "#F59E0B",
  warningInk: "#8A4A06",
  info: "#0EA5E9",
  infoInk: "#075985",
} as const;

export const aqweliaSpacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const aqweliaRadii = {
  control: 12,
  card: 20,
  panel: 28,
  hero: 32,
  pill: 999,
} as const;

export const aqweliaShadows = {
  soft: "0 8px 30px rgba(6, 31, 43, 0.08)",
  card: "0 18px 55px rgba(6, 31, 43, 0.12)",
  floating: "0 28px 80px rgba(6, 31, 43, 0.18)",
} as const;

export const aqweliaTypography = {
  display: "var(--font-playfair-display), Georgia, 'Times New Roman', serif",
  body: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

export const aqweliaMediaTreatment = {
  /** Diffuse full-bleed layer used to fill the available frame. */
  fillClassName: "aq-media-fill",
  /** Complete, uncropped image layer placed above the diffuse fill. */
  fitClassName: "aq-media-fit",
  /** Readability gradient placed between the image and UI content. */
  overlayClassName: "aq-media-overlay",
} as const;

export type AqweliaColorName = keyof typeof aqweliaColors;
export type AqweliaSpacingName = keyof typeof aqweliaSpacing;
export type AqweliaRadiusName = keyof typeof aqweliaRadii;
