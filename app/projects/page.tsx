import type { Metadata } from "next";
import { PlaceholderPage } from "../components/placeholder-page";
import { IconFolder } from "../components/icons";

export const metadata: Metadata = { title: "Project Catalog · UI Standardization Platform" };

/** Project Catalog — หน้าโครง (ADD-04 D-8) */
export default function ProjectCatalogPage() {
  return (
    <PlaceholderPage
      title="Project Catalog"
      description="Browse every project registered on the platform."
      icon={<IconFolder size={22} />}
      emptyTitle="Project catalog is coming soon"
      emptyDescription="This screen is planned for a later phase. Imported websites and built projects are available from the sidebar."
      primaryAction={{ href: "/upload", label: "Upload Website" }}
    />
  );
}
