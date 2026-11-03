import type { Metadata } from "next";
import { PlaceholderPage } from "../components/placeholder-page";
import { IconSettings } from "../components/icons";

export const metadata: Metadata = { title: "Settings · UI Standardization Platform" };

/** Settings — หน้าโครง (ADD-04 D-8) */
export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Users, roles and platform configuration."
      icon={<IconSettings size={22} />}
      emptyTitle="Settings are coming soon"
      emptyDescription="User, role and platform settings are planned for the access-control phase."
    />
  );
}
