import { redirect } from "next/navigation";

/*
 * ============================================================================
 * DEPRECATED ROUTE — โฟลว์เดิมที่ผูกกับ backend REST API (api.getProject ฯลฯ)
 * ถูกแทนที่ด้วยโฟลว์ mock ใหม่ที่ /sites/[id] และ /mapping
 *
 * โค้ดเดิมยังเก็บไว้ที่ไฟล์ project-client.tsx (คอมเมนต์อ้างอิง) แต่ route นี้
 * จะ redirect ไปหน้าแรกเพื่อไม่ให้ชนกับโฟลว์ใหม่
 *
 * ของเดิม:
 *   import { Suspense } from "react";
 *   import { ProjectClient } from "./project-client";
 *   export const instant = false;
 *   export default async function ProjectPage({ params }) {
 *     const { id } = await params;
 *     return <Suspense ...><ProjectClient id={id} /></Suspense>;
 *   }
 * ============================================================================
 */
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  redirect("/");
}
