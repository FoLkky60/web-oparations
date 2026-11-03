import type {
  ImportedSite,
  DetectedComponent,
  ComponentStyle,
  ComponentType,
  SitePage,
  NavLink,
} from "./mock-types";

/**
 * ชุดข้อมูลจำลอง (mock) — ADD-02
 *
 * แนวคิดหลัก:
 * - "เว็บที่ import" = เว็บจริงหลายหน้า (multi-page) ที่นักพัฒนาเขียนไว้แล้วนำเข้ามา
 * - สร้าง "หนึ่งเว็บครบชุด" ชื่อ Acme Internal Portal (acme.example.com)
 *   มี 3 หน้าใช้งานจริง: Home / Login / Admin Monitor
 * - ทุกหน้าใช้ "ชุด component มาตรฐานเดียวกัน" (SiteNav/SiteButton/SiteCard/
 *   SiteInput/SiteTable/SiteStat/SiteHero) จึงเห็นความสม่ำเสมอชัดเจนเมื่อสลับหน้า
 * - ยังคง DetectedComponent + structureKey ไว้เพื่อเล่าเรื่อง mapping/standardization
 *   (dashboard + mapping อ่านจากตรงนี้) — หลายหน้าใช้ structureKey ซ้ำกัน
 *   (เช่น primary-button อยู่ทั้ง 3 หน้า) สะท้อนว่าใช้ component ชุดเดียวกัน
 */

let counter = 0;
const uid = (p: string) => `${p}-${(++counter).toString(36)}`;

function comp(
  siteId: string,
  pageId: string,
  type: ComponentType,
  structureKey: string,
  label: string,
  style: ComponentStyle,
  text?: string,
): DetectedComponent {
  return {
    id: uid("c"),
    siteId,
    pageId,
    type,
    structureKey,
    label,
    text,
    style,
    selector: `.${structureKey}`,
  };
}

/**
 * สไตล์ดิบ (raw) ของ "ชุด component มาตรฐานของเว็บ Acme" — ใช้ชุดเดียวทั้งเว็บ
 * (สะท้อนว่าเว็บนี้มี design language เดียว) ค่านี้ใช้เป็น style ดั้งเดิมของ
 * DetectedComponent เพื่อให้เรื่อง before→after ยังทำงานได้
 */
const ACME: Record<string, ComponentStyle> = {
  "top-nav": {
    background: "#0f766e",
    color: "#ecfeff",
    borderRadius: "0px",
    padding: "12px 20px",
    fontWeight: "600",
    fontSize: "15px",
  },
  "primary-button": {
    background: "#0d9488",
    color: "#ffffff",
    borderRadius: "10px",
    padding: "10px 20px",
    fontWeight: "600",
    fontSize: "14px",
    shadow: "0 1px 2px rgba(0,0,0,0.12)",
  },
  "feature-card": {
    background: "#ffffff",
    color: "#134e4a",
    borderRadius: "14px",
    borderColor: "#99f6e4",
    padding: "20px",
    fontWeight: "600",
    fontSize: "16px",
    shadow: "0 2px 6px rgba(0,0,0,0.06)",
  },
  "text-field": {
    background: "#f0fdfa",
    color: "#134e4a",
    borderRadius: "10px",
    borderColor: "#99f6e4",
    padding: "10px 12px",
    fontWeight: "400",
    fontSize: "14px",
  },
  "data-table": {
    background: "#ffffff",
    color: "#134e4a",
    borderRadius: "12px",
    borderColor: "#99f6e4",
    padding: "0px",
    fontWeight: "400",
    fontSize: "14px",
  },
  "stat-tile": {
    background: "#ffffff",
    color: "#134e4a",
    borderRadius: "14px",
    borderColor: "#99f6e4",
    padding: "18px",
    fontWeight: "700",
    fontSize: "28px",
    shadow: "0 2px 6px rgba(0,0,0,0.06)",
  },
};

/** nav ที่ใช้ร่วมกันทุกหน้าในเว็บ (ชุดเดียว → ความสม่ำเสมอ) */
const ACME_NAV: NavLink[] = [
  { label: "Home", target: "home" },
  { label: "Admin Monitor", target: "admin-monitor" },
  { label: "Docs", target: "#" },
  { label: "Sign in", target: "login" },
];

const ACME_BRAND = "Acme Internal Portal";

