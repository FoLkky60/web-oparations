import type { ComponentType, SVGProps } from "react";
import type { NavCounts } from "../lib/standard-store";
import {
  IconAnalysis,
  IconDashboard,
  IconDesignSystem,
  IconFolder,
  IconHistory,
  IconMapping,
  IconReport,
  IconSettings,
  IconTemplate,
  IconUpload,
} from "./icons";

/*
 * เมนูหลัก (ADD-04 §4.1) — ใช้ร่วมกันระหว่าง Sidebar (desktop) และ MobileNav (drawer)
 *
 * RBAC-ready: `requiredPermission` (optional) ไว้ให้ Phase G filter ตามบทบาท
 * ตอนนี้ยังไม่มี auth จริง → hasPermission() คืน true (เมนูแสดงครบ)
 */

export type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export interface NavItem {
  href: string;
  label: string;
  Icon: IconComponent;
  requiredPermission?: string;
  /** key ของตัวนับใน NavCounts ที่จะแสดงเป็น badge */
  countKey?: keyof Pick<NavCounts, "projects" | "builderOpen" | "transformationsAttention">;
  /** คำอธิบาย badge สำหรับ screen reader */
  countLabel?: string;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", Icon: IconDashboard, requiredPermission: "dashboard:view" },
  {
    href: "/projects",
    label: "Project Catalog",
    Icon: IconFolder,
    requiredPermission: "project:view",
    countKey: "projects",
    countLabel: "projects",
  },
  { href: "/upload", label: "Upload Website", Icon: IconUpload, requiredPermission: "project:create" },
  { href: "/analysis", label: "UI Analysis", Icon: IconAnalysis, requiredPermission: "analysis:view" },
  { href: "/mapping", label: "Component Mapping", Icon: IconMapping, requiredPermission: "mapping:view" },
  {
    href: "/builder",
    label: "Template & Builder",
    Icon: IconTemplate,
    requiredPermission: "design-system:edit",
    countKey: "builderOpen",
    countLabel: "categories open",
  },
  {
    href: "/transformations",
    label: "Transformation History",
    Icon: IconHistory,
    requiredPermission: "transformation:view",
    countKey: "transformationsAttention",
    countLabel: "need attention",
  },
  { href: "/design-system", label: "Design System", Icon: IconDesignSystem, requiredPermission: "design-system:view" },
  { href: "/reports", label: "Reports", Icon: IconReport, requiredPermission: "report:view" },
  { href: "/settings", label: "Settings", Icon: IconSettings, requiredPermission: "settings:view" },
];

/** hook point สำหรับ RBAC (Phase G) */
export function hasPermission(requiredPermission?: string): boolean {
  void requiredPermission;
  return true;
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
