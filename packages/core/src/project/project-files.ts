import type { ProjectFileEntry } from "@shared/index";

/**
 * An in-memory representation of an uploaded project's files. Text files hold
 * their content; binary assets hold a Buffer. This is the unit the analyzer and
 * transformer operate on, independent of how files are persisted.
 */

export interface ProjectFile {
  path: string; // normalized, forward-slash, no leading slash
  kind: ProjectFileEntry["kind"];
  text?: string; // for html/css/js
  binary?: Buffer; // for assets
  size: number;
}

export class ProjectWorkspace {
  readonly files: Map<string, ProjectFile> = new Map();

  add(file: ProjectFile): void {
    this.files.set(file.path, file);
  }

  get(path: string): ProjectFile | undefined {
    return this.files.get(path);
  }

  list(): ProjectFile[] {
    return [...this.files.values()];
  }

  byKind(kind: ProjectFile["kind"]): ProjectFile[] {
    return this.list().filter((f) => f.kind === kind);
  }

  entries(): ProjectFileEntry[] {
    return this.list().map((f) => ({ path: f.path, kind: f.kind, size: f.size }));
  }

  /** Detect the entry point: index.html at the shallowest depth, else first html. */
  entryPoint(): string | null {
    const htmls = this.byKind("html");
    if (htmls.length === 0) return null;
    const indexes = htmls.filter((f) => f.path.toLowerCase().endsWith("index.html"));
    const pool = indexes.length ? indexes : htmls;
    pool.sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));
    return pool[0].path;
  }

  clone(): ProjectWorkspace {
    const ws = new ProjectWorkspace();
    for (const f of this.list()) {
      ws.add({
        ...f,
        binary: f.binary ? Buffer.from(f.binary) : undefined,
      });
    }
    return ws;
  }
}

export function classifyFileKind(path: string): ProjectFile["kind"] {
  const lower = path.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "js";
  if (/\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|json|txt|map)$/i.test(lower)) return "asset";
  return "unsupported";
}
