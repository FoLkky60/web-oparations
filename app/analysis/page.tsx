import type { Metadata } from "next";
import { PlaceholderPage } from "../components/placeholder-page";
import { IconAnalysis } from "../components/icons";

export const metadata: Metadata = { title: "UI Analysis · UI Standardization Platform" };

/** UI Analysis — หน้าโครง (ADD-04 D-8) */
export default function AnalysisPage() {
  return (
    <PlaceholderPage
      title="UI Analysis"
      description="DOM and CSS analysis results for imported websites."
      icon={<IconAnalysis size={22} />}
      emptyTitle="No analysis view yet"
      emptyDescription="Detailed analysis reports are planned for a later phase. Per-site component status against the active standard is available in Component Mapping."
      primaryAction={{ href: "/mapping", label: "Open Component Mapping" }}
    />
  );
}
