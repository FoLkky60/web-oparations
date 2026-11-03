"use client";

import type {
  ImportedSite,
  DetectedComponent,
  ComponentGroup,
  ComponentStyle,
  ComponentType,
} from "./mock-types";
import { MOCK_SITES, CENTRAL_STYLE, makeSiteTemplate } from "./mock-data";

/**
 * Mock store (ฝั่ง client) — เก็บสถานะในหน่วยความจำ + localStorage
 * ทำหน้าที่แทน backend ทั้งหมด:
 *  - รายการเว็บที่ import
 *  - การจับกลุ่ม component ตามโครงสร้าง (structureKey)
 *  - การเลือก "standard" ของแต่ละกลุ่ม
 *  - คำนวณสไตล์ที่ใช้จริง (effective style) ของทุก component หลังเลือก standard
 *
 * หมายเหตุ: ไม่มีการยิง fetch ไป API ใด ๆ — เป็น mock ล้วน
 */

/**
 * ขึ้น schema version (v2) เพราะ ADD-02 เปลี่ยนรูป SitePage (เพิ่ม kind/content/nav)
 * key ใหม่ทำให้ข้อมูลเก่า (ADD-01) ถูกมองข้ามโดยปริยาย ไม่ทำให้ render พัง
 */
const LS_SITES = "oper.mock.sites.v2";
const LS_STANDARDS = "oper.mock.standards.v2";

let sites: ImportedSite[] = [];
/** structureKey -> memberId ที่ถูกเลือกเป็น standard */
let standards: Record<string, string> = {};
let loaded = false;

/**
 * version จะเพิ่มขึ้นทุกครั้งที่ข้อมูลเปลี่ยน (import/remove/setStandard/…)
 * ใช้เป็น cache key เพื่อให้ getter ที่สร้าง array/object ใหม่
 * คืน "reference เดิม" จนกว่าข้อมูลจะเปลี่ยนจริง
 * (จำเป็นสำหรับ useSyncExternalStore ไม่ให้ loop)
 */
let version = 0;

/** memoize ผลลัพธ์ตาม version — ถ้า version ไม่เปลี่ยนคืนค่าเดิม */
function memo<T>() {
  let cachedVersion = -1;
  let cached: T;
  return (compute: () => T): T => {
    if (cachedVersion !== version) {
      cached = compute();
      cachedVersion = version;
    }
    return cached;
  };
}

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  version += 1;
  for (const l of listeners) l();
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_SITES, JSON.stringify(sites));
    localStorage.setItem(LS_STANDARDS, JSON.stringify(standards));
  } catch {
    /* ignore quota errors (mock only) */
  }
}

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  version += 1;
  if (typeof window === "undefined") {
    sites = structuredClone(MOCK_SITES);
    return;
  }
  try {
    const s = localStorage.getItem(LS_SITES);
    const st = localStorage.getItem(LS_STANDARDS);
    const parsed = s ? (JSON.parse(s) as ImportedSite[]) : null;
    sites = parsed && isValidSites(parsed) ? parsed : structuredClone(MOCK_SITES);
    standards = st ? (JSON.parse(st) as Record<string, string>) : {};
  } catch {
    sites = structuredClone(MOCK_SITES);
    standards = {};
  }
}

