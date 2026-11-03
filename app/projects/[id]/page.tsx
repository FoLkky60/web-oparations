import type { Metadata } from "next";
import { ProjectDetail } from "./project-detail";

export const metadata: Metadata = { title: "Project · UI Standardization Platform" };

/**
 * Project detail (ADD-04 Phase F) — real pipeline: analyze -> compliance ->
 * transform -> review report / compare -> export. Data is fetched client-side
 * from the REST API (app/lib/client.ts).
 */
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetail id={id} />;
}