/**
 * สร้าง DetectedComponent ของแต่ละหน้า โดยใช้ structureKey ซ้ำข้ามหน้า
 * (ทุกหน้าใช้ top-nav + primary-button เดียวกัน) เพื่อสื่อว่าใช้ component ชุดเดียว
 */
function pageComponents(siteId: string, pageId: string, kind: SitePage["kind"]): DetectedComponent[] {
  const nav = comp(siteId, pageId, "navbar", "top-nav", ACME_BRAND, ACME["top-nav"]);

  if (kind === "home") {
    return [
      nav,
      comp(siteId, pageId, "button", "primary-button", "Get started", ACME["primary-button"]),
      comp(
        siteId,
        pageId,
        "card",
        "feature-card",
        "Unified components",
        ACME["feature-card"],
        "Every page shares the same standardized building blocks.",
      ),
    ];
  }
  if (kind === "login") {
    return [
      nav,
      comp(siteId, pageId, "input", "text-field", "Work email", ACME["text-field"]),
      comp(siteId, pageId, "button", "primary-button", "Sign in", ACME["primary-button"]),
    ];
  }
  // admin-monitor
  return [
    nav,
    comp(siteId, pageId, "table", "data-table", "Recent activity", ACME["data-table"]),
    comp(siteId, pageId, "card", "stat-tile", "Active users", ACME["stat-tile"], "1,284"),
    comp(siteId, pageId, "button", "primary-button", "Refresh", ACME["primary-button"]),
  ];
}

/** สร้างเว็บ Acme ครบ 3 หน้า (เนื้อหาเรนเดอร์ได้จริง + detected components) */
function makeAcmeSite(id: string, name: string, domain: string): ImportedSite {
  const homeId = `${id}-home`;
  const loginId = `${id}-login`;
  const adminId = `${id}-admin-monitor`;

  const pages: SitePage[] = [
    {
      id: homeId,
      siteId: id,
      name: "Home",
      path: "/index.html",
      kind: "home",
      brand: ACME_BRAND,
      nav: ACME_NAV,
      content: {
        kind: "home",
        data: {
          hero: {
            headline: "One design language across every page",
            subtext:
              "Acme Internal Portal is built from a single standardized component set, so the home page, sign-in, and admin tools all feel like one product.",
            ctaLabel: "Get started",
          },
          features: [
            {
              title: "Unified components",
              body: "Navigation, buttons, cards, inputs, and tables come from one shared set reused on every page.",
            },
            {
              title: "Consistent by default",
              body: "Spacing, colour, and typography stay the same whether you are reading docs or reviewing metrics.",
            },
            {
              title: "Accessible everywhere",
              body: "Focus states, labels, and 44px targets are standardized so every screen meets the same bar.",
            },
          ],
        },
      },
    },
    {
      id: loginId,
      siteId: id,
      name: "Login",
      path: "/login.html",
      kind: "login",
      brand: ACME_BRAND,
      nav: ACME_NAV,
      content: {
        kind: "login",
        data: {
          title: "Sign in to Acme",
          subtitle: "Use your work account to continue to the portal.",
          // mock เท่านั้น — ไม่รับ PII จริง, ไม่มี submit จริง
          fields: [
            { name: "email", label: "Work email", type: "email", placeholder: "you@acme.example.com" },
            { name: "password", label: "Password", type: "password", placeholder: "Enter your password" },
          ],
          submitLabel: "Sign in",
          helperText: "This is a mock sign-in form — no credentials are sent anywhere.",
        },
      },
    },
    {
      id: adminId,
      siteId: id,
      name: "Admin Monitor",
      path: "/admin/monitor.html",
      kind: "admin-monitor",
      brand: ACME_BRAND,
      nav: ACME_NAV,
      content: {
        kind: "admin-monitor",
        data: {
          title: "Admin Monitor",
          subtitle: "Live overview of portal usage and recent activity.",
          stats: [
            { label: "Active users", value: "1,284", delta: "+12%", trend: "up" },
            { label: "Sessions today", value: "3,902", delta: "+4%", trend: "up" },
            { label: "Error rate", value: "0.4%", delta: "-0.1%", trend: "down" },
            { label: "Avg. response", value: "212 ms", delta: "0%", trend: "flat" },
          ],
          table: {
            caption: "Recent activity",
            columns: ["User", "Action", "Status", "When"],
            rows: [
              ["j.rivera", "Signed in", "Success", "2 min ago"],
              ["m.chen", "Updated profile", "Success", "8 min ago"],
              ["a.okafor", "Exported report", "Pending", "15 min ago"],
              ["s.patel", "Password reset", "Success", "32 min ago"],
              ["l.novak", "Failed sign-in", "Blocked", "41 min ago"],
            ],
          },
        },
      },
    },
  ];

  const components: DetectedComponent[] = [
    ...pageComponents(id, homeId, "home"),
    ...pageComponents(id, loginId, "login"),
    ...pageComponents(id, adminId, "admin-monitor"),
  ];

  return {
    id,
    name,
    domain,
    importedAt: new Date(Date.now() - counter * 3600_000).toISOString(),
    status: "analyzed",
    fileCount: 9,
    sizeKb: 148,
    complianceScore: 72,
    pages,
    components,
  };
}

