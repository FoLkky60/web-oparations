"use client";

/*
 * ADD-04 Phase E — โครงร่วมของหน้าเว็บทีม (ใช้ทั้ง original และ built)
 * พื้น/ตัวอักษร/ฟอนต์ ของหน้า derive จาก standard categories ผ่าน useSiteTheme
 * @container → layout ปรับตามความกว้างพื้นที่ main ของแพลตฟอร์ม (ไม่ใช่ viewport)
 */

import type { ReactNode } from "react";
import { useSiteTheme } from "../std";

export function SiteRoot({ children }: { children: ReactNode }) {
  const theme = useSiteTheme();
  return (
    <div
      className="@container flex min-h-[70vh] min-w-0 flex-col"
      style={{ background: theme.pageBg, color: theme.textOnPage, fontFamily: theme.font }}
    >
      {children}
    </div>
  );
}

/** หัวข้อหลักของหน้าเว็บทีม (h1) + คำอธิบาย + action */
export function SiteHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const theme = useSiteTheme();
  return (
    <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-end @3xl:justify-between">
      <div className="min-w-0">
        <h1
          className="text-2xl leading-tight @3xl:text-[28px]"
          style={{ color: theme.textOnPage, fontWeight: Math.max(theme.headingWeight, 700) }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm" style={{ color: theme.mutedOnPage }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-end gap-2">{actions}</div>}
    </div>
  );
}

/** หัวข้อ section (h2) บนพื้นหน้า */
export function SiteSectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  const theme = useSiteTheme();
  return (
    <h2 id={id} className="text-lg" style={{ color: theme.textOnPage, fontWeight: Math.max(theme.headingWeight, 600) }}>
      {children}
    </h2>
  );
}

/** ข้อความรองบน surface */
export function Muted({ children, className = "" }: { children: ReactNode; className?: string }) {
  const theme = useSiteTheme();
  return (
    <span className={className} style={{ color: theme.muted }}>
      {children}
    </span>
  );
}
