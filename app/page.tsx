"use client";

import Link from "next/link";
import {
  getBuilderState,
  getDashboardMetrics,
  getSiteSummaries,
} from "./lib/standard-store";
import { useStandard } from "./lib/use-standard";
import {
  COMPLIANCE_TARGET,
  COMPLIANCE_TREND,
  DESIGN_SYSTEM_META,
  MOCK_AS_OF,
  PORTFOLIO_STATS,
  TRANSFORMATION_ACTIVITY,
  UI_ISSUES,
} from "./lib/standard-data";
import { ACTIVITY_STATUS, PIPELINE_STATUS, formatDate, formatDateTime } from "./lib/standard-labels";
import type { TrendPoint } from "./lib/standard-types";
import {
  Card,
  Chip,
  ComplianceBar,
  LinkButton,
  MiniBar,
  PageHeader,
  Sparkline,
  StatusPill,
} from "./components/ui";
import {
  IconAnalysis,
  IconArrowRight,
  IconBox,
  IconDesignSystem,
  IconFolder,
  IconPlus,
  IconReport,
  IconTemplate,
  IconUpload,
} from "./components/icons";

/*
 * ============================================================================
 * Dashboard (ADD-04 §4.2) — mock data
 * - ตัวเลข portfolio / UI issues / trend / activity = mock constants (standard-data.ts)
 * - Recent Projects, pipeline counts, เวอร์ชัน Design System = คำนวณจาก standard-store
 * - ADD-05: Output = 5 เว็บ (ทุกเว็บมี standardized build) — Recent Projects ลิงก์ไป /imported/[siteId]
 * ============================================================================
 */

