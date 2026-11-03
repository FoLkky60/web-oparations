"use client";

import type { TransformationReport } from "@shared/index";
import { Card, Badge } from "./ui";

export function TransformView({ report, exportHref }: { report: TransformationReport; exportHref: string }) {
  const applied = report.changes.filter((c) => c.status === "applied");
  const review = report.changes.filter((c) => c.status === "needs-review");
  const v = report.validation;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Transformation result</h2>
            <Badge kind={report.status}>{report.status}</Badge>
          </div>
          <a
            href={exportHref}
            className="inline-flex items-center rounded-[var(--radius-medium)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Download standardized ZIP
          </a>
        </div>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Design System {report.designSystemVersion} · categories: {report.categories.join(", ")} ·{" "}
          {applied.length} applied · {review.length} need review
        </p>
        <p className="mt-2 rounded-[var(--radius-small)] bg-amber-50 p-2 text-xs text-amber-800">
          {report.behavioralNote}
        </p>
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-semibold">Static validation</h3>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <Check ok={v.htmlReparsed} label="HTML re-parsed" />
          <Check ok={v.cssReparsed} label="CSS re-parsed" />
          <Check ok={v.stylesheetReferencesValid} label="Stylesheet refs valid" />
          <Check ok={v.outputFilesExist} label="Output files exist" />
          <Check ok={v.originalUnchanged} label="Original unchanged" />
          <div className="text-[var(--color-muted)]">{v.unresolvedMappings} unresolved mapping(s)</div>
        </div>
        {v.messages.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            {v.messages.map((m, i) => <li key={i}>• {m}</li>)}
          </ul>
        )}
      </Card>

      {report.warnings.length > 0 && (
        <Card className="border-amber-200">
          <h3 className="mb-2 text-sm font-semibold">Warnings</h3>
          <ul className="space-y-1 text-sm text-amber-800">
            {report.warnings.map((w, i) => <li key={i}>• {w}</li>)}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="mb-3 text-lg font-semibold">Changes ({report.changes.length})</h3>
        {report.changes.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No changes were produced.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-muted)]">
                  <th className="py-2">Status</th>
                  <th className="py-2">File</th>
                  <th className="py-2">Selector</th>
                  <th className="py-2">Property</th>
                  <th className="py-2">Before → After</th>
                  <th className="py-2">Rule</th>
                </tr>
              </thead>
              <tbody>
                {report.changes.map((c, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)] align-top last:border-0">
                    <td className="py-2"><Badge kind={c.status}>{c.status}</Badge></td>
                    <td className="py-2 font-mono text-xs">{c.file}</td>
                    <td className="py-2 font-mono text-xs">{c.selector}</td>
                    <td className="py-2 font-mono text-xs">{c.property ?? "—"}</td>
                    <td className="py-2 font-mono text-xs">
                      <span className="text-red-700">{c.before || "∅"}</span>
                      {" → "}
                      <span className="text-green-700">{c.after}</span>
                    </td>
                    <td className="py-2 text-xs">
                      {c.rule}
                      <div className="text-[var(--color-muted)]">{c.reason}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={ok ? "text-green-700" : "text-red-700"}>{ok ? "✓" : "✗"}</span>
      <span>{label}</span>
    </div>
  );
}
