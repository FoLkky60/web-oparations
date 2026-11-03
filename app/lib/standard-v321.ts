import { DESIGN_SYSTEM_VERSION_SEED } from "@core/index";
import type { DesignToken, DesignSystemVersion } from "@shared/index";

/**
 * Standard v3.2.1 — the corporate standard the platform applies to uploaded
 * websites (ADD-04 decision D-2).
 *
 * Source of the values: ADD-04 change request §6 "Design Tokens ที่อ่านได้จาก
 * mockup" (.aidlc/specs/ui-standardization-platform/change-request-ADD-04.md):
 *   - color.primary          #D71920  (Builder: Button fill / Dashboard tokens)
 *   - text on primary        #FFFFFF  (Builder: Text color) -> color.text-on-primary
 *   - font.body              Inter 14 (Dashboard: "Design tokens normalized")
 *                                      -> font.family "Inter, sans-serif", font.size.body 14px
 *   - space.4                16px     (Dashboard) -> spacing.medium 16px
 *   - button radius          8px      (Builder: Selected Standard) -> radius.medium 8px
 *
 * Every other token, all components and all mapping rules are inherited
 * unchanged from the engine's v1 seed (DESIGN_SYSTEM_V1 / 1.0.0), because the
 * mockup does not specify them (no guessing). DESIGN_SYSTEM_V1 itself is NOT
 * modified — engine tests rely on its #73493A primary.
 *
 * This is the ONLY place the v3.2.1 values live.
 */
export const STANDARD_V321_VERSION = "3.2.1";

/** Overrides (by token name) applied on top of the v1 token set. */
const V321_OVERRIDES: Record<string, string> = {
  "color.primary": "#D71920",
  "font.family": "Inter, sans-serif",
  "font.size.body": "14px",
  "spacing.medium": "16px",
  "radius.medium": "8px",
};

/** Tokens that v1 does not have; appended after the v1 tokens of the same category. */
const V321_ADDITIONS: DesignToken[] = [
  {
    name: "color.text-on-primary",
    category: "color",
    value: "#FFFFFF",
    cssVariable: "--color-text-on-primary",
    description: "Text color on primary fill",
  },
];

function buildTokens(): DesignToken[] {
  const base = DESIGN_SYSTEM_VERSION_SEED.tokens.map((t) =>
    V321_OVERRIDES[t.name] !== undefined ? { ...t, value: V321_OVERRIDES[t.name] } : { ...t },
  );
  // Insert additions right after the last token of their category so that
  // exact-match lookups keep preferring the existing v1 tokens first.
  const out = [...base];
  for (const add of V321_ADDITIONS) {
    let idx = -1;
    out.forEach((t, i) => {
      if (t.category === add.category) idx = i;
    });
    out.splice(idx + 1, 0, add);
  }
  return out;
}

/** Build the immutable v3.2.1 version record (active when created). */
export function buildStandardV321(createdAt: string = new Date().toISOString()): DesignSystemVersion {
  return {
    version: STANDARD_V321_VERSION,
    tokens: buildTokens(),
    components: DESIGN_SYSTEM_VERSION_SEED.components.map((c) => ({ ...c })),
    mappingRules: DESIGN_SYSTEM_VERSION_SEED.mappingRules.map((r) => ({ ...r })),
    active: true,
    immutable: true,
    createdBy: "system",
    createdAt,
  };
}
