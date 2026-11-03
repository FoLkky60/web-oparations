import type {
  DetectedDesignProperties,
  Finding,
  DesignSystem,
  DetectedComponent,
} from "@shared/index";
import type { CssModel } from "./css-analyzer";
import { isColorValue, nearestColor, sameColor } from "../design-system/color";
import { tokensByCategory } from "../design-system/design-system";

/**
 * Extract the design properties actually used across the stylesheets and
 * inline styles, then compare them against the Design System tokens to produce
 * findings. We are conservative: a differing value is only a "warning" when it
 * is close to an approved token (clear intent) OR clearly off-palette; values
 * we cannot classify are reported as "info" (unclassified), not errors.
 */

const COLOR_PROPS = new Set(["color", "background", "background-color", "border", "border-color", "box-shadow", "outline"]);
const RADIUS_PROPS = new Set(["border-radius"]);
const SPACING_PROPS = new Set(["padding", "margin", "gap", "padding-top", "padding-right", "padding-bottom", "padding-left", "margin-top", "margin-right", "margin-bottom", "margin-left"]);
const FONT_FAMILY_PROPS = new Set(["font-family", "font"]);
const FONT_SIZE_PROPS = new Set(["font-size"]);
const SHADOW_PROPS = new Set(["box-shadow"]);

function extractColorsFromValue(value: string): string[] {
  const out: string[] = [];
  const re = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) out.push(m[0]);
  return out;
}

function extractLengths(value: string): string[] {
  const out: string[] = [];
  const re = /\b\d*\.?\d+(px|rem|em|%)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) out.push(m[0]);
  return out;
}

export function extractDesignProperties(models: CssModel[], inlineStyles: Record<string, string>[]): DetectedDesignProperties {
  const colors = new Set<string>();
  const fontFamilies = new Set<string>();
  const fontSizes = new Set<string>();
  const spacing = new Set<string>();
  const borderRadii = new Set<string>();
  const shadows = new Set<string>();

  const consume = (prop: string, value: string): void => {
    const p = prop.toLowerCase();
    if (COLOR_PROPS.has(p)) extractColorsFromValue(value).forEach((c) => colors.add(c));
    if (FONT_FAMILY_PROPS.has(p)) fontFamilies.add(value.trim());
    if (FONT_SIZE_PROPS.has(p)) extractLengths(value).forEach((l) => fontSizes.add(l));
    if (SPACING_PROPS.has(p)) extractLengths(value).forEach((l) => spacing.add(l));
    if (RADIUS_PROPS.has(p)) extractLengths(value).forEach((l) => borderRadii.add(l));
    if (SHADOW_PROPS.has(p)) shadows.add(value.trim());
  };

  for (const model of models) {
    for (const rule of model.rules) {
      for (const decl of rule.declarations) consume(decl.prop, decl.value);
    }
  }
  for (const inline of inlineStyles) {
    for (const [prop, value] of Object.entries(inline)) consume(prop, value);
  }

  return {
    colors: [...colors],
    fontFamilies: [...fontFamilies],
    fontSizes: [...fontSizes],
    spacing: [...spacing],
    borderRadii: [...borderRadii],
    shadows: [...shadows],
  };
}

export function findViolations(
  props: DetectedDesignProperties,
  components: DetectedComponent[],
  ds: DesignSystem,
): Finding[] {
  const findings: Finding[] = [];

  const colorTokens = tokensByCategory("color", ds).map((t) => ({ name: t.name, value: t.value }));
  const radiusTokens = tokensByCategory("radius", ds).map((t) => ({ name: t.name, value: t.value }));
  const spacingTokens = tokensByCategory("spacing", ds).map((t) => ({ name: t.name, value: t.value }));
  const fontTokens = tokensByCategory("typography", ds);
  const approvedFamily = fontTokens.find((t) => t.name === "font.family")?.value ?? null;

  // Colors
  for (const color of props.colors) {
    if (!isColorValue(color)) continue;
    const exact = colorTokens.find((t) => sameColor(t.value, color));
    if (exact) continue; // already a token value
    const near = nearestColor(color, colorTokens, 24);
    if (near) {
      findings.push({
        category: "color",
        sourceValue: color,
        suggestedToken: near.name,
        severity: "warning",
        note: `Close to approved ${near.name} (${near.value}); likely the same intent.`,
      });
    } else {
      findings.push({
        category: "color",
        sourceValue: color,
        suggestedToken: null,
        severity: "info",
        note: "Off-palette color with no close token. Unclassified: may be an intentional exception (e.g. error/warning). Not auto-transformed.",
      });
    }
  }

  // Border radius
  for (const r of props.borderRadii) {
    const match = radiusTokens.find((t) => t.value === r);
    if (match) continue;
    const near = nearestLength(r, radiusTokens);
    findings.push({
      category: "radius",
      sourceValue: r,
      suggestedToken: near?.name ?? null,
      severity: near ? "warning" : "info",
      note: near ? `Close to ${near.name} (${near.value}).` : "No close radius token; unclassified.",
    });
  }

  // Spacing
  for (const s of props.spacing) {
    const match = spacingTokens.find((t) => t.value === s);
    if (match) continue;
    const near = nearestLength(s, spacingTokens);
    findings.push({
      category: "spacing",
      sourceValue: s,
      suggestedToken: near?.name ?? null,
      severity: near ? "warning" : "info",
      note: near ? `Close to ${near.name} (${near.value}).` : "No close spacing token; unclassified.",
    });
  }

  // Typography (font family)
  if (approvedFamily) {
    for (const fam of props.fontFamilies) {
      if (normalizeFamily(fam) === normalizeFamily(approvedFamily)) continue;
      findings.push({
        category: "typography",
        sourceValue: fam,
        suggestedToken: "font.family",
        severity: "warning",
        note: `Non-standard font family; approved family is ${approvedFamily}.`,
      });
    }
  }

  // Unknown components
  for (const c of components) {
    if (c.type === "unknown" || c.target.component === null) {
      findings.push({
        category: "component",
        sourceValue: `${c.source.tag}${c.source.classes.length ? "." + c.source.classes.join(".") : ""}`,
        suggestedToken: null,
        severity: "info",
        note: "Unknown or unmapped component; requires manual review.",
        source: c.source,
      });
    }
  }

  return findings;
}

function normalizeFamily(f: string): string {
  return f.replace(/["']/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function toPx(value: string): number | null {
  const m = value.match(/^(\d*\.?\d+)px$/);
  return m ? Number(m[1]) : null;
}

function nearestLength(
  value: string,
  tokens: { name: string; value: string }[],
  threshold = 4,
): { name: string; value: string } | null {
  const px = toPx(value);
  if (px === null) return null;
  let best: { name: string; value: string; d: number } | null = null;
  for (const t of tokens) {
    const tpx = toPx(t.value);
    if (tpx === null) continue;
    const d = Math.abs(tpx - px);
    if (!best || d < best.d) best = { name: t.name, value: t.value, d };
  }
  if (best && best.d <= threshold) return { name: best.name, value: best.value };
  return null;
}
