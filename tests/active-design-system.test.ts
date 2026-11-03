import { describe, it, expect } from "vitest";
import { ProjectWorkspace } from "@core/project/project-files";
import { analyzeProject } from "@core/analysis/analyze-project";
import { transformProject } from "@core/transformation/transform-project";
import { designSystemFromVersion, DESIGN_SYSTEM_V1 } from "@core/design-system/design-system";
import type { DesignSystem } from "@shared/index";
import { buildStandardV321, STANDARD_V321_VERSION } from "../app/lib/standard-v321";

/**
 * ADD-04 Phase F (F.1/F.2): the engine accepts a DesignSystem object (the
 * active version from the app's repository) in addition to the old
 * version-string path, which must keep resolving to 1.0.0.
 */

const HTML = `<!DOCTYPE html>
<html><head><link rel="stylesheet" href="styles/main.css"></head>
<body><button class="cta">Go</button></body></html>`;

const CSS = `.cta { background-color: #D71920; color: #FFFFFF; }
.legacy { color: #73493A; }
`;

function ws(): ProjectWorkspace {
  const w = new ProjectWorkspace();
  w.add({ path: "index.html", kind: "html", text: HTML, size: HTML.length });
  w.add({ path: "styles/main.css", kind: "css", text: CSS, size: CSS.length });
  return w;
}

const V321: DesignSystem = designSystemFromVersion(buildStandardV321("2026-11-03T00:00:00.000Z"));

describe("Standard v3.2.1 seed values (ADD-04 §6)", () => {
  it("overrides only the documented tokens and keeps v1 components", () => {
    const tok = (n: string) => V321.tokens.find((t) => t.name === n)?.value;
    expect(V321.version).toBe(STANDARD_V321_VERSION);
    expect(tok("color.primary")).toBe("#D71920");
    expect(tok("color.text-on-primary")).toBe("#FFFFFF");
    expect(tok("font.family")).toBe("Inter, sans-serif");
    expect(tok("font.size.body")).toBe("14px");
    expect(tok("spacing.medium")).toBe("16px");
    expect(tok("radius.medium")).toBe("8px");
    expect(tok("color.secondary")).toBe("#D9B99B"); // inherited from v1
    expect(V321.components).toEqual(DESIGN_SYSTEM_V1.components);
    // DESIGN_SYSTEM_V1 itself is untouched.
    expect(DESIGN_SYSTEM_V1.tokens.find((t) => t.name === "color.primary")?.value).toBe("#73493A");
  });
});

describe("engine with a DesignSystem object", () => {
  it("transformProject normalizes exact #D71920 to var(--color-primary) and leaves #73493A untouched", () => {
    const original = ws();
    const { output, report } = transformProject(original, { categories: ["colors"], designSystem: V321 });
    const css = output.get("styles/main.css")?.text ?? "";
    expect(report.designSystemVersion).toBe("3.2.1");
    expect(css).toContain("background-color: var(--color-primary)");
    expect(css).toContain("#73493A");
    expect(report.changes.some((c) => c.before.toLowerCase() === "#d71920" && c.after === "var(--color-primary)")).toBe(true);
    expect(report.changes.some((c) => c.before.toLowerCase() === "#73493a")).toBe(false);
    // RULE-01: original workspace not mutated.
    expect(original.get("styles/main.css")?.text).toBe(CSS);
    // Token stylesheet is generated from the passed DS.
    expect(output.get("styles/ds-tokens.css")?.text).toContain("--color-primary: #D71920;");
  });

  it("designSystem takes precedence over designSystemVersion", () => {
    const { report } = transformProject(ws(), { designSystem: V321, designSystemVersion: "1.0.0" });
    expect(report.designSystemVersion).toBe("3.2.1");
  });

  it("analyzeProject accepts a DesignSystem object", () => {
    const result = analyzeProject(ws(), V321);
    expect(result.designSystemVersion).toBe("3.2.1");
  });
});

describe("old version-string path still uses 1.0.0", () => {
  it("analyzeProject with no argument / '1.0.0'", () => {
    expect(analyzeProject(ws()).designSystemVersion).toBe("1.0.0");
    expect(analyzeProject(ws(), "1.0.0").designSystemVersion).toBe("1.0.0");
  });

  it("transformProject via designSystemVersion maps #73493A, not #D71920", () => {
    const { output, report } = transformProject(ws(), { categories: ["colors"], designSystemVersion: "1.0.0" });
    const css = output.get("styles/main.css")?.text ?? "";
    expect(report.designSystemVersion).toBe("1.0.0");
    expect(css).toContain("color: var(--color-primary)"); // .legacy #73493A -> token
    expect(report.changes.some((c) => c.before.toLowerCase() === "#d71920" && c.after === "var(--color-primary)")).toBe(false);
  });
});
