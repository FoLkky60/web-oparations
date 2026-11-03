"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  AnalysisResult,
  ComplianceReport,
  DetectedComponent,
  Finding,
  MappingRule,
  ValidationResult,
} from "@shared/index";
import type { ProjectRecord } from "../../lib/repository";
import { api, type ActiveDesignSystem } from "../../lib/client";
import { ISSUE_LEVEL, PROJECT_STATUS, SEVERITY, formatBytes } from "../../lib/project-labels";
import { formatDateTime } from "../../lib/standard-labels";
import { Button, Card, Chip, ComplianceBar, EmptyState, ErrorBox, LinkButton, PageHeader, StatusPill, type Tone } from "../../components/ui";
import { IconAlert, IconAnalysis, IconArrowLeft, IconCheck, IconUpload } from "../../components/icons";
import { TransformPanel } from "./transform-panel";

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; record: ProjectRecord };

function errMsg(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function ProjectDetail({ id }: { id: string }) {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [activeDs, setActiveDs] = useState<ActiveDesignSystem | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [compliance, setCompliance] = useState<ComplianceReport | null>(null);
  const [complianceError, setComplianceError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const loadCompliance = useCallback(async () => {
    setComplianceError(null);
    try {
      const { report } = await api.getCompliance(id);
      setCompliance(report);
    } catch (err) {
      setCompliance(null);
      setComplianceError(errMsg(err, "Could not compute compliance."));
    }
  }, [id]);

  const refresh = useCallback(async () => {
    try {
      const record = await api.getProject(id);
      setLoad({ kind: "ready", record });
      if (record.project.files.length > 0) {
        api.validate(id).then((r) => setValidation(r.validation)).catch(() => setValidation(null));
      }
      if (record.analysis) await loadCompliance();
      return record;
    } catch (err) {
      setLoad({ kind: "error", message: errMsg(err, "Could not load project.") });
      return null;
    }
  }, [id, loadCompliance]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    api.getActiveDesignSystem().then(setActiveDs).catch(() => setActiveDs(null));
  }, [refresh]);

  async function runAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    setStatus("Analyzing project…");
    try {
      const { analysis } = await api.analyze(id);
      setStatus(
        analysis.status === "completed"
          ? `Analysis complete: ${analysis.summary.componentsDetected} components, ${analysis.summary.potentialViolations} potential violations.`
          : "Analysis failed.",
      );
      await refresh();
    } catch (err) {
      const m = errMsg(err, "Analysis failed.");
      setAnalyzeError(m);
      setStatus(`Analysis failed: ${m}`);
    } finally {
      setAnalyzing(false);
    }
  }

  if (load.kind === "loading") {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4" aria-busy="true">
        <p role="status" className="sr-only">Loading project</p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-medium)] bg-[var(--color-surface-muted)] motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  if (load.kind === "error") {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4">
        <BackLink />
        <EmptyState
          icon={<IconAlert size={22} />}
          title="Project could not be loaded"
          description={load.message}
          action={
            <>
              <Button variant="secondary" onClick={() => void refresh()}>Try again</Button>
              <LinkButton href="/projects">Back to catalog</LinkButton>
            </>
          }
        />
      </div>
    );
  }

  const { project, analysis, transformations } = load.record;
  const st = PROJECT_STATUS[project.status];
  const hasUpload = project.files.length > 0;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <BackLink />
      <PageHeader
        title={project.name}
        meta={
          <>
            <StatusPill tone={st.tone} label={st.label} />
            <Chip>{project.designSystemVersion ? `Analyzed with Standard v${project.designSystemVersion}` : "Not analyzed yet"}</Chip>
            {activeDs && <span className="text-xs text-[var(--color-muted)]">Active standard: v{activeDs.version}</span>}
          </>
        }
        description={
          <>
            Entry point <span className="font-mono">{project.entryPoint ?? "none"}</span> · {project.files.length} files ·
            updated {formatDateTime(project.updatedAt)} · id <span className="font-mono">{project.id}</span>
          </>
        }
        actions={
          <Button onClick={() => void runAnalyze()} disabled={analyzing || !hasUpload}>
            <IconAnalysis size={16} /> {analyzing ? "Analyzing…" : analysis ? "Re-run analysis" : "Analyze"}
          </Button>
        }
      />
      <p role="status" aria-live="polite" className="sr-only">{status}</p>
      {analyzeError && <ErrorBox message={analyzeError} />}

      {!hasUpload ? (
        <EmptyState
          icon={<IconUpload size={22} />}
          title="No files uploaded"
          description="This project has no uploaded files, so it cannot be analyzed. Upload the website again to create a new project."
          action={<LinkButton href="/upload" variant="primary">Upload Website</LinkButton>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <FilesCard files={project.files} />
          <ValidationCard validation={validation} />
        </div>
      )}

      {hasUpload && !analysis && (
        <EmptyState
          icon={<IconAnalysis size={22} />}
          title="Not analyzed yet"
          description="Run the analysis to detect components and find values that do not match the active design system."
          action={
            <Button onClick={() => void runAnalyze()} disabled={analyzing}>
              {analyzing ? "Analyzing…" : "Analyze"}
            </Button>
          }
        />
      )}

      {analysis && (
        <AnalysisSection
          analysis={analysis}
          compliance={compliance}
          complianceError={complianceError}
          onRetryCompliance={() => void loadCompliance()}
          rules={activeDs?.mappingRules ?? null}
        />
      )}

      {analysis && (
        <TransformPanel projectId={id} initialCount={transformations.length} onTransformed={() => void refresh()} />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/projects" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline">
      <IconArrowLeft size={16} /> Project Catalog
    </Link>
  );
}

function FilesCard({ files }: { files: ProjectRecord["project"]["files"] }) {
  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">Files ({files.length})</h2>
      <ul className="max-h-72 divide-y divide-[var(--color-border)] overflow-y-auto rounded-[var(--radius-medium)] border border-[var(--color-border)] text-sm">
        {files.map((f) => (
          <li key={f.path} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 truncate font-mono text-xs text-[var(--color-text)]" title={f.path}>{f.path}</span>
            <span className="shrink-0 text-xs text-[var(--color-muted)]">
              {f.kind.toUpperCase()} · {formatBytes(f.size)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ValidationCard({ validation }: { validation: ValidationResult | null }) {
  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">Upload validation</h2>
      {!validation ? (
        <p className="text-sm text-[var(--color-muted)]">Checking stored files…</p>
      ) : (
        <div className="space-y-3">
          {validation.valid ? (
            <StatusPill tone="success" label="Valid" icon={<IconCheck size={12} />} />
          ) : (
            <StatusPill tone="danger" label="Not valid" />
          )}
          {validation.issues.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No validation issues.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {validation.issues.map((i, idx) => (
                <li key={`${i.code}-${idx}`} className="flex flex-wrap items-start gap-2">
                  <StatusPill tone={ISSUE_LEVEL[i.level].tone} label={ISSUE_LEVEL[i.level].label} />
                  <code className="font-mono text-xs text-[var(--color-muted)]">{i.code}</code>
                  <span className="text-[var(--color-text)]">{i.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * Analysis
 * ------------------------------------------------------------------------- */

/**
 * Mirrors the engine's decideMapping() (packages/core/src/transformation/
 * component-mapping.ts): auto only when a rule exists, the detection is
 * semantic/attribute-based and confidence >= the rule's threshold.
 */
function mappingStatus(c: DetectedComponent, rules: MappingRule[] | null): { label: string; tone: Tone } {
  if (!rules) return c.target.component ? { label: `Suggested: ${c.target.component}`, tone: "info" } : { label: "Unmapped", tone: "neutral" };
  const rule = rules.find((r) => r.sourceComponentType === c.type && r.enabled);
  if (!rule) return { label: "Unmapped", tone: "neutral" };
  const semantic = c.classification.method === "semantic-html" || c.classification.method === "attribute";
  if (semantic && c.classification.confidence >= rule.autoApplyThreshold) return { label: "Auto-map", tone: "success" };
  return { label: "Candidate · needs review", tone: "warning" };
}

function AnalysisSection({
  analysis,
  compliance,
  complianceError,
  onRetryCompliance,
  rules,
}: {
  analysis: AnalysisResult;
  compliance: ComplianceReport | null;
  complianceError: string | null;
  onRetryCompliance: () => void;
  rules: MappingRule[] | null;
}) {
  const s = analysis.summary;
  const grouped = new Map<Finding["category"], Finding[]>();
  for (const f of analysis.findings) {
    grouped.set(f.category, [...(grouped.get(f.category) ?? []), f]);
  }
  const unresolved = new Map<string, number>();
  for (const c of analysis.components) {
    for (const p of c.unresolvedProperties) unresolved.set(p, (unresolved.get(p) ?? 0) + 1);
  }

  return (
    <section aria-labelledby="analysis-heading" className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="analysis-heading" className="text-lg font-semibold text-[var(--color-text)]">Analysis</h2>
        <StatusPill tone={analysis.status === "completed" ? "success" : "danger"} label={analysis.status === "completed" ? "Completed" : "Failed"} />
        <Chip>Standard v{analysis.designSystemVersion}</Chip>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryStat label="Components detected" value={s.componentsDetected} />
        <SummaryStat label="Potential violations" value={s.potentialViolations} />
        <SummaryStat label="Unknown / unmapped" value={s.unknownComponents} />
        <SummaryStat label="HTML files analyzed" value={s.filesAnalyzed} />
      </div>

      {analysis.warnings.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Analysis warnings ({analysis.warnings.length})</h3>
          <ul className="space-y-1 text-sm">
            {analysis.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-[var(--color-text)]">
                <span className="mt-0.5 text-[var(--color-warning)]"><IconAlert size={16} /></span>
                {w}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ComplianceCard report={compliance} error={complianceError} onRetry={onRetryCompliance} />

      <Card className="p-0">
        <div className="p-5 pb-3">
          <h3 className="text-base font-semibold text-[var(--color-text)]">Detected components ({analysis.components.length})</h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Confidence is a heuristic estimate, not a calibrated probability. Candidates found by structure or heuristics are never changed automatically.
          </p>
        </div>
        {analysis.components.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-[var(--color-muted)]">No components were detected.</p>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">Type</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Source</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Method</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Confidence</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Mapping</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Unresolved / warnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {analysis.components.map((c, i) => {
                  const m = mappingStatus(c, rules);
                  return (
                    <tr key={`${c.source.file}-${c.source.domIndex}-${i}`}>
                      <td className="px-4 py-2 font-medium text-[var(--color-text)]">{c.type}</td>
                      <td className="px-4 py-2">
                        <div className="font-mono text-xs text-[var(--color-text)]">{c.source.selector}</div>
                        <div className="text-xs text-[var(--color-muted)]">{c.source.file}</div>
                      </td>
                      <td className="px-4 py-2 text-[var(--color-text)]">{c.classification.method}</td>
                      <td className="px-4 py-2 text-[var(--color-text)]">{Math.round(c.classification.confidence * 100)}%</td>
                      <td className="px-4 py-2">
                        <StatusPill tone={m.tone} label={m.label} />
                        {c.target.component && <div className="mt-1 text-xs text-[var(--color-muted)]">Target {c.target.component}</div>}
                      </td>
                      <td className="px-4 py-2 text-xs text-[var(--color-muted)]">
                        {c.unresolvedProperties.length > 0 && <div>Unresolved: {c.unresolvedProperties.join(", ")}</div>}
                        {c.warnings.map((w, wi) => (
                          <div key={wi} className="text-[var(--color-warning)]">{w}</div>
                        ))}
                        {c.unresolvedProperties.length === 0 && c.warnings.length === 0 && "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 text-base font-semibold text-[var(--color-text)]">Findings by category ({analysis.findings.length})</h3>
        {analysis.findings.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No findings. Every detected value matches the active design system.</p>
        ) : (
          <div className="space-y-4">
            {[...grouped.entries()].map(([cat, items]) => (
              <details key={cat} className="rounded-[var(--radius-medium)] border border-[var(--color-border)]" open={grouped.size <= 3}>
                <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-semibold capitalize text-[var(--color-text)]">
                  {cat} <span className="font-normal text-[var(--color-muted)]">({items.length})</span>
                </summary>
                <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)] text-sm">
                  {items.map((f, i) => (
                    <li key={i} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
                      <StatusPill tone={SEVERITY[f.severity].tone} label={SEVERITY[f.severity].label} />
                      <code className="font-mono text-xs text-[var(--color-text)]">{f.sourceValue}</code>
                      <span className="text-xs text-[var(--color-muted)]">
                        {f.suggestedToken ? `Suggested token ${f.suggestedToken} · ` : ""}
                        {f.note}
                        {f.source ? ` · ${f.source.file} ${f.source.selector}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-2 text-base font-semibold text-[var(--color-text)]">Unresolved properties</h3>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          Properties that cannot be resolved by static analysis (no browser rendering). Review these manually.
        </p>
        {unresolved.size === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">None.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {[...unresolved.entries()].map(([p, n]) => (
              <li key={p} className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text)]">
                <span className="font-mono">{p}</span> · {n} component{n === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <div className="text-sm text-[var(--color-muted)]">{label}</div>
      <div className="mt-1 text-3xl font-bold text-[var(--color-text)]">{value}</div>
    </Card>
  );
}

function ComplianceCard({
  report,
  error,
  onRetry,
}: {
  report: ComplianceReport | null;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <Card>
      <h3 className="mb-3 text-base font-semibold text-[var(--color-text)]">Compliance</h3>
      {error ? (
        <div className="space-y-3">
          <ErrorBox message={error} />
          <Button variant="secondary" onClick={onRetry}>Try again</Button>
        </div>
      ) : !report ? (
        <p className="text-sm text-[var(--color-muted)]">Computing compliance score…</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div>
            <div className="text-4xl font-bold text-[var(--color-text)]">{report.score}</div>
            <div className="mb-2 text-xs text-[var(--color-muted)]">score out of 100 · Standard v{report.analysisDesignSystemVersion}</div>
            <ComplianceBar score={report.score} />
            <p className="mt-3 text-sm text-[var(--color-text)]">
              {report.outstanding.length} outstanding finding{report.outstanding.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">Dimension</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Compliant</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Weighted violations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {report.dimensions.map((d) => (
                  <tr key={d.category}>
                    <td className="py-2 pr-4 capitalize text-[var(--color-text)]">{d.category}</td>
                    <td className="py-2 pr-4 text-[var(--color-text)]">{d.compliant} / {d.total}</td>
                    <td className="py-2 pr-4 text-[var(--color-text)]">{d.weightedViolations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
