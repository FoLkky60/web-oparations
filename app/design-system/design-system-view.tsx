"use client";

/*
 * Design System — active standard (published version) จาก standard-store
 * - เวอร์ชันที่ publish อยู่ + draft ที่กำลังทำ (เปลี่ยนมาตรฐานได้ที่ /builder เท่านั้น)
 * - token list = STANDARD_TOKENS (mock sample ของ Standard v3.2.1)
 * - 7 categories: variant ที่ publish (เว็บต้นทาง + selector + key specs) พร้อม preview จาก std components
 * - UI ของแอปใช้ CSS variables; hex ที่แสดงใน swatch/specs คือ DATA ของมาตรฐาน (ไม่ใช่ token ของแอป)
 */

import { useMemo, type ReactNode } from "react";
import { Card, Chip, LinkButton, StatusPill } from "../components/ui";
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
import { DESIGN_SYSTEM_META, STANDARD_TOKENS } from "../lib/standard-data";
import { formatDateTime } from "../lib/standard-labels";
import {
  decidedCount,
  getBuilderState,
  getCategories,
  getSite,
  getVariant,
  publishedStyle,
  workspacesOutdated,
} from "../lib/standard-store";
import type { CategoryId, StandardToken, Variant, VariantStyle } from "../lib/standard-types";
import { CATEGORY_IDS } from "../lib/standard-types";
import { useStandard } from "../lib/use-standard";

const PANEL =
  "rounded-[var(--radius-large)] border border-[var(--color-border)] bg-[var(--color-background)] p-5 shadow-[var(--shadow-sm)]";

const TOKEN_GROUP_LABEL: Record<StandardToken["group"], string> = {
  color: "Color",
  font: "Typography",
  space: "Spacing",
  radius: "Radius",
  size: "Size",
};

const TOKEN_GROUPS: StandardToken["group"][] = ["color", "font", "space", "radius", "size"];

/** สีของมาตรฐาน (DATA) — แสดง hex เป็นข้อความเสมอ ไม่พึ่งสีอย่างเดียว */
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

