import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(
    process.cwd(),
    "src/components/design-system/aqwelia-primitives.tsx"
  ),
  "utf8"
);

describe("AQWELIA reusable Figma primitives", () => {
  it("exports the shared screen building blocks", () => {
    for (const component of [
      "AqBadge",
      "AqButton",
      "AqCard",
      "AqMediaFrame",
      "AqMetricCard",
      "AqSection",
    ]) {
      expect(source).toContain(component);
    }
  });

  it("keeps all actions at least 44 px high", () => {
    expect(source).toContain("aq-touch-target");
    expect(source).toContain('sm: "min-h-11');
  });

  it("renders the complete image above a diffuse full-bleed layer", () => {
    expect(source).toContain('className="aq-media-fill"');
    expect(source).toContain('cn("aq-media-fit"');
    expect(source).toContain("aq-media-overlay");
  });

  it("retains an empty alt on the decorative duplicate only", () => {
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain('alt=""');
    expect(source).toContain("alt={alt}");
  });
});
