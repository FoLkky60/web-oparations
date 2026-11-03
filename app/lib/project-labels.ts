/*
 * ADD-04 Phase F — label + tone for REAL backend statuses (pair with <StatusPill>).
 * Every status always has a text label; color is never the only signal.
 */
import type { Tone } from "../components/ui";
import type {
  FindingSeverity,
  ProjectStatus,
  TransformationCategory,
  TransformationChange,
  TransformationReport,
  ValidationIssue,
} from "@shared/index";

type LabelTone = { label: string; tone: Tone };

export const PROJECT_STATUS: Record<ProjectStatus, LabelTone> = {
  created: { label: "Created", tone: "neutral" },
  uploaded: { label: "Uploaded", tone: "info" },
  validated: { label: "Validated", tone: "info" },
  analyzed: { label: "Analyzed", tone: "info" },
  transformed: { label: "Transformed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

export const SEVERITY: Record<FindingSeverity, LabelTone> = {
  error: { label: "Error", tone: "danger" },
  warning: { label: "Warning", tone: "warning" },
  info: { label: "Info", tone: "info" },
};

export const ISSUE_LEVEL: Record<ValidationIssue["level"], LabelTone> = {
  error: { label: "Error", tone: "danger" },
  warning: { label: "Warning", tone: "warning" },
};

export const TRANSFORM_STATUS: Record<TransformationReport["status"], LabelTone> = {
  success: { label: "Success", tone: "success" },
  partial: { label: "Partial", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
};

export const CHANGE_STATUS: Record<TransformationChange["status"], LabelTone> = {
  applied: { label: "Applied", tone: "success" },
  "needs-review": { label: "Needs review", tone: "warning" },
  skipped: { label: "Skipped", tone: "neutral" },
};

export const CATEGORY_LABEL: Record<TransformationCategory, string> = {
  colors: "Colors",
  radius: "Radius",
  spacing: "Spacing",
  typography: "Typography",
  components: "Components",
};

export const ALL_TRANSFORM_CATEGORIES: TransformationCategory[] = [
  "colors",
  "radius",
  "spacing",
  "typography",
  "components",
];

/** Human-readable byte size (deterministic, no Intl — avoids hydration mismatch). */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
