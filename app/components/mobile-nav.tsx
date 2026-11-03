"use client";

import { useEffect, useRef, useState } from "react";
import { SidebarContent } from "./sidebar";
import { IconClose, IconMenu } from "./icons";

/**
 * Navigation สำหรับจอเล็ก (< md) — ปุ่ม Menu เปิด drawer ที่มีเนื้อหาเดียวกับ Sidebar
 * (เมนูหลัก + Imported websites + Built projects + user) ตาม design-system-policies §9
 *  - Escape / คลิกพื้นหลัง / คลิกลิงก์ = ปิด
 *  - เปิดแล้ว focus ไปที่ปุ่มปิด, ปิดแล้วคืน focus ให้ปุ่ม Menu
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = openRef.current;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <div className="flex items-center gap-2 bg-[var(--color-sidebar)] px-2 py-1 text-white">
        <button
          ref={openRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-drawer"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-medium)] hover:bg-white/10"
        >
          <IconMenu size={20} />
          <span className="sr-only">Open menu</span>
        </button>
        <span className="text-sm font-semibold">UI Standardization Platform</span>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Main navigation">
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            className="absolute inset-0 bg-[var(--color-sidebar)]/60"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-drawer"
            className="relative flex h-full w-72 max-w-[85vw] flex-col bg-[var(--color-sidebar)] text-white shadow-[var(--shadow-lg)]"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-medium)] hover:bg-white/10"
            >
              <IconClose size={20} />
              <span className="sr-only">Close menu</span>
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
