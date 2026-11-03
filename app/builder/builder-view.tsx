"use client";

/*
 * ============================================================================
 * ADD-04 Phase D — Component Standard Builder (§4.3)
 * อ้างอิง: .aidlc/specs/ui-standardization-platform/change-request-ADD-04.md §3, §4.3, §6, §8.1, §10
 *
 * - state ทั้งหมดมาจาก standard-store (mock, localStorage) ผ่าน useStandard — ไม่มี network call
 * - ตัวเลขทุกตัว derive จาก store/data (ไม่มี hardcode ที่ drift ได้)
 * - preview ของ variant / impact ใช้ std components จริง (StyleResolverProvider + StdStyleOverride)
 *   → หน้าตาตรงกับเว็บต้นฉบับ/standardized build ของ 5 เว็บ (ADD-05)
 * - ต้นฉบับไม่ถูกแก้ (RULE-01): Original preview อ่าน sourceStyle เสมอ
 * - UI ของแอปใช้ CSS variables เท่านั้น; hex ที่ปรากฏ (swatch) คือ DATA ของเว็บต้นฉบับ
 * ============================================================================
 */

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  IconAlert,
  IconArrowRight,
  IconBox,
  IconButtonShape,
  IconCard,
  IconCheck,
  IconClose,
  IconFooter,
  IconGlobe,
  IconNavBar,
  IconRefresh,
  IconSave,
  IconTable,
  IconTag,
  IconTextField,
  IconUpload,
} from "../components/icons";
import { Button, Chip, EmptyState, LinkButton, StatusPill } from "../components/ui";
import {
  StdBadge,
  StdButton,
  StdCard,
  StdFooter,
  StdInput,
  StdNav,
  StdStyleOverride,
  StdTable,
  StyleResolverProvider,
  type StyleResolver,
} from "../components/std";
import { DESIGN_SYSTEM_META, SEED_BUILDER_STATE, STANDARD_TOKENS } from "../lib/standard-data";
import { DECISION_STATUS, IMPACT_STATUS, formatDateTime, siteBuildStatus } from "../lib/standard-labels";
import {
  applyToAllProjects,
  categoryUsageTotal,
  confirmCategory,
  decidedCount,
  getBuilderState,
  getCategories,
  getCategory,
  getSiteBuild,
  getSite,
  getSites,
  getVariant,
  getVariants,
  impactFor,
  openCategoryCount,
  pickVariant,
  rebuildWorkspaces,
  resetStandard,
  saveDraft,
  setToggle,
  skipCategory,
  sourceStyle,
  type ApplyResult,
} from "../lib/standard-store";
import type {
  BuilderState,
  CategoryId,
  SiteId,
  StandardToken,
  Variant,
  VariantStyle,
  VariantType,
} from "../lib/standard-types";
import { CATEGORY_IDS } from "../lib/standard-types";
import { useStandard } from "../lib/use-standard";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_ICON: Record<CategoryId, (p: { size?: number }) => ReactNode> = {
  button: (p) => <IconButtonShape {...p} />,
  input: (p) => <IconTextField {...p} />,
  card: (p) => <IconCard {...p} />,
  navbar: (p) => <IconNavBar {...p} />,
  table: (p) => <IconTable {...p} />,
  badge: (p) => <IconTag {...p} />,
  footer: (p) => <IconFooter {...p} />,
};

const CATEGORY_PLURAL: Record<CategoryId, string> = {
  button: "buttons",
  input: "input fields",
  card: "cards",
  navbar: "navigation bars",
  table: "data tables",
  badge: "badges",
  footer: "footers",
};

const VARIANT_TYPES: { id: VariantType; label: string }[] = [
  { id: "primary", label: "Primary" },
  { id: "secondary", label: "Secondary" },
  { id: "ghost", label: "Ghost" },
];

type PreviewState = "default" | "hover" | "focus" | "disabled" | "success" | "warning" | "danger";

const STATE_LABEL: Record<PreviewState, string> = {
  default: "Default",
  hover: "Hover",
  focus: "Focus",
  disabled: "Disabled",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
};

/** states ในตาราง variant (คอลัมน์ Variant states) */
const TABLE_STATES: Record<CategoryId, PreviewState[]> = {
  button: ["default", "hover", "disabled"],
  input: ["default", "focus", "disabled"],
  badge: ["success", "warning", "danger"],
  card: ["default"],
  navbar: ["default"],
  table: ["default"],
  footer: ["default"],
};

/** states ในแผง Selected Standard */
const PANEL_STATES: Record<CategoryId, PreviewState[]> = {
  ...TABLE_STATES,
  button: ["default", "hover", "focus", "disabled"],
};

type SortKey = "source" | "usage";
type RightTab = "selected" | "tokens";

// ---------------------------------------------------------------------------
// Helpers (pure)
// ---------------------------------------------------------------------------

function isOpen(state: BuilderState, c: CategoryId): boolean {
  const s = state.draft.decisions[c].status;
  return s !== "decided" && s !== "skipped";
}

/** category แรกที่ควรเปิด: กำลัง choosing → ยังไม่ตัดสิน → button */
function initialCategory(state: BuilderState): CategoryId {
  return (
    CATEGORY_IDS.find((c) => state.draft.decisions[c].status === "choosing") ??
    CATEGORY_IDS.find((c) => isOpen(state, c)) ??
    CATEGORY_IDS[0]
  );
}

