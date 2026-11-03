/*
 * ADD-04 — label + tone ของสถานะต่าง ๆ (ใช้คู่กับ <StatusPill>) — label เสมอ ไม่พึ่งสีอย่างเดียว
 */
import type { Tone } from "../components/ui";
import type {
  ActivityStatus,
  DecisionStatus,
  ImpactStatus,
  PipelineStatus,
  SiteBuild,
} from "./standard-types";

type LabelTone = { label: string; tone: Tone };

/** ADD-05: สถานะ build ต่อเว็บ — "v<built version>" (success) หรือ "Needs rebuild" (warning) */
export function siteBuildStatus(build: SiteBuild): LabelTone {
  return build.needsRebuild
    ? { label: "Needs rebuild", tone: "warning" }
    : { label: `v${build.version}`, tone: "success" };
}

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

/*
 * วันที่แบบคงที่ (UTC) ประกอบเองโดยไม่ใช้ Intl/toLocale*
 * เหตุผล: ผลลัพธ์ของ Intl ขึ้นกับเวอร์ชัน ICU ของ Node กับ browser
 * (เช่น Node: "3 Nov at 08:40" vs browser: "3 Nov, 08:40") → hydration mismatch
 */
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "3 Nov 2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "3 Nov, 08:40" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}