export default function Dashboard() {
  const builder = useStandard(getBuilderState);
  const summaries = useStandard(getSiteSummaries);
  const metrics = useStandard(getDashboardMetrics);

  const recent = [...summaries].sort((a, b) => b.site.lastAnalyzed.localeCompare(a.site.lastAnalyzed));
  const totalIssues = UI_ISSUES.reduce((sum, i) => sum + i.count, 0);

  const pipeline = [
    { title: "Upload Website", detail: `${summaries.length} websites imported`, Icon: IconUpload },
    { title: "Analyze UI", detail: `${metrics.totalComponents} components extracted`, Icon: IconAnalysis },
    {
      title: "Standardize",
      detail: `${metrics.decided} of ${metrics.totalCategories} categories decided (Draft v${builder.draft.version})`,
      Icon: IconTemplate,
    },
    {
      title: "Output",
      detail: `${summaries.length} websites built with Standard v${builder.workspaces.version}`,
      Icon: IconBox,
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Welcome to UI Standardization Platform"
        meta={
          <>
            <Chip>Design System v{builder.published.version} active</Chip>
            <span className="text-xs text-[var(--color-muted)]">{formatDate(MOCK_AS_OF)}</span>
          </>
        }
        description="Analyze imported websites, choose one standard per component, and rebuild every imported website with it."
        actions={
          <LinkButton href="/upload" variant="primary">
            <IconPlus size={16} /> Upload Website
          </LinkButton>
        }
      />

      {/* Stat cards */}
      <section aria-label="Portfolio summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PORTFOLIO_STATS.map((s) => (
          <Card key={s.id}>
            <div className="text-sm text-[var(--color-muted)]">{s.label}</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-bold text-[var(--color-text)]">
                {s.value}
                {s.suffix}
              </span>
              <span className="text-xs font-medium text-[var(--color-success)]">{s.delta}</span>
            </div>
            <div className="mt-2 h-10">
              <Sparkline data={s.series} height={40} />
            </div>
          </Card>
        ))}
      </section>

      {/* Pipeline */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Website Transformation Pipeline</h2>
          <LinkButton href="/upload" variant="primary">
            <IconUpload size={16} /> Upload Website to Standardize
          </LinkButton>
        </div>
        <ol className="grid gap-3 md:grid-cols-4">
          {pipeline.map((step, i) => (
            <li key={step.title} className="relative flex items-stretch">
              <div className="flex-1 rounded-[var(--radius-medium)] border border-[var(--color-border)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-[var(--color-on-primary)]">
                    {i + 1}
                  </span>
                  <step.Icon size={18} className="text-[var(--color-primary)]" />
                  <span className="text-sm font-semibold text-[var(--color-text)]">{step.title}</span>
                </div>
                <p className="text-sm text-[var(--color-muted)]">{step.detail}</p>
              </div>
              {i < pipeline.length - 1 && (
                <IconArrowRight
                  size={16}
                  className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-[var(--color-muted)] md:block"
                />
              )}
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Recent projects */}
        <Card className="min-w-0 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Recent Projects</h2>
            <Link href="/projects" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline">
              View all <IconArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <caption className="sr-only">Recent projects with compliance score against Design System v{builder.published.version}</caption>
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                  <th scope="col" className="py-2 pr-3 font-medium">Project name</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Last analyzed</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Source compliance</th>
                  <th scope="col" className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(({ site, compliance }) => {
                  const st = PIPELINE_STATUS[site.pipelineStatus];
                  return (
                    <tr key={site.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-3 pr-3">
                        <Link href={`/imported/${site.id}`} className="flex items-center gap-3 hover:underline">
                          <span
                            aria-hidden="true"
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-small)] bg-[var(--color-surface-muted)] text-xs font-bold text-[var(--color-text)]"
                          >
                            {site.code}
                          </span>
                          <span>
                            <span className="block font-medium text-[var(--color-text)]">{site.name}</span>
                            <span className="block text-xs text-[var(--color-muted)]">Team {site.team}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 pr-3 text-[var(--color-muted)]">{formatDate(site.lastAnalyzed)}</td>
                      <td className="py-3 pr-3">
                        <ComplianceBar score={compliance} />
                      </td>
                      <td className="py-3">
                        <StatusPill tone={st.tone} label={st.label} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Source compliance compares each original website (never modified) with Standard v{builder.published.version}.
            Open a website to see its standardized build (default) or its original source.
          </p>
        </Card>

        {/* UI issues */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">UI Issues Overview</h2>
            <span className="text-sm font-semibold text-[var(--color-text)]">{totalIssues} open issues</span>
          </div>
          <ul className="space-y-4">
            {UI_ISSUES.map((it) => (
              <li key={it.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{it.label}</span>
                  <span className="font-semibold">{it.count}</span>
                </div>
                <MiniBar
                  pct={it.autoFixablePct}
                  color={it.autoFixablePct >= 50 ? "var(--color-success)" : "var(--color-warning)"}
                />
                <div className="mt-1 text-xs text-[var(--color-muted)]">
                  {it.autoFixablePct}% auto-fixable{it.note ? ` · ${it.note}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Compliance trend */}
        <Card className="min-w-0">
          <ComplianceTrend points={COMPLIANCE_TREND} target={COMPLIANCE_TARGET} />
        </Card>

        {/* Activity */}
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Recent Transformation Activity</h2>
          <ul className="space-y-3 text-sm">
            {TRANSFORMATION_ACTIVITY.map((a) => {
              const st = ACTIVITY_STATUS[a.status];
              return (
                <li key={a.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--color-text)]">{a.title}</p>
                    <p className="text-xs text-[var(--color-muted)]">{a.detail}</p>
                    <p className="text-xs text-[var(--color-muted)]">{formatDateTime(a.at)}</p>
                  </div>
                  <StatusPill tone={st.tone} label={st.label} />
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Quick actions */}
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LinkButton href="/upload" variant="primary">
              <IconUpload size={16} /> Upload Website
            </LinkButton>
            <LinkButton href="/projects">
              <IconFolder size={16} /> New Project
            </LinkButton>
            <LinkButton href="/builder">
              <IconDesignSystem size={16} /> Manage Design System
            </LinkButton>
            <LinkButton href="/reports">
              <IconReport size={16} /> View Reports
            </LinkButton>
          </div>
        </Card>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Design System v{builder.published.version} · {DESIGN_SYSTEM_META.components} components · {DESIGN_SYSTEM_META.tokens} tokens ·
        Last updated {formatDate(builder.published.publishedAt)}
      </p>
    </div>
  );
}

/** กราฟเส้น compliance 12 เดือน + เส้น target (SVG ล้วน ผูก token) */
function ComplianceTrend({ points, target }: { points: TrendPoint[]; target: number }) {
  const width = 360;
  const height = 160;
  const padX = 28;
  const padY = 12;
  const min = 50;
  const max = 100;
  const x = (i: number) => padX + (i * (width - padX - 8)) / Math.max(points.length - 1, 1);
  const y = (v: number) => padY + ((max - v) * (height - padY * 2)) / (max - min);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const diff = last && first ? last.value - first.value : 0;

  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Compliance Trend</h2>
          <p className="text-xs text-[var(--color-muted)]">Last 12 months</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[var(--color-text)]">{last?.value ?? 0}%</div>
          <div className="text-xs font-medium text-[var(--color-success)]">
            {diff >= 0 ? "+" : ""}
            {diff} pts since {first?.label}
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full"
        role="img"
        aria-label={`Compliance rose from ${first?.value}% in ${first?.label} to ${last?.value}% in ${last?.label}. Target ${target}%.`}
      >
        {[50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={padX} x2={width - 8} y1={y(v)} y2={y(v)} style={{ stroke: "var(--color-border)" }} strokeWidth={1} />
            <text x={0} y={y(v) + 4} style={{ fill: "var(--color-muted)" }} fontSize={10}>
              {v}%
            </text>
          </g>
        ))}
        <line
          x1={padX}
          x2={width - 8}
          y1={y(target)}
          y2={y(target)}
          style={{ stroke: "var(--color-success)" }}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <text x={width - 8} y={y(target) - 4} textAnchor="end" style={{ fill: "var(--color-success)" }} fontSize={10}>
          Target {target}%
        </text>
        <path d={line} fill="none" style={{ stroke: "var(--color-primary)" }} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.label} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4 : 2} style={{ fill: "var(--color-primary)" }} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between pl-7 text-xs text-[var(--color-muted)]">
        <span>{first?.label}</span>
        <span>{last?.label}</span>
      </div>
    </>
  );
}
