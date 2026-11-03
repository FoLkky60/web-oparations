"use client";

import { useSyncExternalStore } from "react";
import { subscribe } from "./mock-store";

/**
 * hook เล็ก ๆ ให้ component re-render เมื่อ mock store เปลี่ยน
 * ใช้ร่วมกับ selector ที่อ่านจาก mock-store
 */
export function useMock<T>(selector: () => T): T {
  return useSyncExternalStore(
    subscribe,
    selector,
    selector, // server snapshot (ค่าเริ่มต้นเหมือนกัน)
  );
}
