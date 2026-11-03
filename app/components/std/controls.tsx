"use client";

/*
 * ADD-04 Phase E — std controls: StdButton, StdInput, StdBadge
 * สไตล์มาจาก VariantStyle ของ category (useStdStyle) → ตั้งเป็น CSS custom properties บน element
 * แล้ว Tailwind arbitrary values อ่าน var(...) (รองรับ hover/focus/disabled โดยไม่ hardcode hex)
 */

import {
  useId,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { IconAlert, IconChevronDown, IconSearch } from "../icons";
import {
  AA_UI,
  DARK_INK,
  LIGHT_SURFACE,
  fontStack,
  isDark,
  mix,
  readableBg,
  readableOn,
  readablePair,
} from "./color";
import { preventMockNavigation, useSiteTheme, useStdStyle } from "./style-context";

/** แปลง map ของ CSS custom properties เป็น style object */
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}

/** hit area ≥ 44×44px โดยไม่เปลี่ยนขนาดที่มองเห็น (pseudo-element) */
export const HIT_AREA =
  "before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-full before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']";

// ---------------------------------------------------------------------------
// StdButton
// ---------------------------------------------------------------------------

export type StdButtonVariant = "primary" | "secondary" | "text";

export interface StdButtonProps {
  children?: ReactNode;
  /** primary = ปุ่มทึบ (button style) · secondary = outline (radius/height/font เดียวกัน) · text = text link */
  variant?: StdButtonVariant;
  size?: "md" | "sm";
  type?: "button" | "submit" | "reset";
  /** ถ้าระบุ จะ render เป็น <a> — "#" = mock link (ไม่ navigate) */
  href?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  fullWidth?: boolean;
  /** จำเป็นเมื่อเป็นปุ่มไอคอนอย่างเดียว */
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  /** แสดง state แบบคงที่ (ใช้ใน preview ของ Builder) */
  previewState?: "hover" | "focus";
  className?: string;
}