/** เว็บ seed เดียว (ครบ 3 หน้า) */
export const MOCK_SITES: ImportedSite[] = [
  makeAcmeSite("site-acme", "Acme Internal Portal", "acme.example.com"),
];

/**
 * template สำหรับ importSite() — ใช้โครง Acme ชุดเดียว (single template ก็พอ)
 * คืน factory เพื่อให้ได้ instance ใหม่ทุกครั้ง
 */
export function makeSiteTemplate(id: string, name: string, domain: string): ImportedSite {
  return makeAcmeSite(id, name, domain);
}

/**
 * สไตล์มาตรฐานกลาง (Central Design System) — ธีมแดงตามชีต
 * เมื่อผู้ใช้ "ยังไม่เลือก" standard จากของจริง ก็ fallback มาที่ชุดนี้ได้
 */
export const CENTRAL_STYLE: Record<ComponentType, ComponentStyle> = {
  button: {
    background: "#e8392e",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "10px 20px",
    fontWeight: "600",
    fontSize: "14px",
    shadow: "0 1px 2px rgba(0,0,0,0.12)",
  },
  card: {
    background: "#ffffff",
    color: "#1f2430",
    borderRadius: "12px",
    borderColor: "#e6e8ec",
    padding: "20px",
    fontWeight: "600",
    fontSize: "16px",
    shadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  navbar: {
    background: "#1b2030",
    color: "#ffffff",
    borderRadius: "0px",
    padding: "12px 20px",
    fontWeight: "600",
    fontSize: "15px",
  },
  input: {
    background: "#ffffff",
    color: "#1f2430",
    borderRadius: "8px",
    borderColor: "#e6e8ec",
    padding: "10px 12px",
    fontWeight: "400",
    fontSize: "14px",
  },
  form: {
    background: "#ffffff",
    color: "#1f2430",
    borderRadius: "12px",
    borderColor: "#e6e8ec",
    padding: "20px",
    fontWeight: "400",
    fontSize: "14px",
  },
  table: {
    background: "#ffffff",
    color: "#1f2430",
    borderRadius: "8px",
    borderColor: "#e6e8ec",
    padding: "0px",
    fontWeight: "400",
    fontSize: "14px",
  },
  alert: {
    background: "#ffe5e3",
    color: "#c62828",
    borderRadius: "8px",
    borderColor: "#f5b5b0",
    padding: "12px 16px",
    fontWeight: "500",
    fontSize: "14px",
  },
  footer: {
    background: "#1b2030",
    color: "#8b92a5",
    borderRadius: "0px",
    padding: "16px 20px",
    fontWeight: "400",
    fontSize: "13px",
  },
  hero: {
    background: "#ffffff",
    color: "#1f2430",
    borderRadius: "16px",
    padding: "32px",
    fontWeight: "700",
    fontSize: "28px",
  },
};

/** ป้ายชื่อโครงสร้าง (structureKey) ที่ใช้ในเว็บ */
export const STRUCTURE_LABELS: Record<string, string> = {
  "top-nav": "Top Navigation",
  "primary-button": "Primary Button",
  "feature-card": "Feature Card",
  "text-field": "Text Field",
  "data-table": "Data Table",
  "stat-tile": "Stat Tile",
};

/**
 * ชื่อ component กลาง (Central Design System) ที่แต่ละ structureKey จะถูก map ไป
 * ใช้โชว์ความสัมพันธ์ "primary-button → PrimaryButton" บนหน้า before→after
 */
export const STRUCTURE_CENTRAL_NAME: Record<string, string> = {
  "top-nav": "TopNav",
  "primary-button": "PrimaryButton",
  "feature-card": "FeatureCard",
  "text-field": "TextField",
  "data-table": "DataTable",
  "stat-tile": "StatTile",
};
