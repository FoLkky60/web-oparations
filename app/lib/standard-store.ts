"use client";

/*
 * ============================================================================
 * ADD-04 — Standard store (client, mock only) — Phase C
 *
 * - ข้อมูล static (sites / categories / variants / built projects) มาจาก standard-data.ts
 *   ไม่ถูกแก้ (RULE-01: ต้นฉบับไม่ถูกเขียนทับ)
 * - state ที่เปลี่ยนได้ = BuilderState (draft / published / toggles) เก็บใน localStorage
 *   key "oper.standard.v1" (แยกจาก mock-store เดิมของ ADD-02)
 * - pattern เดียวกับ mock-store: subscribe + version + memo (reference คงที่สำหรับ useSyncExternalStore)
 * - Hydration: ทั้ง server และ render แรกฝั่ง client ใช้ seed เสมอ แล้วค่อยโหลด localStorage
 *   ตอน subscribe ครั้งแรก (หลัง mount) → ไม่มี hydration mismatch
 * - ไม่มี network call ใด ๆ
 * ============================================================================
 */

import type {
  BuilderState,
  BuilderToggles,
  BuiltProject,
  Category,
  CategoryId,
  DecisionStatus,
  ImportedWebsite,
  MockNotification,
  SiteId,
  SiteImpact,
  Variant,
  VariantStyle,
} from "./standard-types";
import { CATEGORY_IDS } from "./standard-types";
import {
  BUILT_PROJECTS,
  CATEGORIES,
  NOTIFICATIONS,
  PORTFOLIO_STATS,
  SEED_BUILDER_STATE,
  SITES,
  TRANSFORMATION_ACTIVITY,
  VARIANTS,
} from "./standard-data";

const LS_KEY = "oper.standard.v1";

// ---------------------------------------------------------------------------
// Static indexes (คำนวณครั้งเดียว — reference คงที่ตลอดอายุแอป)
// ---------------------------------------------------------------------------

const VARIANT_BY_ID = new Map<string, Variant>(VARIANTS.map((v) => [v.id, v]));
const VARIANTS_BY_CATEGORY = new Map<CategoryId, Variant[]>(
  CATEGORY_IDS.map((c) => [c, VARIANTS.filter((v) => v.categoryId === c)]),
);
const CATEGORY_BY_ID = new Map<CategoryId, Category>(CATEGORIES.map((c) => [c.id, c]));
const SITE_BY_ID = new Map<string, ImportedWebsite>(SITES.map((s) => [s.id, s]));

function variantKey(siteId: SiteId, categoryId: CategoryId) {
  return `${categoryId}-${siteId}`;
}

// ---------------------------------------------------------------------------
// Mutable state + subscription
// ---------------------------------------------------------------------------

let state: BuilderState = structuredClone(SEED_BUILDER_STATE);
let loaded = false;
let version = 0;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l();
}

