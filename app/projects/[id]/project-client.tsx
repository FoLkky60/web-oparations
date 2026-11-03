"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  AnalysisResult,
  TransformationReport,
  TransformationCategory,
} from "@shared/index";
import type { ProjectRecord } from "../../lib/repository";
import { api } from "../../lib/client";
import { Card, Badge, Button, Stat } from "../../components/ui";
import { AnalysisView } from "../../components/analysis-view";
import { TransformView } from "../../components/transform-view";

const CATEGORIES: TransformationCategory[] = ["colors", "radius", "spacing", "typography", "components"];

export function ProjectClient({ id }: { id: string }) {
  const [record, setRecord] = useState<ProjectRecord | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [report, setReport] = useState<TransformationReport | null>(null);
  const [reportVersion, setReportVersion] = useState<number | null>(null);
  const [selected, setSelected] = useState<TransformationCategory[]>([...CATEGORIES]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rec = await api.getProject(id);
      setError(null);
      setRecord(rec);
      if (rec.analysis) setAnalysis(rec.analysis);
      const last = rec.transformations[rec.transformations.length - 1];
      if (last) {
        setReport(last.report);
        setReportVersion(last.version);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    api
      .getProject(id)
      .then((rec) => {
        if (!active) return;
        setError(null);
        setRecord(rec);
        if (rec.analysis) setAnalysis(rec.analysis);
        const last = rec.transformations[rec.transformations.length - 1];
        if (last) {
          setReport(last.report);
          setReportVersion(last.version);
        }
      })
      .catch((e: unknown) => {
        if (active) setError((e as Error).message);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function runAnalyze() {
    setBusy("analyze");
    setError(null);
    try {
      const { analysis } = await api.analyze(id);
      setAnalysis(analysis);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runTransform() {
    setBusy("transform");
    setError(null);
    try {
      const { report, version } = await api.transform(id, selected);
      setReport(report);
      setReportVersion(version);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function toggle(cat: TransformationCategory) {
    setSelected((cur) => (cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat]));
  }

  if (!record) {
    return <p className="text-sm text-[var(--color-muted)]">{error ?? "Loading…"}</p>;
  }

  const p = record.project;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-[var(--color-muted)] hover:underline">← Dashboard</Link>
          <h1 className="text-2xl font-semibold">{p.name}</h1>
          <p className="text-sm text-[var(--color-muted)]">
            <Badge kind={p.status === "transformed" ? "success" : p.status === "failed" ? "failed" : "info"}>{p.status}</Badge>
            {" "}· entry {p.entryPoint ?? "—"} · {p.files.length} files
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAnalyze} disabled={busy !== null}>
            {busy === "analyze" ? "Analyzing…" : "Run analysis"}
          </Button>
        </div>
      </div>

      {error && <Card className="border-red-200 text-red-700">{error}</Card>}

      {analysis && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Components" value={analysis.summary.componentsDetected} />
            <Stat label="Potential violations" value={analysis.summary.potentialViolations} />
            <Stat label="Unknown components" value={analysis.summary.unknownComponents} />
            <Stat label="Files analyzed" value={analysis.summary.filesAnalyzed} />
          </div>
          <AnalysisView analysis={analysis} />
        </>
      )}

      {analysis && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Transform</h2>
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            Select which categories to standardize. Non-semantic candidates are always flagged for
            review and never changed automatically.
          </p>
          <div className="mb-4 flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-2 text-sm capitalize">
                <input type="checkbox" checked={selected.includes(cat)} onChange={() => toggle(cat)} />
                {cat}
              </label>
            ))}
          </div>
          <Button onClick={runTransform} disabled={busy !== null || selected.length === 0}>
            {busy === "transform" ? "Transforming…" : "Generate standardized version"}
          </Button>
        </Card>
      )}

      {report && (
        <TransformView report={report} exportHref={reportVersion ? api.exportUrl(id, reportVersion) : api.exportUrl(id)} />
      )}
    </div>
  );
}
