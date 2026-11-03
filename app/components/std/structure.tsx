"use client";

/*
 * ADD-04 Phase E — std structure: StdCard, StdInset, StdNav (top), StdSideNav, StdTable, StdFooter
 * สไตล์มาจาก VariantStyle ตาม category (ดูตาราง field ใน standard-types.ts)
 */

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { IconClose, IconMenu } from "../icons";
import { AA_UI, fontStack, mix, readableOn, readablePair } from "./color";
import { cssVars } from "./controls";
import { preventMockNavigation, useSiteTheme, useStdStyle } from "./style-context";

/** ความกว้างเนื้อหามาตรฐานของหน้าเว็บทีม (container query — ปรับตามพื้นที่ main ไม่ใช่ viewport) */
export const SITE_CONTAINER = "mx-auto w-full max-w-[1200px] px-4 @3xl:px-8";

export interface StdNavLink {
  label: string;
  /** ไม่ระบุ/"#" = mock link (D-5) ไม่ navigate */
  href?: string;
  active?: boolean;
  icon?: ReactNode;
}

// ---------------------------------------------------------------------------
// StdCard
// ---------------------------------------------------------------------------

export interface StdCardProps {
  title?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  /** badge มุมขวาของหัวการ์ด */
  badge?: ReactNode;
  /** action มุมขวาของหัวการ์ด (เช่น "View all") */
  actions?: ReactNode;
  children?: ReactNode;
  id?: string;
  /** hover state (การ์ดที่คลิกได้) */
  interactive?: boolean;
  className?: string;
  bodyClassName?: string;
}

export function StdCard({
  title,
  headingLevel = 2,
  badge,
  actions,
  children,
  id,
  interactive,
  className = "",
  bodyClassName = "",
}: StdCardProps) {
  const s = useStdStyle("card");
  const theme = useSiteTheme();
  const autoId = useId();
  const titleId = `${id ?? autoId}-title`;
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const style: CSSProperties = {
    ...cssVars({ "--sc-bg": s.fill, "--sc-hover": s.hoverFill }),
    border: s.border,
    borderRadius: s.radius,
    color: theme.text,
    fontFamily: theme.font,
  };
  const Tag = title ? "section" : "div";
  return (
    <Tag
      id={id}
      aria-labelledby={title ? titleId : undefined}
      className={`min-w-0 bg-[var(--sc-bg)] transition-colors duration-[var(--dur-base)] ${interactive ? "hover:bg-[var(--sc-hover)]" : ""} ${className}`}
      style={style}
    >
      {(title || badge || actions) && (
        <div
          className="flex flex-wrap items-center justify-between gap-2"
          style={{ minHeight: s.height, paddingInline: s.paddingX, paddingTop: Math.round(s.paddingX * 0.6) }}
        >
          {title && (
            <Heading
              id={titleId}
              className="min-w-0"
              style={{
                fontFamily: fontStack(s.fontFamily),
                fontWeight: s.fontWeight,
                fontSize: s.fontSize,
                textTransform: s.textTransform ?? "none",
                color: theme.text,
              }}
            >
              {title}
            </Heading>
          )}
          {(badge || actions) && <div className="flex flex-wrap items-center gap-2">{badge}{actions}</div>}
        </div>
      )}
      <div
        className={bodyClassName}
        style={{ padding: s.paddingX, paddingTop: title ? Math.round(s.paddingX * 0.5) : s.paddingX }}
      >
        {children}
      </div>
    </Tag>
  );
}

