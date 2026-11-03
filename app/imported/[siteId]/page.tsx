import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceholderPage } from "../../components/placeholder-page";
import { IconGlobe } from "../../components/icons";
import { StatusPill } from "../../components/ui";
import { SITES } from "../../lib/standard-data";
import { SITE_STATUS } from "../../lib/standard-labels";

/**
 * Imported website — placeholder ชั่วคราว (ADD-04 Phase B)
 * หน้าเว็บต้นฉบับจริงของแต่ละทีมจะมาแทนใน phase ถัดไป (D-6)
 */

export function generateStaticParams() {
  return SITES.map((s) => ({ siteId: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ siteId: string }> }): Promise<Metadata> {
  const { siteId } = await params;
  const site = SITES.find((s) => s.id === siteId);
  return { title: `${site?.name ?? "Website"} · Imported websites` };
}

export default async function ImportedSitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = SITES.find((s) => s.id === siteId);
  if (!site) notFound();
  const st = SITE_STATUS[site.status];

  return (
    <PlaceholderPage
      title={site.name}
      meta={
        <>
          <StatusPill tone={st.tone} label={st.label} />
          <span className="text-xs text-[var(--color-muted)]">
            Team {site.team} · {site.componentCount} components · {site.pageCount} pages
          </span>
        </>
      }
      description="Original source website. The original is never modified."
      icon={<IconGlobe size={22} />}
      emptyTitle="Source website preview is coming soon"
      emptyDescription="The original pages of this website will be viewable here in a later phase."
      primaryAction={{ href: "/mapping", label: "View component status" }}
    />
  );
}
