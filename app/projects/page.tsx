import type { Metadata } from "next";
import { ProjectCatalog } from "./project-catalog";

export const metadata: Metadata = { title: "Project Catalog · UI Standardization Platform" };

/** Project Catalog (ADD-04 Phase F / US-007) — real projects from GET /api/projects. */
export default function ProjectCatalogPage() {
  return <ProjectCatalog />;
}
