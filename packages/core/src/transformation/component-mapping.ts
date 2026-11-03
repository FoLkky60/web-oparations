import type {
  DesignSystem,
  DetectedComponent,
  ComponentType,
} from "@shared/index";

/**
 * Deterministic component mapping. Strictly separates four concerns:
 *   1. source component detection (already done upstream)
 *   2. target component selection
 *   3. transformation eligibility
 *   4. actual code modification (done by the HTML/CSS transformers)
 *
 * Mappings are configurable rules, not hard-coded class names. No AI here.
 */

export interface ComponentMappingRule {
  sourceType: ComponentType;
  targetComponent: string;
  /** Minimum confidence required to apply automatically. */
  autoApplyThreshold: number;
  enabled: boolean;
}

export const DEFAULT_MAPPING_RULES: ComponentMappingRule[] = [
  { sourceType: "button", targetComponent: "PrimaryButton", autoApplyThreshold: 0.8, enabled: true },
  { sourceType: "link", targetComponent: "Link", autoApplyThreshold: 0.9, enabled: true },
  { sourceType: "text-input", targetComponent: "TextInput", autoApplyThreshold: 0.7, enabled: true },
  { sourceType: "select", targetComponent: "Select", autoApplyThreshold: 0.9, enabled: true },
  { sourceType: "checkbox", targetComponent: "Checkbox", autoApplyThreshold: 0.9, enabled: true },
  { sourceType: "radio", targetComponent: "Radio", autoApplyThreshold: 0.9, enabled: true },
  { sourceType: "card", targetComponent: "Card", autoApplyThreshold: 0.75, enabled: true },
  { sourceType: "table", targetComponent: "Table", autoApplyThreshold: 0.9, enabled: true },
  { sourceType: "navigation", targetComponent: "Navigation", autoApplyThreshold: 0.75, enabled: true },
  { sourceType: "form", targetComponent: "Form", autoApplyThreshold: 0.9, enabled: true },
  { sourceType: "heading", targetComponent: "Heading", autoApplyThreshold: 0.9, enabled: true },
  { sourceType: "alert", targetComponent: "Alert", autoApplyThreshold: 0.7, enabled: true },
];

export type MappingEligibility = "auto" | "needs-review" | "ineligible";

export interface ComponentMappingDecision {
  component: DetectedComponent;
  targetComponent: string | null;
  standardClass: string | null;
  eligibility: MappingEligibility;
  reason: string;
}

export function decideMapping(
  component: DetectedComponent,
  ds: DesignSystem,
  rules: ComponentMappingRule[] = DEFAULT_MAPPING_RULES,
): ComponentMappingDecision {
  const rule = rules.find((r) => r.sourceType === component.type && r.enabled);
  if (!rule) {
    return {
      component,
      targetComponent: null,
      standardClass: null,
      eligibility: "ineligible",
      reason: `No enabled mapping rule for component type "${component.type}".`,
    };
  }

  const dsComponent = ds.components.find((c) => c.name === rule.targetComponent);
  if (!dsComponent) {
    return {
      component,
      targetComponent: null,
      standardClass: null,
      eligibility: "ineligible",
      reason: `Target component "${rule.targetComponent}" not present in Design System ${ds.version}.`,
    };
  }

  // Structural changes to non-semantic elements (e.g. a div button candidate)
  // are never auto-applied: tag/behavior risk. They go to review.
  const isSemantic = component.classification.method === "semantic-html" || component.classification.method === "attribute";
  const meetsThreshold = component.classification.confidence >= rule.autoApplyThreshold;

  if (meetsThreshold && isSemantic) {
    return {
      component,
      targetComponent: dsComponent.name,
      standardClass: dsComponent.standardClass,
      eligibility: "auto",
      reason: `Confidence ${component.classification.confidence} >= ${rule.autoApplyThreshold} via ${component.classification.method}.`,
    };
  }

  return {
    component,
    targetComponent: dsComponent.name,
    standardClass: dsComponent.standardClass,
    eligibility: "needs-review",
    reason: isSemantic
      ? `Confidence ${component.classification.confidence} below threshold ${rule.autoApplyThreshold}.`
      : `Non-semantic detection (${component.classification.method}); structural mapping requires human review.`,
  };
}

export function decideMappings(
  components: DetectedComponent[],
  ds: DesignSystem,
  rules: ComponentMappingRule[] = DEFAULT_MAPPING_RULES,
): ComponentMappingDecision[] {
  return components.map((c) => decideMapping(c, ds, rules));
}
