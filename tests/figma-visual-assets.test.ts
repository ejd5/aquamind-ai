import { statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const VISUAL_ASSETS = [
  "public/aqwelia-hero-bg.png",
  "public/bloc04-bg.png",
  "public/modules-bg.png",
  "public/bloc-bas.png",
] as const;

describe("AQWELIA Figma landing assets", () => {
  it.each(VISUAL_ASSETS)("keeps %s available and non-empty", (asset) => {
    const stats = statSync(resolve(process.cwd(), asset));

    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(0);
  });
});
