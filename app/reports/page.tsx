import type { Metadata } from "next";
import { PlaceholderPage } from "../components/placeholder-page";
import { IconReport } from "../components/icons";

export const metadata: Metadata = { title: "Reports · UI Standardization Platform" };

/** Reports — หน้าโครง (ADD-04 D-8) */
export default function ReportsPage() {
  return (
    <PlaceholderPage
      title="Reports"
      description="Compliance and analysis reports for each project."
      icon={<IconReport size={22} />}
      emptyTitle="No reports yet"
      emptyDescription="Downloadable compliance and analysis reports are planned for a later phase."
    />
  );
}
