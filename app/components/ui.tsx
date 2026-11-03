import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { IconAlert, IconCheck, IconCircle, IconClock } from "./icons";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-background)] p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <div className="text-sm text-[var(--color-muted)]">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-3xl font-bold text-[var(--color-text)]">{value}</div>
        {hint && <span className="text-xs font-medium text-[var(--color-primary)]">{hint}</span>}
      </div>
    </Card>
  );
}

/*
 * Badge — สีผูกกับ semantic token เสมอ (ไม่ hardcode Tailwind palette)
 * พื้นหลัง = token ผสมขาวให้อ่อน (color-mix) · ตัวอักษร = token เต็ม → คอนทราสต์ผ่าน AA
 * สื่อความหมายด้วยสี + ข้อความ (label) ควบคู่กันตามนโยบาย
 */
export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const KIND_TONE: Record<string, Tone> = {
  error: "danger",
  warning: "warning",
  info: "info",
  applied: "success",
  "needs-review": "warning",
  success: "success",
  standardized: "success",
  analyzed: "warning",
  imported: "neutral",
  failed: "danger",
};

const TONE_VAR: Record<Tone, string> = {
  neutral: "var(--color-muted)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
};

function toneStyle(tone: Tone): CSSProperties {
  const c = TONE_VAR[tone];
  return {
    backgroundColor: `color-mix(in srgb, ${c} 14%, white)`,
    color: c,
  };
}

export function Badge({ kind, children }: { kind?: string; children: ReactNode }) {
  const tone: Tone = (kind && KIND_TONE[kind]) || "neutral";
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
      style={toneStyle(tone)}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline";
  type?: "button" | "submit";
  className?: string;
}) {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-medium)] px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]"
      : variant === "outline"
        ? "border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-secondary)]"
        : "border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] hover:bg-[var(--color-surface)]";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]"
      : "border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] hover:bg-[var(--color-surface)]";
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-medium)] px-4 py-2 text-sm font-medium transition-colors ${styles}`}
    >
      {children}
    </Link>
  );
}

/** แถบความคืบหน้าแบบขั้นตอน (ตาม mockup) */
export function StepFlow({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} className="flex items-center gap-1">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? "bg-[var(--color-success)] text-white"
                    : active
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-border)] text-[var(--color-muted)]"
                }`}
              >
                {done ? <IconCheck size={14} /> : i + 1}
              </span>
              <span className={`text-xs ${active ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-muted)]"}`}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && <span aria-hidden="true" className="mx-1 h-px w-6 bg-[var(--color-border)]" />}
          </div>
        );
      })}
    </div>
  );
}

/** แถบ compliance แบบมีเปอร์เซ็นต์ */
export function ComplianceBar({ score }: { score: number }) {
  const color =
    score >= 85 ? "var(--color-success)" : score >= 65 ? "var(--color-warning)" : "var(--color-danger)";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-medium" style={{ color }}>
        {score}%
      </span>
    </div>
  );
}

/** กราฟเส้นเล็ก ๆ (SVG) ไม่พึ่ง lib ภายนอก — ใช้โชว์ trend */
export function Sparkline({
  data,
  width = 280,
  height = 72,
  stroke = "var(--color-primary)",
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 6;
  const stepX = (width - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height - pad} L${pts[0][0].toFixed(1)},${height - pad} Z`;
  return (
    <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={stroke} opacity={0.1} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 3 : 0} fill={stroke} />
      ))}
    </svg>
  );
}

/** แถบ progress กลม ๆ แสดงสัดส่วน (เช่น auto-fixable %) */
export function MiniBar({ pct, color = "var(--color-success)" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * ADD-04 (Phase B) — primitives เพิ่ม (ผูก token ทั้งหมด)
 * ------------------------------------------------------------------------- */

const TONE_ICON: Record<Tone, (p: { size?: number }) => ReactNode> = {
  success: (p) => <IconCheck {...p} />,
  warning: (p) => <IconAlert {...p} />,
  danger: (p) => <IconAlert {...p} />,
  info: (p) => <IconClock {...p} />,
  neutral: (p) => <IconCircle {...p} />,
};

/**
 * StatusPill — สถานะที่ไม่พึ่งสีอย่างเดียว: ไอคอนรูปทรงต่างกัน + label เสมอ (WCAG 2.2 AA)
 */
export function StatusPill({ tone, label, icon }: { tone: Tone; label: string; icon?: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
      style={toneStyle(tone)}
    >
      {icon ?? TONE_ICON[tone]({ size: 12 })}
      {label}
    </span>
  );
}

/** หัวหน้าเพจ (title + คำอธิบาย + action) ใช้ร่วมทุกหน้า */
export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{title}</h1>
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
        {description && <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Empty state มาตรฐาน (D-8: หน้าที่ยังไม่พัฒนา / ยังไม่มีข้อมูล) */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-medium)] border border-dashed border-[var(--color-border)] bg-[var(--color-background)] px-6 py-12 text-center">
      {icon && (
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)]">
          {icon}
        </span>
      )}
      <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-[var(--color-muted)]">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Chip เล็กโทนแบรนด์ (เช่น "Design System v3.2.1 active") */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary-active)]">
      {children}
    </span>
  );
}
