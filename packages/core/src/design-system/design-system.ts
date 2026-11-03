import type {
  DesignSystem,
  DesignToken,
  DesignSystemComponent,
  DesignSystemVersion,
  MappingRule,
} from "@shared/index";
import { DEFAULT_MAPPING_RULES } from "../transformation/component-mapping";

/**
 * Central Design System v1 — the single source of truth for corporate UI
 * standards. Values are configurable defaults that an administrator can change
 * later; the versioning structure lets every transformation record exactly
 * which Design System version was applied.
 */

const COLOR_TOKENS: DesignToken[] = [
  { name: "color.primary", category: "color", value: "#73493A", cssVariable: "--color-primary", description: "Primary brand color" },
  { name: "color.secondary", category: "color", value: "#D9B99B", cssVariable: "--color-secondary", description: "Secondary brand color" },
  { name: "color.background", category: "color", value: "#FFFFFF", cssVariable: "--color-background", description: "Page background" },
  { name: "color.text", category: "color", value: "#222222", cssVariable: "--color-text", description: "Body text" },
  { name: "color.border", category: "color", value: "#D9D9D9", cssVariable: "--color-border", description: "Default border" },
];

const TYPOGRAPHY_TOKENS: DesignToken[] = [
  { name: "font.family", category: "typography", value: "Inter, sans-serif", cssVariable: "--font-family", description: "Base font family" },
  { name: "font.size.body", category: "typography", value: "16px", cssVariable: "--font-size-body", description: "Body font size" },
  { name: "font.weight.heading", category: "typography", value: "600", cssVariable: "--font-weight-heading", description: "Heading weight" },
  { name: "font.weight.body", category: "typography", value: "400", cssVariable: "--font-weight-body", description: "Body weight" },
];

const SPACING_TOKENS: DesignToken[] = [
  { name: "spacing.small", category: "spacing", value: "8px", cssVariable: "--spacing-small" },
  { name: "spacing.medium", category: "spacing", value: "16px", cssVariable: "--spacing-medium" },
  { name: "spacing.large", category: "spacing", value: "24px", cssVariable: "--spacing-large" },
];

const RADIUS_TOKENS: DesignToken[] = [
  { name: "radius.small", category: "radius", value: "4px", cssVariable: "--radius-small" },
  { name: "radius.medium", category: "radius", value: "8px", cssVariable: "--radius-medium" },
  { name: "radius.large", category: "radius", value: "16px", cssVariable: "--radius-large" },
];

const SHADOW_TOKENS: DesignToken[] = [
  { name: "shadow.small", category: "shadow", value: "0 1px 2px rgba(0,0,0,0.08)", cssVariable: "--shadow-small" },
  { name: "shadow.medium", category: "shadow", value: "0 4px 8px rgba(0,0,0,0.12)", cssVariable: "--shadow-medium" },
];

const COMPONENTS: DesignSystemComponent[] = [
  { name: "PrimaryButton", componentType: "button", standardClass: "ds-button ds-button--primary", variants: ["primary", "secondary"], description: "Standardized button" },
  { name: "TextInput", componentType: "text-input", standardClass: "ds-input", description: "Standardized text input" },
  { name: "Select", componentType: "select", standardClass: "ds-select", description: "Standardized select" },
  { name: "Checkbox", componentType: "checkbox", standardClass: "ds-checkbox", description: "Standardized checkbox" },
  { name: "Radio", componentType: "radio", standardClass: "ds-radio", description: "Standardized radio" },
  { name: "Card", componentType: "card", standardClass: "ds-card", description: "Standardized card" },
  { name: "Table", componentType: "table", standardClass: "ds-table", description: "Standardized table" },
  { name: "Navigation", componentType: "navigation", standardClass: "ds-nav", description: "Standardized navigation" },
  { name: "Form", componentType: "form", standardClass: "ds-form", description: "Standardized form" },
  { name: "Heading", componentType: "heading", standardClass: "ds-heading", description: "Standardized heading" },
  { name: "Alert", componentType: "alert", standardClass: "ds-alert", description: "Standardized alert" },
  { name: "Link", componentType: "link", standardClass: "ds-link", description: "Standardized link" },
];

export const DESIGN_SYSTEM_V1: DesignSystem = {
  version: "1.0.0",
  tokens: [
    ...COLOR_TOKENS,
    ...TYPOGRAPHY_TOKENS,
    ...SPACING_TOKENS,
    ...RADIUS_TOKENS,
    ...SHADOW_TOKENS,
  ],
  components: COMPONENTS,
};

const REGISTRY: Record<string, DesignSystem> = {
  [DESIGN_SYSTEM_V1.version]: DESIGN_SYSTEM_V1,
};

export function getDesignSystem(version?: string): DesignSystem {
  if (!version) return DESIGN_SYSTEM_V1;
  const ds = REGISTRY[version];
  if (!ds) throw new Error(`Unknown design system version: ${version}`);
  return ds;
}

export function listDesignSystemVersions(): string[] {
  return Object.keys(REGISTRY);
}

/** Render the token set as a `:root { ... }` CSS custom property block. */
export function renderTokensCss(ds: DesignSystem = DESIGN_SYSTEM_V1): string {
  const lines = ds.tokens.map((t) => `  ${t.cssVariable}: ${t.value};`);
  return `:root {\n${lines.join("\n")}\n}\n`;
}

/** Tokens filtered by category, useful for the normalizer. */
export function tokensByCategory(
  category: DesignToken["category"],
  ds: DesignSystem = DESIGN_SYSTEM_V1,
): DesignToken[] {
  return ds.tokens.filter((t) => t.category === category);
}

// ---------------------------------------------------------------------------
// Design System versioning (D3-7)
// ---------------------------------------------------------------------------

/**
 * Convert the engine's internal ComponentMappingRule[] (DEFAULT_MAPPING_RULES)
 * into the shared MappingRule[] contract used by DesignSystemVersion. These are
 * the same rules, re-expressed with the shared field names.
 */
export function defaultMappingRules(): MappingRule[] {
  return DEFAULT_MAPPING_RULES.map((r) => ({
    sourceComponentType: r.sourceType,
    targetComponent: r.targetComponent,
    autoApplyThreshold: r.autoApplyThreshold,
    enabled: r.enabled,
  }));
}

/**
 * Seed DesignSystemVersion built from DESIGN_SYSTEM_V1 plus the default mapping
 * rules. This is the richer, versioned representation an admin manages; the
 * engine still consumes the plain `DesignSystem` view (see
 * {@link designSystemFromVersion}) so analyzer/normalizer/transformer logic is
 * untouched. Marked immutable + active: it is the first active version on a
 * fresh install.
 */
export const DESIGN_SYSTEM_VERSION_SEED: DesignSystemVersion = {
  version: DESIGN_SYSTEM_V1.version,
  tokens: DESIGN_SYSTEM_V1.tokens,
  components: DESIGN_SYSTEM_V1.components,
  mappingRules: defaultMappingRules(),
  active: true,
  immutable: true,
  createdBy: "system",
  createdAt: "1970-01-01T00:00:00.000Z",
};

/**
 * Build the plain `DesignSystem` view (version/tokens/components) that the
 * engine's analyzer/normalizer/transformer already consume, from the richer
 * versioned record. Mapping rules live on the version, not on DesignSystem, so
 * existing engine APIs keep the exact same shape.
 */
export function designSystemFromVersion(v: DesignSystemVersion): DesignSystem {
  return {
    version: v.version,
    tokens: v.tokens,
    components: v.components,
  };
}
