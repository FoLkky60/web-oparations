import type { Metadata } from "next";
import { DesignSystemView } from "./design-system-view";

export const metadata: Metadata = { title: "Design System · UI Standardization Platform" };

/**
 * Design System — แสดง active standard (เวอร์ชันที่ publish อยู่) จาก standard-store
 * Server page (metadata) → client view ที่อ่าน standard-store (mock, localStorage)
 */
export default function DesignSystemPage() {
  return <DesignSystemView />;
}
