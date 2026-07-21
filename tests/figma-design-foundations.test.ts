import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  aqweliaColors,
  aqweliaMediaTreatment,
  aqweliaRadii,
  aqweliaSpacing,
  aqweliaTypography,
} from "../src/lib/design/aqwelia-tokens";

const css = readFileSync(
  resolve(process.cwd(), "src/app/aqwelia-figma.css"),
  "utf8"
);

describe("AQWELIA Figma visual foundations", () => {
  it("keeps the approved brand palette stable", () => {
    expect(aqweliaColors).toEqual({
      lagoon: "#18CFC3",
      aqua: "#72E8DF",
      deepTeal: "#073C45",
      night: "#061F2B",
      mist: "#EAFBF8",
      silver: "#A8BDC1",
      ivory: "#FAFCFB",
      champagne: "#C6A56B",
    });
  });

  it("uses the 4 px grid and the approved radius scale", () => {
    expect(aqweliaSpacing[1]).toBe(4);
    expect(aqweliaSpacing[6]).toBe(24);
    expect(aqweliaSpacing[24]).toBe(96);
    expect(aqweliaRadii).toEqual({
      control: 12,
      card: 20,
      panel: 28,
      hero: 32,
      pill: 999,
    });
  });

  it("uses Playfair Display and Geist from the root layout", () => {
    expect(aqweliaTypography.display).toContain("--font-playfair-display");
    expect(aqweliaTypography.body).toContain("--font-geist-sans");
    expect(css).toContain("--aq-font-display: var(--font-playfair-display)");
    expect(css).toContain("--aq-font-body: var(--font-geist-sans)");
  });

  it("preserves the no-destructive-crop media treatment", () => {
    expect(aqweliaMediaTreatment).toEqual({
      fillClassName: "aq-media-fill",
      fitClassName: "aq-media-fit",
      overlayClassName: "aq-media-overlay",
    });
    expect(css).toContain(".aq-media-fill");
    expect(css).toContain("object-fit: cover");
    expect(css).toContain(".aq-media-fit");
    expect(css).toContain("object-fit: contain");
  });

  it("keeps accessibility safeguards in the shared layer", () => {
    expect(css).toContain("min-width: 2.75rem");
    expect(css).toContain("min-height: 2.75rem");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(":focus-visible");
  });
});
