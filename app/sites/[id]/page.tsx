import { Suspense } from "react";
import { SiteClient } from "./site-client";

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-sm text-[var(--color-muted)]">Loading…</p>}>
      <SiteClient id={id} />
    </Suspense>
  );
}
