"use client";

/*
 * ADD-04 Phase E — Style resolver context
 *
 * หน้าเว็บของทีม (app/components/sites/*) ใช้ renderer ตัวเดียวกันทั้ง "original" และ "built"
 * ต่างกันแค่ resolver ที่ส่งเข้ามา:
 *   original → (c) => sourceStyle(siteId, c)   — หน้าตาเดิมของแต่ละทีม
 *   built    → (c) => publishedStyle(c)        — มาตรฐานที่ publish อยู่ (ทุกทีมเหมือนกัน)
 * std components อ่านสไตล์ผ่าน useStdStyle(categoryId) จึงไม่ต้องส่ง resolver ต่อกันเอง
 */

import { createContext, useContext, useMemo, type MouseEvent, type ReactNode } from "react";
import type { CategoryId, VariantStyle } from "../../lib/standard-types";
import { AA_UI, borderColor, fontStack, isDark, mix, readableOn } from "./color";

export type StyleResolver = (categoryId: CategoryId) => VariantStyle;

const StyleResolverContext = createContext<StyleResolver | null>(null);

export function StyleResolverProvider({ resolver, children }: { resolver: StyleResolver; children: ReactNode }) {
  return <StyleResolverContext.Provider value={resolver}>{children}</StyleResolverContext.Provider>;
}

/**
 * override สไตล์ของ category เดียว (เช่น preview variant ใน Builder)
 * ถ้าไม่มี provider ด้านนอก category อื่นจะได้ style เดียวกันนี้ (ใช้ preview component เดี่ยว)
 */
export function StdStyleOverride({
  category,
  style,
  children,
}: {
  category: CategoryId;
  style: VariantStyle;
  children: ReactNode;
}) {
  const parent = useContext(StyleResolverContext);
  const resolver = useMemo<StyleResolver>(
    () => (c) => (c === category || !parent ? style : parent(c)),
    [category, style, parent],
  );
  return <StyleResolverContext.Provider value={resolver}>{children}</StyleResolverContext.Provider>;
}

export function useStdStyle(categoryId: CategoryId): VariantStyle {
  const resolver = useContext(StyleResolverContext);
  if (!resolver) {
    throw new Error("useStdStyle must be used inside <StyleResolverProvider>.");
  }
  return resolver(categoryId);
}

export interface SiteTheme {
  /** พื้นหลังของหน้า = card.disabledFill (พื้น section ด้านใน) */
  pageBg: string;
  /** พื้นการ์ด/พื้นผิว */
  surface: string;
  /** ข้อความหลักบน surface */
  text: string;
  /** ข้อความหลักบน pageBg */
  textOnPage: string;
  /** ข้อความรองบน surface (ผ่าน AA) */
  muted: string;
  /** ข้อความรองบน pageBg (ผ่าน AA) */
  mutedOnPage: string;
  /** font stack ของเนื้อหา */
  font: string;
  headingWeight: number;
  /** สีเน้น (กราฟ/progress/ไอคอน) ≥ 3:1 บน surface */
  accent: string;
  /** สีเน้นสำหรับข้อความ ≥ 4.5:1 บน surface */
  accentText: string;
  /** สีเส้นแบ่ง */
  divider: string;
}

/** ธีมของ "หน้าเว็บ" ที่ derive จาก standard categories (card + button + navbar + table) */
export function useSiteTheme(): SiteTheme {
  const card = useStdStyle("card");
  const button = useStdStyle("button");
  const navbar = useStdStyle("navbar");
  const table = useStdStyle("table");
  return useMemo(() => {
    const surface = card.fill;
    const pageBg = card.disabledFill;
    const mutedRaw = mix(card.text, surface, 0.3);
    const accentRaw = [button.fill, navbar.hoverFill, table.fill, card.text].find((c) => isDark(c)) ?? card.text;
    return {
      pageBg,
      surface,
      text: readableOn(card.text, surface),
      textOnPage: readableOn(card.text, pageBg),
      muted: readableOn(mutedRaw, surface),
      mutedOnPage: readableOn(mutedRaw, pageBg),
      font: fontStack(card.fontFamily),
      headingWeight: card.fontWeight,
      accent: readableOn(accentRaw, surface, AA_UI),
      accentText: readableOn(accentRaw, surface),
      divider: borderColor(card.border) ?? mix(card.text, surface, 0.85),
    };
  }, [card, button, navbar, table]);
}

/** ลิงก์ mock (`#`, D-5) ไม่พาออกจากแพลตฟอร์ม และไม่เลื่อนหน้าไปบนสุด */
export function preventMockNavigation(event: MouseEvent<HTMLElement>, href?: string) {
  if (!href || href === "#") event.preventDefault();
}
