"use client";
import { useCallback, useEffect, useId, useState } from "react";
import type { TransformationCategory, TransformationChange, TransformationReport } from "@shared/index";
import { api, type FileComparison, type TransformationSummary } from "../../lib/client";
import { ALL_TRANSFORM_CATEGORIES, CATEGORY_LABEL, CHANGE_STATUS, TRANSFORM_STATUS } from "../../lib/project-labels";
import { formatDateTime } from "../../lib/standard-labels";
import { diffLines } from "../../lib/line-diff";
import { Button, Card, Chip, EmptyState, ErrorBox, StatusPill } from "../../components/ui";
import { IconAlert, IconCheck, IconDownload, IconHistory } from "../../components/icons";

function errMsg(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Transform + review (US-012/014/018/021/022): run a transformation for the
 * chosen categories, list stored versions, show a version's report, compare
 * original vs output, and export. The original upload is never modified.
 */
export function TransformPanel({
  projectId,
  initialCount,
  onTransformed,
}: {
  projectId: string;
  initialCount: number;
  onTransformed: () => void;
}) {
  const [categories, setCategories] = useState<TransformationCategory[]>([...ALL_TRANSFORM_CATEGORIES]);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [versions, setVersions] = useState<TransformationSummary[] | null>(null);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [report, setReport] = useState<TransformationReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const fieldsetId = useId();

  const loadReport = useCallback(
    async (version: number) => {
      setSelected(version);
      setReportLoading(true);
      setReportError(null);
      try {
        const r = await api.getTransformation(projectId, version);
        setReport(r.report);
      } catch (err) {
        setReport(null);
        setReportError(errMsg(err, "Could not load the report."));
      } finally {
        setReportLoading(false);
      }
    },
    [projectId],
  );

  const loadVersions = useCallback(async () => {
    setVersionsError(null);
    try {
      const { transformations } = await api.listTransformations(projectId);
      setVersions(transformations);
      return transformations;
    } catch (err) {
      setVersionsError(errMsg(err, "Could not load transformation versions."));
      return null;
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadVersions().then((list) => {
      if (list && list.length > 0) void loadReport(list[list.length - 1].version);
    });
  }, [loadVersions, loadReport, initialCount]);

  function toggle(c: TransformationCategory) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : ALL_TRANSFORM_CATEGORIES.filter((x) => x === c || prev.includes(x))));
  }

  async function run() {
    if (categories.length === 0) return;
    setRunning(true);
    setRunError(null);
    setStatus("Generating standardized output…");
    try {
      const { report: r, version } = await api.transform(projectId, categories);
      setReport(r);
      setSelected(version);
      setReportError(null);
      setStatus(`Transformation v${version} finished with status ${TRANSFORM_STATUS[r.status].label}.`);
      await loadVersions();
      onTransformed();
    } catch (err) {
      const m = errMsg(err, "Transformation failed.");
      setRunError(m);
      setStatus(`Transformation failed: ${m}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section aria-labelledby="transform-heading" className="space-y-6">
      <h2 id="transform-heading" className="text-lg font-semibold text-[var(--color-text)]">Standardize</h2>
      <p role="status" aria-live="polite" className="sr-only">{status}</p>

      <Card className="space-y-4">
        <fieldset aria-describedby={`${fieldsetId}-help`}>
          <legend className="text-base font-semibold text-[var(--color-text)]">Categories to standardize</legend>
          <p id={`${fieldsetId}-help`} className="mt-1 text-xs text-[var(--color-muted)]">
            Output is generated as a new version; the original upload stays unchanged.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_TRANSFORM_CATEGORIES.map((c) => {
              const inputId = `${fieldsetId}-${c}`;
              return (
                <label
                  key={c}
                  htmlFor={inputId}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-medium)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={categories.includes(c)}
                    onChange={() => toggle(c)}
                    disabled={running}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  {CATEGORY_LABEL[c]}
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void run()} disabled={running || categories.length === 0}>
            {running ? "Transforming…" : "Run transformation"}
          </Button>
          {categories.length === 0 && <span className="text-sm text-[var(--color-warning)]">Select at least one category.</span>}
        </div>
        {runError && <ErrorBox message={runError} />}
      </Card>

      <Card>
        <h3 className="mb-3 text-base font-semibold text-[var(--color-text)]">Transformation versions</h3>
        {versionsError ? (
          <div className="space-y-3">
            <ErrorBox message={versionsError} />
            <Button variant="secondary" onClick={() => void loadVersions()}>Try again</Button>
          </div>
        ) : versions === null ? (
          <p className="text-sm text-[var(--color-muted)]">Loading versions…</p>
        ) : versions.length === 0 ? (
          <EmptyState
            icon={<IconHistory size={22} />}
            title="No transformations yet"
            description="Choose categories above and run a transformation to generate a standardized copy."
          />
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Transformation versions">
            {[...versions].reverse().map((v) => {
              const t = TRANSFORM_STATUS[v.status];
              const active = v.version === selected;
              return (
                <li key={v.version}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => void loadReport(v.version)}
                    className={`flex min-h-11 flex-col items-start gap-1 rounded-[var(--radius-medium)] border px-3 py-2 text-left text-sm ${
                      active ? "border-[var(--color-primary)] bg-[var(--color-secondary)]" : "border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-semibold text-[var(--color-text)]">
                      v{v.version} <StatusPill tone={t.tone} label={t.label} />
                    </span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {v.changeCount} changes · {formatDateTime(v.createdAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {reportLoading && <p className="text-sm text-[var(--color-muted)]">Loading report…</p>}
      {reportError && <ErrorBox message={reportError} />}
      {report && selected !== null && !reportLoading && (
        <ReportView key={selected} projectId={projectId} version={selected} report={report} />
      )}
    </section>
  );
}

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-[var(--color-text)]">
      {ok ? (
        <StatusPill tone="success" label="Pass" icon={<IconCheck size={12} />} />
      ) : (
        <StatusPill tone="danger" label="Fail" icon={<IconAlert size={12} />} />
      )}
      {label}
    </li>
  );
}

function ReportView({ projectId, version, report }: { projectId: string; version: number; report: TransformationReport }) {
  const v = report.validation;
  const byFile = new Map<string, TransformationChange[]>();
  for (const c of report.changes) byFile.set(c.file, [...(byFile.get(c.file) ?? []), c]);
  const applied = report.changes.filter((c) => c.status === "applied").length;
  const review = report.changes.filter((c) => c.status === "needs-review").length;
  const t = TRANSFORM_STATUS[report.status];

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--color-text)]">Report · v{version}</h3>
              <StatusPill tone={t.tone} label={t.label} />
              <Chip>Standard v{report.designSystemVersion}</Chip>
            </div>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Categories: {report.categories.map((c) => CATEGORY_LABEL[c]).join(", ")} · {applied} applied · {review} need review ·{" "}
              {report.changes.length - applied - review} skipped
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 md:items-end">
            <a
              href={api.exportUrl(projectId, version)}
              download
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-medium)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
            >
              <IconDownload size={16} /> Export v{version} (.zip)
            </a>
            <span className="max-w-xs text-xs text-[var(--color-muted)]">
              Export will require reviewer approval in a later phase.
            </span>
          </div>
        </div>
        <p className="rounded-[var(--radius-small)] bg-[color-mix(in_srgb,var(--color-warning)_10%,white)] p-3 text-sm text-[var(--color-text)]">
          <span className="font-semibold">Note: </span>
          {report.behavioralNote}
        </p>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Static validation</h4>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Flag ok={v.htmlReparsed} label="HTML re-parsed" />
            <Flag ok={v.cssReparsed} label="CSS re-parsed" />
            <Flag ok={v.stylesheetReferencesValid} label="Stylesheet references valid" />
            <Flag ok={v.outputFilesExist} label="Output files exist" />
            <Flag ok={v.originalUnchanged} label="Original unchanged" />
            <li className="text-sm text-[var(--color-text)]">{v.unresolvedMappings} unresolved mapping(s)</li>
          </ul>
          {v.messages.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--color-muted)]">
              {v.messages.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
        </div>
        {report.warnings.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Warnings</h4>
            <ul className="space-y-1 text-sm">
              {report.warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-[var(--color-text)]">
                  <span className="mt-0.5 text-[var(--color-warning)]"><IconAlert size={16} /></span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-0">
        <h3 className="p-5 pb-3 text-base font-semibold text-[var(--color-text)]">Changes by file ({report.changes.length})</h3>
        {report.changes.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-[var(--color-muted)]">No changes were needed for the selected categories.</p>
        ) : (
          <div className="space-y-4 px-5 pb-5">
            {[...byFile.entries()].map(([file, changes]) => (
              <details key={file} className="rounded-[var(--radius-medium)] border border-[var(--color-border)]" open={byFile.size <= 3}>
                <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-semibold text-[var(--color-text)]">
                  <span className="font-mono">{file}</span>
                  <span className="font-normal text-[var(--color-muted)]">({changes.length})</span>
                </summary>
                <div className="overflow-x-auto border-t border-[var(--color-border)]">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-semibold">Selector / property</th>
                        <th scope="col" className="px-3 py-2 font-semibold">Original</th>
                        <th scope="col" className="px-3 py-2 font-semibold">Output</th>
                        <th scope="col" className="px-3 py-2 font-semibold">Rule / reason</th>
                        <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {changes.map((c, i) => {
                        const s = CHANGE_STATUS[c.status];
                        return (
                          <tr key={i}>
                            <td className="px-3 py-2 align-top">
                              <div className="font-mono text-xs text-[var(--color-text)]">{c.selector}</div>
                              {c.property && <div className="font-mono text-xs text-[var(--color-muted)]">{c.property}</div>}
                            </td>
                            <td className="px-3 py-2 align-top"><code className="break-all font-mono text-xs text-[var(--color-text)]">{c.before || "—"}</code></td>
                            <td className="px-3 py-2 align-top"><code className="break-all font-mono text-xs text-[var(--color-text)]">{c.after || "—"}</code></td>
                            <td className="px-3 py-2 align-top text-xs">
                              <div className="font-medium text-[var(--color-text)]">{c.rule}</div>
                              <div className="text-[var(--color-muted)]">{c.reason}</div>
                            </td>
                            <td className="px-3 py-2 align-top"><StatusPill tone={s.tone} label={s.label} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        )}
      </Card>

      <CompareView projectId={projectId} version={version} files={[...byFile.keys()]} />
    </div>
  );
}

function CompareView({ projectId, version, files }: { projectId: string; version: number; files: string[] }) {
  const [file, setFile] = useState<string>(files[0] ?? "");
  const [data, setData] = useState<FileComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changedOnly, setChangedOnly] = useState(true);
  const selectId = useId();

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    api
      .compareFile(projectId, version, file)
      .then((r) => {
        if (!cancelled) setData(r.file);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(errMsg(err, "Could not load file comparison."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, version, file]);

  if (files.length === 0) return null;
  const diff = data ? diffLines(data.original ?? "", data.output ?? "") : null;
  const CONTEXT = 2;
  const visible = diff
    ? diff.rows.map((row, i) => {
        if (!changedOnly || row.type !== "same") return true;
        for (let k = Math.max(0, i - CONTEXT); k <= Math.min(diff.rows.length - 1, i + CONTEXT); k++) {
          if (diff.rows[k].type !== "same") return true;
        }
        return false;
      })
    : [];

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text)]">Compare original and output</h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Side-by-side line diff of one changed file. Removed lines are marked with a minus, added lines with a plus.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={selectId} className="mb-1 block text-xs font-medium text-[var(--color-text)]">File</label>
            <select
              id={selectId}
              value={file}
              onChange={(e) => setFile(e.target.value)}
              className="min-h-11 rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm text-[var(--color-text)]"
            >
              {files.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <label className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" checked={changedOnly} onChange={(e) => setChangedOnly(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
            Changed lines only
          </label>
        </div>
      </div>

      {loading && <p className="text-sm text-[var(--color-muted)]">Loading file…</p>}
      {error && <ErrorBox message={error} />}
      {diff && !loading && (
        <>
          {diff.approximate && <p className="text-xs text-[var(--color-warning)]">Large file: lines are paired by position, so the diff is approximate.</p>}
          <div className="max-h-[560px] overflow-auto rounded-[var(--radius-medium)] border border-[var(--color-border)]">
            <table className="w-full min-w-[900px] table-fixed border-collapse font-mono text-xs">
              <thead className="sticky top-0 bg-[var(--color-surface)] text-left text-[var(--color-muted)]">
                <tr>
                  <th scope="col" className="w-1/2 px-3 py-2 font-sans font-semibold">Original</th>
                  <th scope="col" className="w-1/2 border-l border-[var(--color-border)] px-3 py-2 font-sans font-semibold">Output</th>
                </tr>
              </thead>
              <tbody>
                {diff.rows.map((row, i) => {
                  if (!visible[i]) {
                    return visible[i - 1] ? (
                      <tr key={i}>
                        <td colSpan={2} className="bg-[var(--color-surface-muted)] px-3 py-1 text-center font-sans text-[var(--color-muted)]">
                          Unchanged lines hidden
                        </td>
                      </tr>
                    ) : null;
                  }
                  const left = row.type === "added" ? null : row.left;
                  const right = row.type === "removed" ? null : row.right;
                  return (
                    <tr key={i} className="align-top">
                      <td className={`whitespace-pre-wrap break-all px-3 py-0.5 ${row.type === "removed" ? "bg-[color-mix(in_srgb,var(--color-danger)_10%,white)]" : ""}`}>
                        {left !== null && (
                          <>
                            <span className="mr-2 inline-block w-8 select-none text-right text-[var(--color-muted)]">{row.type === "removed" ? "-" : ""}{"leftNo" in row ? row.leftNo : ""}</span>
                            <span className="text-[var(--color-text)]">{left}</span>
                          </>
                        )}
                      </td>
                      <td className={`whitespace-pre-wrap break-all border-l border-[var(--color-border)] px-3 py-0.5 ${row.type === "added" ? "bg-[color-mix(in_srgb,var(--color-success)_10%,white)]" : ""}`}>
                        {right !== null && (
                          <>
                            <span className="mr-2 inline-block w-8 select-none text-right text-[var(--color-muted)]">{row.type === "added" ? "+" : ""}{"rightNo" in row ? row.rightNo : ""}</span>
                            <span className="text-[var(--color-text)]">{right}</span>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
