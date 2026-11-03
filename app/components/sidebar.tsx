"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBuiltProjects, getNavCounts, getSites } from "../lib/standard-store";
import { useStandard } from "../lib/use-standard";
import { CURRENT_USER } from "../lib/standard-data";
import { SITE_STATUS } from "../lib/standard-labels";
import { MAIN_NAV, hasPermission, isActivePath } from "./nav-config";
import { IconBox, IconCheck, IconCircle } from "./icons";

/**
 * Sidebar เข้ม (ADD-04 §4.1)
 * MAIN MENU + IMPORTED WEBSITES (n) + BUILT PROJECTS (n) + user card
 * ตัวเลข badge ทั้งหมดคำนวณจาก standard-store
 */
export function Sidebar() {
  return (
    <aside
      aria-label="Main navigation"
      className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-[var(--color-sidebar)] text-white"
    >
      <SidebarContent />
    </aside>
  );
}

/** เนื้อหา sidebar — ใช้ซ้ำใน mobile drawer (onNavigate = ปิด drawer เมื่อคลิกลิงก์) */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const sites = useStandard(getSites);
  const built = useStandard(getBuiltProjects);
  const counts = useStandard(getNavCounts);

  const navItems = MAIN_NAV.filter((item) => hasPermission(item.requiredPermission));

  const linkBase =
    "mb-0.5 flex min-h-11 items-center gap-3 rounded-[var(--radius-medium)] px-3 py-2 text-sm transition-colors";
  const linkState = (active: boolean) =>
    active
      ? "bg-[var(--color-sidebar-active)] font-medium text-white"
      : "text-[var(--color-sidebar-muted)] hover:bg-white/5 hover:text-white";

  return (
    <>
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-medium)] bg-[var(--color-primary)] text-sm font-bold">
          UI
        </span>
        <div className="text-sm font-semibold leading-tight">
          UI Standardization
          <div className="text-[11px] font-normal text-[var(--color-sidebar-muted)]">Platform</div>
        </div>
      </div>

      <nav aria-label="Primary" className="mt-1 flex-1 overflow-y-auto px-2 pb-4">
        <SectionLabel>Main Menu</SectionLabel>
        <ul>
          {navItems.map(({ href, label, Icon, countKey, countLabel }) => {
            const active = isActivePath(pathname, href);
            const count = countKey ? counts[countKey] : 0;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`${linkBase} ${linkState(active)}`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {countKey && count > 0 && (
                    <span
                      className={`rounded-full px-1.5 text-[11px] font-semibold ${
                        active ? "bg-white/20 text-white" : "bg-white/10 text-white"
                      }`}
                    >
                      {count}
                      <span className="sr-only"> {countLabel}</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <SectionLabel>Imported Websites ({sites.length})</SectionLabel>
        <ul>
          {sites.map((site) => {
            const href = `/imported/${site.id}`;
            const active = isActivePath(pathname, href);
            const st = SITE_STATUS[site.status];
            return (
              <li key={site.id}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`${linkBase} ${
                    active ? "bg-white/10 font-medium text-white" : "text-[var(--color-sidebar-muted)] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-small)] bg-white/10 text-[10px] font-bold text-white"
                  >
                    {site.code}
                  </span>
                  <span className="flex-1 truncate">{site.name}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      site.status === "built" ? "bg-white/15 text-white" : "text-[var(--color-sidebar-muted)] ring-1 ring-white/20"
                    }`}
                  >
                    {site.status === "built" ? <IconCheck size={10} /> : <IconCircle size={10} />}
                    {st.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <SectionLabel>Built Projects ({built.length})</SectionLabel>
        <ul>
          {built.map((p) => {
            const href = `/built/${p.id}`;
            const active = isActivePath(pathname, href);
            return (
              <li key={p.id}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`${linkBase} ${
                    active ? "bg-white/10 font-medium text-white" : "text-[var(--color-sidebar-muted)] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <IconBox size={18} className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.name}</span>
                    <span className="block truncate text-[11px] text-[var(--color-sidebar-muted)]">Team {p.team}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
        <span
          aria-hidden="true"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-[var(--color-on-primary)]"
        >
          {CURRENT_USER.initials}
        </span>
        <div className="min-w-0 text-sm leading-tight">
          <div className="truncate font-medium text-white">{CURRENT_USER.name}</div>
          <div className="truncate text-[11px] text-[var(--color-sidebar-muted)]">{CURRENT_USER.role}</div>
        </div>
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-sidebar-muted)] first:mt-1">
      {children}
    </div>
  );
}