/** ย่อ component กว้าง (nav/table/footer) ให้เป็น thumbnail */
function Scaled({ width, height, scale, children }: { width: number; height: number; scale: number; children: ReactNode }) {
  return (
    <div
      className="max-w-full overflow-hidden rounded-[var(--radius-small)] border border-[var(--color-border)]"
      style={{ width: Math.round(width * scale), height: Math.round(height * scale) }}
    >
      <div className="@container origin-top-left" style={{ width, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

function PreviewBody({ categoryId }: { categoryId: CategoryId }) {
  switch (categoryId) {
    case "button":
      return (
        <div className="flex flex-wrap items-center gap-2">
          <StdButton>Submit</StdButton>
          <StdButton previewState="hover">Submit</StdButton>
          <StdButton disabled>Submit</StdButton>
        </div>
      );
    case "input":
      return (
        <div className="w-48">
          <StdInput label="Email" placeholder="name@company.com" />
        </div>
      );
    case "badge":
      return (
        <div className="flex flex-wrap items-center gap-2">
          <StdBadge tone="success">Paid</StdBadge>
          <StdBadge tone="warning">Pending</StdBadge>
          <StdBadge tone="danger">Overdue</StdBadge>
        </div>
      );
    case "card":
      return (
        <div className="w-52">
          <StdCard title="Your account" headingLevel={4}>
            <p className="text-xs">Business plan · 12 seats</p>
          </StdCard>
        </div>
      );
    case "navbar":
      return (
        <Scaled width={800} height={72} scale={0.36}>
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
        <Scaled width={560} height={170} scale={0.5}>
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
        <Scaled width={800} height={96} scale={0.36}>
          <StdFooter
            brand={<span className="font-semibold">ACME</span>}
            links={[{ label: "Privacy" }, { label: "Terms" }, { label: "Contact" }]}
            copyright="© 2026 ACME Corp."
          />
        </Scaled>
      );
  }
}

/** preview แบบตกแต่ง (aria-hidden + inert → ไม่รับ focus/คลิก) — ค่าจริงอยู่ในรายการ specs ข้างเคียง */
function CategoryPreview({ categoryId, style, resolver }: { categoryId: CategoryId; style: VariantStyle; resolver: StyleResolver }) {
  return (
    <div aria-hidden="true" inert className="pointer-events-none select-none">
      <StyleResolverProvider resolver={resolver}>
        <StdStyleOverride category={categoryId} style={style}>
          <PreviewBody categoryId={categoryId} />
        </StdStyleOverride>
      </StyleResolverProvider>
    </div>
  );
}

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="text-right text-[var(--color-text)]">{children}</dd>
    </div>
  );
}

function CategoryCard({ label, variant, resolver }: { label: string; variant: Variant; resolver: StyleResolver }) {
  const s = variant.style;
  const site = getSite(variant.siteId);
  return (
    <article className={`${PANEL} flex flex-col gap-4`} aria-labelledby={`ds-cat-${variant.categoryId}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`ds-cat-${variant.categoryId}`} className="text-base font-semibold text-[var(--color-text)]">
            {label}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Source: {site?.name ?? variant.siteId} · <code className="font-mono">{variant.selector}</code>
          </p>
        </div>
        <StatusPill tone="success" label="Published" />
      </header>
      <div className="flex min-h-24 items-center justify-center overflow-hidden rounded-[var(--radius-medium)] bg-[var(--color-surface)] p-4">
        <CategoryPreview categoryId={variant.categoryId} style={s} resolver={resolver} />
      </div>
      <dl className="divide-y divide-[var(--color-border)] text-xs">
        <Spec label="Fill">
          <Swatch hex={s.fill} />
        </Spec>
        <Spec label="Text color">
          <Swatch hex={s.text} />
        </Spec>
        <Spec label="Border radius">{s.radius}px</Spec>
        <Spec label="Height">{s.height}px</Spec>
        <Spec label="Horizontal padding">{s.paddingX}px</Spec>
        <Spec label="Typography">
          {s.fontFamily} · {s.fontWeight} · {s.fontSize}px
        </Spec>
        <Spec label="Border">
          <span className="font-mono">{s.border}</span>
        </Spec>
      </dl>
    </article>
  );
}

export function DesignSystemView() {
  const state = useStandard(getBuilderState);
  const decided = useStandard(decidedCount);
  const outdated = useStandard(workspacesOutdated);
  const categories = getCategories();

  // active standard = published decisions (อ่านจาก state เพื่อ re-render เมื่อ publish ใหม่)
  const resolver = useMemo<StyleResolver>(
    () => (c) => getVariant(state.published.decisions[c])?.style ?? publishedStyle(c),
    [state],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Design System</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip>Standard v{state.published.version} active</Chip>
            <span className="text-xs text-[var(--color-muted)]">
              Published {formatDateTime(state.published.publishedAt)} UTC · {DESIGN_SYSTEM_META.components} components ·{" "}
              {DESIGN_SYSTEM_META.tokens} tokens
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Draft v{state.draft.version} in progress · {decided} of {CATEGORY_IDS.length} categories decided. Change the
            standard in Template &amp; Builder.
          </p>
          {outdated && (
            <div className="mt-2">
              <StatusPill tone="warning" label="Websites need rebuild with the latest standard" />
            </div>
          )}
        </div>
        <LinkButton href="/builder" variant="primary">
          Open Template &amp; Builder
        </LinkButton>
      </div>

      <section aria-labelledby="ds-tokens">
        <Card>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="ds-tokens" className="text-lg font-semibold text-[var(--color-text)]">
              Design tokens
            </h2>
            <span className="text-xs text-[var(--color-muted)]">
              Sample of {STANDARD_TOKENS.length} tokens · Standard v{state.published.version}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {TOKEN_GROUPS.map((g) => {
              const tokens = STANDARD_TOKENS.filter((t) => t.group === g);
              if (tokens.length === 0) return null;
              return (
                <div key={g}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                    {TOKEN_GROUP_LABEL[g]}
                  </h3>
                  <ul className="space-y-1.5 text-sm">
                    {tokens.map((t) => (
                      <li key={t.name} className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-[var(--color-text)]">{t.name}</span>
                        <span className="text-xs text-[var(--color-muted)]">
                          {t.group === "color" ? <Swatch hex={t.value} /> : t.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section aria-labelledby="ds-components" className="space-y-3">
        <h2 id="ds-components" className="text-lg font-semibold text-[var(--color-text)]">
          Standard components
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((cat) => {
            const variant = getVariant(state.published.decisions[cat.id]);
            if (!variant) return null;
            return <CategoryCard key={cat.id} label={cat.label} variant={variant} resolver={resolver} />;
          })}
        </div>
      </section>
    </div>
  );
}
