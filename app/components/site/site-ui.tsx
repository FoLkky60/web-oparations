"use client";

import type { CSSProperties, ReactNode } from "react";
import type { NavLink } from "../../lib/mock-types";

/**
 * SHARED SITE UI (ADD-02)
 * ------------------------------------------------------------------
 * ชุด component "มาตรฐานของเว็บที่ถูก import" ที่ "ทุกหน้าใช้ร่วมกัน"
 * (Home / Login / Admin Monitor ใช้ชุดเดียวกัน → ความสม่ำเสมอมองเห็นได้)
 *
 * - เป็น component ของ "เว็บที่ถูกแปลง" โดยเฉพาะ — แยกจาก app UI primitives
 *   (app/components/ui.tsx) และจาก DESIGN_SYSTEM_V1 ใน packages/core
 * - ใช้ site-scoped CSS variables (ขึ้นต้น --site-*) นิยามไว้ที่ SiteSurface
 *   เพื่อให้มี design language เดียวทั้งเว็บ โดยไม่แตะ app token ใน globals.css
 * - presentational + accessible (label, aria, focus-visible, tap target ≥44px) + responsive
 * - ไอคอนเป็น SVG inline (currentColor) — ไม่มีอิโมจิ
 */

// ---------------------------------------------------------------------------
// Site-scoped design tokens — นิยามบน SiteSurface (ไม่กระทบ app token)
// ---------------------------------------------------------------------------

const SITE_TOKENS: CSSProperties = {
  // ธีมของเว็บ Acme (teal) — คนละชุดกับธีมแดงของแพลตฟอร์ม
  ["--site-brand" as string]: "#0d9488",
  ["--site-brand-strong" as string]: "#0f766e",
  ["--site-brand-ink" as string]: "#ecfeff",
  ["--site-on-brand" as string]: "#ffffff",
  ["--site-surface" as string]: "#f0fdfa",
  ["--site-card" as string]: "#ffffff",
  ["--site-border" as string]: "#99f6e4",
  ["--site-text" as string]: "#134e4a",
  ["--site-muted" as string]: "#4b726e",
  ["--site-radius" as string]: "12px",
  ["--site-radius-sm" as string]: "8px",
  ["--site-shadow" as string]: "0 2px 8px rgba(13,148,136,0.10)",
  // semantic (ใช้คู่ไอคอน+label เสมอ — ไม่พึ่งสีอย่างเดียว)
  ["--site-success" as string]: "#15803d",
  ["--site-warning" as string]: "#b45309",
  ["--site-danger" as string]: "#b91c1c",
};

