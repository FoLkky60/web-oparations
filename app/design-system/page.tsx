"use client";

import { CENTRAL_STYLE } from "../lib/mock-data";
import { Card, Badge } from "../components/ui";
import type { ComponentType } from "../lib/mock-types";

/*
 * ============================================================================
 * NOTE: หน้านี้เดิมดึง token/component จาก backend:
 *   const t = await api.tokens(); const c = await api.components();
 * ตอนนี้แสดงจาก MOCK (CENTRAL_STYLE) — ธีมแดง โค้ดเดิมคอมเมนต์อ้างอิงไว้
 * ============================================================================
 */

/*
 * รายการ swatch สำหรับ "แสดงผล" ค่า token ของธีมแอป (app theme — ธีมแดง)
 * - สวอตช์เรนเดอร์จาก cssVar (var(--...)) โดยตรง จึงสะท้อนค่าจริงจาก globals.css
 *   (ไม่ได้ hardcode สีลง logic ของ component)
 * - ช่อง `value` เป็น "ค่าอ้างอิงที่บันทึกไว้" (documented reference) ให้ตรงกับ
 *   globals.css — ต้อง sync กันเมื่อแก้ token (ดู .kiro/steering/design-system.md)
 * หมายเหตุ: นี่คือธีมของแอปเอง ไม่ใช่ DESIGN_SYSTEM_V1 (brown) ใน packages/core
 */
const COLOR_TOKENS = [
  { name: "color.primary", value: "#d71920", cssVar: "--color-primary" },
  { name: "color.primary.hover", value: "#b5151b", cssVar: "--color-primary-hover" },
  { name: "color.accent", value: "#e8392e", cssVar: "--color-accent" },
  { name: "color.secondary", value: "#ffe5e3", cssVar: "--color-secondary" },
  { name: "color.success", value: "#15803d", cssVar: "--color-success" },
  { name: "color.warning", value: "#b45309", cssVar: "--color-warning" },
  { name: "color.danger", value: "#b91c1c", cssVar: "--color-danger" },
  { name: "color.info", value: "#1d4ed8", cssVar: "--color-info" },
  { name: "color.text", value: "#1f2430", cssVar: "--color-text" },
  { name: "color.muted", value: "#5b6270", cssVar: "--color-muted" },
  { name: "color.surface", value: "#f6f7f9", cssVar: "--color-surface" },
  { name: "color.border", value: "#e6e8ec", cssVar: "--color-border" },
  { name: "color.sidebar", value: "#1b2030", cssVar: "--color-sidebar" },
];

const RADIUS_TOKENS = [
  { name: "radius.small", value: "4px", cssVar: "--radius-small" },
  { name: "radius.medium", value: "8px", cssVar: "--radius-medium" },
  { name: "radius.large", value: "16px", cssVar: "--radius-large" },
];

export default function DesignSystemPage() {
  const types = Object.keys(CENTRAL_STYLE) as ComponentType[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Design System</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Central source of truth · ธีมแดง · version 3.2.1 (mock)
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          ด้านล่างเป็น token ของ <strong>ธีมแอปเอง</strong> (app theme) · ส่วน
          “Central component styles” คือมาตรฐานที่ใช้แปลงเว็บผู้ใช้ (DESIGN_SYSTEM_V1)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Color tokens</h2>
          <ul className="space-y-2 text-sm">
            {COLOR_TOKENS.map((t) => (
              <li key={t.name} className="flex items-center gap-3">
                <span
                  className="inline-block h-5 w-5 rounded-[var(--radius-small)] border border-[var(--color-border)]"
                  style={{ background: `var(${t.cssVar})` }}
                />
                <span className="font-mono text-xs">{t.name}</span>
                <span className="text-[var(--color-muted)]">{t.value}</span>
                <span className="ml-auto font-mono text-xs text-[var(--color-muted)]">{t.cssVar}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">Radius tokens</h2>
          <ul className="space-y-2 text-sm">
            {RADIUS_TOKENS.map((t) => (
              <li key={t.name} className="flex items-center gap-3">
                <span
                  className="inline-block h-5 w-8 border border-[var(--color-primary)]"
                  style={{ borderRadius: `var(${t.cssVar})` }}
                />
                <span className="font-mono text-xs">{t.name}</span>
                <span className="text-[var(--color-muted)]">{t.value}</span>
                <span className="ml-auto font-mono text-xs text-[var(--color-muted)]">{t.cssVar}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Central component styles</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => {
            const s = CENTRAL_STYLE[type];
            return (
              <div key={type} className="rounded-[var(--radius-medium)] border border-[var(--color-border)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium capitalize">{type}</span>
                  <Badge kind="info">central</Badge>
                </div>
                <div
                  className="flex min-h-[48px] items-center justify-center text-sm"
                  style={{
                    background: s.background,
                    color: s.color,
                    borderRadius: s.borderRadius,
                    border: s.borderColor ? `1px solid ${s.borderColor}` : undefined,
                    padding: s.padding,
                    fontWeight: Number(s.fontWeight),
                    boxShadow: s.shadow,
                  }}
                >
                  {type}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
