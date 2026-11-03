import type {
  ComponentType,
  DetectedComponent,
  ClassificationMethod,
  ResolvedProperties,
  DesignSystem,
} from "@shared/index";
import type { ParsedDocument, ParsedElement } from "./html-analyzer";
import { childrenOf } from "./html-analyzer";
import { analyzeCss, resolveForElement } from "./css-analyzer";
import type { CssRule } from "./css-analyzer";

/**
 * Rule-based, multi-signal component detection.
 *
 * Core principle: CSS class names are NOT the primary signal. We rank signals
 * as semantic HTML > attributes/roles > structure > styling heuristics. A styled
 * <div> is only ever a *candidate*, never auto-promoted to an interactive type.
 */

const STYLE_PROPS = [
  "background",
  "background-color",
  "color",
  "border",
  "border-radius",
  "padding",
  "margin",
  "font-family",
  "font-size",
  "font-weight",
  "box-shadow",
  "width",
  "height",
  "display",
];

function collectProperties(
  el: ParsedElement,
  rules: CssRule[],
): { properties: ResolvedProperties; unresolved: string[] } {
  const res = resolveForElement(el, rules);
  const properties: ResolvedProperties = {};

  // Inline styles have the highest practical precedence; include them.
  for (const [k, v] of Object.entries(el.inlineStyle)) properties[k] = v;

  for (const prop of STYLE_PROPS) {
    if (properties[prop]) continue;
    const r = res.resolved[prop];
    if (r) properties[prop] = r.value;
  }
  return { properties, unresolved: res.unresolved };
}

