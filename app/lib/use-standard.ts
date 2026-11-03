"use client";

import { useSyncExternalStore } from "react";
import { subscribe } from "./standard-store";

/**
 * hook ให้ component re-render เมื่อ standard-store เปลี่ยน (ADD-04)
 * selector ต้องคืน reference คงที่ (getter ใน store memoize ตาม version แล้ว)
 * server snapshot = selector เดียวกัน: ก่อน subscribe store ยังเป็น seed ทั้ง server และ client
 */
export function useStandard<T>(selector: () => T): T {
  return useSyncExternalStore(subscribe, selector, selector);
}
