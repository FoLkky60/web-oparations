"use client";
import { useState } from "react";
import type { Project, ValidationResult } from "@shared/index";
import { api } from "../lib/client";
import { ISSUE_LEVEL, PROJECT_STATUS, formatBytes } from "../lib/project-labels";
import { Button, Card, ErrorBox, LinkButton, PageHeader, StatusPill, StepFlow } from "../components/ui";
import { IconAlert, IconArrowRight, IconCheck, IconUpload } from "../components/icons";

/**
 * Upload Website (ADD-04 Phase F / US-004, US-005) — real pipeline:
 * createProject -> upload (ZIP or single .html/.css) -> server validation.
 * The original upload is stored read-only; every later step works on copies (RULE-01).
 */

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // mirrors the server default MAX_UPLOAD_BYTES (50 MiB)
const ALLOWED_EXT = [".zip", ".html", ".htm", ".css"];

type Phase = "idle" | "creating" | "uploading" | "done" | "error";

function checkFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  if (!ALLOWED_EXT.some((ext) => lower.endsWith(ext))) {
    return `"${file.name}" is not supported. Upload a .zip project, or a single .html or .css file.`;
  }
  if (file.size === 0) return `"${file.name}" is empty.`;
  if (file.size > MAX_UPLOAD_BYTES) {
    return `"${file.name}" is ${formatBytes(file.size)}. The maximum upload size is 50 MB.`;
  }
  return null;
}

export default function UploadPage() {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const busy = phase === "creating" || phase === "uploading";

  function pick(f: File | undefined | null) {
    setValidation(null);
    setProject(null);
    setError(null);
    setPhase("idle");
    if (!f) return;
    const problem = checkFile(f);
    setFileError(problem);
    setFile(problem ? null : f);
  }

  async function submit() {
    if (!file || busy) return;
    setError(null);
    setValidation(null);
    setProject(null);
    let createdId: string | null = null;
    try {
      setPhase("creating");
      const projectName = name.trim() || file.name.replace(/\.[^.]+$/, "");
      const { project: created } = await api.createProject(projectName.slice(0, 200));
      createdId = created.id;
      setPhase("uploading");
      const result = await api.upload(created.id, file);
      setValidation(result.validation);
      setProject(result.project);
      setPhase("done");
    } catch (err) {
      // Upload was rejected outright (e.g. FILE_TOO_LARGE / UNSUPPORTED_FILE):
      // remove the empty project we just created so the catalog stays clean.
      if (createdId) {
        await api.deleteProject(createdId).catch(() => undefined);
      }
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setPhase("error");
    }
  }

  const statusText =
    phase === "creating"
      ? "Creating project…"
      : phase === "uploading"
        ? "Uploading and validating files…"
        : phase === "done" && validation
          ? validation.valid
            ? "Upload complete. The project passed validation."
            : "Upload complete, but the project has blocking issues."
          : phase === "error"
            ? `Upload failed: ${error ?? ""}`
            : "";

  const errors = validation?.issues.filter((i) => i.level === "error") ?? [];
  const warnings = validation?.issues.filter((i) => i.level === "warning") ?? [];

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader
        title="Upload Website"
        description="Upload an HTML/CSS project as a .zip, or a single .html or .css file (max 50 MB). The original is stored unchanged; standardized output is always a separate copy."
      />

      <Card>
        <StepFlow
          steps={["Upload", "Analyze", "Detect", "Compare", "Standardize"]}
          current={phase === "done" && validation?.valid ? 1 : 0}
        />
      </Card>

      <Card className="space-y-4">
        <div>
          <label htmlFor="project-name" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Project name <span className="font-normal text-[var(--color-muted)]">(optional)</span>
          </label>
          <input
            id="project-name"
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Corporate Portal"
            disabled={busy}
            className="min-h-11 w-full rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          />
          <p className="mt-1 text-xs text-[var(--color-muted)]">Defaults to the file name.</p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) pick(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-[var(--radius-medium)] border-2 border-dashed px-4 py-10 text-center transition-colors ${
            dragging ? "border-[var(--color-primary)] bg-[var(--color-secondary)]" : "border-[var(--color-border)] bg-[var(--color-surface)]"
          }`}
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)]">
            <IconUpload size={22} />
          </span>
          <p className="text-sm text-[var(--color-text)]">Drag and drop a file here, or choose one</p>
          <div className="flex gap-2 text-xs font-semibold text-[var(--color-muted)]">
            <span className="rounded bg-[var(--color-background)] px-2 py-1">ZIP</span>
            <span className="rounded bg-[var(--color-background)] px-2 py-1">HTML</span>
            <span className="rounded bg-[var(--color-background)] px-2 py-1">CSS</span>
          </div>
          <label
            htmlFor="project-file"
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)] focus-within:outline focus-within:outline-2 focus-within:outline-[var(--color-primary)]"
          >
            Choose file
            <input
              id="project-file"
              type="file"
              accept=".zip,.html,.htm,.css"
              className="sr-only"
              disabled={busy}
              aria-describedby="file-help"
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </label>
          <p id="file-help" className="text-xs text-[var(--color-muted)]">
            Accepted: .zip, .html, .htm, .css · up to 50 MB
          </p>
          {file && (
            <p className="text-sm text-[var(--color-text)]">
              Selected: <span className="font-medium">{file.name}</span> ({formatBytes(file.size)})
            </p>
          )}
          {fileError && (
            <p role="alert" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-danger)]">
              <IconAlert size={16} /> {fileError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={!file || busy}>
            <IconUpload size={16} />
            {busy ? (phase === "creating" ? "Creating project…" : "Uploading…") : "Upload and validate"}
          </Button>
          <p aria-live="polite" role="status" className="text-sm text-[var(--color-muted)]">
            {statusText}
          </p>
        </div>

        {phase === "error" && error && <ErrorBox message={error} />}
      </Card>

      {validation && project && (
        <Card className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text)]">Validation result</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {validation.valid ? (
                  <StatusPill tone="success" label="Valid" icon={<IconCheck size={12} />} />
                ) : (
                  <StatusPill tone="danger" label="Not valid" icon={<IconAlert size={12} />} />
                )}
                <StatusPill tone={PROJECT_STATUS[project.status].tone} label={PROJECT_STATUS[project.status].label} />
                <span className="text-sm text-[var(--color-muted)]">
                  {project.name} · {validation.files.length} files · entry point {validation.entryPoint ?? "none"}
                </span>
              </div>
            </div>
            <LinkButton href={`/projects/${project.id}`} variant="primary">
              Open project <IconArrowRight size={16} />
            </LinkButton>
          </div>

          {validation.issues.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No issues found.</p>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                Issues ({errors.length} errors, {warnings.length} warnings)
              </h3>
              <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-medium)] border border-[var(--color-border)]">
                {[...errors, ...warnings].map((issue, i) => (
                  <li key={`${issue.code}-${i}`} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-start sm:gap-3">
                    <StatusPill tone={ISSUE_LEVEL[issue.level].tone} label={ISSUE_LEVEL[issue.level].label} />
                    <code className="font-mono text-xs text-[var(--color-muted)]">{issue.code}</code>
                    <span className="text-[var(--color-text)]">
                      {issue.message}
                      {issue.path && <span className="ml-1 font-mono text-xs text-[var(--color-muted)]">({issue.path})</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
