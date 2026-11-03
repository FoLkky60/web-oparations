"use client";

/*
 * ADD-04 Phase E — std widgets (helper ที่ใช้ร่วมใน built projects, §5):
 * StdBrand, StdAvatar, StdStatCard, StdProgress, StdAlert, StdSegmented, StdBreadcrumb,
 * StdBarChart, StdStackedBar
 * อ่านสไตล์ผ่าน category ที่ใกล้ที่สุด (card / button / badge) + useSiteTheme
 */

import { useId, type ReactNode } from "react";
import { IconAlert, IconCheck, IconChevronRight, IconHelp } from "../icons";
import { AA_UI, LIGHT_SURFACE, fontStack, isDark, mix, readableOn, readablePair } from "./color";
import { HIT_AREA, cssVars, type StdTone } from "./controls";
import { StdCard } from "./structure";
import { preventMockNavigation, useSiteTheme, useStdStyle } from "./style-context";

const TONE_COLOR: Record<StdTone, string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
  neutral: "var(--color-muted)",
};

// ---------------------------------------------------------------------------
// Brand / Avatar
// ---------------------------------------------------------------------------

/** โลโก้ของ product เอง (ตัวย่อในกล่อง) + ชื่อเว็บ — ไม่ใช้โลโก้บุคคลที่สาม */
export function StdBrand({ code, name, tagline }: { code: string; name: string; tagline?: string }) {
  const s = useStdStyle("button");
  const mark = readablePair(s.fill, s.text);
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold"
        style={{
          background: mark.bg,
          color: mark.fg,
          borderRadius: Math.min(s.radius, 10),
          border: "1px solid color-mix(in srgb, currentColor 30%, transparent)",
        }}
      >
        {code}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-base font-bold">{name}</span>
        {tagline && <span className="block truncate text-xs opacity-90">{tagline}</span>}
      </span>
    </span>
  );
}

export function StdAvatar({ initials, size = 36 }: { initials: string; size?: number }) {
  const theme = useSiteTheme();
  const bg = mix(theme.accent, LIGHT_SURFACE, 0.85);
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full text-xs font-bold"
      style={{ width: size, height: size, background: bg, color: readableOn(theme.accentText, bg) }}
    >
      {initials}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StdStatCard
// ---------------------------------------------------------------------------

export interface StdStatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** badge มุมขวา */
  badge?: ReactNode;
}

export function StdStatCard({ label, value, hint, badge }: StdStatCardProps) {
  const theme = useSiteTheme();
  return (
    <StdCard>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm" style={{ color: theme.muted }}>
          {label}
        </p>
        {badge}
      </div>
      <p className="mt-2 text-2xl leading-tight" style={{ fontWeight: Math.max(theme.headingWeight, 700) }}>
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs" style={{ color: theme.muted }}>
          {hint}
        </p>
      )}
    </StdCard>
  );
}

// ---------------------------------------------------------------------------
// StdProgress
// ---------------------------------------------------------------------------

export interface StdProgressProps {
  label: string;
  value: number;
  max: number;
  /** ข้อความค่า เช่น "12 of 18 days" */
  valueText: string;
  tone?: StdTone;
}

