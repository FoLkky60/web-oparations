/*
 * ADD-04 — label + tone ของสถานะต่าง ๆ (ใช้คู่กับ <StatusPill>) — label เสมอ ไม่พึ่งสีอย่างเดียว
 */
import type { Tone } from "../components/ui";
import type {
  ActivityStatus,
  DecisionStatus,
  ImpactStatus,
  PipelineStatus,
  SiteStatus,
} from "./standard-types";

type LabelTone = { label: string; tone: Tone };

export const SITE_STATUS: Record<SiteStatus, LabelTone> = {
  built: { label: "Built", tone: "success" },
  imported: { label: "Imported", tone: "neutral" },
};

export const PIPELINE_STATUS: Record<PipelineStatus, LabelTone> = {
  standardized: { label: "Standardized", tone: "success" },
  "in-review": { label: "In Review", tone: "info" },
  "needs-attention": { label: "Needs Attention", tone: "danger" },
  analyzing: { label: "Analyzing", tone: "warning" },
};

export const ACTIVITY_STATUS: Record<ActivityStatus, LabelTone> = {
  success: { label: "Success", tone: "success" },
  warning: { label: "Warning", tone: "warning" },
  review: { label: "Review", tone: "info" },
};

export const IMPACT_STATUS: Record<ImpactStatus, LabelTone> = {
  source: { label: "Source", tone: "success" },
  match: { label: "Match", tone: "info" },
  replace: { label: "Replace", tone: "warning" },
};

export const DECISION_STATUS: Record<DecisionStatus, LabelTone> = {
  decided: { label: "Decided", tone: "success" },
  choosing: { label: "Choosing", tone: "info" },
  pending: { label: "Pending", tone: "warning" },
  skipped: { label: "Skipped", tone: "neutral" },
  "not-started": { label: "Not started", tone: "neutral" },
};

/** วันที่แบบคงที่ (UTC, en-GB) เพื่อให้ SSR/CSR ได้ข้อความเดียวกัน */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
