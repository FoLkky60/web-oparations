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
 * Pages still use app/lib/mock-store until Phase 4 switches them over to this
 * client; mock-store is intentionally left in place.
 */

async function req<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { credentials: "include", ...init });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const message: string =
      body?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
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
    );
  },

  analyze: (id: string) =>
    req<{ analysis: AnalysisResult }>(`/api/projects/${id}/analyze`, {
      method: "POST",
    }),

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
