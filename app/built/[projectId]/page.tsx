import { notFound, redirect } from "next/navigation";
import { LEGACY_BUILT_PROJECT_SITE } from "../../lib/standard-data";

/**
 * ADD-05: "Built projects" ไม่ใช่ชุดแยกอีกต่อไป — เว็บ 5 เว็บมี standardized build ในตัว (/imported/[siteId])
 * route นี้เหลือไว้เพื่อให้ลิงก์เก่าใช้ได้: redirect (307) ไปเว็บที่ตรงกัน, id อื่น → 404
 */
export default async function LegacyBuiltProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  // own-property check เท่านั้น (กัน id อย่าง "constructor" / "__proto__")
  const siteId = Object.prototype.hasOwnProperty.call(LEGACY_BUILT_PROJECT_SITE, projectId)
    ? LEGACY_BUILT_PROJECT_SITE[projectId]
    : undefined;
  if (!siteId) notFound();
  redirect(`/imported/${siteId}`);
}
