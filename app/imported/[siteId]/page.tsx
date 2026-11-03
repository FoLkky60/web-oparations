import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteView, type SiteViewMode } from "../../components/sites/site-viewer";
import { SITES } from "../../lib/standard-data";

/**
 * Imported website (ADD-04 Phase E + ADD-05) — เว็บของทีม 1 ใน 5 เว็บ (ชุดเดียวกับ standardized build)
 *  - ค่าเริ่มต้น = Standardized (มาตรฐานที่ build ล่าสุด, อัปเดตทันทีหลัง Apply/Rebuild)
 *  - ?view=original = Original source (ต้นฉบับไม่ถูกแก้ — RULE-01)
 */

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function parseMode(view: string | string[] | undefined): SiteViewMode {
  const v = Array.isArray(view) ? view[0] : view;
  return v === "original" ? "original" : "standardized";
}

export async function generateMetadata({ params }: { params: Promise<{ siteId: string }> }): Promise<Metadata> {
  const { siteId } = await params;
  const site = SITES.find((s) => s.id === siteId);
  return { title: `${site?.name ?? "Website"} · Imported websites` };
}

export default async function ImportedSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: SearchParams;
}) {
  const { siteId } = await params;
  const site = SITES.find((s) => s.id === siteId);
  if (!site) notFound();
  const mode = parseMode((await searchParams).view);
  return <SiteView siteId={site.id} mode={mode} />;
}
