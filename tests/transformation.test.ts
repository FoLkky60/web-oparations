import { describe, it, expect } from "vitest";
import { parse } from "parse5";
import postcss from "postcss";
import { ProjectWorkspace } from "@core/project/project-files";
import { transformProject } from "@core/transformation/transform-project";
import { normalizeCss } from "@core/transformation/css-normalizer";
import { getDesignSystem } from "@core/design-system/design-system";
import { TEAM_A_HTML, TEAM_A_CSS } from "./fixtures";

function ws(): ProjectWorkspace {
  const w = new ProjectWorkspace();
  w.add({ path: "index.html", kind: "html", text: TEAM_A_HTML, size: TEAM_A_HTML.length });
  w.add({ path: "styles/main.css", kind: "css", text: TEAM_A_CSS, size: TEAM_A_CSS.length });
  return w;
}

describe("CSS normalization (AST, conservative)", () => {
  it("maps an exact primary color to the token variable", () => {
    const { css, changes } = normalizeCss(TEAM_A_CSS, { categories: ["colors"], ds: getDesignSystem(), file: "main.css" });
    expect(css).toContain("var(--color-primary)");
    expect(changes.some((c) => c.rule === "map-color-token" && c.before.toLowerCase() === "#73493a")).toBe(true);
  });

  it("does NOT rewrite the off-palette error color", () => {
    const { css } = normalizeCss(TEAM_A_CSS, { categories: ["colors"], ds: getDesignSystem(), file: "main.css" });
    expect(css).toContain("#cc0000");
  });

  it("normalizes an exact-match border-radius to the token", () => {
    const { changes } = normalizeCss(TEAM_A_CSS, { categories: ["radius"], ds: getDesignSystem(), file: "main.css" });
    expect(changes.some((c) => c.rule === "normalize-border-radius" && c.before === "4px" && c.after === "var(--radius-small)")).toBe(true);
  });

  it("does not touch a non-matching radius (3px)", () => {
    const { css } = normalizeCss(TEAM_A_CSS, { categories: ["radius"], ds: getDesignSystem(), file: "main.css" });
    expect(css).toContain("border-radius: 3px");
  });
});

describe("full project transformation", () => {
  it("generates a standardized output without mutating the original", () => {
    const original = ws();
    const originalCss = original.get("styles/main.css")!.text;
    const { output, report } = transformProject(original);

    // Original untouched.
    expect(original.get("styles/main.css")!.text).toBe(originalCss);

    // Output exists and differs.
    expect(output.get("styles/main.css")!.text).not.toBe(originalCss);
    expect(output.get("styles/ds-tokens.css")).toBeDefined();
    expect(report.validation.originalUnchanged).toBe(true);
  });

  it("output HTML and CSS re-parse successfully", () => {
    const { output, report } = transformProject(ws());
    for (const f of output.byKind("html")) expect(() => parse(f.text ?? "")).not.toThrow();
    for (const f of output.byKind("css")) expect(() => postcss.parse(f.text ?? "", { from: f.path })).not.toThrow();
    expect(report.validation.htmlReparsed).toBe(true);
    expect(report.validation.cssReparsed).toBe(true);
  });

  it("adds standardized classes to semantic components and links the tokens stylesheet", () => {
    const { output } = transformProject(ws());
    const html = output.get("index.html")!.text ?? "";
    expect(html).toContain("ds-button");
    expect(html).toContain("ds-tokens.css");
  });

  it("flags the non-semantic div candidate as needs-review (not auto-applied)", () => {
    const { report } = transformProject(ws());
    const candidate = report.changes.find((c) => c.selector.includes("action-button"));
    expect(candidate?.status).toBe("needs-review");
  });

  it("records structured changes and a behavioral caveat", () => {
    const { report } = transformProject(ws());
    expect(report.changes.length).toBeGreaterThan(0);
    expect(report.behavioralNote).toMatch(/does NOT guarantee/i);
    expect(["success", "partial"]).toContain(report.status);
  });

  it("supports selective categories (colors only)", () => {
    const { report } = transformProject(ws(), { categories: ["colors"] });
    expect(report.changes.every((c) => c.category === "colors" || c.status === "needs-review")).toBe(true);
    expect(report.changes.some((c) => c.category === "colors")).toBe(true);
    expect(report.changes.some((c) => c.category === "radius")).toBe(false);
  });
});
