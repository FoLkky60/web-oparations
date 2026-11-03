"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Project } from "@shared/index";
import { api } from "../lib/client";
import { PROJECT_STATUS } from "../lib/project-labels";
import { formatDate, formatDateTime } from "../lib/standard-labels";
import { Button, Card, EmptyState, LinkButton, PageHeader, StatusPill } from "../components/ui";
import { ConfirmDialog } from "../components/confirm-dialog";
import { IconAlert, IconFolder, IconRefresh, IconUpload } from "../components/icons";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; projects: Project[] };

export function ProjectCatalog() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const { projects } = await api.listProjects();
      setState({ kind: "ready", projects });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Could not load projects." });
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount (client-only data; no SSR of project data).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteProject(toDelete.id);
      setNotice(`Deleted project "${toDelete.name}".`);
      setToDelete(null);
      await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  const count = state.kind === "ready" ? state.projects.length : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Project Catalog"
        description="Every project uploaded to the platform, with its pipeline status and the design system version it was analyzed against."
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()} disabled={state.kind === "loading"}>
              <IconRefresh size={16} /> Refresh
            </Button>
            <LinkButton href="/upload" variant="primary">
              <IconUpload size={16} /> Upload Website
            </LinkButton>
          </>
        }
      />

      <p role="status" aria-live="polite" className="sr-only">
        {state.kind === "loading" ? "Loading projects" : count !== null ? `${count} projects` : ""} {notice}
      </p>
      {notice && <p className="text-sm text-[var(--color-success)]">{notice}</p>}

      {state.kind === "loading" && (
        <Card>
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-[var(--radius-small)] bg-[var(--color-surface-muted)] motion-reduce:animate-none" />
            ))}
          </div>
        </Card>
      )}

      {state.kind === "error" && (
        <Card>
          <div role="alert" className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-danger)]">
              <IconAlert size={18} /> {state.message}
            </p>
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        </Card>
      )}

      {state.kind === "ready" && state.projects.length === 0 && (
        <EmptyState
          icon={<IconFolder size={22} />}
          title="No projects yet"
          description="Upload a website (.zip, .html or .css) to analyze it against the corporate design system."
          action={
            <LinkButton href="/upload" variant="primary">
              <IconUpload size={16} /> Upload Website
            </LinkButton>
          }
        />
      )}

      {state.kind === "ready" && state.projects.length > 0 && (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <caption className="sr-only">Projects</caption>
              <thead className="bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Project</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Entry point</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Files</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Design system</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Created</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Updated</th>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {state.projects.map((p) => {
                  const st = PROJECT_STATUS[p.status];
                  return (
                    <tr key={p.id} className="hover:bg-[var(--color-surface)]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${p.id}`}
                          className="inline-flex min-h-11 flex-col justify-center font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline"
                        >
                          {p.name}
                          <span className="font-mono text-xs font-normal text-[var(--color-muted)]">{p.id}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={st.tone} label={st.label} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--color-text)]">{p.entryPoint ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--color-text)]">{p.files.length}</td>
                      <td className="px-4 py-3 text-[var(--color-text)]">{p.designSystemVersion ? `v${p.designSystemVersion}` : "Not analyzed"}</td>
                      <td className="px-4 py-3 text-[var(--color-muted)]">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3 text-[var(--color-muted)]">{formatDateTime(p.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setDeleteError(null);
                            setNotice("");
                            setToDelete(p);
                          }}
                        >
                          Delete<span className="sr-only"> {p.name}</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete project?"
        description={
          <>
            This permanently removes <strong className="text-[var(--color-text)]">{toDelete?.name}</strong>, its stored
            upload, analysis and every standardized output version. This cannot be undone.
          </>
        }
        confirmLabel="Delete project"
        busy={deleting}
        error={deleteError}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
