import type { AnalysisResult, DesignSystem, DetectedComponent } from "@shared/index";
import { ProjectWorkspace } from "../project/project-files";
import { analyzeHtml } from "./html-analyzer";
import { analyzeCss } from "./css-analyzer";
import type { CssModel } from "./css-analyzer";
import { detectComponents } from "./component-detector";
import { extractDesignProperties, findViolations } from "./design-properties";
import { resolveCssForDocument } from "../project/resolve-css";
import { getDesignSystem } from "../design-system/design-system";

/**
 * Full analysis of a project workspace: parse every HTML file, resolve its CSS,
 * detect components (multi-signal), extract design properties and compute
 * findings against the active Design System.
 */
export function analyzeProject(
  ws: ProjectWorkspace,
  designSystemVersionOrDs?: string | DesignSystem,
): AnalysisResult {
  // Additive: callers may pass a version id (registry lookup, default v1) or a
  // full DesignSystem object (e.g. the active version from the app's repository).
  const ds: DesignSystem =
    typeof designSystemVersionOrDs === "object" && designSystemVersionOrDs !== null
      ? designSystemVersionOrDs
      : getDesignSystem(designSystemVersionOrDs);
  const warnings: string[] = [];
  const allComponents: DetectedComponent[] = [];
  const cssModels: CssModel[] = [];
  const inlineStyleBags: Record<string, string>[] = [];

  const htmlFiles = ws.byKind("html");
  if (htmlFiles.length === 0) {
    return {
      status: "failed",
      summary: { componentsDetected: 0, potentialViolations: 0, unknownComponents: 0, filesAnalyzed: 0 },
      components: [],
      designProperties: { colors: [], fontFamilies: [], fontSizes: [], spacing: [], borderRadii: [], shadows: [] },
      findings: [],
      warnings: ["No HTML files found to analyze."],
      designSystemVersion: ds.version,
    };
  }

  // Analyze standalone CSS files too (even if not linked) so properties surface.
  const linkedCss = new Set<string>();

  for (const htmlFile of htmlFiles) {
    const doc = analyzeHtml(htmlFile.path, htmlFile.text ?? "");
    const cssRes = resolveCssForDocument(ws, htmlFile.path, doc);

    cssRes.missing.forEach((m) =>
      warnings.push(`Stylesheet "${m}" referenced by ${htmlFile.path} was not found in the project.`),
    );
    cssRes.external.forEach((e) =>
      warnings.push(`External stylesheet "${e}" (not analyzed) referenced by ${htmlFile.path}.`),
    );

    for (const src of cssRes.sources) {
      if (!src.file.includes("#style")) linkedCss.add(src.file);
      cssModels.push(analyzeCss(src.file, src.css));
    }

    const components = detectComponents({
      doc,
      cssSources: cssRes.sources,
      designSystem: ds,
    });
    allComponents.push(...components);

    // inline styles for property extraction
    for (const el of doc.elements) {
      if (Object.keys(el.inlineStyle).length) inlineStyleBags.push(el.inlineStyle);
    }
  }

  // Include unlinked CSS files in property analysis.
  for (const cssFile of ws.byKind("css")) {
    if (!linkedCss.has(cssFile.path)) {
      cssModels.push(analyzeCss(cssFile.path, cssFile.text ?? ""));
    }
  }

  const designProperties = extractDesignProperties(cssModels, inlineStyleBags);
  const findings = findViolations(designProperties, allComponents, ds);

  const unknownComponents = allComponents.filter(
    (c) => c.type === "unknown" || c.target.component === null,
  ).length;
  const potentialViolations = findings.filter((f) => f.severity !== "info").length;

  return {
    status: "completed",
    summary: {
      componentsDetected: allComponents.length,
      potentialViolations,
      unknownComponents,
      filesAnalyzed: htmlFiles.length,
    },
    components: allComponents,
    designProperties,
    findings,
    warnings,
    designSystemVersion: ds.version,
  };
}
