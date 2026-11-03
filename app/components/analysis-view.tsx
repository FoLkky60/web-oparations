"use client";

import type { AnalysisResult } from "@shared/index";
import { Card, Badge } from "./ui";

export function AnalysisView({ analysis }: { analysis: AnalysisResult }) {
  const dp = analysis.designProperties;
  return (
    <div className="space-y-6">
      {analysis.warnings.length > 0 && (
        <Card className="border-amber-200">
          <h3 className="mb-2 text-sm font-semibold">Analysis warnings</h3>
          <ul className="space-y-1 text-sm text-amber-800">
            {analysis.warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="mb-3 text-lg font-semibold">Detected components</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-muted)]">
                <th className="py-2">Type</th>
                <th className="py-2">Source</th>
                <th className="py-2">Method</th>
                <th className="py-2">Confidence</th>
                <th className="py-2">Suggested</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {analysis.components.map((c, i) => (
                <tr key={i} className="border-b border-[var(--color-border)] align-top last:border-0">
                  <td className="py-2 font-medium capitalize">{c.type}</td>
                  <td className="py-2 font-mono text-xs text-[var(--color-muted)]">
                    {c.source.file}
                    <br />
                    &lt;{c.source.tag}
                    {c.source.classes.length ? ` class="${c.source.classes.join(" ")}"` : ""}&gt;
                  </td>
                  <td className="py-2">
                    <Badge kind={c.classification.method === "semantic-html" ? "applied" : "info"}>
                      {c.classification.method}
                    </Badge>
                  </td>
                  <td className="py-2">{(c.classification.confidence * 100).toFixed(0)}%</td>
                  <td className="py-2">{c.target.component ?? "—"}</td>
                  <td className="py-2 text-xs text-amber-800">
                    {c.warnings.length ? c.warnings.join(" ") : c.classification.reasons.join("; ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-lg font-semibold">Design properties</h3>
          <PropRow label="Colors" values={dp.colors} swatches />
          <PropRow label="Font families" values={dp.fontFamilies} />
          <PropRow label="Font sizes" values={dp.fontSizes} />
          <PropRow label="Spacing" values={dp.spacing} />
          <PropRow label="Border radii" values={dp.borderRadii} />
          <PropRow label="Shadows" values={dp.shadows} />
        </Card>

        <Card>
          <h3 className="mb-3 text-lg font-semibold">Findings</h3>
          {analysis.findings.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No findings.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {analysis.findings.map((f, i) => (
                <li key={i} className="border-b border-[var(--color-border)] pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge kind={f.severity}>{f.severity}</Badge>
                    <span className="capitalize">{f.category}</span>
                    <span className="font-mono text-xs">{f.sourceValue}</span>
                    {f.suggestedToken && (
                      <span className="text-xs text-[var(--color-muted)]">→ {f.suggestedToken}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{f.note}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function PropRow({ label, values, swatches }: { label: string; values: string[]; swatches?: boolean }) {
  if (values.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="mb-1 text-xs font-semibold text-[var(--color-muted)]">{label}</div>
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-[var(--radius-small)] border border-[var(--color-border)] px-2 py-0.5 text-xs font-mono">
            {swatches && (
              <span className="inline-block h-3 w-3 rounded-sm border border-[var(--color-border)]" style={{ background: v }} />
            )}
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
