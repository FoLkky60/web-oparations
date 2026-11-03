import { Suspense } from "react";
import { PageClient } from "./page-client";

export default async function SiteSubPage({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>;
}) {
  const { id, pageId } = await params;
  return (
    <Suspense fallback={<p className="text-sm text-[var(--color-muted)]">Loading…</p>}>
      <PageClient siteId={id} pageId={pageId} />
    </Suspense>
  );
}
