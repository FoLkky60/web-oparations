"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getCategories,
  getNotifications,
  getSite,
  getSites,
} from "../lib/standard-store";
import { useStandard } from "../lib/use-standard";
import { CURRENT_USER } from "../lib/standard-data";
import { formatDateTime } from "../lib/standard-labels";
import { MAIN_NAV, hasPermission } from "./nav-config";
import { IconBell, IconChevronRight, IconHelp, IconSearch } from "./icons";

/**
 * Top bar (ADD-04 §4.1): breadcrumb · search (Ctrl/Cmd + K) · notifications · help · avatar
 * ค้นหาเฉพาะข้อมูล mock ใน store (เมนู, imported websites (5) — ADD-05 ไม่มี built projects แยก, component categories)
 */
export function TopBar() {
  const pathname = usePathname();
  const crumbs = useBreadcrumb(pathname);

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 sm:px-6">
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1 text-sm">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
                {i > 0 && <IconChevronRight size={14} className="shrink-0 text-[var(--color-muted)]" />}
                {last || !c.href ? (
                  <span
                    aria-current={last ? "page" : undefined}
                    className={`truncate ${last ? "font-medium text-[var(--color-text)]" : "text-[var(--color-muted)]"}`}
                  >
                    {c.label}
                  </span>
                ) : (
                  <Link href={c.href} className="truncate text-[var(--color-muted)] hover:text-[var(--color-text)] hover:underline">
                    {c.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="order-last w-full sm:order-none sm:w-auto">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1">
        <NotificationsButton />
        <Popover
          label="Help"
          trigger={<IconHelp size={20} />}
          panel={
            <div className="space-y-2 p-4 text-sm">
              <p className="font-semibold text-[var(--color-text)]">Keyboard shortcuts</p>
              <p className="flex items-center justify-between gap-4 text-[var(--color-muted)]">
                Focus search <Kbd>Ctrl K</Kbd>
              </p>
              <p className="flex items-center justify-between gap-4 text-[var(--color-muted)]">
                Close panel <Kbd>Esc</Kbd>
              </p>
              <p className="pt-2 text-xs text-[var(--color-muted)]">Mock environment: data is stored in this browser only.</p>
            </div>
          }
        />
        <span
          className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-[var(--color-on-primary)]"
          role="img"
          aria-label={`${CURRENT_USER.name}, ${CURRENT_USER.role}`}
        >
          {CURRENT_USER.initials}
        </span>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

interface Crumb {
  label: string;
  href?: string;
}

function useBreadcrumb(pathname: string): Crumb[] {
  return useMemo(() => {
    const root: Crumb = { label: "UI Standardization Platform", href: "/" };
    if (pathname === "/") return [root, { label: "Dashboard" }];
    const [seg, id] = pathname.split("/").filter(Boolean);
    if (seg === "builder") return [root, { label: "Design System", href: "/design-system" }, { label: "Template & Builder" }];
    if (seg === "imported") {
      return [root, { label: "Imported websites" }, { label: (id && getSite(id)?.name) || "Website" }];
    }
    const item = MAIN_NAV.find((n) => n.href === `/${seg}`);
    const crumbs: Crumb[] = [root, { label: item?.label ?? seg, href: item?.href }];
    if (id) crumbs.push({ label: decodeURIComponent(id) });
    return crumbs;
  }, [pathname]);
}

// ---------------------------------------------------------------------------
// Search (Ctrl/Cmd + K)
// ---------------------------------------------------------------------------

interface SearchResult {
  href: string;
  label: string;
  group: string;
}

function GlobalSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const sites = useStandard(getSites);
  const categories = useStandard(getCategories);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const index = useMemo<SearchResult[]>(
    () => [
      ...MAIN_NAV.filter((n) => hasPermission(n.requiredPermission)).map((n) => ({
        href: n.href,
        label: n.label,
        group: "Menu",
      })),
      ...sites.map((s) => ({ href: `/imported/${s.id}`, label: `${s.name} (${s.code}) · ${s.team}`, group: "Imported website" })),
      ...categories.map((c) => ({ href: "/builder", label: c.label, group: "Component" })),
    ],
    [sites, categories],
  );

  const q = query.trim().toLowerCase();
  const results = q ? index.filter((r) => r.label.toLowerCase().includes(q)).slice(0, 8) : [];
  const showList = open && q.length > 0;

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          inputRef.current?.blur();
        }
      }}
    >
      <label htmlFor="global-search" className="sr-only">
        Search projects, components, design tokens
      </label>
      <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
      <input
        ref={inputRef}
        id="global-search"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search projects, components, design tokens..."
        role="combobox"
        aria-autocomplete="list"
        aria-controls={showList ? listId : undefined}
        aria-expanded={showList}
        aria-keyshortcuts="Control+K Meta+K"
        className="min-h-11 w-full rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-9 pr-16 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:bg-[var(--color-background)] focus:outline-none sm:w-80 lg:w-96"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
        <Kbd>Ctrl K</Kbd>
      </span>
      {showList && (
        <div
          id={listId}
          className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-lg)]"
        >
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[var(--color-muted)]" role="status">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <ul aria-label="Search results">
              {results.map((r) => (
                <li key={`${r.group}-${r.label}`}>
                  <Link
                    href={r.href}
                    onClick={() => {
                      setQuery("");
                      setOpen(false);
                    }}
                    className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                  >
                    <span className="truncate">{r.label}</span>
                    <span className="shrink-0 text-xs text-[var(--color-muted)]">{r.group}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications + generic popover
// ---------------------------------------------------------------------------

function NotificationsButton() {
  const items = useStandard(getNotifications);
  return (
    <Popover
      label={`Notifications (${items.length})`}
      trigger={
        <span className="relative inline-flex">
          <IconBell size={20} />
          {items.length > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-semibold text-[var(--color-on-primary)]"
            >
              {items.length}
            </span>
          )}
        </span>
      }
      panel={
        <div className="w-72">
          <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text)]">Notifications</p>
          {items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--color-muted)]">No new notifications</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id} className="border-b border-[var(--color-border)] px-4 py-3 text-sm last:border-0">
                  <p className="text-[var(--color-text)]">{n.text}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">{formatDateTime(n.at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      }
    />
  );
}

function Popover({ label, trigger, panel }: { label: string; trigger: ReactNode; panel: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-medium)] text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
      >
        {trigger}
      </button>
      {open && (
        <div
          id={panelId}
          tabIndex={-1}
          className="absolute right-0 top-full z-40 mt-1 rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-lg)]"
        >
          {panel}
        </div>
      )}
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[var(--radius-small)] border border-[var(--color-border)] bg-[var(--color-background)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-muted)]">
      {children}
    </kbd>
  );
}
