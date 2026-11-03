import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceholderPage } from "../../components/placeholder-page";
import { IconBox } from "../../components/icons";
import { BUILT_PROJECTS } from "../../lib/standard-data";

/**
 * Built project — placeholder ชั่วคราว (ADD-04 Phase B)
 * viewer + เว็บของทีมที่ใช้งานได้จริงจะมาแทนใน Phase E (§4.4)
 */

export function generateStaticParams() {
  return BUILT_PROJECTS.map((p) => ({ projectId: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }): Promise<Metadata> {
  const { projectId } = await params;
  const project = BUILT_PROJECTS.find((p) => p.id === projectId);
  return { title: `${project?.name ?? "Project"} · Built projects` };
}

export default async function BuiltProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = BUILT_PROJECTS.find((p) => p.id === projectId);
  if (!project) notFound();

  return (
    <PlaceholderPage
      title={project.name}
      meta={<span className="text-xs text-[var(--color-muted)]">Team {project.team} · Standardized build</span>}
      description="Team workspace rebuilt with the published component standard."
      icon={<IconBox size={22} />}
      emptyTitle="Built workspace preview is coming soon"
      emptyDescription="The team website rendered with the standard component set will be viewable here in a later phase."
      primaryAction={{ href: "/builder", label: "Template & Builder" }}
    />
  );
}
