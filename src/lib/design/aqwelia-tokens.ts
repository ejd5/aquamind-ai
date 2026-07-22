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
