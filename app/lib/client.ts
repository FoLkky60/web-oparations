import type {
  Project,
  ValidationResult,
  AnalysisResult,
  TransformationReport,
  TransformationCategory,
  DesignToken,
  DesignSystemComponent,
  MappingRule,
  ComplianceReport,
} from "@shared/index";
import type { ProjectRecord } from "./repository";

/**
 * Typed REST client for the platform's own backend (Next.js route handlers
 * under /api). Every request sends cookies (`credentials: "include"`) so the
 * Phase 5 session cookie flows automatically once auth is wired. The server
 * error envelope `{ error: { code, message } }` is parsed and surfaced as a
 * thrown Error on non-2xx responses.
 *
 * ADD-04 Phase F: Upload, Project Catalog and Project detail use this client.
 * The mock Builder/imported/built pages still use their own mock stores.
 */

/** Error thrown for non-2xx responses; carries the envelope code + HTTP status. */
export class ApiRequestError extends Error {
  constructor(message: string, public code: string | null, public status: number) {
    super(message);
  }
}

/**
 * `okStatuses` lists extra non-2xx statuses whose body is a normal typed
 * payload (e.g. upload returns 422 + validation result when the project has
 * blocking issues).
 */
async function req<T>(input: string, init?: RequestInit, okStatuses: number[] = []): Promise<T> {
  const res = await fetch(input, { credentials: "include", ...init });
  const text = await res.text();
  let body: { error?: { code?: string; message?: string } } & Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    // Non-JSON body (e.g. a proxy/HTML error page) — fall through to a generic message.
  }
  if (!res.ok && (body?.error || !okStatuses.includes(res.status))) {
    const message: string =
      body?.error?.message ?? `Request failed (${res.status})`;
    throw new ApiRequestError(message, body?.error?.code ?? null, res.status);
  }
  return body as unknown as T;
}

export interface TransformationSummary {
  version: number;
  status: TransformationReport["status"];
  categories: TransformationCategory[];
  changeCount: number;
  createdAt: string;
}

export interface FileComparison {
  path: string;
  version: number;
  original: string | null;
  output: string | null;
  kind: "html" | "css" | "js" | "asset" | "unsupported";
}

export interface DesignSystemVersionSummary {
  version: string;
  active: boolean;
  createdAt: string;
}

export interface DesignSystemVersionDetail {
  tokens: DesignToken[];
  components: DesignSystemComponent[];
  mappingRules: MappingRule[];
}

export interface ActiveDesignSystem extends DesignSystemVersionDetail {
  version: string;
  active: boolean;
  createdAt: string;
  createdBy: string;
}

export interface CreateDesignSystemVersionPayload {
  tokens: DesignToken[];
  components: DesignSystemComponent[];
  mappingRules: MappingRule[];
}

export const api = {
  // --- Projects -----------------------------------------------------------
  listProjects: () => req<{ projects: Project[] }>("/api/projects"),

  createProject: (name: string) =>
    req<{ project: Project }>("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),

  getProject: (id: string) => req<ProjectRecord>(`/api/projects/${id}`),

  deleteProject: (id: string) =>
    req<{ deleted: string }>(`/api/projects/${id}`, { method: "DELETE" }),

  upload: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req<{ validation: ValidationResult; project: Project }>(
      `/api/projects/${id}/upload`,
      { method: "POST", body: form },
      [422],
    );
  },

  /** Re-validate the stored original upload (read-only). */
  validate: (id: string) =>
    req<{ validation: ValidationResult }>(
      `/api/projects/${id}/validate`,
      { method: "POST" },
      [422],
    ),
  analyze: (id: string) =>
    req<{ analysis: AnalysisResult }>(
      `/api/projects/${id}/analyze`,
      { method: "POST" },
      [422],
    ),

  getAnalysis: (id: string) =>
    req<{ analysis: AnalysisResult }>(`/api/projects/${id}/analysis`),

  transform: (id: string, categories?: TransformationCategory[]) =>
    req<{ report: TransformationReport; version: number }>(
      `/api/projects/${id}/transform`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories }),
      },
      [422],
    ),
  listTransformations: (id: string) =>
    req<{ transformations: TransformationSummary[] }>(
      `/api/projects/${id}/transformations`,
    ),
  getTransformation: (id: string, version: number) =>
    req<{ version: number; report: TransformationReport }>(
      `/api/projects/${id}/transformations/${version}`,
    ),
  compareFile: (id: string, version: number, path: string) =>
    req<{ file: FileComparison }>(
      `/api/projects/${id}/transformations/${version}/file?path=${encodeURIComponent(path)}`,
    ),

  getCompliance: (id: string) =>
    req<{ report: ComplianceReport }>(`/api/projects/${id}/compliance`),

  // --- Design system (active + versioning) --------------------------------
  tokens: () =>
    req<{ version: string; tokens: DesignToken[] }>(
      "/api/design-system/tokens",
    ),

  components: () =>
    req<{ version: string; components: DesignSystemComponent[] }>(
      "/api/design-system/components",
    ),

  designSystemVersions: () =>
    req<{ versions: DesignSystemVersionSummary[] }>(
      "/api/design-system/versions",
    ),

  designSystemVersion: (version: string) =>
    req<DesignSystemVersionDetail>(
      `/api/design-system/versions/${encodeURIComponent(version)}`,
    ),

  createDesignSystemVersion: (payload: CreateDesignSystemVersionPayload) =>
    req<{ version: string }>("/api/design-system/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getActiveDesignSystem: () =>
    req<ActiveDesignSystem>("/api/design-system/active"),

  // --- Export (URL builder, not a fetch) ----------------------------------
  exportUrl: (id: string, version?: number): string =>
    `/api/projects/${id}/export${version ? `?version=${version}` : ""}`,
};
