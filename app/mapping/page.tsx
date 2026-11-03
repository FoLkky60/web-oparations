"use client";

import {
  getBuilderState,
  getCategories,
  getSite,
  getSites,
  impactFor,
  publishedVariant,
} from "../lib/standard-store";
import { useStandard } from "../lib/use-standard";
import { DECISION_STATUS, IMPACT_STATUS } from "../lib/standard-labels";
import { Card, Chip, LinkButton, PageHeader, StatusPill } from "../components/ui";
import { IconArrowRight } from "../components/icons";

/*
 * ============================================================================
 * Component Mapping (ADD-04 Phase B) — สรุปแบบเบาจาก standard-store
 * ตาราง 7 categories × 5 imported websites: Source / Replace / Match เทียบ standard ที่ publish อยู่
 * การเลือก/ยืนยันมาตรฐานทำใน Template & Builder (/builder)
 * ============================================================================
 */

export default function MappingPage() {
  const builder = useStandard(getBuilderState);
  const sites = useStandard(getSites);
  const categories = useStandard(getCategories);

  const rows = categories.map((cat) => {
    const standard = publishedVariant(cat.id);
    const impacts = impactFor(cat.id, standard.id);
    return { cat, standard, impacts };
  });

  const toReplace = rows.reduce(
    (sum, r) => sum + r.impacts.filter((i) => i.status === "replace").reduce((s, i) => s + i.count, 0),
    0,
  );
  const total = rows.reduce((sum, r) => sum + r.impacts.reduce((s, i) => s + i.count, 0), 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Component Mapping"
        meta={
          <>
            <Chip>Standard v{builder.published.version} active</Chip>
            <span className="text-xs text-[var(--color-muted)]">Draft v{builder.draft.version} in progress</span>
          </>
        }
        description="How each imported website maps to the active component standard. Original websites are never modified."
        actions={
          <LinkButton href="/builder" variant="primary">
            Open Template &amp; Builder <IconArrowRight size={16} />
          </LinkButton>
        }
      />

      <section aria-label="Mapping summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-[var(--color-muted)]">Component categories</div>
          <div className="mt-1 text-3xl font-bold">{categories.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--color-muted)]">Imported websites</div>
          <div className="mt-1 text-3xl font-bold">{sites.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--color-muted)]">Instances to replace</div>
          <div className="mt-1 text-3xl font-bold">
            {toReplace}
            <span className="ml-1 text-base font-medium text-[var(--color-muted)]">of {total}</span>
          </div>
        </Card>
      </section>

      <Card className="min-w-0">
        <h2 className="mb-1 text-lg font-semibold">Status per website</h2>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Source = the website the standard comes from · Match = already identical · Replace = will be replaced on apply.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <caption className="sr-only">
              Component categories against Standard v{builder.published.version} for each imported website
            </caption>
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th scope="col" className="py-2 pr-3 font-medium">Category</th>
                <th scope="col" className="py-2 pr-3 font-medium">Standard source</th>
                {sites.map((s) => (
                  <th key={s.id} scope="col" className="py-2 pr-3 font-medium">
                    <abbr title={s.name} className="no-underline">
                      {s.code}
                    </abbr>
                    <span className="sr-only"> {s.name}</span>
                  </th>
                ))}
                <th scope="col" className="py-2 font-medium">Draft v{builder.draft.version}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ cat, standard, impacts }) => {
                const draft = builder.draft.decisions[cat.id];
                const draftSt = DECISION_STATUS[draft.status];
                return (
                  <tr key={cat.id} className="border-b border-[var(--color-border)] align-top last:border-0">
                    <th scope="row" className="py-3 pr-3 text-left font-medium text-[var(--color-text)]">
                      {cat.label}
                    </th>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{getSite(standard.siteId)?.name}</div>
                      <code className="font-mono text-xs text-[var(--color-muted)]">{standard.selector}</code>
                    </td>
                    {impacts.map((imp) => {
                      const st = IMPACT_STATUS[imp.status];
                      return (
                        <td key={imp.siteId} className="py-3 pr-3">
                          <StatusPill tone={st.tone} label={st.label} />
                          <div className="mt-1 text-xs text-[var(--color-muted)]">{imp.count} instances</div>
                        </td>
                      );
                    })}
                    <td className="py-3">
                      <StatusPill tone={draftSt.tone} label={draftSt.label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
