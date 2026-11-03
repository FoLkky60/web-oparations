/**
 * Shared TypeScript contracts for the Enterprise Web UI Standardization Platform.
 *
 * These types are the single source of truth for analysis results, component
 * mappings, transformation plans/reports and API responses. They are framework
 * agnostic and are consumed by both the core engine and the Next.js web app.
 */

// ---------------------------------------------------------------------------
// Design System
// ---------------------------------------------------------------------------

export type DesignTokenCategory =
  | "color"
  | "typography"
  | "spacing"
  | "radius"
  | "shadow";

export interface DesignToken {
  /** Canonical token name, e.g. "color.primary" or "radius.medium". */
  name: string;
  category: DesignTokenCategory;
  /** The literal value, e.g. "#73493A" or "8px". */
  value: string;
  /** CSS custom property this token is exposed as, e.g. "--color-primary". */
  cssVariable: string;
  description?: string;
}

export interface DesignSystemComponent {
  /** Central component name, e.g. "PrimaryButton". */
  name: string;
  /** The source component type this standard component standardizes. */
  componentType: ComponentType;
  /** CSS class the transformation engine applies to recognized elements. */
  standardClass: string;
  variants?: string[];
  description?: string;
}

export interface DesignSystem {
  version: string;
  tokens: DesignToken[];
  components: DesignSystemComponent[];
}

// ---------------------------------------------------------------------------
// Component detection / semantic UI representation
// ---------------------------------------------------------------------------

export type ComponentType =
  | "button"
  | "link"
  | "text-input"
  | "select"
  | "checkbox"
  | "radio"
  | "card"
  | "table"
  | "navigation"
  | "form"
  | "heading"
  | "alert"
  | "unknown";

export type ClassificationMethod =
  | "semantic-html"
  | "attribute"
  | "structure"
  | "heuristic";

/** A stable reference back to the exact source element. */
export interface SourceRef {
  file: string;
  /** Original tag name, lowercased. */
  tag: string;
  classes: string[];
  id?: string;
  /** A CSS-ish selector/path that locates the element in its document. */
  selector: string;
  /** DOM order index within the document (0-based, pre-order). */
  domIndex: number;
}

/** Visual properties resolved for an element (best-effort, static only). */
export interface ResolvedProperties {
  [property: string]: string;
}

export interface DetectedComponent {
  type: ComponentType;
  source: SourceRef;
  /** Best-effort resolved style properties (may be partial). */
  properties: ResolvedProperties;
  /** Properties that could not be resolved without a rendering engine. */
  unresolvedProperties: string[];
  classification: {
    method: ClassificationMethod;
    /** Heuristic estimate in [0,1]. NOT a calibrated probability. */
    confidence: number;
    reasons: string[];
  };
  warnings: string[];
  target: {
    component: string | null;
    status: "suggested" | "none";
  };
}

// ---------------------------------------------------------------------------
// Design properties & violations
// ---------------------------------------------------------------------------

export interface DetectedDesignProperties {
  colors: string[];
  fontFamilies: string[];
  fontSizes: string[];
  spacing: string[];
  borderRadii: string[];
  shadows: string[];
}

export type FindingSeverity = "info" | "warning" | "error";

export interface Finding {
  category: DesignTokenCategory | "component";
  sourceValue: string;
  suggestedToken: string | null;
  severity: FindingSeverity;
  /** Why this was or was not flagged. */
  note: string;
  source?: SourceRef;
}

export interface AnalysisSummary {
  componentsDetected: number;
  potentialViolations: number;
  unknownComponents: number;
  filesAnalyzed: number;
}

export interface AnalysisResult {
  status: "completed" | "failed";
  summary: AnalysisSummary;
  components: DetectedComponent[];
  designProperties: DetectedDesignProperties;
  findings: Finding[];
  warnings: string[];
  designSystemVersion: string;
}

// ---------------------------------------------------------------------------
// Transformation
// ---------------------------------------------------------------------------

export type TransformationCategory =
  | "colors"
  | "radius"
  | "spacing"
  | "typography"
  | "components";

