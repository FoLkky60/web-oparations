import postcss from "postcss";
import type { Declaration, Rule } from "postcss";
import type {
  DesignSystem,
  TransformationChange,
  TransformationCategory,
} from "@shared/index";
import { parseColor, sameColor, nearestColor } from "../design-system/color";
import { tokensByCategory } from "../design-system/design-system";

/**
 * Structural CSS normalization via the PostCSS AST. We walk declarations and
 * replace recognized raw values with Design Token custom properties. We never
 * do blind string replacement, so unrelated occurrences of the same literal are
 * not swept up. Conservative guards:
 *   - Only colors that EXACTLY match a token, or sit within a tight distance of
 *     a token, are rewritten. Off-palette colors (e.g. error red) are left alone.
 *   - !important declarations are rewritten in place but flagged.
 *   - Existing var(--...) usages are left untouched.
 */

export interface NormalizeOptions {
  categories: TransformationCategory[];
  ds: DesignSystem;
  file: string;
}

export interface NormalizeResult {
  css: string;
  changes: TransformationChange[];
}

const COLOR_PROPS = new Set(["color", "background-color", "border-color", "outline-color", "fill", "stroke"]);
const COLOR_SHORTHAND = new Set(["background", "border", "outline"]);
const RADIUS_PROPS = new Set(["border-radius", "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius"]);
const SPACING_PROPS = new Set(["padding", "margin", "gap", "padding-top", "padding-right", "padding-bottom", "padding-left", "margin-top", "margin-right", "margin-bottom", "margin-left"]);

export function normalizeCss(css: string, opts: NormalizeOptions): NormalizeResult {
  const { categories, ds, file } = opts;
  const changes: TransformationChange[] = [];
  const root = postcss.parse(css, { from: file });

  const colorTokens = tokensByCategory("color", ds).map((t) => ({ name: t.name, value: t.value, cssVar: t.cssVariable }));
  const radiusTokens = tokensByCategory("radius", ds).map((t) => ({ name: t.name, value: t.value, cssVar: t.cssVariable }));
  const spacingTokens = tokensByCategory("spacing", ds).map((t) => ({ name: t.name, value: t.value, cssVar: t.cssVariable }));
  const fontFamily = tokensByCategory("typography", ds).find((t) => t.name === "font.family");

  const doColors = categories.includes("colors");
  const doRadius = categories.includes("radius");
  const doSpacing = categories.includes("spacing");
  const doTypography = categories.includes("typography");

  root.walkRules((rule: Rule) => {
    const selector = rule.selector;
    rule.walkDecls((decl: Declaration) => {
      const prop = decl.prop.toLowerCase();
      if (prop.startsWith("--")) return; // don't rewrite token definitions
      const original = decl.value;

      // --- Colors ---
      if (doColors && (COLOR_PROPS.has(prop) || COLOR_SHORTHAND.has(prop))) {
        const rewritten = rewriteColorValue(original, colorTokens);
        if (rewritten.changed) {
          decl.value = rewritten.value;
          for (const detail of rewritten.details) {
            changes.push({
              file,
              selector,
              property: prop,
              before: detail.before,
              after: detail.after,
              rule: "map-color-token",
              reason: detail.reason,
              category: "colors",
              automatic: !decl.important,
              status: decl.important ? "needs-review" : "applied",
            });
          }
        }
      }

      // --- Radius ---
      if (doRadius && RADIUS_PROPS.has(prop)) {
        const token = radiusTokens.find((t) => t.value === original.trim());
        if (token && !original.includes("var(")) {
          const after = `var(${token.cssVar})`;
          decl.value = after;
          changes.push(change(file, selector, prop, original, after, "normalize-border-radius", `Exact match to ${token.name}.`, "radius", decl.important));
        }
      }

      // --- Spacing ---
      if (doSpacing && SPACING_PROPS.has(prop)) {
        const rewritten = rewriteLengthList(original, spacingTokens);
        if (rewritten.changed) {
          decl.value = rewritten.value;
          changes.push(change(file, selector, prop, original, rewritten.value, "normalize-spacing", "One or more values matched spacing tokens exactly.", "spacing", decl.important));
        }
      }

      // --- Typography ---
      if (doTypography && fontFamily && (prop === "font-family")) {
        if (normalizeFamily(original) !== normalizeFamily(fontFamily.value) && !original.includes("var(")) {
          const after = `var(${fontFamily.cssVariable})`;
          decl.value = after;
          changes.push(change(file, selector, prop, original, after, "apply-typography-token", `Standardized to ${fontFamily.name}.`, "typography", decl.important));
        }
      }
    });
  });

  return { css: root.toString(), changes };
}

function change(
  file: string,
  selector: string,
  property: string,
  before: string,
  after: string,
  rule: string,
  reason: string,
  category: TransformationCategory,
  important: boolean,
): TransformationChange {
  return {
    file,
    selector,
    property,
    before,
    after,
    rule,
    reason: important ? `${reason} (declaration uses !important; review).` : reason,
    category,
    automatic: !important,
    status: important ? "needs-review" : "applied",
  };
}

interface ColorRewrite {
  changed: boolean;
  value: string;
  details: { before: string; after: string; reason: string }[];
}

/**
 * Replace individual color literals inside a value. Only exact or near matches
 * to a token are rewritten; everything else is preserved. This prevents an
 * error-red or warning-amber from being forced into the primary token.
 */
function rewriteColorValue(
  value: string,
  tokens: { name: string; value: string; cssVar: string }[],
): ColorRewrite {
  const details: ColorRewrite["details"] = [];
  const re = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
  let changed = false;

  const newValue = value.replace(re, (literal) => {
    if (!parseColor(literal)) return literal;
    const exact = tokens.find((t) => sameColor(t.value, literal));
    if (exact) {
      changed = true;
      details.push({ before: literal, after: `var(${exact.cssVar})`, reason: `Exact match to ${exact.name}.` });
      return `var(${exact.cssVar})`;
    }
    const near = nearestColor(literal, tokens.map((t) => ({ name: t.name, value: t.value })), 16);
    if (near) {
      const token = tokens.find((t) => t.name === near.name)!;
      changed = true;
      details.push({ before: literal, after: `var(${token.cssVar})`, reason: `Within tight distance (${near.distance.toFixed(1)}) of ${token.name}; treated as same intent.` });
      return `var(${token.cssVar})`;
    }
    return literal; // off-palette: preserved
  });

  return { changed, value: newValue, details };
}

interface LengthRewrite {
  changed: boolean;
  value: string;
}

function rewriteLengthList(
  value: string,
  tokens: { name: string; value: string; cssVar: string }[],
): LengthRewrite {
  if (value.includes("var(")) return { changed: false, value };
  const parts = value.trim().split(/\s+/);
  let changed = false;
  const mapped = parts.map((p) => {
    const token = tokens.find((t) => t.value === p);
    if (token) {
      changed = true;
      return `var(${token.cssVar})`;
    }
    return p;
  });
  return { changed, value: mapped.join(" ") };
}

function normalizeFamily(f: string): string {
  return f.replace(/["']/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}
