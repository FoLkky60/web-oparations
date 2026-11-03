import type { ReactNode } from "react";
import { EmptyState, LinkButton, PageHeader } from "./ui";

/**
 * หน้าโครง + empty state (ADD-04 D-8) สำหรับเมนูที่ยังไม่พัฒนาใน phase นี้
 */
export function PlaceholderPage({
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  meta,
  primaryAction,
}: {
  title: string;
  description?: ReactNode;
  icon: ReactNode;
  emptyTitle: string;
  emptyDescription: ReactNode;
  meta?: ReactNode;
  primaryAction?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader title={title} description={description} meta={meta} />
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <>
            {primaryAction && (
              <LinkButton href={primaryAction.href} variant="primary">
                {primaryAction.label}
              </LinkButton>
            )}
            <LinkButton href="/">Back to Dashboard</LinkButton>
          </>
        }
      />
    </div>
  );
}
