import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const foundations = read("src/app/aqwelia-figma.css");
const flows = read("src/app/aqwelia-flows.css");
const pro = read("src/app/aqwelia-pro.css");
const layout = read("src/app/layout.tsx");
const proLayout = read("src/app/pro/app/layout.tsx");

describe("AQWELIA Figma screen layers", () => {
  it("loads all scoped visual layers after the existing global theme", () => {
    const globalsIndex = layout.indexOf('import "./globals.css"');
    const foundationsIndex = layout.indexOf('import "./aqwelia-figma.css"');
    const flowsIndex = layout.indexOf('import "./aqwelia-flows.css"');
    const proIndex = layout.indexOf('import "./aqwelia-pro.css"');

    expect(globalsIndex).toBeGreaterThanOrEqual(0);
    expect(foundationsIndex).toBeGreaterThan(globalsIndex);
    expect(flowsIndex).toBeGreaterThan(foundationsIndex);
    expect(proIndex).toBeGreaterThan(flowsIndex);
  });

  it("scopes the individual dashboard cockpit to the existing app shell", () => {
    expect(foundations).toContain("aside.custom-scroll + main");
    expect(foundations).toContain("var(--aq-radius-panel)");
    expect(foundations).toContain("min-height: 2.75rem");
  });

  it("keeps onboarding and diagnostic behavior untouched while styling their stable hooks", () => {
    expect(flows).toContain(".aurora-bg");
    expect(flows).toContain('label[for="diag-upload"]');
    expect(flows).toContain("object-fit: contain");
    expect(flows).toContain("min-height: 2.75rem");
  });

  it("uses an explicit scope for the professional workspace", () => {
    expect(proLayout).toContain('className="aq-pro-app');
    expect(proLayout).toContain("aq-pro-header");
    expect(proLayout).toContain("aq-pro-sidebar");
    expect(proLayout).toContain("aq-pro-main");
    expect(pro).toContain(".aq-pro-app");
    expect(pro).toContain(".aq-pro-main");
  });

  it("does not introduce pricing, billing or database rules in visual CSS", () => {
    const visualSource = `${foundations}\n${flows}\n${pro}`.toLowerCase();
    for (const forbidden of ["stripe", "revenuecat", "prisma", "migration.sql"]) {
      expect(visualSource).not.toContain(forbidden);
    }
  });
});