/** category ถัดไปที่ยังไม่ decided/skipped (วนรอบ) — null ถ้าไม่เหลือ */
function nextOpenCategory(state: BuilderState, from: CategoryId): CategoryId | null {
  const start = CATEGORY_IDS.indexOf(from);
  for (let i = 1; i < CATEGORY_IDS.length; i += 1) {
    const c = CATEGORY_IDS[(start + i) % CATEGORY_IDS.length];
    if (isOpen(state, c)) return c;
  }
  return null;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function typographyText(s: VariantStyle): string {
  return `${s.fontFamily} · ${s.fontWeight} · ${s.fontSize}px`;
}

function siteName(siteId: SiteId): string {
  return getSite(siteId)?.name ?? siteId;
}

function fillToken(style: VariantStyle): StandardToken | undefined {
  return STANDARD_TOKENS.find((t) => t.group === "color" && t.value.toLowerCase() === style.fill.toLowerCase());
}

/** token ของ active standard ที่ค่าตรงกับ variant (fill/text/hover · radius · height · padding · typography) */
function tokensUsedBy(style?: VariantStyle): Set<string> {
  const used = new Set<string>();
  if (!style) return used;
  const colors = [style.fill, style.text, style.hoverFill].map((c) => c.toLowerCase());
  for (const t of STANDARD_TOKENS) {
    const hit =
      (t.group === "color" && colors.includes(t.value.toLowerCase())) ||
      (t.group === "radius" && t.value === `${style.radius}px`) ||
      (t.group === "size" && t.value === `${style.height}px`) ||
      (t.group === "space" && t.value === `${style.paddingX}px`) ||
      (t.group === "font" &&
        !!t.typography &&
        t.typography.family === style.fontFamily &&
        t.typography.weight === style.fontWeight &&
        t.typography.size === style.fontSize);
    if (hit) used.add(t.name);
  }
  return used;
}

/** resolver คงที่ต่อเว็บ (สไตล์ต้นฉบับ — RULE-01) */
const siteResolverCache = new Map<SiteId, StyleResolver>();
function siteResolver(siteId: SiteId): StyleResolver {
  let r = siteResolverCache.get(siteId);
  if (!r) {
    r = (c) => sourceStyle(siteId, c);
    siteResolverCache.set(siteId, r);
  }
  return r;
}

// relative time — server/hydration = null (แสดงเวลาแบบ absolute) แล้วค่อยเป็น relative หลัง mount
const TICK_MS = 30_000;
function subscribeTick(cb: () => void) {
  const id = window.setInterval(cb, TICK_MS);
  return () => window.clearInterval(id);
}
function tickSnapshot() {
  return Math.floor(Date.now() / TICK_MS);
}
function useNowTick(): number | null {
  return useSyncExternalStore(subscribeTick, tickSnapshot, () => null);
}
function savedText(iso: string, tick: number | null): string {
  const absolute = `${formatDateTime(iso)} UTC`;
  if (tick === null) return absolute;
  const diff = tick * TICK_MS - new Date(iso).getTime();
  if (diff < -60_000) return absolute;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return absolute;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ---------------------------------------------------------------------------
// Small UI pieces (app tokens)
// ---------------------------------------------------------------------------

const PANEL = "rounded-[var(--radius-large)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-sm)]";

function SiteAvatar({ siteId }: { siteId: SiteId }) {
  const site = getSite(siteId);
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-medium)] bg-[var(--color-surface-muted)] text-xs font-bold text-[var(--color-text)]"
    >
      {site?.code ?? "--"}
    </span>
  );
}

/** สีของเว็บต้นฉบับ (DATA) + hex เป็นข้อความเสมอ */
function Swatch({ hex }: { hex: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 shrink-0 rounded-[var(--radius-small)] border border-[var(--color-border)]"
        style={{ background: hex }}
      />
      <span className="font-mono">{hex.toUpperCase()}</span>
    </span>
  );
}

function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max} (${pct}%)`}
      className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
    >
      <div
        className="h-full rounded-full bg-[var(--color-success)] transition-[width] duration-[var(--dur-base)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Tabs<T extends string>({
  idBase,
  label,
  tabs,
  value,
  onChange,
}: {
  idBase: string;
  label: string;
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.id === value);
    let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = tabs.length - 1;
    if (n < 0) return;
    e.preventDefault();
    const next = tabs[n].id;
    onChange(next);
    document.getElementById(`${idBase}-tab-${next}`)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex flex-wrap gap-1 border-b border-[var(--color-border)]">
      {tabs.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            id={`${idBase}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idBase}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm transition-colors duration-[var(--dur-fast)] ${
              selected
                ? "border-[var(--color-primary)] font-semibold text-[var(--color-text)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="rounded-full bg-[var(--color-surface-muted)] px-1.5 text-xs font-medium text-[var(--color-text)]">
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 pt-2.5">
        <span id={`${id}-label`} className="block text-sm font-medium text-[var(--color-text)]">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="mt-0.5 block text-xs text-[var(--color-muted)]">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-1 text-xs font-medium text-[var(--color-text)]"
      >
        <span
          aria-hidden="true"
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-[var(--dur-fast)] ${
            checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-muted)]"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-[var(--color-background)] shadow-[var(--shadow-sm)] transition-transform duration-[var(--dur-fast)] ${
              checked ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </span>
        <span aria-hidden="true" className="w-6">
          {checked ? "On" : "Off"}
        </span>
      </button>
    </div>
  );
}

/**
 * Modal — native <dialog> + showModal(): role=dialog, aria-modal, พื้นหลัง inert (focus trap),
 * Escape ปิดได้ (cancel event), คืน focus ให้ element เดิม (หรือ finalFocus ถ้าระบุ)
 */
function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  finalFocus,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  finalFocus?: () => HTMLElement | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-modal="true"
      aria-labelledby={titleId}
      onClose={() => {
        onClose();
        (finalFocus?.() ?? returnTo.current)?.focus();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--radius-large)] border border-[var(--color-border)] bg-[var(--color-background)] p-0 text-[var(--color-text)] shadow-[var(--shadow-lg)] backdrop:bg-[var(--color-sidebar)]/60"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close dialog"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-medium)] text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        >
          <IconClose size={18} />
        </button>
      </div>
      <div className="space-y-4 px-5 py-4 text-sm">{children}</div>
      <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border)] px-5 py-4 sm:flex-row sm:justify-end">
        {footer}
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Previews (std components — สไตล์จริงของ variant)
// ---------------------------------------------------------------------------