interface Classification {
  type: ComponentType;
  method: ClassificationMethod;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

const INPUT_TEXT_TYPES = new Set([
  "text",
  "email",
  "password",
  "search",
  "tel",
  "url",
  "number",
  "",
]);

/** Decide a component type from semantics + attributes + structure. */
function classify(el: ParsedElement, doc: ParsedDocument): Classification | null {
  const tag = el.tag;
  const role = (el.attrs["role"] ?? "").toLowerCase();
  const type = (el.attrs["type"] ?? "").toLowerCase();

  // --- Strong semantic signals -------------------------------------------
  if (tag === "button") {
    return sem("button", ["<button> element"]);
  }
  if (tag === "a" && el.attrs["href"] !== undefined) {
    // Links styled as buttons are still links semantically.
    if (role === "button") {
      return {
        type: "button",
        method: "attribute",
        confidence: 0.8,
        reasons: ['<a> with role="button"'],
        warnings: ["Anchor acting as button; verify keyboard/activation behavior."],
      };
    }
    return sem("link", ['<a href> element']);
  }
  if (tag === "input") {
    if (type === "checkbox") return sem("checkbox", ['<input type="checkbox">']);
    if (type === "radio") return sem("radio", ['<input type="radio">']);
    if (type === "submit" || type === "button") return sem("button", [`<input type="${type}">`]);
    if (INPUT_TEXT_TYPES.has(type)) return sem("text-input", [`<input type="${type || "text"}">`]);
    return { type: "text-input", method: "semantic-html", confidence: 0.7, reasons: [`<input type="${type}">`], warnings: [`Input type "${type}" mapped conservatively to text-input.`] };
  }
  if (tag === "textarea") return sem("text-input", ["<textarea> element"]);
  if (tag === "select") return sem("select", ["<select> element"]);
  if (tag === "form") return sem("form", ["<form> element"]);
  if (tag === "table") return sem("table", ["<table> element"]);
  if (tag === "nav") return sem("navigation", ["<nav> element"]);
  if (/^h[1-6]$/.test(tag)) return sem("heading", [`<${tag}> heading element`]);

  // --- Role-based signals -------------------------------------------------
  if (role === "button") {
    return {
      type: "button",
      method: "attribute",
      confidence: 0.75,
      reasons: [`role="button" on <${tag}>`],
      warnings: ["Non-button element with button role; verify activation/keyboard behavior."],
    };
  }
  if (role === "navigation") return attr("navigation", `role="navigation" on <${tag}>`);
  if (role === "alert" || role === "alertdialog") return attr("alert", `role="${role}" on <${tag}>`);
  if (role === "tab" || role === "tablist") return attr("navigation", `role="${role}"`);

  // --- Structural signals -------------------------------------------------
  const kids = childrenOf(doc, el);

  // Navigation: <ul>/<div> wrapping multiple links.
  const linkKids = kids.filter((k) => k.tag === "a" && k.attrs["href"] !== undefined);
  if ((tag === "ul" || tag === "div" || tag === "header") && linkKids.length >= 3) {
    return {
      type: "navigation",
      method: "structure",
      confidence: 0.6,
      reasons: [`${linkKids.length} descendant links suggest a navigation container`],
      warnings: ["Navigation inferred from structure; confirm intent."],
    };
  }

  // Card: a container div with a heading and some body content.
  if (tag === "div" || tag === "article" || tag === "section") {
    const hasHeading = kids.some((k) => /^h[1-6]$/.test(k.tag));
    const hasBody = kids.some((k) => k.tag === "p" || k.text.length > 0);
    if (hasHeading && hasBody) {
      return {
        type: "card",
        method: "structure",
        confidence: tag === "article" ? 0.65 : 0.55,
        reasons: ["Container with heading and body content resembles a card"],
        warnings: ["Card inferred from structure; confirm intent."],
      };
    }
  }

  // Alert-like: div whose class/text strongly implies alert and NOT interactive.
  const classBlob = el.classes.join(" ").toLowerCase();
  if ((tag === "div" || tag === "p") && /\b(alert|notice|banner|toast|message|error|warning|success)\b/.test(classBlob)) {
    return {
      type: "alert",
      method: "heuristic",
      confidence: 0.5,
      reasons: [`Class hint "${classBlob}" suggests an alert`],
      warnings: ["Alert inferred from class hint; this is a weak signal."],
    };
  }

  // Button candidate: a div/span that *looks* clickable. Candidate only.
  if (tag === "div" || tag === "span") {
    const looksClickable =
      el.attrs["onclick"] !== undefined ||
      el.attrs["tabindex"] !== undefined ||
      role === "button";
    const shortText = el.text.length > 0 && el.text.length <= 24 && kids.length === 0;
    if (looksClickable && shortText) {
      return {
        type: "button",
        method: "heuristic",
        confidence: 0.45,
        reasons: [
          "Non-semantic element with click/tab affordance and short label",
        ],
        warnings: [
          "Button CANDIDATE only; not a real <button>. Requires human review before any structural change.",
        ],
      };
    }
    if (shortText && /\b(btn|button|action|submit|cta)\b/.test(classBlob)) {
      return {
        type: "button",
        method: "heuristic",
        confidence: 0.35,
        reasons: [`Class hint "${classBlob}" and short label suggest a button`],
        warnings: [
          "Button CANDIDATE from class hint only (weak); no interaction evidence.",
        ],
      };
    }
  }

  return null;

  function sem(type: ComponentType, reasons: string[]): Classification {
    return { type, method: "semantic-html", confidence: 1, reasons, warnings: [] };
  }
  function attr(type: ComponentType, reason: string): Classification {
    return { type, method: "attribute", confidence: 0.7, reasons: [reason], warnings: [] };
  }
}

function suggestTarget(type: ComponentType, ds: DesignSystem): string | null {
  const match = ds.components.find((c) => c.componentType === type);
  return match ? match.name : null;
}

export interface DetectionInput {
  doc: ParsedDocument;
  /** CSS text keyed by logical file name. Inline <style> blocks included. */
  cssSources: { file: string; css: string }[];
  designSystem: DesignSystem;
}

export function detectComponents(input: DetectionInput): DetectedComponent[] {
  const { doc, cssSources, designSystem } = input;

  // Build one ordered rule set across all stylesheets (source order preserved).
  let order = 0;
  const rules: CssRule[] = [];
  for (const src of cssSources) {
    const model = analyzeCss(src.file, src.css, order);
    rules.push(...model.rules);
    order += model.rules.length;
  }

  const detected: DetectedComponent[] = [];
  for (const el of doc.elements) {
    const c = classify(el, doc);
    if (!c) continue;

    const { properties, unresolved } = collectProperties(el, rules);
    const target = suggestTarget(c.type, designSystem);

    detected.push({
      type: c.type,
      source: el.source,
      properties,
      unresolvedProperties: unresolved,
      classification: {
        method: c.method,
        confidence: c.confidence,
        reasons: c.reasons,
      },
      warnings: c.warnings,
      target: target ? { component: target, status: "suggested" } : { component: null, status: "none" },
    });
  }

  return detected;
}