export interface TransformationChange {
  file: string;
  selector: string;
  property: string | null;
  before: string;
  after: string;
  rule: string;
  reason: string;
  category: TransformationCategory;
  automatic: boolean;
  status: "applied" | "needs-review" | "skipped";
  source?: SourceRef;
}

export interface TransformationValidation {
  htmlReparsed: boolean;
  cssReparsed: boolean;
  stylesheetReferencesValid: boolean;
  outputFilesExist: boolean;
  originalUnchanged: boolean;
  unresolvedMappings: number;
  messages: string[];
}

export interface TransformationReport {
  status: "success" | "failed" | "partial";
  designSystemVersion: string;
  categories: TransformationCategory[];
  changes: TransformationChange[];
  warnings: string[];
  validation: TransformationValidation;
  /** Explicit reminder that static validation != behavioral preservation. */
  behavioralNote: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Project domain
// ---------------------------------------------------------------------------

export type ProjectStatus =
  | "created"
  | "uploaded"
  | "validated"
  | "analyzed"
  | "transformed"
  | "failed";

export interface ProjectFileEntry {
  path: string;
  kind: "html" | "css" | "js" | "asset" | "unsupported";
  size: number;
}

export interface Project {
  id: string;
  name: string;
  originalFilename: string | null;
  status: ProjectStatus;
  entryPoint: string | null;
  files: ProjectFileEntry[];
  designSystemVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  sourceType: "original" | "standardized";
  storageReference: string;
  designSystemVersion: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  entryPoint: string | null;
  files: ProjectFileEntry[];
  issues: ValidationIssue[];
}

// ---------------------------------------------------------------------------
// API envelope
// ---------------------------------------------------------------------------

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Access control: roles, permissions, users and sessions
// ---------------------------------------------------------------------------

export type Role =
  | "system-admin"
  | "ds-admin"
  | "developer"
  | "reviewer"
  | "project-owner"
  | "external-system";

export type Permission =
  | "project.read"
  | "project.create"
  | "project.delete"
  | "project.upload"
  | "project.analyze"
  | "project.transform"
  | "project.export"
  | "review.view"
  | "review.approve"
  | "designsystem.read"
  | "designsystem.write"
  | "user.manage"
  | "audit.view";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  /** scrypt-derived hash; never the plaintext password. */
  passwordHash: string;
  createdAt: string;
  active: boolean;
}

export interface Session {
  id: string;
  userId: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Review & approval
// ---------------------------------------------------------------------------

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Approval {
  id: string;
  projectId: string;
  transformationVersion: number;
  status: ApprovalStatus;
  reviewerId: string | null;
  reason: string | null;
  createdAt: string;
  decidedAt: string | null;
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

export type AuditAction =
  | "login"
  | "logout"
  | "project.create"
  | "project.upload"
  | "project.analyze"
  | "project.transform"
  | "project.export"
  | "project.delete"
  | "review.approve"
  | "review.reject"
  | "designsystem.update"
  | "user.manage"
  | "access.denied";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string | null;
  actorRole: Role | null;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  outcome: "success" | "failure";
  detail?: string;
}

// ---------------------------------------------------------------------------
// Compliance reporting
// ---------------------------------------------------------------------------

export interface ComplianceDimension {
  category: "color" | "typography" | "spacing" | "radius" | "component";
  total: number;
  compliant: number;
  weightedViolations: number;
}

export interface ComplianceReport {
  projectId: string;
  analysisDesignSystemVersion: string;
  score: number;
  dimensions: ComplianceDimension[];
  outstanding: Finding[];
  computedAt: string;
}

// ---------------------------------------------------------------------------
// Design system: mapping rules and versioning
// ---------------------------------------------------------------------------

export interface MappingRule {
  sourceComponentType: ComponentType;
  targetComponent: string;
  /** Confidence in [0,1] at/above which a mapping is auto-applied. */
  autoApplyThreshold: number;
  enabled: boolean;
}

export interface DesignSystemVersion {
  version: string;
  tokens: DesignToken[];
  components: DesignSystemComponent[];
  mappingRules: MappingRule[];
  active: boolean;
  immutable: true;
  createdBy: string;
  createdAt: string;
}