/** ย่อ component กว้าง (nav/table/footer) ให้เป็น thumbnail */
function Scaled({ width, height, scale, children }: { width: number; height: number; scale: number; children: ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-small)] border border-[var(--color-border)]"
      style={{ width: Math.round(width * scale), height: Math.round(height * scale) }}
    >
      <div className="@container origin-top-left" style={{ width, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

function PreviewBody({ categoryId, state }: { categoryId: CategoryId; state: PreviewState }) {
  switch (categoryId) {
    case "button":
      return (
        <StdButton
          previewState={state === "hover" ? "hover" : state === "focus" ? "focus" : undefined}
          disabled={state === "disabled"}
        >
          Submit
        </StdButton>
      );
    case "input":
      return (
        <div className="w-44">
          <StdInput
            label="Email"
            placeholder="name@company.com"
            previewState={state === "focus" ? "focus" : undefined}
            disabled={state === "disabled"}
          />
        </div>
      );
    case "badge": {
      const text = state === "warning" ? "Pending" : state === "danger" ? "Overdue" : "Paid";
      const tone = state === "warning" ? "warning" : state === "danger" ? "danger" : "success";
      return <StdBadge tone={tone}>{text}</StdBadge>;
    }
    case "card":
      return (
        <div className="w-48">
          <StdCard title="Your account" headingLevel={4}>
            <p className="text-xs">Business plan · 12 seats</p>
          </StdCard>
        </div>
      );
    case "navbar":
      return (
        <Scaled width={800} height={72} scale={0.32}>
          <StdNav
            ariaLabel="Preview navigation"
            brand={<span className="font-semibold">ACME</span>}
            links={[{ label: "Home", active: true }, { label: "Services" }, { label: "Billing" }, { label: "Support" }]}
            actions={<StdButton size="sm">Sign in</StdButton>}
          />
        </Scaled>
      );
    case "table":
      return (
        <Scaled width={560} height={170} scale={0.45}>
          <StdTable
            caption="Preview table"
            minWidth={0}
            rowKey={(r) => r.id}
            rows={[
              { id: "INV-1042", amount: "$1,200.00" },
              { id: "INV-1043", amount: "$860.00" },
              { id: "INV-1044", amount: "$2,450.00" },
            ]}
            columns={[
              { key: "id", header: "Invoice", render: (r) => r.id },
              { key: "amount", header: "Amount", render: (r) => r.amount, align: "end" },
            ]}
          />
        </Scaled>
      );
    case "footer":
      return (
        <Scaled width={800} height={96} scale={0.32}>
          <StdFooter
            brand={<span className="font-semibold">ACME</span>}
            links={[{ label: "Privacy" }, { label: "Terms" }, { label: "Contact" }]}
            copyright="© 2026 ACME Corp."
          />
        </Scaled>
      );
  }
}

/**
 * preview แบบตกแต่ง (aria-hidden + inert → ไม่รับ focus/คลิก) — ข้อความ state อยู่ใน figcaption
 * บริบทของเว็บ = sourceStyle(siteId) แล้ว override category ด้วย style ที่ต้องการแสดง
 */
function VariantPreview({
  siteId,
  categoryId,
  style,
  state,
}: {
  siteId: SiteId;
  categoryId: CategoryId;
  style: VariantStyle;
  state: PreviewState;
}) {
  return (
    <div aria-hidden="true" inert className="pointer-events-none select-none">
      <StyleResolverProvider resolver={siteResolver(siteId)}>
        <StdStyleOverride category={categoryId} style={style}>
          <PreviewBody categoryId={categoryId} state={state} />
        </StdStyleOverride>
      </StyleResolverProvider>
    </div>
  );
}

function StatePreviews({ variant, states }: { variant: Variant; states: PreviewState[] }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {states.map((s) => (
        <figure key={s} className="flex flex-col items-start gap-1">
          <VariantPreview siteId={variant.siteId} categoryId={variant.categoryId} style={variant.style} state={s} />
          <figcaption className="text-xs text-[var(--color-muted)]">{STATE_LABEL[s]}</figcaption>
        </figure>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function BuilderView() {
  const state = useStandard(getBuilderState);
  const tick = useNowTick();

  const categories = getCategories();
  const sites = getSites();
  const totalCategories = categories.length;
  const decided = decidedCount();
  const openCount = openCategoryCount();
  const totalVariants = categories.reduce((n, c) => n + getVariants(c.id).length, 0);
  const totalComponents = sites.reduce((n, s) => n + s.componentCount, 0);
  const decidedPct = totalCategories === 0 ? 0 : Math.round((decided / totalCategories) * 100);

  const [active, setActive] = useState<CategoryId>(() => initialCategory(getBuilderState()));
  const [variantType, setVariantType] = useState<VariantType>("primary");
  const [sort, setSort] = useState<SortKey>("source");
  const [rightTab, setRightTab] = useState<RightTab>("selected");
  const [announce, setAnnounce] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [result, setResult] = useState<ApplyResult | null>(null);

  const impactRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const focusResultNext = useRef(false);
  const ids = useId();

  // ---- active category derived ----
  const category = getCategory(active);
  const variants = getVariants(active);
  const projectCount = new Set(variants.map((v) => v.siteId)).size;
  const hasTypes = variants.some((v) => v.variantType !== undefined);
  const visible = variants
    .filter((v) => !hasTypes || (v.variantType ?? "primary") === variantType)
    .sort((a, b) =>
      sort === "usage" ? b.usage.count - a.usage.count : siteName(a.siteId).localeCompare(siteName(b.siteId)),
    );
  const decision = state.draft.decisions[active];
  const pickedId = state.draft.pickedVariantId[active];
  const picked = pickedId ? getVariant(pickedId) : undefined;
  const impact = picked ? impactFor(active, picked.id) : [];
  const replaceRows = impact.filter((i) => i.status === "replace");
  const replaceCount = replaceRows.reduce((n, i) => n + i.count, 0);
  const alreadyMatch = impact.filter((i) => i.status !== "replace").reduce((n, i) => n + i.count, 0);
  const usageTotal = categoryUsageTotal(active);
  const categoryPlural = CATEGORY_PLURAL[active];
  const usedTokens = tokensUsedBy(picked?.style);
  const matchedFillToken = picked ? fillToken(picked.style) : undefined;

  // ---- stepper ----
  const applied = result !== null;
  /** index ของขั้นปัจจุบัน (0-based); 5 = ทุกขั้นเสร็จ */
  const currentStep = applied ? 5 : openCount === 0 ? 3 : 2;
  const steps = [
    { label: "Import websites", sub: `${sites.length} projects` },
    { label: "Extract components", sub: `${totalComponents} components found` },
    { label: "Compare & choose", sub: "Admin picks the standard" },
    { label: "Apply to all projects", sub: "One click, every site" },
    { label: "Publish to teams", sub: "All imported websites" },
  ];

  // ---- apply dialog derived ----
  const decidedIds = CATEGORY_IDS.filter((c) => state.draft.decisions[c].status === "decided");
  const notDecidedIds = CATEGORY_IDS.filter((c) => state.draft.decisions[c].status !== "decided");

  // ---- handlers ----
  function selectCategory(c: CategoryId) {
    setActive(c);
    setVariantType("primary");
  }

  function handleConfirm() {
    const label = category.label;
    if (!confirmCategory(active)) return;
    const next = nextOpenCategory(getBuilderState(), active);
    if (next) {
      selectCategory(next);
      setAnnounce(`${label} standard confirmed. Now reviewing ${getCategory(next).label}.`);
    } else {
      setAnnounce(`${label} standard confirmed. All categories are decided or skipped.`);
    }
  }

  function handleSkip() {
    const label = category.label;
    skipCategory(active);
    const next = nextOpenCategory(getBuilderState(), active);
    if (next) {
      selectCategory(next);
      setAnnounce(`${label} skipped. It keeps the current published standard. Now reviewing ${getCategory(next).label}.`);
    } else {
      setAnnounce(`${label} skipped. All categories are decided or skipped.`);
    }
  }

  function handleSave() {
    saveDraft();
    setAnnounce(`Draft v${getBuilderState().draft.version} saved.`);
  }

  function reviewImpact() {
    const el = impactRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  }

  function confirmApply() {
    const r = applyToAllProjects();
    if (!r) {
      setApplyError("No decided categories to apply");
      return;
    }
    setApplyError(null);
    setResult(r);
    focusResultNext.current = true;
    setApplyOpen(false);
    setAnnounce(`Published Standard v${r.publishedVersion}.`);
  }

  function confirmReset() {
    resetStandard();
    setResult(null);
    selectCategory(initialCategory(getBuilderState()));
    setResetOpen(false);
    setAnnounce("Demo data reset to the seed standard.");
  }

  // =========================================================================
  return (
    <div className="flex flex-col gap-6">
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {/* ---------------- Header ---------------- */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-[var(--color-muted)]">
              <li>
                <Link href="/design-system" className="inline-flex min-h-11 items-center hover:text-[var(--color-text)] hover:underline">
                  Design System
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-[var(--color-text)]">
                Template &amp; Builder
              </li>
            </ol>
          </nav>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Component Standard Builder</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip>
              Draft v{state.draft.version} · {decided} of {totalCategories} categories decided
            </Chip>
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
              <IconSave size={14} />
              {state.draft.savedAt ? `Draft saved ${savedText(state.draft.savedAt, tick)}` : "Not saved yet"}
            </span>
            <span className="text-xs text-[var(--color-muted)]">· Published Standard v{state.published.version}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={handleSave}>
            <IconSave size={16} />
            Save Draft
          </Button>
          <LinkButton href="/upload" variant="primary">
            <IconUpload size={16} />
            Import Website
          </LinkButton>
        </div>
      </header>

      {/* ---------------- Stepper ---------------- */}
      <nav aria-label="Standardization flow" className={`${PANEL} px-4 py-3`}>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => {
            const done = i < currentStep;
            const current = i === currentStep;
            return (
              <li key={s.label} aria-current={current ? "step" : undefined} className="flex min-w-0 items-start gap-2">
                <span
                  aria-hidden="true"
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done
                      ? "bg-[var(--color-success)] text-[var(--color-on-primary)]"
                      : current
                        ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                        : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]"
                  }`}
                >
                  {done ? <IconCheck size={14} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm ${current ? "font-semibold" : "font-medium"} text-[var(--color-text)]`}>
                    {s.label}
                  </span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    {s.sub}
                    <span className="sr-only">{done ? " (completed)" : current ? " (current step)" : " (upcoming)"}</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ---------------- Apply result ---------------- */}
      {result && (
        <div
          ref={resultRef}
          tabIndex={-1}
          role="region"
          aria-labelledby={`${ids}-result-title`}
          className={`${PANEL} border-[var(--color-success)] p-4 focus-visible:outline-2 focus-visible:outline-offset-2`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-success)] text-[var(--color-on-primary)]">
                <IconCheck size={16} />
              </span>
              <div className="min-w-0">
                <h2 id={`${ids}-result-title`} className="font-semibold text-[var(--color-text)]">
                  Published Standard v{result.publishedVersion} · {result.applied.length}{" "}
                  {plural(result.applied.length, "category", "categories")} applied · {result.rebuiltWorkspaces}{" "}
                  {plural(result.rebuiltWorkspaces, "website", "websites")} rebuilt
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Applied: {result.applied.map((c) => getCategory(c).label).join(", ")}.
                  {result.unchanged.length > 0 &&
                    ` Kept the previous standard: ${result.unchanged.map((c) => getCategory(c).label).join(", ")}.`}{" "}
                  Enforce on all projects: {result.enforced ? "On" : "Off"}. New draft v{result.nextDraftVersion} started.
                </p>
                {state.workspaces.version !== state.published.version && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--color-text)]">
                    <StatusPill tone="warning" label={`Websites still built with v${state.workspaces.version}`} />
                    <Button
                      variant="primary"
                      onClick={() => {
                        const n = rebuildWorkspaces();
                        setAnnounce(`${n} websites rebuilt with Standard v${getBuilderState().published.version}.`);
                      }}
                    >
                      <IconRefresh size={16} />
                      Rebuild workspaces
                    </Button>
                  </div>
                )}
                <ul className="mt-2 flex flex-wrap gap-2">
                  {sites.map((s) => (
                    <li key={s.id}>
                      <LinkButton href={`/imported/${s.id}`}>
                        <IconBox size={16} />
                        {s.name}
                        <span className="text-xs text-[var(--color-muted)]">Team {s.team}</span>
                      </LinkButton>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              aria-label="Dismiss publish result"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-medium)] text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
            >
              <IconClose size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ---------------- 3-column workspace ---------------- */}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[16rem_minmax(0,1fr)] 2xl:grid-cols-[17rem_minmax(0,1fr)_22rem]">
        {/* ======== Left: categories + sources ======== */}
        <aside aria-labelledby={`${ids}-cat-title`} className="grid min-w-0 gap-4 md:grid-cols-2 md:items-start xl:flex xl:flex-col">
          <section className={`${PANEL} p-4`} aria-labelledby={`${ids}-cat-title`}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 id={`${ids}-cat-title`} className="text-sm font-semibold text-[var(--color-text)]">
                Component categories
              </h2>
              <span className="text-xs text-[var(--color-muted)]">{totalVariants} variants</span>
            </div>
            <div className="mt-3 space-y-1.5">
              <p className="flex justify-between text-xs text-[var(--color-muted)]">
                <span>Decisions made</span>
                <span className="font-semibold text-[var(--color-text)]">
                  {decided} of {totalCategories}
                </span>
              </p>
              <Progress value={decided} max={totalCategories} label="Decisions made" />
            </div>
            <ul className="mt-3 space-y-1">
              {categories.map((c) => {
                const d = state.draft.decisions[c.id];
                const vs = getVariants(c.id);
                const projects = new Set(vs.map((v) => v.siteId)).size;
                const chosen = d.status === "decided" && d.variantId ? getVariant(d.variantId) : undefined;
                const isActive = c.id === active;
                const st = DECISION_STATUS[d.status];
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => selectCategory(c.id)}
                      className={`flex min-h-11 w-full items-start gap-3 rounded-[var(--radius-medium)] border px-3 py-2.5 text-left transition-colors duration-[var(--dur-fast)] ${
                        isActive
                          ? "border-[var(--color-primary)] bg-[var(--color-secondary)]"
                          : "border-transparent hover:bg-[var(--color-surface)]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-medium)] bg-[var(--color-surface-muted)] text-[var(--color-text)]"
                      >
                        {CATEGORY_ICON[c.id]({ size: 16 })}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[var(--color-text)]">{c.label}</span>
                        <span className="block text-xs text-[var(--color-muted)]">
                          {vs.length} variants · {projects} projects
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <StatusPill tone={st.tone} label={st.label} />
                          {chosen && (
                            <span className="text-xs text-[var(--color-muted)]">Chosen: {siteName(chosen.siteId)}</span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={`${PANEL} p-4`} aria-labelledby={`${ids}-src-title`}>
            <h2 id={`${ids}-src-title`} className="text-sm font-semibold text-[var(--color-text)]">
              Source websites <span className="font-normal text-[var(--color-muted)]">({totalComponents} components)</span>
            </h2>
            <ul className="mt-3 space-y-1">
              {sites.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/imported/${s.id}?view=original`}
                    className="flex min-h-11 items-center gap-3 rounded-[var(--radius-medium)] px-2 py-1.5 hover:bg-[var(--color-surface)]"
                  >
                    <SiteAvatar siteId={s.id} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[var(--color-text)]">{s.name}</span>
                      <span className="block text-xs text-[var(--color-muted)]">
                        Team {s.team} · {siteBuildStatus(getSiteBuild(s.id)).label}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">{s.componentCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex gap-2 rounded-[var(--radius-medium)] border border-[var(--color-info)] bg-[color-mix(in_srgb,var(--color-info)_8%,white)] p-3 text-xs text-[var(--color-text)]">
            <span className="mt-0.5 shrink-0 text-[var(--color-info)]">
              <IconAlert size={16} />
            </span>
            <p>
              <strong className="font-semibold">Admin decision required.</strong> The variant you choose is applied to
              every imported project. Nothing is restyled automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 self-start justify-self-start rounded-[var(--radius-medium)] px-2 text-xs text-[var(--color-muted)] underline-offset-4 hover:text-[var(--color-text)] hover:underline"
          >
            <IconRefresh size={14} />
            Reset demo data
          </button>
        </aside>

        {/* ======== Center: variants + impact ======== */}
        <div className="flex min-w-0 flex-col gap-4">
          <section className={`${PANEL} min-w-0 p-5`} aria-labelledby={`${ids}-var-title`}>
            <div className="flex flex-col gap-1">
              <h2 id={`${ids}-var-title`} className="text-lg font-bold text-[var(--color-text)]">
                {category.label}
              </h2>
              <p className="text-sm text-[var(--color-muted)]">
                {variants.length} variants from {projectCount} projects
              </p>
              <p id={`${ids}-var-desc`} className="text-sm text-[var(--color-muted)]">
                Select one variant to become the organization standard. It will replace every{" "}
                {category.label.toLowerCase()} style in all imported projects.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              {hasTypes ? (
                <Tabs
                  idBase={`${ids}-vt`}
                  label={`${category.label} variant types`}
                  value={variantType}
                  onChange={setVariantType}
                  tabs={VARIANT_TYPES.map((t) => ({
                    ...t,
                    count: variants.filter((v) => (v.variantType ?? "primary") === t.id).length,
                  }))}
                />
              ) : (
                <span />
              )}
              <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                Sort by
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="min-h-11 rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm text-[var(--color-text)]"
                >
                  <option value="source">Source project</option>
                  <option value="usage">Usage</option>
                </select>
              </label>
            </div>

            <div
              className="mt-4"
              {...(hasTypes
                ? { role: "tabpanel", id: `${ids}-vt-panel`, "aria-labelledby": `${ids}-vt-tab-${variantType}` }
                : {})}
            >
              {visible.length === 0 ? (
                <EmptyState
                  icon={CATEGORY_ICON[active]({ size: 22 })}
                  title={`No ${variantType} ${categoryPlural} extracted`}
                  description={`None of the ${projectCount} imported projects has a ${variantType} ${category.label.toLowerCase()} variant yet. Primary variants are listed in the Primary tab.`}
                />
              ) : (
                <div
                  role="region"
                  aria-label={`${category.label} variants table`}
                  tabIndex={0}
                  className="max-w-full overflow-x-auto rounded-[var(--radius-medium)] border border-[var(--color-border)]"
                >
                  <div role="radiogroup" aria-labelledby={`${ids}-var-title`} aria-describedby={`${ids}-var-desc`}>
                    <table className="w-full min-w-[860px] border-collapse text-sm">
                      <caption className="sr-only">
                        {category.label} variants: pick one to become the standard
                      </caption>
                      <thead>
                        <tr className="bg-[var(--color-surface)] text-left text-xs text-[var(--color-muted)]">
                          <th scope="col" className="w-14 px-3 py-2 font-semibold">Pick</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Source project</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Variant states</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Key specs</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Usage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((v) => {
                          const isPicked = pickedId === v.id;
                          const isChosen = decision.status === "decided" && decision.variantId === v.id;
                          const name = siteName(v.siteId);
                          return (
                            <tr
                              key={v.id}
                              className={`border-t border-[var(--color-border)] align-middle ${
                                isPicked
                                  ? "bg-[color-mix(in_srgb,var(--color-primary)_6%,white)] shadow-[inset_3px_0_0_var(--color-primary)]"
                                  : ""
                              }`}
                            >
                              <td className="px-1.5 py-3">
                                <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center">
                                  <input
                                    type="radio"
                                    name={`${ids}-pick-${active}`}
                                    value={v.id}
                                    checked={isPicked}
                                    onChange={() => pickVariant(active, v.id)}
                                    aria-label={`Use ${name} ${v.selector} as the ${category.label} standard`}
                                    className="h-[18px] w-[18px] cursor-pointer accent-[var(--color-primary)]"
                                  />
                                </label>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-start gap-2">
                                  <SiteAvatar siteId={v.siteId} />
                                  <div className="min-w-0">
                                    <p className="font-medium text-[var(--color-text)]">{name}</p>
                                    <p className="font-mono text-xs text-[var(--color-muted)]">{v.selector}</p>
                                    {(isChosen || isPicked) && (
                                      <p className="mt-1">
                                        {isChosen ? (
                                          <StatusPill tone="success" label="Chosen standard" />
                                        ) : (
                                          <StatusPill tone="info" label="Selected" icon={<IconCheck size={12} />} />
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <StatePreviews variant={v} states={TABLE_STATES[active]} />
                              </td>
                              <td className="px-3 py-3">
                                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-[var(--color-text)]">
                                  <dt className="text-[var(--color-muted)]">Radius</dt>
                                  <dd>{v.style.radius}px</dd>
                                  <dt className="text-[var(--color-muted)]">Height</dt>
                                  <dd>{v.style.height}px</dd>
                                  <dt className="text-[var(--color-muted)]">Font</dt>
                                  <dd>{typographyText(v.style)}</dd>
                                  <dt className="text-[var(--color-muted)]">Fill</dt>
                                  <dd>
                                    <Swatch hex={v.style.fill} />
                                  </dd>
                                </dl>
                              </td>
                              <td className="px-3 py-3">
                                <p className="whitespace-nowrap font-semibold text-[var(--color-text)]">
                                  {v.usage.count}{" "}
                                  <span className="font-normal text-[var(--color-muted)]">in {v.usage.pages} pages</span>
                                </p>
                                {v.mostUsed && (
                                  <p className="mt-1">
                                    <StatusPill tone="neutral" label="Most used" />
                                  </p>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ---- Impact preview ---- */}
          <section
            id="impact-preview"
            ref={impactRef}
            tabIndex={-1}
            aria-labelledby={`${ids}-impact-title`}
            className={`${PANEL} @container min-w-0 scroll-mt-4 p-5 focus-visible:outline-2 focus-visible:outline-offset-2`}
          >
            <h2 id={`${ids}-impact-title`} className="text-lg font-bold text-[var(--color-text)]">
              Impact preview
            </h2>
            {picked ? (
              <>
                <p className="mt-1 text-sm text-[var(--color-text)]">
                  <strong className="font-semibold">
                    {replaceCount} {categoryPlural} will be replaced across {replaceRows.length}{" "}
                    {plural(replaceRows.length, "project", "projects")}
                  </strong>
                  <span className="text-[var(--color-muted)]">
                    {" "}
                    · standard from {siteName(picked.siteId)} ({picked.selector}) applies to all {impact.length} projects
                  </span>
                </p>
                <ul className="mt-4 space-y-3">
                  {impact.map((i) => {
                    const st = IMPACT_STATUS[i.status];
                    const action =
                      i.status === "replace" ? "Apply standard" : i.status === "source" ? "Source of standard" : "Already matches";
                    return (
                      <li
                        key={i.siteId}
                        className="grid min-w-0 gap-3 rounded-[var(--radius-medium)] border border-[var(--color-border)] p-3 @xl:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] @xl:items-center"
                      >
                        <div className="flex min-w-0 items-start gap-2 @xl:col-span-3">
                          <SiteAvatar siteId={i.siteId} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text)]">{siteName(i.siteId)}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-[var(--color-muted)]">
                              <StatusPill tone={st.tone} label={st.label} />
                              {i.count} {categoryPlural}
                            </p>
                          </div>
                        </div>
                        <figure className="min-w-0 overflow-hidden">
                          <figcaption className="mb-1 text-xs text-[var(--color-muted)]">Original source</figcaption>
                          <VariantPreview
                            siteId={i.siteId}
                            categoryId={active}
                            style={sourceStyle(i.siteId, active)}
                            state={TABLE_STATES[active][0]}
                          />
                        </figure>
                        <p className="flex items-center gap-1 text-xs font-medium text-[var(--color-muted)]">
                          <IconArrowRight size={14} />
                          {action}
                        </p>
                        <figure className="min-w-0 overflow-hidden">
                          <figcaption className="mb-1 text-xs text-[var(--color-muted)]">Standardized output</figcaption>
                          <VariantPreview
                            siteId={i.siteId}
                            categoryId={active}
                            style={picked.style}
                            state={TABLE_STATES[active][0]}
                          />
                        </figure>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <div className="mt-3">
                <EmptyState
                  icon={<IconGlobe size={22} />}
                  title="Pick a variant to preview its impact"
                  description={`Choose a ${category.label.toLowerCase()} variant above to see the original and standardized look of every project.`}
                />
              </div>
            )}
          </section>
        </div>

        {/* ======== Right: Selected Standard / Design Tokens ======== */}
        <aside
          aria-label="Standard details"
          className={`${PANEL} min-w-0 p-5 xl:col-span-2 2xl:col-span-1 2xl:self-start`}
        >
          <Tabs
            idBase={`${ids}-rt`}
            label="Standard details"
            value={rightTab}
            onChange={setRightTab}
            tabs={[
              { id: "selected", label: "Selected Standard" },
              { id: "tokens", label: "Design Tokens" },
            ]}
          />
          <div
            role="tabpanel"
            id={`${ids}-rt-panel`}
            aria-labelledby={`${ids}-rt-tab-${rightTab}`}
            className="mt-4 space-y-5"
          >
            {rightTab === "selected" ? (
              <>
                {picked ? (
                  <>
                    <div>
                      <h3 className="text-base font-bold text-[var(--color-text)]">
                        {category.label} /{" "}
                        {picked.variantType
                          ? VARIANT_TYPES.find((t) => t.id === picked.variantType)?.label
                          : "Default"}
                      </h3>
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                        Source: {siteName(picked.siteId)} · <span className="font-mono">{picked.selector}</span>
                      </p>
                      <p className="mt-1.5">
                        {decision.status === "decided" && decision.variantId === picked.id ? (
                          <StatusPill tone="success" label="Decided" />
                        ) : (
                          <StatusPill tone="info" label="Not confirmed yet" />
                        )}
                      </p>
                    </div>

                    <StatePreviews variant={picked} states={PANEL_STATES[active]} />

                    <div>
                      <h4 className="text-sm font-semibold text-[var(--color-text)]">Specs</h4>
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs text-[var(--color-text)]">
                        <dt className="text-[var(--color-muted)]">Fill</dt>
                        <dd>
                          <Swatch hex={picked.style.fill} />
                        </dd>
                        <dt className="text-[var(--color-muted)]">Text color</dt>
                        <dd>
                          <Swatch hex={picked.style.text} />
                        </dd>
                        <dt className="text-[var(--color-muted)]">Border radius</dt>
                        <dd>{picked.style.radius}px</dd>
                        <dt className="text-[var(--color-muted)]">Height</dt>
                        <dd>{picked.style.height}px</dd>
                        <dt className="text-[var(--color-muted)]">Horizontal padding</dt>
                        <dd>{picked.style.paddingX}px</dd>
                        <dt className="text-[var(--color-muted)]">Typography</dt>
                        <dd>{typographyText(picked.style)}</dd>
                        <dt className="text-[var(--color-muted)]">Border</dt>
                        <dd className="font-mono">{picked.style.border}</dd>
                      </dl>
                    </div>

                    {matchedFillToken ? (
                      <p className="flex gap-2 rounded-[var(--radius-medium)] bg-[color-mix(in_srgb,var(--color-success)_10%,white)] p-3 text-xs text-[var(--color-text)]">
                        <span className="mt-0.5 shrink-0 text-[var(--color-success)]">
                          <IconCheck size={14} />
                        </span>
                        <span>
                          Fill matches existing token <code className="font-mono font-semibold">{matchedFillToken.name}</code>.
                          No new tokens needed.
                        </span>
                      </p>
                    ) : (
                      <p className="flex gap-2 rounded-[var(--radius-medium)] bg-[color-mix(in_srgb,var(--color-warning)_10%,white)] p-3 text-xs text-[var(--color-text)]">
                        <span className="mt-0.5 shrink-0 text-[var(--color-warning)]">
                          <IconAlert size={14} />
                        </span>
                        <span>
                          New token needed: <code className="font-mono font-semibold">color.{active}-fill</code>{" "}
                          <span className="font-mono">{picked.style.fill.toUpperCase()}</span>
                        </span>
                      </p>
                    )}

                    <div>
                      <h4 className="text-sm font-semibold text-[var(--color-text)]">
                        Applies to all {impact.length} projects
                      </h4>
                      <p className="text-xs text-[var(--color-muted)]">
                        {alreadyMatch} of {usageTotal} already match
                      </p>
                      <ul className="mt-2 space-y-1">
                        {impact.map((i) => {
                          const st = IMPACT_STATUS[i.status];
                          return (
                            <li key={i.siteId} className="flex items-center justify-between gap-2 text-sm">
                              <span className="flex min-w-0 items-center gap-2">
                                <SiteAvatar siteId={i.siteId} />
                                <span className="truncate text-[var(--color-text)]">{siteName(i.siteId)}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <span className="text-xs text-[var(--color-muted)]">{i.count}</span>
                                <StatusPill tone={st.tone} label={st.label} />
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={CATEGORY_ICON[active]({ size: 22 })}
                    title="No variant selected"
                    description={`Pick a ${category.label.toLowerCase()} variant in the table to review its states, specs and impact.`}
                  />
                )}

                <div className="space-y-1 border-t border-[var(--color-border)] pt-3">
                  <Switch
                    checked={state.toggles.enforceAll}
                    onChange={(v) => setToggle("enforceAll", v)}
                    label="Enforce on all projects (no local overrides)"
                  />
                  <Switch
                    checked={state.toggles.autoRebuild}
                    onChange={(v) => setToggle("autoRebuild", v)}
                    label={`Auto-rebuild ${sites.length} websites on publish`}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Button onClick={handleConfirm} disabled={!picked} className="w-full">
                    <IconCheck size={16} />
                    Confirm {category.label} Standard
                  </Button>
                  <Button variant="secondary" onClick={handleSkip} className="w-full">
                    Skip
                  </Button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs text-[var(--color-muted)]">
                  Tokens of the active design system (mock sample · {STANDARD_TOKENS.length} of {DESIGN_SYSTEM_META.tokens}).
                  {picked ? ` Marked tokens match the selected ${category.label.toLowerCase()} variant.` : ""}
                </p>
                <ul className="mt-3 divide-y divide-[var(--color-border)]">
                  {STANDARD_TOKENS.map((t) => {
                    const used = usedTokens.has(t.name);
                    return (
                      <li key={t.name} className="flex items-center justify-between gap-2 py-2">
                        <span className="min-w-0">
                          <code className="block truncate font-mono text-xs font-semibold text-[var(--color-text)]">
                            {t.name}
                          </code>
                          <span className="text-xs text-[var(--color-muted)]">
                            {t.group === "color" ? <Swatch hex={t.value} /> : t.value}
                          </span>
                        </span>
                        {used && <StatusPill tone="success" label="Used by selected" />}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ---------------- Bottom bar ---------------- */}
      <div className="z-20 -mx-4 -mb-4 border-t border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 shadow-[var(--shadow-lg)] sm:-mx-6 sm:-mb-6 sm:px-6 md:sticky md:bottom-0">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center">
            <div className="min-w-[10rem]">
              <dt className="text-[var(--color-muted)]">Standard decisions</dt>
              <dd className="mt-0.5 font-semibold text-[var(--color-text)]">
                {decided} of {totalCategories} ({decidedPct}%)
              </dd>
              <dd className="mt-1">
                <Progress value={decided} max={totalCategories} label="Standard decisions" />
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted)]">Projects affected</dt>
              <dd className="mt-0.5 font-semibold text-[var(--color-text)]">{sites.length} websites</dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted)]">Variants compared</dt>
              <dd className="mt-0.5 font-semibold text-[var(--color-text)]">{totalVariants}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted)]">Built workspaces</dt>
              <dd className="mt-0.5 font-semibold text-[var(--color-text)]">{sites.length} websites</dd>
            </div>
            <div>
              <dt className="text-[var(--color-muted)]">Warnings</dt>
              <dd className="mt-0.5">
                {openCount > 0 ? (
                  <StatusPill tone="warning" label={`${openCount} ${plural(openCount, "category", "categories")} open`} />
                ) : (
                  <StatusPill tone="success" label="No open categories" />
                )}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={reviewImpact}>
              Review Impact
            </Button>
            <Button
              onClick={() => {
                setApplyError(null);
                setApplyOpen(true);
              }}
            >
              Apply Standard to All Projects
            </Button>
          </div>
        </div>
      </div>

      {/* ---------------- Apply dialog ---------------- */}
      <Modal
        open={applyOpen}
        onClose={() => {
          setApplyOpen(false);
          setApplyError(null);
        }}
        finalFocus={() => {
          if (!focusResultNext.current) return null;
          focusResultNext.current = false;
          return resultRef.current;
        }}
        title="Apply standard to all projects?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmApply}>Apply and publish v{state.draft.version}</Button>
          </>
        }
      >
        <p className="text-[var(--color-muted)]">
          Draft v{state.draft.version} will be published and applied to every imported project. Original sources
          are never modified; the standardized build of all {sites.length} websites uses the published standard.
        </p>
        <div>
          <h3 className="font-semibold">Categories to apply ({decidedIds.length})</h3>
          {decidedIds.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {decidedIds.map((c) => {
                const v = getVariant(state.draft.decisions[c].variantId ?? "");
                return (
                  <li key={c} className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="success" label="Decided" />
                    <span className="font-medium">{getCategory(c).label}</span>
                    {v && (
                      <span className="text-xs text-[var(--color-muted)]">
                        Chosen: {siteName(v.siteId)} <span className="font-mono">{v.selector}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-[var(--color-muted)]">No categories are decided yet.</p>
          )}
        </div>
        {notDecidedIds.length > 0 && (
          <div className="rounded-[var(--radius-medium)] border border-[var(--color-warning)] bg-[color-mix(in_srgb,var(--color-warning)_8%,white)] p-3">
            <p className="flex items-start gap-2 font-medium">
              <span className="mt-0.5 shrink-0 text-[var(--color-warning)]">
                <IconAlert size={16} />
              </span>
              {notDecidedIds.length} {plural(notDecidedIds.length, "category is", "categories are")} still open or skipped.
              They keep the current published standard (v{state.published.version}).
            </p>
            <ul className="mt-2 space-y-1 pl-6 text-xs">
              {notDecidedIds.map((c) => {
                const st = DECISION_STATUS[state.draft.decisions[c].status];
                const pub = getVariant(state.published.decisions[c]);
                return (
                  <li key={c} className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={st.tone} label={st.label} />
                    <span className="font-medium">{getCategory(c).label}</span>
                    {pub && <span className="text-[var(--color-muted)]">keeps {siteName(pub.siteId)} style</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div>
          <h3 className="font-semibold">Settings</h3>
          <ul className="mt-1 space-y-0.5 text-[var(--color-text)]">
            <li>Enforce on all projects (no local overrides): {state.toggles.enforceAll ? "On" : "Off"}</li>
            <li>
              Auto-rebuild {sites.length} websites on publish:{" "}
              {state.toggles.autoRebuild ? `On (${sites.length} websites)` : "Off (rebuild later)"}
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Affected projects ({sites.length})</h3>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {sites.map((s) => (
              <li key={s.id} className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-0.5 text-xs">
                {s.name} · Team {s.team} · {siteBuildStatus(getSiteBuild(s.id)).label}
              </li>
            ))}
          </ul>
        </div>
        {applyError && (
          <p role="alert" className="flex items-center gap-2 font-medium text-[var(--color-danger)]">
            <IconAlert size={16} />
            {applyError}
          </p>
        )}
      </Modal>

      {/* ---------------- Reset dialog ---------------- */}
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmReset}>Reset demo data</Button>
          </>
        }
      >
        <p>
          This restores the seed data: published Standard v{SEED_BUILDER_STATE.published.version} and Draft v
          {SEED_BUILDER_STATE.draft.version} with{" "}
          {CATEGORY_IDS.filter((c) => SEED_BUILDER_STATE.draft.decisions[c].status === "decided").length} of{" "}
          {CATEGORY_IDS.length} categories decided.
        </p>
        <p className="text-[var(--color-muted)]">
          Draft decisions and publish history saved in this browser will be lost. Imported websites are not affected.
        </p>
      </Modal>
    </div>
  );
}