function commit(next: BuilderState) {
  state = next;
  version += 1;
  persist();
  notify();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // โหลด localStorage ครั้งแรกหลัง mount (ดูหมายเหตุ hydration ด้านบน)
  if (!loaded) {
    loaded = true;
    const fromStorage = readStorage();
    if (fromStorage) {
      state = fromStorage;
      version += 1;
      queueMicrotask(notify);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (error) {
    // mock only — quota/private mode ไม่ทำให้แอปพัง
    console.warn("standard-store: unable to persist builder state", { error: String(error) });
  }
}

function readStorage(): BuilderState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isBuilderState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const DECISION_STATUSES: readonly DecisionStatus[] = [
  "decided",
  "skipped",
  "choosing",
  "pending",
  "not-started",
];

function isVariantOf(id: unknown, categoryId: CategoryId): boolean {
  return typeof id === "string" && VARIANT_BY_ID.get(id)?.categoryId === categoryId;
}

/** shape guard — ข้อมูลไม่ตรง → fallback เป็น seed */
function isBuilderState(data: unknown): data is BuilderState {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<BuilderState>;
  const draft = d.draft;
  const published = d.published;
  const toggles = d.toggles;
  if (!draft || !published || !toggles) return false;
  if (typeof draft.version !== "string" || typeof published.version !== "string") return false;
  if (typeof published.publishedAt !== "string") return false;
  if (draft.savedAt !== null && typeof draft.savedAt !== "string") return false;
  if (typeof toggles.enforceAll !== "boolean" || typeof toggles.autoRebuild !== "boolean") return false;
  if (!draft.decisions || !draft.pickedVariantId || !published.decisions) return false;
  return CATEGORY_IDS.every((c) => {
    const dec = draft.decisions[c];
    if (!dec || !DECISION_STATUSES.includes(dec.status)) return false;
    if (dec.variantId !== null && !isVariantOf(dec.variantId, c)) return false;
    if (dec.status === "decided" && dec.variantId === null) return false;
    const picked = draft.pickedVariantId[c];
    if (picked !== null && !isVariantOf(picked, c)) return false;
    return isVariantOf(published.decisions[c], c);
  });
}

/** memoize ตาม version — คืน reference เดิมจนกว่า state จะเปลี่ยน */
function memo<T>(compute: () => T): () => T {
  let cachedVersion = -1;
  let cached: T;
  return () => {
    if (cachedVersion !== version) {
      cached = compute();
      cachedVersion = version;
    }
    return cached;
  };
}

// ---------------------------------------------------------------------------
// Queries — static data
// ---------------------------------------------------------------------------

export function getBuilderState(): BuilderState {
  return state;
}

export function getSites(): ImportedWebsite[] {
  return SITES;
}

export function getSite(siteId: string): ImportedWebsite | undefined {
  return SITE_BY_ID.get(siteId);
}

export function getCategories(): Category[] {
  return CATEGORIES;
}

export function getCategory(categoryId: CategoryId): Category {
  return CATEGORY_BY_ID.get(categoryId) as Category;
}

export function getVariants(categoryId: CategoryId): Variant[] {
  return VARIANTS_BY_CATEGORY.get(categoryId) ?? [];
}

export function getVariant(variantId: string): Variant | undefined {
  return VARIANT_BY_ID.get(variantId);
}

/** variant ของเว็บหนึ่งใน category หนึ่ง (seed มีครบทุกคู่) */
export function getSiteVariant(siteId: SiteId, categoryId: CategoryId): Variant {
  return VARIANT_BY_ID.get(variantKey(siteId, categoryId)) as Variant;
}

export function getBuiltProjects(): BuiltProject[] {
  return BUILT_PROJECTS;
}

export function getBuiltProject(projectId: string): BuiltProject | undefined {
  return BUILT_PROJECTS.find((p) => p.id === projectId);
}

export function getBuiltProjectForSite(siteId: SiteId): BuiltProject | undefined {
  return BUILT_PROJECTS.find((p) => p.siteId === siteId);
}

/** สไตล์ต้นฉบับของเว็บ (ไม่เปลี่ยนตาม decision — RULE-01) */
export function sourceStyle(siteId: SiteId, categoryId: CategoryId): VariantStyle {
  return getSiteVariant(siteId, categoryId).style;
}

/** total instance ของ category ทุกเว็บ (เช่น button = 187) */
export function categoryUsageTotal(categoryId: CategoryId): number {
  return getVariants(categoryId).reduce((sum, v) => sum + v.usage.count, 0);
}

// ---------------------------------------------------------------------------
// Queries — standard (ขึ้นกับ state)
// ---------------------------------------------------------------------------

export function publishedVariant(categoryId: CategoryId): Variant {
  return VARIANT_BY_ID.get(state.published.decisions[categoryId]) as Variant;
}

/** สไตล์ของ variant ที่ publish อยู่ (ใช้ render built projects) */
export function publishedStyle(categoryId: CategoryId): VariantStyle {
  return publishedVariant(categoryId).style;
}

export function decidedCount(): number {
  return CATEGORY_IDS.filter((c) => state.draft.decisions[c].status === "decided").length;
}

/** จำนวน category ที่ยังไม่ decided (ไม่นับ skipped) — ใช้เป็น warning ก่อน apply */
export function openCategoryCount(): number {
  return CATEGORY_IDS.filter((c) => {
    const s = state.draft.decisions[c].status;
    return s !== "decided" && s !== "skipped";
  }).length;
}

const STYLE_FIELDS: (keyof VariantStyle)[] = [
  "fill",
  "text",
  "hoverFill",
  "disabledFill",
  "radius",
  "height",
  "paddingX",
  "fontFamily",
  "fontWeight",
  "fontSize",
  "border",
  "textTransform",
];

function normalize(value: VariantStyle[keyof VariantStyle]): string {
  if (value === undefined) return "none";
  return String(value).trim().toLowerCase();
}

/** สัดส่วน field ที่ตรงกัน (0..1) — deterministic */
export function styleSimilarity(a: VariantStyle, b: VariantStyle): number {
  const same = STYLE_FIELDS.filter((f) => normalize(a[f]) === normalize(b[f])).length;
  return same / STYLE_FIELDS.length;
}

const impactCache = new Map<string, SiteImpact[]>();

/**
 * ผลกระทบต่อแต่ละเว็บ ถ้าใช้ variantId เป็นมาตรฐานของ categoryId
 *  - source  = เว็บนี้คือต้นทางของ variant
 *  - match   = สไตล์เดิมตรงกับ variant ทุก field อยู่แล้ว (ไม่ต้องแทน)
 *  - replace = ต้องแทนด้วยมาตรฐาน
 * ขึ้นกับ static data เท่านั้น → cache ถาวรได้ (reference คงที่)
 */
export function impactFor(categoryId: CategoryId, variantId: string): SiteImpact[] {
  const key = `${categoryId}|${variantId}`;
  const cached = impactCache.get(key);
  if (cached) return cached;
  const chosen = VARIANT_BY_ID.get(variantId);
  const result: SiteImpact[] = SITES.map((site) => {
    const v = getSiteVariant(site.id, categoryId);
    let status: SiteImpact["status"] = "replace";
    if (chosen && v.id === chosen.id) status = "source";
    else if (chosen && styleSimilarity(v.style, chosen.style) === 1) status = "match";
    return { siteId: site.id, status, count: v.usage.count };
  });
  impactCache.set(key, result);
  return result;
}

/**
 * Compliance ของเว็บต้นฉบับเทียบมาตรฐานที่ publish อยู่ (0–100, deterministic)
 * ต่อ category: variant ของเว็บ = มาตรฐาน → 1, ไม่ใช่ → styleSimilarity กับมาตรฐาน
 * แล้วถ่วงน้ำหนักด้วยจำนวน instance (usage.count)
 */
export function siteCompliance(siteId: SiteId): number {
  let weighted = 0;
  let total = 0;
  for (const c of CATEGORY_IDS) {
    const v = getSiteVariant(siteId, c);
    const pub = publishedVariant(c);
    const score = v.id === pub.id ? 1 : styleSimilarity(v.style, pub.style);
    weighted += score * v.usage.count;
    total += v.usage.count;
  }
  return total === 0 ? 0 : Math.round((weighted / total) * 100);
}

/** จำนวน category ที่เว็บนี้ตรงมาตรฐานอยู่แล้ว (source หรือ match) */
export function siteMatchedCategories(siteId: SiteId): number {
  return CATEGORY_IDS.filter((c) => {
    const impact = impactFor(c, state.published.decisions[c]).find((i) => i.siteId === siteId);
    return impact ? impact.status !== "replace" : false;
  }).length;
}

export interface SiteSummary {
  site: ImportedWebsite;
  compliance: number;
  matchedCategories: number;
  builtProject?: BuiltProject;
}

export const getSiteSummaries = memo<SiteSummary[]>(() =>
  SITES.map((site) => ({
    site,
    compliance: siteCompliance(site.id),
    matchedCategories: siteMatchedCategories(site.id),
    builtProject: getBuiltProjectForSite(site.id),
  })),
);

export interface DashboardMetrics {
  /** compliance เฉลี่ยของ 5 เว็บต้นฉบับ (ถ่วงตาม componentCount) */
  avgSourceCompliance: number;
  totalComponents: number;
  totalVariants: number;
  decided: number;
  totalCategories: number;
}

export const getDashboardMetrics = memo<DashboardMetrics>(() => {
  const summaries = getSiteSummaries();
  const totalComponents = SITES.reduce((s, x) => s + x.componentCount, 0);
  const weighted = summaries.reduce((s, x) => s + x.compliance * x.site.componentCount, 0);
  return {
    avgSourceCompliance: totalComponents === 0 ? 0 : Math.round(weighted / totalComponents),
    totalComponents,
    totalVariants: VARIANTS.length,
    decided: decidedCount(),
    totalCategories: CATEGORY_IDS.length,
  };
});

export interface NavCounts {
  /** Project Catalog — portfolio total (mock constant ใน standard-data) */
  projects: number;
  /** Template & Builder — category ที่ยังเปิดอยู่ใน draft */
  builderOpen: number;
  /** Transformation History — กิจกรรมที่ต้องดู (warning/review) */
  transformationsAttention: number;
  importedWebsites: number;
  builtProjects: number;
}

export const getNavCounts = memo<NavCounts>(() => ({
  projects: PORTFOLIO_STATS.find((s) => s.id === "total")?.value ?? SITES.length,
  builderOpen: openCategoryCount(),
  transformationsAttention: TRANSFORMATION_ACTIVITY.filter((a) => a.status !== "success").length,
  importedWebsites: SITES.length,
  builtProjects: BUILT_PROJECTS.length,
}));

export const getNotifications = memo<MockNotification[]>(() => {
  const open = openCategoryCount();
  const derived: MockNotification[] =
    open > 0
      ? [
          {
            id: "n-draft",
            text: `Draft v${state.draft.version} has ${open} ${open === 1 ? "category" : "categories"} still open`,
            at: state.draft.savedAt ?? state.published.publishedAt,
          },
        ]
      : [];
  return [...derived, ...NOTIFICATIONS];
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function cloneState(): BuilderState {
  return structuredClone(state);
}

/** เลือก radio (ก่อน Confirm) — คืน false ถ้า variant ไม่อยู่ใน category */
export function pickVariant(categoryId: CategoryId, variantId: string): boolean {
  if (!isVariantOf(variantId, categoryId)) return false;
  const next = cloneState();
  next.draft.pickedVariantId[categoryId] = variantId;
  // category ที่ decided แล้ว: คง decision เดิมไว้จนกว่าจะกด Confirm ใหม่ (เปลี่ยนแค่ radio)
  if (next.draft.decisions[categoryId].status !== "decided") {
    next.draft.decisions[categoryId] = { variantId: null, status: "choosing" };
  }
  commit(next);
  return true;
}

/** Confirm <Category> Standard — ใช้ variant ที่ pick ไว้ คืน false ถ้ายังไม่ได้ pick */
export function confirmCategory(categoryId: CategoryId): boolean {
  const picked = state.draft.pickedVariantId[categoryId];
  if (!picked || !isVariantOf(picked, categoryId)) return false;
  const next = cloneState();
  next.draft.decisions[categoryId] = { variantId: picked, status: "decided" };
  commit(next);
  return true;
}

/** Skip — ไม่ตัดสิน category นี้ใน draft นี้ (มาตรฐานเดิมที่ publish อยู่ยังใช้ต่อ) */
export function skipCategory(categoryId: CategoryId): void {
  const next = cloneState();
  next.draft.decisions[categoryId] = { variantId: null, status: "skipped" };
  next.draft.pickedVariantId[categoryId] = null;
  commit(next);
}

/** Save Draft — บันทึกเวลา (state persist ทุก action อยู่แล้ว) คืน ISO time */
export function saveDraft(): string {
  const next = cloneState();
  next.draft.savedAt = new Date().toISOString();
  commit(next);
  return next.draft.savedAt as string;
}

export function setToggle(key: keyof BuilderToggles, value: boolean): void {
  const next = cloneState();
  next.toggles[key] = value;
  commit(next);
}

export interface ApplyResult {
  publishedVersion: string;
  nextDraftVersion: string;
  applied: CategoryId[];
  /** category ที่ยังไม่ decided ตอน apply (คงมาตรฐานเดิม) */
  unchanged: CategoryId[];
  enforced: boolean;
  /** จำนวน team workspace ที่ rebuild (0 ถ้าปิด Auto-rebuild) */
  rebuiltWorkspaces: number;
  publishedAt: string;
}

function bumpPatch(v: string): string {
  const parts = v.split(".").map((n) => Number.parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return `${v}.1`;
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

/**
 * Apply Standard to All Projects (+ publish)
 * published ← decided categories ของ draft ทับบน published เดิม
 * published.version ← draft.version แล้ว bump draft (3.2.2 → 3.2.3)
 * คืน null ถ้าไม่มี category ที่ decided เลย
 */
export function applyToAllProjects(): ApplyResult | null {
  const applied = CATEGORY_IDS.filter((c) => state.draft.decisions[c].status === "decided");
  if (applied.length === 0) return null;
  const next = cloneState();
  for (const c of applied) {
    const id = next.draft.decisions[c].variantId;
    if (id) next.published.decisions[c] = id;
  }
  const publishedAt = new Date().toISOString();
  next.published.version = next.draft.version;
  next.published.publishedAt = publishedAt;
  next.draft.version = bumpPatch(next.draft.version);
  next.draft.savedAt = publishedAt;
  commit(next);
  return {
    publishedVersion: next.published.version,
    nextDraftVersion: next.draft.version,
    applied,
    unchanged: CATEGORY_IDS.filter((c) => !applied.includes(c)),
    enforced: next.toggles.enforceAll,
    rebuiltWorkspaces: next.toggles.autoRebuild ? BUILT_PROJECTS.length : 0,
    publishedAt,
  };
}

/** คืนค่า seed (published v3.2.1 + draft v3.2.2) */
export function resetStandard(): void {
  commit(structuredClone(SEED_BUILDER_STATE));
}