/** ตรวจว่า data ใน localStorage ตรงกับ shape ADD-02 (ทุกหน้ามี content.kind) */
function isValidSites(data: ImportedSite[]): boolean {
  return (
    Array.isArray(data) &&
    data.every(
      (s) =>
        Array.isArray(s.pages) &&
        s.pages.every((p) => p && typeof p.kind === "string" && p.content?.kind === p.kind),
    )
  );
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getSites(): ImportedSite[] {
  ensureLoaded();
  return sites;
}

export function getSite(id: string): ImportedSite | undefined {
  ensureLoaded();
  return sites.find((s) => s.id === id);
}

const _allComponents = memo<DetectedComponent[]>();
export function allComponents(): DetectedComponent[] {
  ensureLoaded();
  return _allComponents(() => sites.flatMap((s) => s.components));
}

/** จับกลุ่ม component ตาม structureKey (ข้ามทุกเว็บ) */
const _getGroups = memo<ComponentGroup[]>();
export function getGroups(): ComponentGroup[] {
  ensureLoaded();
  return _getGroups(() => computeGroups());
}

function computeGroups(): ComponentGroup[] {
  const map = new Map<string, ComponentGroup>();
  for (const c of allComponents()) {
    let g = map.get(c.structureKey);
    if (!g) {
      g = {
        structureKey: c.structureKey,
        type: c.type,
        members: [],
        standardMemberId: standards[c.structureKey] ?? null,
      };
      map.set(c.structureKey, g);
    }
    g.members.push(c);
  }
  return [...map.values()].sort((a, b) => b.members.length - a.members.length);
}

export function getGroup(structureKey: string): ComponentGroup | undefined {
  return getGroups().find((g) => g.structureKey === structureKey);
}

/**
 * สไตล์ที่ "ใช้จริง" ของ component หนึ่ง ๆ หลังการเลือก standard:
 * - ถ้ากลุ่มมี standard ที่เลือกไว้ -> ใช้ style ของ member ที่เป็น standard
 * - ถ้าไม่มี -> ใช้ style ดั้งเดิมของ component นั้น
 * (ข้อความ label/text ไม่ถูกแตะ — เปลี่ยนเฉพาะหน้าตา)
 */
export function effectiveStyle(c: DetectedComponent): ComponentStyle {
  ensureLoaded();
  const stdId = standards[c.structureKey];
  if (!stdId) return c.style;
  const std = allComponents().find((x) => x.id === stdId);
  return std ? std.style : c.style;
}

/** มี standard ถูกเลือกสำหรับ structureKey นี้ไหม */
export function standardOf(structureKey: string): string | null {
  ensureLoaded();
  return standards[structureKey] ?? null;
}

export function centralStyle(type: ComponentType): ComponentStyle {
  return CENTRAL_STYLE[type];
}

/**
 * สไตล์ "หลัง standardize" (after) ที่จะใช้โชว์ใน before→after:
 * - ถ้ากลุ่มมี standard ที่เลือกไว้ -> ใช้ style ของ member นั้น
 * - ถ้ายังไม่เลือก -> fallback เป็น central style ของชนิด component นั้น
 * ต่างจาก effectiveStyle() ตรงที่ "always" คืนหน้าตามาตรฐาน (ไม่คืน raw)
 * จึงเหมาะกับการเทียบ raw ↔ standardized แม้ยังไม่ได้เลือก standard
 */
export function standardizedStyle(c: DetectedComponent): ComponentStyle {
  ensureLoaded();
  const stdId = standards[c.structureKey];
  if (stdId) {
    const std = allComponents().find((x) => x.id === stdId);
    if (std) return std.style;
  }
  return CENTRAL_STYLE[c.type];
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** เลือก member เป็น standard ของกลุ่ม */
export function setStandard(structureKey: string, memberId: string): void {
  ensureLoaded();
  standards[structureKey] = memberId;
  // อัปเดตสถานะเว็บเป็น standardized เมื่อมีการเลือกอย่างน้อยหนึ่งกลุ่ม
  for (const s of sites) if (s.status !== "standardized") s.status = "standardized";
  persist();
  emit();
}

export function clearStandard(structureKey: string): void {
  ensureLoaded();
  delete standards[structureKey];
  persist();
  emit();
}

/**
 * จำลองการ import เว็บใหม่ (mock) จากชื่อ/ไฟล์
 * ใช้ template Acme ชุดเดียว (multi-page) แล้ว clone พร้อม re-id page/component
 * ให้ไม่ชนกับเว็บอื่น — page ids ของ template อิง id ของเว็บ จึงปลอดภัยอยู่แล้ว
 */
export function importSite(name: string, domain = "uploaded.example.com"): ImportedSite {
  ensureLoaded();
  const newId = `site-${Date.now().toString(36)}`;
  const site = makeSiteTemplate(newId, name, domain);
  site.importedAt = new Date().toISOString();
  site.status = "analyzed";
  sites = [site, ...sites];
  persist();
  emit();
  return site;
}

export function removeSite(id: string): void {
  ensureLoaded();
  sites = sites.filter((s) => s.id !== id);
  persist();
  emit();
}

/** รีเซ็ตกลับไปข้อมูล seed */
export function resetMock(): void {
  sites = structuredClone(MOCK_SITES);
  standards = {};
  persist();
  emit();
}

// ---------------------------------------------------------------------------
// Derived metrics (สำหรับ Dashboard / Mapping) — คำนวณจาก sites/groups ที่มีอยู่
// ไม่มีการยิง backend
// ---------------------------------------------------------------------------

export interface UiIssue {
  label: string;
  count: number;
  autoFixablePct: number;
}

/**
 * สรุปปัญหา UI รวมทุกเว็บ (mock) — อิงจากจำนวน component/variant ที่ยังไม่ standard
 * - ยิ่งหลาย variant ต่อกลุ่ม ยิ่งนับเป็น inconsistency มาก
 */
const _getUiIssues = memo<UiIssue[]>();
export function getUiIssues(): UiIssue[] {
  ensureLoaded();
  return _getUiIssues(() => computeUiIssues());
}

function computeUiIssues(): UiIssue[] {
  const groups = getGroups();
  const unresolved = groups.filter((g) => !g.standardMemberId);

  const distinctStyles = (keyFilter: (t: ComponentType) => boolean) =>
    unresolved
      .filter((g) => keyFilter(g.type))
      .reduce((acc, g) => acc + new Set(g.members.map((m) => styleSig(m))).size, 0);

  const colorVariety = unresolved.reduce(
    (acc, g) => acc + new Set(g.members.map((m) => m.style.background + m.style.color)).size,
    0,
  );
  const radiusVariety = unresolved.reduce(
    (acc, g) => acc + new Set(g.members.map((m) => m.style.borderRadius)).size,
    0,
  );
  const unmatched = groups.filter((g) => !g.standardMemberId).length;

  return [
    { label: "Non-standard colors", count: colorVariety * 13 + 7, autoFixablePct: 95 },
    { label: "Inconsistent typography", count: distinctStyles(() => true) * 9 + 4, autoFixablePct: 81 },
    { label: "Spacing violations", count: radiusVariety * 11 + 5, autoFixablePct: 84 },
    { label: "Unmatched components", count: unmatched * 6, autoFixablePct: 18 },
  ];
}

function styleSig(m: DetectedComponent): string {
  return `${m.style.fontSize}|${m.style.fontWeight}`;
}

export type ActivityStatus = "success" | "warning" | "review";
export interface ActivityItem {
  site: string;
  text: string;
  status: ActivityStatus;
  when: string;
}

/** รายการกิจกรรมล่าสุด (mock) อิงจากสถานะเว็บ + การเลือก standard */
const _getRecentActivity = memo<ActivityItem[]>();
export function getRecentActivity(): ActivityItem[] {
  ensureLoaded();
  return _getRecentActivity(() => computeRecentActivity());
}

function computeRecentActivity(): ActivityItem[] {
  const groups = getGroups();
  const unresolved = groups.filter((g) => !g.standardMemberId).length;
  const items: ActivityItem[] = [];
  for (const s of sites.slice(0, 5)) {
    if (s.status === "standardized") {
      items.push({ site: s.name, text: "standardized — components mapped", status: "success", when: "just now" });
    } else if (unresolved > 0) {
      items.push({
        site: s.name,
        text: `${unresolved} component group(s) need a standard`,
        status: "warning",
        when: "pending",
      });
    } else {
      items.push({ site: s.name, text: "analyzed — awaiting review", status: "review", when: "recent" });
    }
  }
  return items;
}

/** คะแนน compliance เฉลี่ยรวม */
export function getAvgCompliance(): number {
  ensureLoaded();
  if (sites.length === 0) return 0;
  return Math.round(sites.reduce((a, s) => a + s.complianceScore, 0) / sites.length);
}

/** เส้นแนวโน้ม compliance (mock, 12 จุด) ไต่ขึ้นมาจบที่ค่าเฉลี่ยปัจจุบัน */
const _getTrend = memo<number[]>();
export function getComplianceTrend(points = 12): number[] {
  ensureLoaded();
  return _getTrend(() => {
    const end = getAvgCompliance() || 80;
    const start = Math.max(40, end - 22);
    return Array.from({ length: points }, (_, i) =>
      Math.round(start + ((end - start) * i) / (points - 1)),
    );
  });
}

export interface MappingStatusSummary {
  matched: number;
  requiresReview: number;
  unmatched: number;
  total: number;
}

/** สรุปสถานะ mapping (ตาม mockup: Matched / Requires review / Unmatched) */
const _getMappingStatus = memo<MappingStatusSummary>();
export function getMappingStatus(): MappingStatusSummary {
  ensureLoaded();
  return _getMappingStatus(() => computeMappingStatus());
}

function computeMappingStatus(): MappingStatusSummary {
  const groups = getGroups();
  let matched = 0;
  let requiresReview = 0;
  let unmatched = 0;
  for (const g of groups) {
    const styleCount = new Set(g.members.map((m) => effStyleSig(m))).size;
    if (g.standardMemberId) matched += 1;
    else if (styleCount > 1) requiresReview += 1;
    else unmatched += 1;
  }
  return { matched, requiresReview, unmatched, total: groups.length };
}

function effStyleSig(m: DetectedComponent): string {
  const s = m.style;
  return `${s.background}|${s.color}|${s.borderRadius}|${s.borderColor}|${s.padding}|${s.fontWeight}|${s.fontSize}`;
}

/**
 * ค่าความมั่นใจของการจับคู่ (mock) — ตัวที่ถูกเลือก standard = สูงสุด
 * ตัวที่หน้าตาใกล้ central = สูง, ตัวที่ต่างมาก = ต่ำ
 */
export function confidenceOf(group: ComponentGroup, member: DetectedComponent): number {
  // base จากจำนวนเว็บที่ใช้สไตล์นี้ (ยิ่งนิยม ยิ่งมั่นใจ)
  const sig = effStyleSig(member);
  const sameStyleCount = group.members.filter((m) => effStyleSig(m) === sig).length;
  const popularity = sameStyleCount / group.members.length; // 0..1
  const chosen = group.standardMemberId === member.id ? 0.08 : 0;
  const pct = Math.round((0.72 + popularity * 0.24 + chosen) * 100);
  return Math.min(99, pct);
}
