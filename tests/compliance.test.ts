import { describe, it, expect } from "vitest";
import { ProjectWorkspace } from "@core/project/project-files";
import { analyzeProject } from "@core/analysis/analyze-project";
import { computeCompliance } from "@core/analysis/compliance";
import { getDesignSystem } from "@core/design-system/design-system";
import type { AnalysisResult, Finding, FindingSeverity } from "@shared/index";
import { TEAM_A_HTML, TEAM_A_CSS, TEAM_B_HTML, TEAM_B_CSS } from "./fixtures";

const DS = getDesignSystem();
const AT = "2026-11-03T00:00:00.000Z";

function wsFrom(files: Record<string, string>): ProjectWorkspace {
  const ws = new ProjectWorkspace();
  for (const [path, text] of Object.entries(files)) {
    ws.add({ path, kind: path.endsWith(".css") ? "css" : "html", text, size: text.length });
  }
  return ws;
}

const teamA = () => analyzeProject(wsFrom({ "index.html": TEAM_A_HTML, "styles/main.css": TEAM_A_CSS }));
const teamB = () => analyzeProject(wsFrom({ "index.html": TEAM_B_HTML, "app.css": TEAM_B_CSS }));

/** Small hand-built analysis matching the real AnalysisResult type: 4 colors, no other items. */
function handBuilt(findings: Finding[] = []): AnalysisResult {
  return {
    status: "completed",
    summary: { componentsDetected: 0, potentialViolations: findings.length, unknownComponents: 0, filesAnalyzed: 1 },
    components: [],
    designProperties: {
      colors: ["#111111", "#222222", "#333333", "#444444"],
      fontFamilies: [],
      fontSizes: [],
      spacing: [],
      borderRadii: [],
      shadows: [],
    },
    findings,
    warnings: [],
    designSystemVersion: DS.version,
  };
}

function colorFinding(severity: FindingSeverity, value = "#111111"): Finding {
  return { category: "color", sourceValue: value, suggestedToken: null, severity, note: "test" };
}

describe("computeCompliance — real engine output", () => {
  it("is deterministic: same input → identical output", () => {
    for (const analysis of [teamA(), teamB()]) {
      const a = computeCompliance(analysis, DS, { projectId: "p1", computedAt: AT });
      const b = computeCompliance(structuredClone(analysis), DS, { projectId: "p1", computedAt: AT });
      expect(b).toEqual(a);
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    }
    // Re-running the full pipeline also yields the same report.
    expect(computeCompliance(teamA(), DS, { computedAt: AT })).toEqual(computeCompliance(teamA(), DS, { computedAt: AT }));
  });

  it("score is an integer within [0, 100]", () => {
    for (const analysis of [teamA(), teamB()]) {
      const { score } = computeCompliance(analysis, DS, { computedAt: AT });
      expect(Number.isInteger(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("outstanding excludes info findings and keeps every warning/error", () => {
    const analysis = teamA();
    const report = computeCompliance(analysis, DS, { computedAt: AT });
    expect(analysis.findings.length).toBeGreaterThan(0);
    expect(report.outstanding.every((f) => f.severity !== "info")).toBe(true);
    expect(report.outstanding).toEqual(analysis.findings.filter((f) => f.severity !== "info"));
  });

  it("removing info findings from a real analysis does not change the score", () => {
    const analysis = teamA();
    const withoutInfo: AnalysisResult = { ...analysis, findings: analysis.findings.filter((f) => f.severity !== "info") };
    expect(computeCompliance(withoutInfo, DS, { computedAt: AT }).score).toBe(
      computeCompliance(analysis, DS, { computedAt: AT }).score,
    );
  });
});

describe("computeCompliance — formula properties", () => {
  it("a fully compliant analysis (no warning/error) scores 100", () => {
    expect(computeCompliance(handBuilt(), DS, { computedAt: AT }).score).toBe(100);
    // Empty project (divide-by-zero guard) also scores 100.
    const empty: AnalysisResult = { ...handBuilt(), designProperties: { ...handBuilt().designProperties, colors: [] } };
    expect(computeCompliance(empty, DS, { computedAt: AT }).score).toBe(100);
  });

  it("info findings do not lower the score", () => {
    const report = computeCompliance(handBuilt([colorFinding("info"), colorFinding("info", "#222222")]), DS, {
      computedAt: AT,
    });
    expect(report.score).toBe(100);
    expect(report.outstanding).toEqual([]);
  });

  it("an error lowers the score more than a warning", () => {
    const err = computeCompliance(handBuilt([colorFinding("error")]), DS, { computedAt: AT }).score;
    const warn = computeCompliance(handBuilt([colorFinding("warning")]), DS, { computedAt: AT }).score;
    expect(err).toBeLessThan(warn);
    expect(warn).toBeLessThan(100);
    // (1 - 3/12) * 100 and (1 - 2/12) * 100 with 4 color items × max weight 3
    expect(err).toBe(75);
    expect(warn).toBe(83);
  });

  it("outstanding contains warnings and errors but not info", () => {
    const findings = [colorFinding("info"), colorFinding("warning", "#222222"), colorFinding("error", "#333333")];
    const report = computeCompliance(handBuilt(findings), DS, { computedAt: AT });
    expect(report.outstanding.map((f) => f.severity)).toEqual(["warning", "error"]);
    const color = report.dimensions.find((d) => d.category === "color")!;
    expect(color).toEqual({ category: "color", total: 4, compliant: 2, weightedViolations: 5 });
  });
});
