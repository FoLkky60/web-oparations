import { describe, it, expect } from "vitest";
import { ProjectWorkspace } from "@core/project/project-files";
import { analyzeProject } from "@core/analysis/analyze-project";
import { analyzeHtml } from "@core/analysis/html-analyzer";
import { detectComponents } from "@core/analysis/component-detector";
import { getDesignSystem } from "@core/design-system/design-system";
import { TEAM_A_HTML, TEAM_A_CSS, TEAM_B_HTML, TEAM_B_CSS } from "./fixtures";

function wsFrom(files: Record<string, string>): ProjectWorkspace {
  const ws = new ProjectWorkspace();
  for (const [path, text] of Object.entries(files)) {
    const kind = path.endsWith(".css") ? "css" : "html";
    ws.add({ path, kind, text, size: text.length });
  }
  return ws;
}

describe("component detection (multi-signal, not class-name based)", () => {
  it("classifies semantic <button> with full confidence", () => {
    const doc = analyzeHtml("index.html", TEAM_A_HTML);
    const components = detectComponents({ doc, cssSources: [{ file: "x.css", css: TEAM_A_CSS }], designSystem: getDesignSystem() });
    const submit = components.find((c) => c.source.classes.includes("submit-btn"));
    expect(submit?.type).toBe("button");
    expect(submit?.classification.method).toBe("semantic-html");
    expect(submit?.classification.confidence).toBe(1);
  });

  it("treats a styled <div> as a button CANDIDATE only, with a warning", () => {
    const doc = analyzeHtml("index.html", TEAM_A_HTML);
    const components = detectComponents({ doc, cssSources: [], designSystem: getDesignSystem() });
    const candidate = components.find((c) => c.source.classes.includes("action-button"));
    expect(candidate?.type).toBe("button");
    expect(candidate?.classification.method).toBe("heuristic");
    expect(candidate!.classification.confidence).toBeLessThan(0.8);
    expect(candidate!.warnings.join(" ")).toMatch(/candidate/i);
  });

  it("detects navigation from structure (multiple links)", () => {
    const doc = analyzeHtml("index.html", TEAM_A_HTML);
    const components = detectComponents({ doc, cssSources: [], designSystem: getDesignSystem() });
    expect(components.some((c) => c.type === "navigation")).toBe(true);
  });

  it("detects a card from structure (heading + body)", () => {
    const doc = analyzeHtml("index.html", TEAM_B_HTML);
    const components = detectComponents({ doc, cssSources: [], designSystem: getDesignSystem() });
    expect(components.some((c) => c.type === "card")).toBe(true);
  });

  it("resolves CSS properties onto elements and flattens inline styles", () => {
    const doc = analyzeHtml("index.html", TEAM_A_HTML);
    const components = detectComponents({ doc, cssSources: [{ file: "main.css", css: TEAM_A_CSS }], designSystem: getDesignSystem() });
    const submit = components.find((c) => c.source.classes.includes("submit-btn"))!;
    expect(submit.properties["background-color"]).toBe("#73493a");
    expect(submit.properties["border-radius"]).toBe("4px");
  });
});

describe("design properties and findings", () => {
  it("flags an off-palette error color as info (unclassified), not a primary-color violation", () => {
    const result = analyzeProject(wsFrom({ "index.html": TEAM_A_HTML, "styles/main.css": TEAM_A_CSS }));
    const errorColor = result.findings.find((f) => f.category === "color" && f.sourceValue === "#cc0000");
    expect(errorColor).toBeDefined();
    expect(errorColor!.suggestedToken).toBeNull();
    expect(errorColor!.severity).toBe("info");
  });

  it("suggests the primary token for a near-primary color", () => {
    const result = analyzeProject(wsFrom({ "index.html": TEAM_B_HTML, "app.css": TEAM_B_CSS }));
    const near = result.findings.find((f) => f.category === "color" && f.sourceValue === "#744a3b");
    expect(near?.suggestedToken).toBe("color.primary");
    expect(near?.severity).toBe("warning");
  });

  it("flags non-standard font families", () => {
    const result = analyzeProject(wsFrom({ "index.html": TEAM_A_HTML, "styles/main.css": TEAM_A_CSS }));
    expect(result.findings.some((f) => f.category === "typography")).toBe(true);
  });

  it("produces a coherent summary", () => {
    const result = analyzeProject(wsFrom({ "index.html": TEAM_A_HTML, "styles/main.css": TEAM_A_CSS }));
    expect(result.status).toBe("completed");
    expect(result.summary.componentsDetected).toBeGreaterThan(0);
    expect(result.summary.filesAnalyzed).toBe(1);
  });
});
