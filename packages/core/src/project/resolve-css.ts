import type { ProjectWorkspace } from "./project-files";
import type { ParsedDocument } from "../analysis/html-analyzer";

/**
 * Resolve the CSS sources that apply to a given HTML document: the inline
 * <style> blocks plus any <link rel="stylesheet"> whose href points to a CSS
 * file inside the project. External (http) stylesheets are reported, not fetched.
 */

export interface ResolvedCssSource {
  file: string;
  css: string;
}

export interface CssResolution {
  sources: ResolvedCssSource[];
  /** hrefs we could not resolve to a project file. */
  missing: string[];
  external: string[];
}

function resolvePath(fromHtml: string, href: string): string {
  // strip query/hash
  const clean = href.split(/[?#]/)[0];
  const baseDir = fromHtml.includes("/") ? fromHtml.slice(0, fromHtml.lastIndexOf("/")) : "";
  const parts = (baseDir ? baseDir.split("/") : []).concat(clean.split("/"));
  const stack: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return stack.join("/");
}

export function resolveCssForDocument(
  ws: ProjectWorkspace,
  htmlFile: string,
  doc: ParsedDocument,
): CssResolution {
  const sources: ResolvedCssSource[] = [];
  const missing: string[] = [];
  const external: string[] = [];

  doc.inlineStyleSheets.forEach((css, i) => {
    if (css.trim()) sources.push({ file: `${htmlFile}#style[${i}]`, css });
  });

  for (const href of doc.stylesheetHrefs) {
    if (/^https?:\/\//i.test(href) || href.startsWith("//")) {
      external.push(href);
      continue;
    }
    const resolved = resolvePath(htmlFile, href);
    const file = ws.get(resolved);
    if (file && file.kind === "css" && file.text !== undefined) {
      sources.push({ file: resolved, css: file.text });
    } else {
      missing.push(href);
    }
  }

  return { sources, missing, external };
}
