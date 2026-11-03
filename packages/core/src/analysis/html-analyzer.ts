import { parse } from "parse5";
import type { SourceRef } from "@shared/index";

/**
 * HTML analysis via parse5. Produces a flat list of ParsedElement nodes, each
 * with a stable SourceRef (file + selector + DOM index) so downstream stages
 * can point precisely back at the source.
 */

export interface ParsedElement {
  tag: string;
  attrs: Record<string, string>;
  classes: string[];
  id?: string;
  inlineStyle: Record<string, string>;
  text: string;
  /** Index into the flat pre-order list. */
  domIndex: number;
  /** domIndex of the parent element, or -1 for roots. */
  parentIndex: number;
  depth: number;
  source: SourceRef;
}

export interface ParsedDocument {
  file: string;
  elements: ParsedElement[];
  /** href values of <link rel="stylesheet">. */
  stylesheetHrefs: string[];
  /** Raw contents of any <style> blocks. */
  inlineStyleSheets: string[];
}

// Minimal structural typing over parse5 nodes to avoid version-coupled imports.
interface P5Attr {
  name: string;
  value: string;
}
interface P5Node {
  nodeName: string;
  tagName?: string;
  attrs?: P5Attr[];
  childNodes?: P5Node[];
  value?: string; // text nodes
}

function parseInlineStyle(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (prop) out[prop] = value;
  }
  return out;
}

function directText(node: P5Node): string {
  if (!node.childNodes) return "";
  return node.childNodes
    .filter((c) => c.nodeName === "#text")
    .map((c) => (c.value ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function buildSelector(
  tag: string,
  id: string | undefined,
  classes: string[],
  domIndex: number,
): string {
  if (id) return `#${id}`;
  if (classes.length) return `${tag}.${classes.join(".")}`;
  return `${tag}:nth-of-type-global(${domIndex})`;
}

export function analyzeHtml(file: string, html: string): ParsedDocument {
  const doc = parse(html) as unknown as P5Node;
  const elements: ParsedElement[] = [];
  const stylesheetHrefs: string[] = [];
  const inlineStyleSheets: string[] = [];
  let counter = 0;

  const walk = (node: P5Node, parentIndex: number, depth: number): void => {
    const children = node.childNodes ?? [];
    for (const child of children) {
      const tag = child.tagName;
      if (!tag) {
        // non-element (text/comment/doctype); do not descend as an element
        if (child.childNodes) walk(child, parentIndex, depth);
        continue;
      }

      const attrs: Record<string, string> = {};
      for (const a of child.attrs ?? []) attrs[a.name.toLowerCase()] = a.value;

      const classes = (attrs["class"] ?? "")
        .split(/\s+/)
        .map((c) => c.trim())
        .filter(Boolean);
      const id = attrs["id"] || undefined;
      const inlineStyle = attrs["style"] ? parseInlineStyle(attrs["style"]) : {};

      // Capture stylesheet references and <style> blocks.
      if (tag === "link" && (attrs["rel"] ?? "").toLowerCase() === "stylesheet" && attrs["href"]) {
        stylesheetHrefs.push(attrs["href"]);
      }
      if (tag === "style") {
        inlineStyleSheets.push(directText(child) || textOfStyle(child));
      }

      const domIndex = counter++;
      const source: SourceRef = {
        file,
        tag,
        classes,
        id,
        selector: buildSelector(tag, id, classes, domIndex),
        domIndex,
      };

      elements.push({
        tag,
        attrs,
        classes,
        id,
        inlineStyle,
        text: directText(child),
        domIndex,
        parentIndex,
        depth,
        source,
      });

      walk(child, domIndex, depth + 1);
    }
  };

  // <style> text lives in a raw text node; grab it reliably.
  function textOfStyle(node: P5Node): string {
    const t = (node.childNodes ?? []).find((c) => c.nodeName === "#text");
    return t?.value ?? "";
  }

  walk(doc, -1, 0);

  return { file, elements, stylesheetHrefs, inlineStyleSheets };
}

/** Children of an element (direct). */
export function childrenOf(doc: ParsedDocument, el: ParsedElement): ParsedElement[] {
  return doc.elements.filter((e) => e.parentIndex === el.domIndex);
}

/** The parent element, or null. */
export function parentOf(doc: ParsedDocument, el: ParsedElement): ParsedElement | null {
  if (el.parentIndex === -1) return null;
  return doc.elements.find((e) => e.domIndex === el.parentIndex) ?? null;
}
