import type { ValidationResult, ValidationIssue } from "@shared/index";
import { ProjectWorkspace } from "../project/project-files";

/**
 * Validate an extracted workspace before analysis: it must contain at least one
 * HTML file (an entry point), and we surface warnings for unsupported content.
 */
export function validateProject(
  ws: ProjectWorkspace,
  priorIssues: ValidationIssue[] = [],
): ValidationResult {
  const issues: ValidationIssue[] = [...priorIssues];

  const htmls = ws.byKind("html");
  const entryPoint = ws.entryPoint();

  if (htmls.length === 0) {
    issues.push({ level: "error", code: "NO_HTML", message: "Project contains no HTML files; nothing to analyze." });
  } else if (!htmls.some((f) => f.path.toLowerCase().endsWith("index.html"))) {
    issues.push({ level: "warning", code: "NO_INDEX", message: `No index.html found; using "${entryPoint}" as entry point.` });
  }

  if (ws.byKind("css").length === 0) {
    issues.push({ level: "warning", code: "NO_CSS", message: "No CSS files found; style analysis will be limited to inline styles." });
  }

  const jsFiles = ws.byKind("js");
  if (jsFiles.length > 0) {
    issues.push({ level: "warning", code: "JS_PRESENT", message: `${jsFiles.length} JavaScript file(s) present. JavaScript is not executed and its behavior is not guaranteed to be preserved.` });
  }

  const hasError = issues.some((i) => i.level === "error");

  return {
    valid: !hasError,
    entryPoint,
    files: ws.entries(),
    issues,
  };
}