export function StdProgress({ label, value, max, valueText, tone }: StdProgressProps) {
  const theme = useSiteTheme();
  const labelId = useId();
  const color = tone ? TONE_COLOR[tone] : theme.accent;
  const track = mix(theme.text, theme.surface, 0.88);
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs" style={{ color: theme.muted }}>
        <span id={labelId}>{label}</span>
        <span>{valueText}</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        className="mt-1.5 h-2 overflow-hidden rounded-full"
        style={{ background: track }}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StdAlert
// ---------------------------------------------------------------------------

export interface StdAlertProps {
  tone?: Exclude<StdTone, "neutral">;
  title?: string;
  children: ReactNode;
  /** true = ประกาศผ่าน screen reader (role="status") เช่น ผลการ submit */
  live?: boolean;
}

export function StdAlert({ tone = "warning", title, children, live }: StdAlertProps) {
  const s = useStdStyle("card");
  const theme = useSiteTheme();
  const token = TONE_COLOR[tone];
  const Icon = tone === "success" ? IconCheck : tone === "info" ? IconHelp : IconAlert;
  return (
    <div
      role={live ? "status" : undefined}
      className="flex gap-3 px-4 py-3 text-sm"
      style={{
        background: `color-mix(in srgb, ${token} 10%, white)`,
        borderInlineStart: `4px solid ${token}`,
        borderRadius: Math.min(s.radius, 12),
        color: "var(--color-text)",
        fontFamily: theme.font,
      }}
    >
      <span className="mt-0.5 shrink-0" style={{ color: token }}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        {title && (
          <p className="font-semibold" style={{ color: token }}>
            {title}
          </p>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StdSegmented (toggle)
// ---------------------------------------------------------------------------

export interface StdSegmentedProps {
  /** ชื่อกลุ่มสำหรับ screen reader */
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function StdSegmented({ label, options, value, onChange }: StdSegmentedProps) {
  const s = useStdStyle("button");
  const strong = readableOn(isDark(s.fill) ? s.fill : s.text, LIGHT_SURFACE);
  const active = readablePair(s.fill, s.text);
  const ring = readableOn(strong, LIGHT_SURFACE, AA_UI);
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-0.5 p-0.5"
      style={{
        ...cssVars({ "--sg-tint": `color-mix(in srgb, ${strong} 10%, transparent)` }),
        border: `1px solid ${mix(strong, LIGHT_SURFACE, 0.55)}`,
        borderRadius: s.radius + 2,
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`relative inline-flex items-center whitespace-nowrap transition-colors duration-[var(--dur-fast)] ${HIT_AREA} ${on ? "" : "hover:bg-[var(--sg-tint)]"}`}
            style={{
              height: Math.max(24, Math.round(s.height * 0.75)),
              paddingInline: Math.max(8, Math.round(s.paddingX * 0.6)),
              borderRadius: s.radius,
              background: on ? active.bg : undefined,
              color: on ? active.fg : strong,
              fontFamily: fontStack(s.fontFamily),
              fontWeight: on ? Math.max(s.fontWeight, 600) : 500,
              fontSize: Math.max(11, s.fontSize - 1),
              textTransform: s.textTransform ?? "none",
              outlineColor: ring,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StdBreadcrumb
// ---------------------------------------------------------------------------

export function StdBreadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  const theme = useSiteTheme();
  const link = readableOn(theme.accentText, theme.pageBg);
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.label} className="inline-flex items-center gap-1">
              {last ? (
                <span aria-current="page" style={{ color: theme.textOnPage }} className="font-medium">
                  {it.label}
                </span>
              ) : (
                <a
                  href={it.href ?? "#"}
                  onClick={(e) => preventMockNavigation(e, it.href)}
                  className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                  style={{ color: link, outlineColor: link }}
                >
                  {it.label}
                </a>
              )}
              {!last && (
                <span style={{ color: theme.mutedOnPage }}>
                  <IconChevronRight size={14} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// StdBarChart (SVG bars + HTML labels — ตัวอักษรไม่ถูกยืดตามขนาดจอ)
// ---------------------------------------------------------------------------

export interface StdBarChartProps {
  /** ชื่อกราฟ (ใช้เป็นชื่อ accessible + caption ตารางค่าที่ซ่อน) */
  title: string;
  data: { label: string; value: number }[];
  formatValue: (value: number) => string;
  height?: number;
}

export function StdBarChart({ title, data, formatValue, height = 192 }: StdBarChartProps) {
  const theme = useSiteTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = Math.max(1, data.length);
  const faded = mix(theme.accent, theme.surface, 0.45);
  const grid = mix(theme.text, theme.surface, 0.9);
  const summary = `${title}: ${data.map((d) => `${d.label} ${formatValue(d.value)}`).join(", ")}`;
  return (
    <figure className="min-w-0">
      <div className="flex gap-2">
        <div
          aria-hidden="true"
          className="flex shrink-0 flex-col justify-between text-end text-[11px]"
          style={{ height, color: theme.muted }}
        >
          <span>{formatValue(max)}</span>
          <span>{formatValue(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }}>
          {[0, 50, 100].map((p) => (
            <div key={p} aria-hidden="true" className="absolute inset-x-0 h-px" style={{ top: `${p}%`, background: grid }} />
          ))}
          <svg
            viewBox={`0 0 ${n * 10} 100`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={summary}
          >
            {data.map((d, i) => {
              const h = (d.value / max) * 100;
              return (
                <rect
                  key={d.label}
                  x={i * 10 + 2}
                  y={100 - h}
                  width={6}
                  height={h}
                  fill={i === data.length - 1 ? theme.accent : faded}
                >
                  <title>{`${d.label}: ${formatValue(d.value)}`}</title>
                </rect>
              );
            })}
          </svg>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="mt-2 grid text-center text-[11px]"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, color: theme.muted, marginInlineStart: 40 }}
      >
        {data.map((d) => (
          <span key={d.label} className="truncate">
            {d.label}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">{title}</figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// StdStackedBar (สัดส่วนสถานะ + legend ที่มี label เสมอ)
// ---------------------------------------------------------------------------

export interface StdStackedSegment {
  label: string;
  /** เปอร์เซ็นต์ 0..100 */
  value: number;
  tone: StdTone;
}

export function StdStackedBar({ label, segments }: { label: string; segments: StdStackedSegment[] }) {
  const theme = useSiteTheme();
  const summary = `${label}: ${segments.map((s) => `${s.label} ${s.value}%`).join(", ")}`;
  return (
    <div>
      <div role="img" aria-label={summary} className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${s.value}%`, background: TONE_COLOR[s.tone] }} />
        ))}
      </div>
      <ul className="mt-3 grid gap-2 text-sm" aria-hidden="true">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TONE_COLOR[s.tone] }} />
              {s.label}
            </span>
            <span className="font-semibold" style={{ color: theme.text }}>
              {s.value}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