/** พื้น section ด้านในการ์ด (card.disabledFill) */
export function StdInset({ children, className = "" }: { children: ReactNode; className?: string }) {
  const s = useStdStyle("card");
  return (
    <div
      className={className}
      style={{
        background: s.disabledFill,
        color: readableOn(s.text, s.disabledFill),
        borderRadius: Math.round(s.radius * 0.6),
        padding: Math.round(s.paddingX * 0.75),
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nav colors (shared by top/side nav)
// ---------------------------------------------------------------------------

function useNavColors() {
  const s = useStdStyle("navbar");
  const bar = readablePair(s.fill, s.text);
  const link = readableOn(s.disabledFill, bar.bg);
  const active = readableOn(s.hoverFill, bar.bg);
  const activeBg = mix(active, bar.bg, 0.86);
  return {
    s,
    bg: bar.bg,
    brand: bar.fg,
    link,
    active,
    activeBg,
    activeOnTint: readableOn(active, activeBg),
    ring: readableOn(active, bar.bg, AA_UI),
  };
}

function navLinkStyle(s: ReturnType<typeof useNavColors>["s"], active?: boolean): CSSProperties {
  return {
    outlineColor: "var(--sn-ring)",
    paddingInline: Math.round(s.paddingX * 0.75),
    borderRadius: s.radius,
    fontFamily: fontStack(s.fontFamily),
    fontWeight: active ? Math.max(s.fontWeight, 600) : s.fontWeight,
    fontSize: s.fontSize,
    textTransform: s.textTransform ?? "none",
  };
}

const NAV_LINK_CLASS =
  "relative inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-[var(--sn-link)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--sn-tint)] hover:text-[var(--sn-active)] aria-[current=page]:text-[var(--sn-active)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sn-ring)]";

// ---------------------------------------------------------------------------
// StdNav (top nav)
// ---------------------------------------------------------------------------

export interface StdNavProps {
  /** ชื่อ/โลโก้ของเว็บ */
  brand: ReactNode;
  links?: StdNavLink[];
  /** ปุ่มด้านขวา (เช่น New Invoice, Sign in) */
  actions?: ReactNode;
  /** เนื้อหาเพิ่มเติมในเมนู mobile (เช่น ช่องค้นหา) */
  mobileExtra?: ReactNode;
  ariaLabel: string;
}

export function StdNav({ brand, links = [], actions, mobileExtra, ariaLabel }: StdNavProps) {
  const c = useNavColors();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const hasMenu = links.length > 0 || !!mobileExtra;
  const vars = cssVars({
    "--sn-link": c.link,
    "--sn-active": c.active,
    "--sn-tint": `color-mix(in srgb, ${c.active} 12%, transparent)`,
    "--sn-ring": c.ring,
  });

  return (
    <header style={{ ...vars, background: c.bg, borderBottom: c.s.border }}>
      <div className={`${SITE_CONTAINER} flex flex-wrap items-center gap-x-4 gap-y-2 py-2`} style={{ minHeight: c.s.height }}>
        {hasMenu && (
          <button
            type="button"
            className={`${NAV_LINK_CLASS} min-w-11 justify-center @3xl:hidden`}
            style={{ borderRadius: c.s.radius, color: c.brand, outlineColor: c.ring }}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <IconClose size={20} /> : <IconMenu size={20} />}
          </button>
        )}
        <div className="min-w-0 shrink-0" style={{ color: c.brand, fontFamily: fontStack(c.s.fontFamily) }}>
          {brand}
        </div>
        {links.length > 0 && (
          <nav aria-label={ariaLabel} className="hidden min-w-0 flex-1 @3xl:block">
            <ul className="flex flex-wrap items-center gap-1">
              {links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href ?? "#"}
                    aria-current={l.active ? "page" : undefined}
                    onClick={(e) => preventMockNavigation(e, l.href)}
                    className={NAV_LINK_CLASS}
                    style={navLinkStyle(c.s, l.active)}
                  >
                    {l.icon}
                    {l.label}
                    {l.active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-2 bottom-1 h-0.5 rounded-full bg-[var(--sn-active)]"
                      />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {actions && <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
      </div>
      {hasMenu && open && (
        <div id={panelId} className={`${SITE_CONTAINER} pb-3 @3xl:hidden`}>
          {links.length > 0 && (
            <nav aria-label={`${ariaLabel} (mobile)`}>
              <ul className="flex flex-col gap-1">
                {links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href ?? "#"}
                      aria-current={l.active ? "page" : undefined}
                      onClick={(e) => preventMockNavigation(e, l.href)}
                      className={`${NAV_LINK_CLASS} w-full`}
                      style={navLinkStyle(c.s, l.active)}
                    >
                      {l.icon}
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {mobileExtra && <div className="mt-2">{mobileExtra}</div>}
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// StdSideNav
// ---------------------------------------------------------------------------

export interface StdSideNavProps {
  items: StdNavLink[];
  ariaLabel: string;
  /** เนื้อหาใต้เมนู (เช่น การ์ด Contact HR) */
  footer?: ReactNode;
  className?: string;
}

export function StdSideNav({ items, ariaLabel, footer, className = "" }: StdSideNavProps) {
  const c = useNavColors();
  const vars = cssVars({
    "--sn-link": c.link,
    "--sn-active": c.activeOnTint,
    "--sn-tint": `color-mix(in srgb, ${c.active} 12%, transparent)`,
    "--sn-ring": c.ring,
  });
  return (
    <div className={`flex flex-col gap-4 ${className}`} style={{ ...vars, background: c.bg }}>
      <nav aria-label={ariaLabel}>
        <ul className="flex flex-wrap gap-1 @3xl:flex-col">
          {items.map((it) => (
            <li key={it.label}>
              <a
                href={it.href ?? "#"}
                aria-current={it.active ? "page" : undefined}
                onClick={(e) => preventMockNavigation(e, it.href)}
                className={`${NAV_LINK_CLASS} @3xl:w-full`}
                style={{ ...navLinkStyle(c.s, it.active), background: it.active ? c.activeBg : undefined }}
              >
                {it.active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2 left-0 w-1 rounded-full bg-[var(--sn-active)]"
                  />
                )}
                {it.icon}
                {it.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {footer}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StdTable
// ---------------------------------------------------------------------------

export interface StdTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "start" | "end" | "center";
  nowrap?: boolean;
}

export interface StdTableProps<T> {
  /** ชื่อตาราง (caption สำหรับ screen reader + ชื่อ region ที่ scroll ได้) */
  caption: string;
  columns: StdTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** ความกว้างขั้นต่ำ — เกินพื้นที่จะ scroll แนวนอนภายในกรอบตารางเท่านั้น */
  minWidth?: number;
  emptyMessage?: string;
}

const ALIGN_CLASS = { start: "text-start", end: "text-end", center: "text-center" } as const;

export function StdTable<T>({ caption, columns, rows, rowKey, minWidth = 640, emptyMessage = "No records" }: StdTableProps<T>) {
  const s = useStdStyle("table");
  const theme = useSiteTheme();
  const head = readablePair(s.fill, s.text);
  const base = theme.surface;
  const fg = readableOn(readableOn(theme.text, base), s.disabledFill);
  const vars = cssVars({ "--st-base": base, "--st-zebra": s.disabledFill, "--st-hover": s.hoverFill });
  const cellPad: CSSProperties = { paddingInline: s.paddingX, height: s.height };
  const cellBorder = s.border === "none" ? undefined : s.border;

  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ ...vars, border: s.border, borderRadius: s.radius, outlineColor: theme.accent }}
    >
      <table className="w-full border-collapse" style={{ minWidth, fontFamily: theme.font, color: fg }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr style={{ background: head.bg, color: head.fg }}>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`whitespace-nowrap ${ALIGN_CLASS[col.align ?? "start"]}`}
                style={{
                  ...cellPad,
                  fontFamily: fontStack(s.fontFamily),
                  fontWeight: s.fontWeight,
                  fontSize: s.fontSize,
                  textTransform: s.textTransform ?? "none",
                  borderBottom: cellBorder,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-center text-sm" style={cellPad}>
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr
              key={rowKey(row)}
              className="bg-[var(--st-base)] transition-colors duration-[var(--dur-fast)] even:bg-[var(--st-zebra)] hover:bg-[var(--st-hover)]"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`text-sm ${ALIGN_CLASS[col.align ?? "start"]} ${col.nowrap ? "whitespace-nowrap" : ""}`}
                  style={{ ...cellPad, borderBottom: i === rows.length - 1 ? undefined : cellBorder }}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StdFooter
// ---------------------------------------------------------------------------

export interface StdFooterColumn {
  title: string;
  links: StdNavLink[];
}

export interface StdFooterProps {
  /** simple = แถวเดียว (brand + links + copyright) · columns = 3 คอลัมน์ + แถบล่าง */
  variant?: "simple" | "columns";
  brand?: ReactNode;
  description?: string;
  links?: StdNavLink[];
  columns?: StdFooterColumn[];
  copyright: string;
  ariaLabel?: string;
}

export function StdFooter({
  variant = "simple",
  brand,
  description,
  links = [],
  columns = [],
  copyright,
  ariaLabel = "Footer",
}: StdFooterProps) {
  const s = useStdStyle("footer");
  const main = readablePair(s.fill, s.text);
  const bottom = readablePair(s.disabledFill, main.fg);
  const vars = cssVars({
    "--sf-link": main.fg,
    "--sf-hover": readableOn(s.hoverFill, main.bg),
    "--sf-ring": readableOn(s.hoverFill, main.bg, AA_UI),
  });
  const font: CSSProperties = {
    fontFamily: fontStack(s.fontFamily),
    fontWeight: s.fontWeight,
    fontSize: s.fontSize,
  };
  const linkClass =
    "inline-flex min-h-11 items-center text-[var(--sf-link)] underline-offset-4 transition-colors duration-[var(--dur-fast)] hover:text-[var(--sf-hover)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sf-ring)]";
  const renderLink = (l: StdNavLink) => (
    <a
      key={l.label}
      href={l.href ?? "#"}
      onClick={(e) => preventMockNavigation(e, l.href)}
      className={linkClass}
      style={{ outlineColor: "var(--sf-ring)" }}
    >
      {l.label}
    </a>
  );

  if (variant === "simple") {
    return (
      <footer style={{ ...vars, ...font, background: main.bg, color: main.fg, borderTop: s.border }}>
        <div
          className={`${SITE_CONTAINER} flex flex-col gap-2 py-3 @3xl:flex-row @3xl:items-center @3xl:justify-between`}
          style={{ minHeight: s.height }}
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {brand}
            {links.length > 0 && (
              <nav aria-label={ariaLabel}>
                <ul className="flex flex-wrap gap-x-5">
                  {links.map((l) => (
                    <li key={l.label}>{renderLink(l)}</li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
          <p>{copyright}</p>
        </div>
      </footer>
    );
  }

  return (
    <footer style={{ ...vars, ...font, background: main.bg, color: main.fg, borderTop: s.border }}>
      <div className={`${SITE_CONTAINER} grid gap-8 py-8 @3xl:grid-cols-[1.4fr_repeat(3,1fr)]`} style={{ minHeight: s.height }}>
        <div className="min-w-0">
          {brand}
          {description && <p className="mt-2 max-w-xs">{description}</p>}
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="font-semibold" style={{ fontSize: s.fontSize + 1 }}>
              {col.title}
            </h2>
            <ul className="mt-1">
              {col.links.map((l) => (
                <li key={l.label}>{renderLink(l)}</li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div style={{ background: bottom.bg, color: bottom.fg }}>
        <p className={`${SITE_CONTAINER} py-3`}>{copyright}</p>
      </div>
    </footer>
  );
}
