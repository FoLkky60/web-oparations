import type { Metadata } from "next";
import { PlaceholderPage } from "../components/placeholder-page";
import { IconTemplate } from "../components/icons";

export const metadata: Metadata = { title: "Template & Builder · UI Standardization Platform" };

/**
 * Template & Builder — placeholder ชั่วคราว (ADD-04 Phase B)
 * Component Standard Builder จริงจะมาแทนใน Phase D (§4.3)
 */
export default function BuilderPage() {
  return (
    <PlaceholderPage
      title="Component Standard Builder"
      description="Compare component variants from every imported website and choose one standard per category."
      icon={<IconTemplate size={22} />}
      emptyTitle="Builder is being prepared"
      emptyDescription="The Component Standard Builder is planned for the next phase. Current decisions per category are visible in Component Mapping."
      primaryAction={{ href: "/mapping", label: "Open Component Mapping" }}
    />
  );
}
