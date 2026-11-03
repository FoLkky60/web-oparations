/*
 * ============================================================================
 * ADD-04/ADD-05 — types ของ mock data ชุดใหม่ (Component Standard Builder + 5 imported websites)
 * อ้างอิง: .aidlc/specs/ui-standardization-platform/change-request-ADD-04.md §2, §3, §4.3, §5
 * ============================================================================
 */

/** 7 categories ที่ Builder ต้องตัดสินมาตรฐาน (§5) */
export type CategoryId = "button" | "input" | "card" | "navbar" | "table" | "badge" | "footer";

export const CATEGORY_IDS: readonly CategoryId[] = [
  "button",
  "input",
  "card",
  "navbar",
  "table",
  "badge",
  "footer",
] as const;

/** 5 imported websites (§2) */
export type SiteId = "cp" | "bd" | "hr" | "po" | "li";

/**
 * ADD-05: เว็บ 5 เว็บ = ชุดเดียว — ทุกเว็บมี standardized build (แทน SiteStatus "built" | "imported" + BuiltProject เดิม)
 * สถานะ build ต่อเว็บ (derive จาก BuilderState — ไม่เก็บซ้ำ)
 */
export interface SiteBuild {
  siteId: SiteId;
  /** เวอร์ชันมาตรฐานที่ build อยู่ (= workspaces.version) */
  version: string;
  /** publish เวอร์ชันใหม่แล้วแต่ยังไม่ rebuild (workspaces.version !== published.version) */
  needsRebuild: boolean;
}

/** สถานะ pipeline ที่แสดงในตาราง Recent Projects ของ Dashboard (§4.2) */
export type PipelineStatus = "standardized" | "in-review" | "needs-attention" | "analyzing";

export interface ImportedWebsite {
  id: SiteId;
  /** ตัวย่อ 2 ตัวอักษร (avatar) */
  code: string;
  name: string;
  team: string;
  /** จำนวน component ที่ extract ได้ (Source websites panel) */
  componentCount: number;
  /** จำนวนหน้าในเว็บต้นฉบับ */
  pageCount: number;
  /** ISO date (mock) */
  lastAnalyzed: string;
  pipelineStatus: PipelineStatus;
}

/**
 * VariantStyle — ค่าสไตล์ของ variant หนึ่งตัว (ใช้ร่วมทุก category)
 * field เดียวกันถูกตีความต่างกันตาม category:
 *
 * | field        | button          | input              | card                 | navbar               | table                 | badge              | footer              |
 * | ------------ | --------------- | ------------------ | -------------------- | -------------------- | --------------------- | ------------------ | ------------------- |
 * | fill         | พื้นปุ่ม         | พื้นช่องกรอก        | พื้นการ์ด             | พื้นแถบ nav          | พื้น header row        | พื้น pill           | พื้น footer          |
 * | text         | ตัวอักษรปุ่ม     | ตัวอักษรที่กรอก      | หัวข้อการ์ด           | ลิงก์เมนู             | ตัวอักษร header        | ตัวอักษร pill       | ตัวอักษร footer      |
 * | hoverFill    | พื้นตอน hover    | สี focus/เส้นขอบ focus | พื้นตอน hover        | สีเมนู active/hover   | พื้นแถวตอน hover       | สีจุด/เน้น          | สีลิงก์ตอน hover     |
 * | disabledFill | พื้นตอน disabled | พื้นตอน disabled    | พื้น section ด้านใน   | สีลิงก์ที่ไม่ active   | พื้นแถวสลับ (zebra)   | พื้น pill กลาง ๆ   | พื้นแถบล่าง/ตัวคั่น   |
 * | radius       | มุมปุ่ม          | มุมช่องกรอก         | มุมการ์ด              | มุม pill ของลิงก์     | มุมกรอบตาราง          | มุม pill           | (ปกติ 0)            |
 * | height       | ความสูงปุ่ม      | ความสูงช่องกรอก      | ความสูงแถบหัวการ์ด     | ความสูงแถบ nav       | ความสูงแถว            | ความสูง pill        | ความสูงขั้นต่ำ        |
 * | paddingX     | padding แนวนอน   | padding แนวนอน      | padding ด้านใน        | padding ลิงก์          | padding cell          | padding แนวนอน     | padding แนวนอน      |
 * | border       | เส้นขอบ          | เส้นขอบปกติ          | เส้นขอบการ์ด          | เส้นขอบล่าง           | เส้นขอบ cell           | เส้นขอบ pill        | เส้นขอบบน            |
 *
 * fontFamily / fontWeight / fontSize / textTransform = typography ของตัวอักษรหลักในทุก category
 * ค่าสีเป็น hex string (เป็น DATA ของเว็บต้นฉบับ — ไม่ใช่ token ของแอป)
 */