/** พื้นผิวของ "เว็บที่ถูก import" — ตั้ง site token + พื้นหลังของเว็บ */
export function SiteSurface({ children }: { children: ReactNode }) {
  return (
    <div
      style={SITE_TOKENS}
      className="min-h-full bg-[var(--site-surface)] text-[var(--site-text)]"
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons (inline SVG, currentColor) — ไม่มีอิโมจิ
// ---------------------------------------------------------------------------

function TrendIcon({ dir }: { dir: "up" | "down" | "flat" }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
  if (dir === "up") {
    return (
      <svg {...common}>
        <path d="M4 17 10 11l4 4 6-6" />
        <path d="M15 5h5v5" />
      </svg>
    );
  }
  if (dir === "down") {
    return (
      <svg {...common}>
        <path d="M4 7 10 13l4-4 6 6" />
        <path d="M15 19h5v-5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5 12h14" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SiteNav — top navigation (brand + links) ใช้ร่วมกันทุกหน้า
// ---------------------------------------------------------------------------

export function SiteNav({
  brand,
  links,
  activeTarget,
  onNavigate,
}: {
  brand: string;
  links: NavLink[];
  activeTarget?: string;
  onNavigate?: (target: NavLink["target"]) => void;
}) {
  return (
    <nav
      aria-label="Site navigation"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-[var(--site-brand-strong)] px-4 py-3 text-[var(--site-brand-ink)] sm:px-6"
    >
      <span className="flex items-center gap-2 text-base font-bold">
        <span
          aria-hidden="true"
          className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--site-radius-sm)] bg-[var(--site-on-brand)] text-xs font-bold text-[var(--site-brand-strong)]"
        >
          A
        </span>
        {brand}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-1">
        {links.map((l) => {
          const active = activeTarget !== undefined && l.target === activeTarget;
          return (
            <button
              key={`${l.label}-${l.target}`}
              type="button"
              onClick={() => onNavigate?.(l.target)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-[var(--site-radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[var(--site-on-brand)] text-[var(--site-brand-strong)]"
                  : "text-[var(--site-brand-ink)] hover:bg-white/10"
              }`}
            >
              {l.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// SiteButton — primary / secondary
// ---------------------------------------------------------------------------

export function SiteButton({
  children,
  variant = "primary",
  type = "button",
  onClick,
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
}) {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--site-radius-sm)] px-5 py-2.5 text-sm font-semibold transition-colors";
  const look =
    variant === "primary"
      ? "bg-[var(--site-brand)] text-[var(--site-on-brand)] hover:bg-[var(--site-brand-strong)]"
      : "border border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)] hover:bg-[var(--site-surface)]";
  return (
    <button type={type} onClick={onClick} className={`${base} ${look} ${className}`}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SiteCard — title + body + optional footer
// ---------------------------------------------------------------------------

export function SiteCard({
  title,
  children,
  footer,
  className = "",
}: {
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-card)] p-5 shadow-[var(--site-shadow)] ${className}`}
    >
      {title && <h3 className="text-base font-semibold text-[var(--site-text)]">{title}</h3>}
      {children && <div className="mt-2 text-sm text-[var(--site-muted)]">{children}</div>}
      {footer && <div className="mt-4 pt-2">{footer}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// SiteInput — label + field (controlled)
// ---------------------------------------------------------------------------

export function SiteInput({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--site-text)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded-[var(--site-radius-sm)] border border-[var(--site-border)] bg-[var(--site-surface)] px-3 py-2 text-sm text-[var(--site-text)] outline-none focus:border-[var(--site-brand)]"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SiteTable — columns + rows (scrolls internally on small screens)
// ---------------------------------------------------------------------------

/** map ค่าสถานะในตาราง → semantic token (สื่อความหมายด้วยสี + จุด + label) */
function statusTone(value: string): string | undefined {
  const v = value.toLowerCase();
  if (v === "success") return "var(--site-success)";
  if (v === "pending") return "var(--site-warning)";
  if (v === "blocked" || v === "failed") return "var(--site-danger)";
  return undefined;
}

export function SiteTable({
  caption,
  columns,
  rows,
  statusColumn,
}: {
  caption: string;
  columns: string[];
  rows: string[][];
  /** index ของคอลัมน์สถานะ (จะแสดงเป็น pill พร้อมจุดสี) */
  statusColumn?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-card)]">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-[var(--site-border)] text-[var(--site-muted)]">
            {columns.map((c) => (
              <th key={c} scope="col" className="px-4 py-3 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[var(--site-border)] last:border-0">
              {row.map((cell, ci) => {
                const tone = statusColumn === ci ? statusTone(cell) : undefined;
                return (
                  <td key={ci} className="px-4 py-3 text-[var(--site-text)]">
                    {tone ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `color-mix(in srgb, ${tone} 14%, white)`, color: tone }}
                      >
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
                        {cell}
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SiteStat — label + value + optional delta
// ---------------------------------------------------------------------------

export function SiteStat({
  label,
  value,
  delta,
  trend = "flat",
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
}) {
  const tone =
    trend === "up" ? "var(--site-success)" : trend === "down" ? "var(--site-danger)" : "var(--site-muted)";
  return (
    <div className="rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-card)] p-4 shadow-[var(--site-shadow)]">
      <div className="text-sm text-[var(--site-muted)]">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[var(--site-text)]">{value}</span>
        {delta && (
          <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: tone }}>
            <TrendIcon dir={trend} />
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SiteHero — headline + subtext + CTA
// ---------------------------------------------------------------------------

export function SiteHero({
  headline,
  subtext,
  ctaLabel,
  onCta,
}: {
  headline: string;
  subtext: string;
  ctaLabel: string;
  onCta?: () => void;
}) {
  return (
    <header className="rounded-[var(--site-radius)] border border-[var(--site-border)] bg-gradient-to-br from-[var(--site-card)] to-[var(--site-surface)] p-6 shadow-[var(--site-shadow)] sm:p-10">
      <h1 className="max-w-2xl text-2xl font-bold text-[var(--site-text)] sm:text-3xl">{headline}</h1>
      <p className="mt-3 max-w-2xl text-sm text-[var(--site-muted)] sm:text-base">{subtext}</p>
      <div className="mt-5">
        <SiteButton onClick={onCta}>{ctaLabel}</SiteButton>
      </div>
    </header>
  );
}
