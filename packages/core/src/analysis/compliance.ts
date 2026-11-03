import type {
  AnalysisResult,
  ComplianceDimension,
  ComplianceReport,
  DesignSystem,
  Finding,
  FindingSeverity,
} from "@shared/index";

/**
 * Deterministic compliance scoring for an analyzed project.
 *
 * This module is PURE and DETERMINISTIC: given the same AnalysisResult and the
 * same DesignSystem it always returns the same ComplianceReport (no clock, no
 * randomness, stable ordering). The timestamp is passed in by the caller so the
 * core stays clock-free and testable.
 *
 * ---------------------------------------------------------------------------
 * Formula (design D3-5)
 * ---------------------------------------------------------------------------
 * Findings are weighted by severity:
 *   error   = 3
 *   warning = 2
 *   info    = 0   (info = an intentional/unclassified exception; NOT penalized)
 *
 * For each dimension (color, typography, spacing, radius, component) we tally
 * the "items considered" against the active Design System:
 *
 *   total     = number of distinct design items considered in that dimension.
 *               For design-property dimensions (color/typography/spacing/
 *               radius) an "item" is one detected design-property value (from
 *               AnalysisResult.designProperties) plus any additional findings
 *               that reference values not present in designProperties (so a
 *               finding is never counted as a free pass). For the "component"
 *               dimension an item is one detected component.
 *   compliant = items in that dimension that have NO error/warning finding
 *               against them. info-only items still count as compliant because
 *               info findings are intentional exceptions, not violations.
 *   weightedViolations = Σ severity-weight of the findings in that dimension
 *               (error=3, warning=2, info=0).
 *
 * ---------------------------------------------------------------------------
 * Weighted denominator (DOCUMENTED CHOICE)
 * ---------------------------------------------------------------------------
 * The overall score is:
 *
 *   score = round( (1 - ΣweightedViolations / max(1, ΣweightedTotal)) * 100 )
 *   clamped to [0, 100]
 *
 * We define the weighted TOTAL for a dimension as:
 *
 *   weightedTotal(dim) = dim.total * MAX_SEVERITY_WEIGHT        // MAX = 3 (error)
 *
 * i.e. the worst case is "every considered item is a full error (weight 3)".
 * ΣweightedTotal is the sum across all five dimensions. This gives a stable,
 * explainable denominator: a project where every item is a hard error scores 0,
 * a project with zero error/warning findings scores 100, and partial violations
 * scale linearly in between. Because info findings carry weight 0 they never
 * move the score, matching the "intentional exception" semantics in the
 * analyzer. max(1, ...) guards the empty-project divide-by-zero (an empty or
 * fully-compliant project scores 100).
 */

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  error: 3,
  warning: 2,
  info: 0,
};

const MAX_SEVERITY_WEIGHT = 3; // weight of a full "error"

type DimensionCategory = ComplianceDimension["category"];

/** The five dimensions, in a fixed order for deterministic output. */
const DIMENSIONS: DimensionCategory[] = [
  "color",
  "typography",
  "spacing",
  "radius",
  "component",
];

/**
 * Count the distinct design-property values considered for a property-based
 * dimension. Maps the ComplianceDimension category onto the
 * DetectedDesignProperties field(s) it is derived from.
 */
function propertyItemCount(
  category: Exclude<DimensionCategory, "component">,
  analysis: AnalysisResult,
): number {
  const dp = analysis.designProperties;
  switch (category) {
    case "color":
      return dp.colors.length;
    case "typography":
      // typography findings are raised against font families (see
      // design-properties.findViolations); font sizes are surfaced but not
      // scored, so the considered item set is the font families.
      return dp.fontFamilies.length;
    case "spacing":
      return dp.spacing.length;
    case "radius":
      return dp.borderRadii.length;
  }
}

function buildDimension(
  category: DimensionCategory,
  analysis: AnalysisResult,
): ComplianceDimension {
  const findings = analysis.findings.filter((f) => f.category === category);

  const weightedViolations = findings.reduce(
    (sum, f) => sum + SEVERITY_WEIGHT[f.severity],
    0,
  );

  // Number of items considered in this dimension.
  let total: number;
  if (category === "component") {
    total = analysis.components.length;
  } else {
    const base = propertyItemCount(category, analysis);
    // A finding may reference a value that is not in the detected property set
    // (defensive): make sure such a finding is never a "free pass" by ensuring
    // total is at least the number of findings in the dimension.
    total = Math.max(base, findings.length);
  }

  // Items with at least one error/warning finding are non-compliant. info-only
  // findings do not make an item non-compliant. We approximate per-item
  // compliance by counting distinct offending source values (findings carry the
  // offending value in sourceValue) with severity error/warning.
  const offendingValues = new Set(
    findings
      .filter((f) => f.severity === "warning" || f.severity === "error")
      .map((f) => f.sourceValue),
  );
  const nonCompliant = Math.min(total, offendingValues.size);
  const compliant = Math.max(0, total - nonCompliant);

  return { category, total, compliant, weightedViolations };
}

/**
 * Compute a deterministic ComplianceReport for an analysis against a design
 * system. `computedAt` is injected so the engine stays clock-free; callers
 * (the app service) pass `new Date().toISOString()`.
 */
export function computeCompliance(
  analysis: AnalysisResult,
  designSystem: DesignSystem,
  options?: { projectId?: string; computedAt?: string },
): ComplianceReport {
  const dimensions = DIMENSIONS.map((c) => buildDimension(c, analysis));

  const sumWeightedViolations = dimensions.reduce(
    (s, d) => s + d.weightedViolations,
    0,
  );
  const sumWeightedTotal = dimensions.reduce(
    (s, d) => s + d.total * MAX_SEVERITY_WEIGHT,
    0,
  );

  const ratio = sumWeightedViolations / Math.max(1, sumWeightedTotal);
  const rawScore = (1 - ratio) * 100;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Outstanding = everything that is not an intentional exception (info).
  const outstanding: Finding[] = analysis.findings.filter(
    (f) => f.severity !== "info",
  );

  return {
    projectId: options?.projectId ?? "",
    analysisDesignSystemVersion: analysis.designSystemVersion,
    score,
    dimensions,
    outstanding,
    computedAt: options?.computedAt ?? "1970-01-01T00:00:00.000Z",
  };
}
