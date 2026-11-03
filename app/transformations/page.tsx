import type { Metadata } from "next";
import { PlaceholderPage } from "../components/placeholder-page";
import { IconHistory } from "../components/icons";

export const metadata: Metadata = { title: "Transformation History · UI Standardization Platform" };

/** Transformation History — หน้าโครง (ADD-04 D-8) */
export default function TransformationsPage() {
  return (
    <PlaceholderPage
      title="Transformation History"
      description="Every standardization run, with versions and results."
      icon={<IconHistory size={22} />}
      emptyTitle="Transformation history is coming soon"
      emptyDescription="A full, versioned history is planned for a later phase. Recent activity is shown on the Dashboard."
      primaryAction={{ href: "/", label: "View recent activity" }}
    />
  );
}
