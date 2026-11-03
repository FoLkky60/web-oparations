import type { Metadata } from "next";
import { BuilderView } from "./builder-view";

export const metadata: Metadata = { title: "Template & Builder · UI Standardization Platform" };

/**
 * Template & Builder — Component Standard Builder (ADD-04 Phase D, §4.3)
 * Server page (metadata) → client view ที่อ่าน/เขียน standard-store (mock, localStorage)
 */
export default function BuilderPage() {
  return <BuilderView />;
}