export interface VariantStyle {
  fill: string;
  text: string;
  hoverFill: string;
  disabledFill: string;
  /** px */
  radius: number;
  /** px */
  height: number;
  /** px */
  paddingX: number;
  fontFamily: string;
  fontWeight: number;
  /** px */
  fontSize: number;
  /** CSS border shorthand หรือ "none" */
  border: string;
  textTransform?: "none" | "uppercase";
}

/** ประเภท variant (tab ใน Builder) — ใช้กับ button เป็นหลัก */
export type VariantType = "primary" | "secondary" | "ghost";

export interface VariantUsage {
  /** จำนวน instance ที่พบ */
  count: number;
  /** จำนวนหน้าที่พบ */
  pages: number;
}

export interface Variant {
  /** `${categoryId}-${siteId}` */
  id: string;
  categoryId: CategoryId;
  siteId: SiteId;
  /** selector ต้นฉบับ เช่น ".btn-primary" */
  selector: string;
  variantType?: VariantType;
  style: VariantStyle;
  usage: VariantUsage;
  /** ป้าย "Most used" ใน Builder */
  mostUsed?: boolean;
}

export interface Category {
  id: CategoryId;
  label: string;
}

/** สถานะ decision ของแต่ละ category ใน draft (§4.3) */
export type DecisionStatus = "decided" | "skipped" | "choosing" | "pending" | "not-started";

export interface DraftDecision {
  /** variant ที่ confirm แล้ว (null ถ้ายังไม่ decided) */
  variantId: string | null;
  status: DecisionStatus;
}

export interface BuilderToggles {
  /** Enforce on all projects (no local overrides) */
  enforceAll: boolean;
  /** Auto-rebuild team workspaces on publish */
  autoRebuild: boolean;
}

export interface BuilderState {
  draft: {
    version: string;
    decisions: Record<CategoryId, DraftDecision>;
    /** radio ที่เลือกไว้ก่อนกด Confirm */
    pickedVariantId: Record<CategoryId, string | null>;
    /** ISO date ของการ Save Draft ล่าสุด (null = ยังไม่เคย save) */
    savedAt: string | null;
  };
  published: {
    version: string;
    decisions: Record<CategoryId, string>;
    /** ISO date */
    publishedAt: string;
  };
  toggles: BuilderToggles;
  /**
   * มาตรฐานที่ standardized build ของทั้ง 5 เว็บถูก build ล่าสุด (D-7, ADD-05)
   * Auto-rebuild = on → อัปเดตพร้อม publish; off → คงเวอร์ชันเดิมจนกว่าจะสั่ง Rebuild
   */
  workspaces: {
    version: string;
    decisions: Record<CategoryId, string>;
    /** ISO date */
    rebuiltAt: string;
  };
}

/** ผลกระทบต่อแต่ละเว็บเมื่อใช้ variant หนึ่งเป็นมาตรฐาน (Impact preview / Applies to all projects) */
export type ImpactStatus = "source" | "replace" | "match";

export interface SiteImpact {
  siteId: SiteId;
  status: ImpactStatus;
  /** จำนวน instance ของ category นี้ในเว็บนั้น */
  count: number;
}

export type ActivityStatus = "success" | "warning" | "review";

export interface TransformationActivity {
  id: string;
  title: string;
  detail: string;
  status: ActivityStatus;
  /** ISO date-time (mock) */
  at: string;
}

export interface UiIssue {
  id: string;
  label: string;
  count: number;
  autoFixablePct: number;
  note?: string;
}

export interface PortfolioStat {
  id: string;
  label: string;
  value: number;
  /** หน่วยต่อท้าย เช่น "%" */
  suffix?: string;
  delta: string;
  /** sparkline series (mock) */
  series: number[];
}

export interface TrendPoint {
  /** label เดือน เช่น "Nov 25" */
  label: string;
  value: number;
}

export interface MockUser {
  name: string;
  initials: string;
  role: string;
}

export interface MockNotification {
  id: string;
  text: string;
  at: string;
}

/** Design token ของ active standard (tab Design Tokens ใน Builder) — mock (ADD-04 Phase D) */
export interface StandardToken {
  name: string;
  /** color = hex · radius/space/size = "<n>px" · font = ข้อความแสดงผล */
  group: "color" | "radius" | "space" | "size" | "font";
  value: string;
  /** ใช้กับ group "font" เพื่อจับคู่กับ VariantStyle */
  typography?: { family: string; weight: number; size: number };
}
