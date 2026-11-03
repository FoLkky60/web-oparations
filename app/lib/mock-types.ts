/**
 * Mock domain model สำหรับโฟลว์ใหม่ (ไม่พึ่ง backend).
 *
 * แนวคิดหลัก (ADD-02):
 * - Import "เว็บจริง" ได้ โดยหนึ่งเว็บมีหลายหน้า (SitePage) ที่ "เรนเดอร์เป็นหน้าเว็บจริง"
 *   (Home / Login / Admin Monitor) ไม่ใช่ตารางสวอตช์ component
 * - ทุกหน้าใน "เว็บเดียวกัน" ใช้ "ชุด component มาตรฐานเดียวกัน" (shared site UI)
 *   → SiteNav / SiteButton / SiteCard / SiteInput / SiteTable / SiteStat / SiteHero
 *   ความสม่ำเสมอจึงมองเห็นได้ทันทีเมื่อสลับหน้า
 * - ยังคงแนวคิด DetectedComponent/structureKey/ComponentGroup ไว้สำหรับเล่าเรื่อง
 *   mapping/standardization (dashboard + mapping คำนวณจากตรงนี้) แต่ "deliverable หลัก"
 *   คือเนื้อหาหน้า (page content) ที่เรนเดอร์ได้จริง
 */

export type ComponentType =
  | "button"
  | "card"
  | "navbar"
  | "input"
  | "form"
  | "table"
  | "alert"
  | "footer"
  | "hero";

/** สไตล์ของ component (หน้าตา) — ส่วนที่จะถูกแทนที่ด้วย standard */
export interface ComponentStyle {
  background: string;
  color: string;
  borderRadius: string;
  borderColor?: string;
  padding: string;
  fontWeight: string;
  fontSize: string;
  shadow?: string;
}

export interface DetectedComponent {
  id: string;
  siteId: string;
  pageId: string;
  type: ComponentType;
  /** กุญแจโครงสร้าง — component คนละหน้า/เว็บที่ค่านี้เท่ากัน = โครงสร้างเดียวกัน */
  structureKey: string;
  /** ข้อความด้านในของ component (จะ "ไม่ถูกเปลี่ยน" ตอน standardize) */
  label: string;
  /** ข้อความประกอบ (เช่น body ของ card) — ก็ไม่เปลี่ยนเช่นกัน */
  text?: string;
  /** สไตล์ดั้งเดิมของ component นี้ */
  style: ComponentStyle;
  /** selector อ้างอิงกลับไปยังต้นฉบับ */
  selector: string;
}

// ---------------------------------------------------------------------------
// Page content (deliverable หลัก) — โครงสร้างเนื้อหาของแต่ละหน้าที่เรนเดอร์จริง
// ---------------------------------------------------------------------------

/** ชนิดหน้าในเว็บที่ import — ควบคุมการเรนเดอร์หน้าจริง */
export type PageKind = "home" | "login" | "admin-monitor";

/** ลิงก์บน SiteNav (ใช้ร่วมกันทุกหน้า → ความสม่ำเสมอ) */
export interface NavLink {
  label: string;
  /** key ของหน้าในเว็บเดียวกัน (home/login/admin-monitor) หรือ "#" ถ้าเป็น mock */
  target: PageKind | "#";
}

/** การ์ดฟีเจอร์บนหน้า Home */
export interface FeatureCardContent {
  title: string;
  body: string;
}

/** ฟิลด์ในฟอร์ม (login) */
export interface FormField {
  name: string;
  label: string;
  /** ชนิด input แบบ safe (ไม่รับ PII จริง — mock) */
  type: "text" | "email" | "password";
  placeholder: string;
}

/** สถิติบนหน้า Admin Monitor */
export interface StatContent {
  label: string;
  value: string;
  /** การเปลี่ยนแปลง (optional) เช่น "+12%" */
  delta?: string;
  /** ทิศทางของ delta เพื่อสื่อความหมายด้วยไอคอน+สี (ไม่พึ่งสีอย่างเดียว) */
  trend?: "up" | "down" | "flat";
}

/** ตารางข้อมูลบนหน้า Admin Monitor */
export interface TableContent {
  caption: string;
  columns: string[];
  rows: string[][];
}

/** Hero บนหน้า Home */
export interface HeroContent {
  headline: string;
  subtext: string;
  ctaLabel: string;
}

/** เนื้อหาหน้า Home */
export interface HomePageContent {
  hero: HeroContent;
  features: FeatureCardContent[];
}

/** เนื้อหาหน้า Login */
export interface LoginPageContent {
  title: string;
  subtitle: string;
  fields: FormField[];
  submitLabel: string;
  helperText: string;
}

/** เนื้อหาหน้า Admin Monitor */
export interface AdminMonitorPageContent {
  title: string;
  subtitle: string;
  stats: StatContent[];
  table: TableContent;
}

/** union ของเนื้อหาหน้า ตาม kind (discriminated union, strict-clean) */
export type PageContent =
  | { kind: "home"; data: HomePageContent }
  | { kind: "login"; data: LoginPageContent }
  | { kind: "admin-monitor"; data: AdminMonitorPageContent };

export interface SitePage {
  id: string;
  siteId: string;
  name: string;
  path: string;
  /** ชนิดหน้า — ควบคุมการเรนเดอร์หน้าจริง */
  kind: PageKind;
  /** ลิงก์บน SiteNav (ใช้ร่วมกันทุกหน้าในเว็บ → ชุดเดียวกัน) */
  nav: NavLink[];
  /** แบรนด์ที่แสดงบน SiteNav (ใช้ร่วมกันทุกหน้า) */
  brand: string;
  /** เนื้อหาเฉพาะหน้า (deliverable หลัก) */
  content: PageContent;
}

export type SiteStatus = "imported" | "analyzed" | "standardized";

export interface ImportedSite {
  id: string;
  name: string;
  domain: string;
  importedAt: string;
  status: SiteStatus;
  fileCount: number;
  sizeKb: number;
  pages: SitePage[];
  components: DetectedComponent[];
  /** คะแนน compliance โดยประมาณ (mock) */
  complianceScore: number;
}

/** กลุ่มของ component ที่โครงสร้างเดียวกัน (ข้ามหน้า/เว็บ) */
export interface ComponentGroup {
  structureKey: string;
  type: ComponentType;
  /** variants ที่เจอ */
  members: DetectedComponent[];
  /** id ของ member ที่ถูกเลือกเป็น standard (null = ยังไม่เลือก) */
  standardMemberId: string | null;
}