export function StdButton({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  href,
  onClick,
  disabled,
  iconStart,
  iconEnd,
  fullWidth,
  ariaLabel,
  ariaPressed,
  ariaExpanded,
  ariaControls,
  previewState,
  className = "",
}: StdButtonProps) {
  const s = useStdStyle("button");
  const sm = size === "sm";
  const height = sm ? Math.max(24, Math.round(s.height * 0.8)) : s.height;
  const paddingX = sm ? Math.max(8, Math.round(s.paddingX * 0.7)) : s.paddingX;
  const fontSize = sm ? Math.max(11, s.fontSize - 1) : s.fontSize;
  const iconOnly = !children && !!(iconStart || iconEnd);

  const primary = readablePair(s.fill, s.text);
  const hoverBg = readableBg(s.hoverFill, primary.fg);
  const strong = readableOn(isDark(s.fill) ? s.fill : s.text, LIGHT_SURFACE);
  const ring = readableOn(strong, LIGHT_SURFACE, AA_UI);
  const tint = `color-mix(in srgb, ${strong} 10%, transparent)`;

  const vars =
    variant === "primary"
      ? {
          "--sb-bg": previewState === "hover" ? hoverBg : primary.bg,
          "--sb-fg": primary.fg,
          "--sb-hover": hoverBg,
          "--sb-dis-bg": s.disabledFill,
          "--sb-dis-fg": readableOn(primary.fg, s.disabledFill, AA_UI),
          "--sb-ring": ring,
          "--sb-border": s.border,
        }
      : {
          "--sb-bg": previewState === "hover" ? tint : "transparent",
          "--sb-fg": strong,
          "--sb-hover": variant === "secondary" ? tint : "transparent",
          "--sb-dis-bg": "transparent",
          "--sb-dis-fg": strong,
          "--sb-ring": ring,
          "--sb-border": variant === "secondary" ? `1px solid ${strong}` : "none",
        };

  const style: CSSProperties = {
    ...cssVars(vars),
    height: variant === "text" ? undefined : height,
    width: iconOnly && variant !== "text" ? height : undefined,
    paddingInline: variant === "text" || iconOnly ? (variant === "text" ? 2 : 0) : paddingX,
    borderRadius: s.radius,
    fontFamily: fontStack(s.fontFamily),
    fontWeight: s.fontWeight,
    fontSize,
    textTransform: s.textTransform ?? "none",
    // inline outlineColor ชนะ global :focus-visible ใน globals.css (unlayered)
    outlineColor: ring,
  };

  const classes = [
    "relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap leading-none select-none",
    "transition-colors duration-[var(--dur-fast)]",
    HIT_AREA,
    "bg-[var(--sb-bg)] text-[var(--sb-fg)] [border:var(--sb-border)] hover:bg-[var(--sb-hover)]",
    "disabled:cursor-not-allowed disabled:bg-[var(--sb-dis-bg)] disabled:text-[var(--sb-dis-fg)]",
    variant !== "primary" ? "disabled:opacity-50" : "",
    variant === "text" ? "underline-offset-4 hover:underline" : "",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sb-ring)]",
    previewState === "focus" ? "outline-2 outline-offset-2 outline-[var(--sb-ring)]" : "",
    previewState === "hover" && variant === "text" ? "underline" : "",
    fullWidth ? "w-full" : "",
    className,
  ].join(" ");

  const content = (
    <>
      {iconStart}
      {children}
      {iconEnd}
    </>
  );

  if (href !== undefined) {
    return (
      <a
        href={href}
        className={classes}
        style={style}
        aria-label={ariaLabel}
        onClick={(e) => {
          preventMockNavigation(e, href);
          onClick?.(e);
        }}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      style={style}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

// ---------------------------------------------------------------------------
// StdInput
// ---------------------------------------------------------------------------

export type StdInputType = "text" | "email" | "date" | "search" | "textarea" | "select" | "checkbox";

export interface StdInputOption {
  value: string;
  label: string;
}

export interface StdInputProps {
  /** label แสดงเสมอ (ไม่มีโหมดซ่อน) */
  label: string;
  type?: StdInputType;
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  options?: StdInputOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  error?: string;
  rows?: number;
  autoComplete?: string;
  min?: string;
  max?: string;
  /** stacked = label อยู่บน · inline = label อยู่ซ้าย (เช่น search ใน header) */
  layout?: "stacked" | "inline";
  /** label ใช้สีตัวอักษรของ parent (เช่น อยู่บน navbar พื้นเข้ม) */
  labelInherit?: boolean;
  previewState?: "focus";
  className?: string;
}

export function StdInput({
  label,
  type = "text",
  name,
  id,
  value,
  defaultValue,
  onValueChange,
  checked,
  onCheckedChange,
  options = [],
  placeholder,
  required,
  disabled,
  hint,
  error,
  rows = 4,
  autoComplete,
  min,
  max,
  layout = "stacked",
  labelInherit,
  previewState,
  className = "",
}: StdInputProps) {
  const s = useStdStyle("input");
  const theme = useSiteTheme();
  const autoId = useId();
  const fieldId = id ?? `std-${autoId}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const fieldRef = useRef<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>(null);

  const bg = s.fill;
  const fg = readableOn(s.text, bg);
  const focus = readableOn(s.hoverFill, bg, AA_UI);
  const placeholderColor = readableOn(mix(fg, bg, 0.4), bg);

  const vars = cssVars({
    "--si-bg": bg,
    "--si-fg": fg,
    "--si-focus": focus,
    "--si-dis": s.disabledFill,
    "--si-ph": placeholderColor,
    "--si-border": error ? "1px solid var(--color-danger)" : s.border,
  });
  const font: CSSProperties = {
    fontFamily: fontStack(s.fontFamily),
    fontWeight: s.fontWeight,
    fontSize: s.fontSize,
  };
  const labelStyle: CSSProperties = {
    fontFamily: fontStack(s.fontFamily),
    color: labelInherit ? "inherit" : theme.text,
  };

  const hintNode = (
    <>
      {hint && (
        <p id={hintId} className="mt-1 text-xs" style={{ color: theme.muted }}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-danger)]">
          <IconAlert size={14} />
          {error}
        </p>
      )}
    </>
  );

  if (type === "checkbox") {
    return (
      <div className={className} style={vars}>
        <label
          htmlFor={fieldId}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm"
          style={labelStyle}
        >
          <input
            id={fieldId}
            ref={fieldRef}
            type="checkbox"
            name={name}
            checked={checked}
            disabled={disabled}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            style={{ outlineColor: focus }}
            className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-[var(--si-focus)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--si-focus)]"
          />
          <span>{label}</span>
        </label>
        {hintNode}
      </div>
    );
  }

  const fieldClass = [
    "block w-full min-w-0 bg-[var(--si-bg)] text-[var(--si-fg)] [border:var(--si-border)] placeholder:text-[var(--si-ph)]",
    "transition-colors duration-[var(--dur-fast)]",
    "focus:[border-color:var(--si-focus)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--si-focus)]",
    "disabled:cursor-not-allowed disabled:bg-[var(--si-dis)]",
    previewState === "focus" ? "[border-color:var(--si-focus)] outline-2 outline-offset-1 outline-[var(--si-focus)]" : "",
  ].join(" ");

  const fieldStyle: CSSProperties = {
    ...font,
    height: type === "textarea" ? undefined : s.height,
    paddingInline: s.paddingX,
    paddingInlineStart: type === "search" ? s.paddingX + 22 : s.paddingX,
    paddingInlineEnd: type === "select" ? s.paddingX + 22 : s.paddingX,
    paddingBlock: type === "textarea" ? 8 : 0,
    borderRadius: s.radius,
    outlineColor: focus,
  };

  const common = {
    id: fieldId,
    name,
    disabled,
    required,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    className: fieldClass,
    style: fieldStyle,
  } as const;

  let field: ReactNode;
  if (type === "textarea") {
    field = (
      <textarea
        {...common}
        ref={fieldRef}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={`${fieldClass} resize-y`}
      />
    );
  } else if (type === "select") {
    field = (
      <select
        {...common}
        ref={fieldRef}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={`${fieldClass} cursor-pointer appearance-none`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else {
    field = (
      <input
        {...common}
        ref={fieldRef}
        type={type}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        min={min}
        max={max}
        onChange={(e) => onValueChange?.(e.target.value)}
      />
    );
  }

  /** คลิกพื้นที่รอบช่องกรอก (hit area ≥44px) → focus ช่องกรอก */
  const focusField = (e: PointerEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      fieldRef.current?.focus();
    }
  };

  const inline = layout === "inline";
  return (
    <div className={`min-w-0 ${inline ? "flex items-center gap-3" : ""} ${className}`} style={vars}>
      <label
        htmlFor={fieldId}
        className={`text-sm font-medium ${inline ? "shrink-0 whitespace-nowrap" : "mb-1 block"}`}
        style={labelStyle}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-[var(--color-danger)]">
            *
          </span>
        )}
      </label>
      <div className="min-w-0 flex-1">
        <div
          className={`relative flex items-center ${type === "textarea" ? "" : "min-h-11"}`}
          onPointerDown={focusField}
        >
          {type === "search" && (
            <span
              className="pointer-events-none absolute top-1/2 -translate-y-1/2"
              style={{ insetInlineStart: s.paddingX, color: placeholderColor }}
            >
              <IconSearch size={16} />
            </span>
          )}
          {field}
          {type === "select" && (
            <span
              className="pointer-events-none absolute top-1/2 -translate-y-1/2"
              style={{ insetInlineEnd: s.paddingX, color: fg }}
            >
              <IconChevronDown size={16} />
            </span>
          )}
        </div>
        {hintNode}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StdBadge
// ---------------------------------------------------------------------------

export type StdTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_TOKEN: Record<Exclude<StdTone, "success" | "neutral">, string> = {
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
};

/** label → tone (สถานะใน §5) — label แสดงคู่เสมอ ไม่พึ่งสีอย่างเดียว */
export function statusTone(label: string): StdTone {
  const key = label.trim().toLowerCase();
  if (["paid", "approved", "success", "available", "active", "completed", "done", "new"].includes(key)) {
    return "success";
  }
  if (["pending", "upcoming", "low", "partially paid", "in progress", "in review", "draft"].includes(key)) {
    return "warning";
  }
  if (["overdue", "declined", "rejected", "failed", "missing"].includes(key)) return "danger";
  if (["scheduled", "info"].includes(key)) return "info";
  return "neutral";
}

export interface StdBadgeProps {
  children: ReactNode;
  /** ถ้าไม่ระบุ จะเดาจากข้อความ (statusTone) เมื่อ children เป็น string */
  tone?: StdTone;
  dot?: boolean;
  className?: string;
}

/**
 * Status pill — shape/typography จาก badge style
 * success = สีของ badge style โดยตรง · neutral = disabledFill
 * warning/danger/info = semantic token (solid ถ้า badge style เป็นพื้นเข้ม, tinted ถ้าพื้นอ่อน)
 */
export function StdBadge({ children, tone, dot = true, className = "" }: StdBadgeProps) {
  const s = useStdStyle("badge");
  const t: StdTone = tone ?? (typeof children === "string" ? statusTone(children) : "neutral");
  const solid = isDark(s.fill);
  const hasBorder = s.border !== "none";

  let bg: string;
  let fg: string;
  let dotColor: string;
  let border = "none";
  if (t === "success") {
    const p = readablePair(s.fill, s.text);
    bg = p.bg;
    fg = p.fg;
    dotColor = readableOn(s.hoverFill, bg, AA_UI);
    border = s.border;
  } else if (t === "neutral") {
    bg = s.disabledFill;
    const ink = isDark(bg) ? LIGHT_SURFACE : DARK_INK;
    fg = readableOn(mix(ink, bg, 0.25), bg);
    dotColor = fg;
    border = hasBorder ? s.border : "none";
  } else {
    const token = TONE_TOKEN[t];
    if (solid) {
      bg = token;
      fg = "var(--color-on-primary)";
      dotColor = "var(--color-on-primary)";
    } else {
      bg = `color-mix(in srgb, ${token} 14%, white)`;
      fg = token;
      dotColor = token;
    }
    if (hasBorder) border = `1px solid color-mix(in srgb, ${token} 40%, white)`;
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap leading-none ${className}`}
      style={{
        background: bg,
        color: fg,
        border,
        minHeight: s.height,
        paddingInline: s.paddingX,
        borderRadius: s.radius,
        fontFamily: fontStack(s.fontFamily),
        fontWeight: s.fontWeight,
        fontSize: s.fontSize,
        textTransform: s.textTransform ?? "none",
      }}
    >
      {dot && (
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dotColor }} />
      )}
      {children}
    </span>
  );
}
