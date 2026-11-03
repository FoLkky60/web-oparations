import { nanoid } from "nanoid";
import {
  extractZip,
  validateProject,
  analyzeProject,
  transformProject,
  getDesignSystem,
  ProjectWorkspace,
  classifyFileKind,
} from "@core/index";
import type {
  Project,
  ProjectVersion,
  ValidationResult,
  AnalysisResult,
  TransformationReport,
  TransformationCategory,
} from "@shared/index";
import { repository, type ProjectRecord } from "./repository";
import { storage } from "./storage";
import { workspaceToZip, zipToWorkspace } from "./workspace-zip";
import { getActiveDesignSystem } from "./design-system-service";

/**
 * Application service orchestrating the project lifecycle. Route handlers are
 * thin wrappers over these methods (the same separation a NestJS controller/
 * service split would give). Nothing here reports success until the underlying
 * operation actually completed.
 */

const ORIGINAL_KEY = (id: string) => `projects/${id}/original.zip`;
const OUTPUT_KEY = (id: string, v: number) => `projects/${id}/standardized-v${v}.zip`;

export async function createProject(name: string): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    id: nanoid(12),
    name: name || "Untitled project",
    originalFilename: null,
    status: "created",
    entryPoint: null,
    files: [],
    designSystemVersion: null,
    createdAt: now,
    updatedAt: now,
  };
  return repository.createProject(project);
}

export async function listProjects(): Promise<Project[]> {
  return repository.listProjects();
}

export async function getProjectRecord(id: string): Promise<ProjectRecord | null> {
  return repository.getProject(id);
}

export async function deleteProject(id: string): Promise<void> {
  const record = await repository.getProject(id);
  for (const t of record?.transformations ?? []) {
    await storage.delete(t.storageReference);
  }
  await storage.delete(ORIGINAL_KEY(id));
  await repository.deleteProject(id);
}

interface UploadInput {
  filename: string;
  data: Buffer;
  /** true if the data is a single file rather than a ZIP. */
  singleFile: boolean;
}

/**
 * Build a workspace from the uploaded bytes (ZIP or single HTML/CSS file),
 * validate it, store the original archive, and persist a version record.
 */
export async function uploadAndStore(
  id: string,
  input: UploadInput,
): Promise<{ validation: ValidationResult; project: Project }> {
  const record = await repository.getProject(id);
  if (!record) throw new ServiceError("NOT_FOUND", `Project ${id} not found`, 404);

  let ws: ProjectWorkspace;
  let extractIssues: ValidationResult["issues"] = [];

  if (input.singleFile) {
    const kind = classifyFileKind(input.filename);
    if (kind !== "html" && kind !== "css") {
      throw new ServiceError("UNSUPPORTED_FILE", "Only .html, .css, or .zip uploads are supported.", 400);
    }
    ws = new ProjectWorkspace();
    ws.add({ path: input.filename, kind, text: input.data.toString("utf8"), size: input.data.byteLength });
  } else {
    const result = await extractZip(input.data);
    ws = result.workspace;
    extractIssues = result.issues;
    if (ws.list().length === 0) {
      // Extraction rejected everything (e.g. unsafe archive).
      const validation = validateProject(ws, extractIssues);
      await repository.updateProject(id, { status: "failed", originalFilename: input.filename });
      return { validation, project: (await repository.getProject(id))!.project };
    }
  }

  const validation = validateProject(ws, extractIssues);

  // Store the original archive (even if validation has warnings, as long as
  // there is content). Never store if there were fatal extraction errors and
  // no files.
  const zipBuf = await workspaceToZip(ws);
  await storage.put(ORIGINAL_KEY(id), zipBuf);

  const now = new Date().toISOString();
  const version: ProjectVersion = {
    id: nanoid(10),
    projectId: id,
    versionNumber: 1,
    sourceType: "original",
    storageReference: ORIGINAL_KEY(id),
    designSystemVersion: null,
    createdAt: now,
  };
  await repository.addVersion(id, version);

  const project = await repository.updateProject(id, {
    originalFilename: input.filename,
    status: validation.valid ? "uploaded" : "failed",
    entryPoint: validation.entryPoint,
    files: validation.files,
  });

  return { validation, project };
}

export async function validateStored(id: string): Promise<ValidationResult> {
  const ws = await loadOriginalWorkspace(id);
  return validateProject(ws);
}

export async function analyze(id: string): Promise<AnalysisResult> {
  const ws = await loadOriginalWorkspace(id);
  // Always analyze against the ACTIVE design system version (ADD-04 D-2).
  const ds = await getActiveDesignSystem();
  const result = analyzeProject(ws, ds);
  await repository.saveAnalysis(id, result);
  await repository.updateProject(id, {
    status: result.status === "completed" ? "analyzed" : "failed",
    designSystemVersion: result.designSystemVersion,
  });
  return result;
}

export async function transform(
  id: string,
  categories?: TransformationCategory[],
): Promise<{ report: TransformationReport; version: number }> {
  const original = await loadOriginalWorkspace(id);
  const ds = await getActiveDesignSystem();
  const { output, report } = transformProject(original, { categories, designSystem: ds });

  const record = await repository.getProject(id);
  const versionNumber = (record?.transformations.length ?? 0) + 2; // v1 is original

  const outBuf = await workspaceToZip(output);
  const key = OUTPUT_KEY(id, versionNumber);
  await storage.put(key, outBuf);

  await repository.addTransformation(id, {
    version: versionNumber,
    report,
    storageReference: key,
    createdAt: report.createdAt,
  });
  await repository.addVersion(id, {
    id: nanoid(10),
    projectId: id,
    versionNumber,
    sourceType: "standardized",
    storageReference: key,
    designSystemVersion: report.designSystemVersion,
    createdAt: report.createdAt,
  });
  await repository.updateProject(id, {
    status: report.status === "failed" ? "failed" : "transformed",
  });

  return { report, version: versionNumber };
}

export async function exportOutput(id: string, version?: number): Promise<{ buffer: Buffer; filename: string } | null> {
  const record = await repository.getProject(id);
  if (!record) return null;
  const t = version
    ? record.transformations.find((x) => x.version === version)
    : record.transformations[record.transformations.length - 1];
  if (!t) return null;
  if (!(await storage.exists(t.storageReference))) return null;
  const buffer = await storage.get(t.storageReference);
  return { buffer, filename: `${record.project.name.replace(/\s+/g, "-")}-standardized-v${t.version}.zip` };
}

export interface FileComparison {
  path: string;
  version: number;
  original: string | null;
  output: string | null;
  kind: "html" | "css" | "js" | "asset" | "unsupported";
}

/**
 * Original vs standardized text of ONE file for a transformation version.
 * The requested path is only used as a lookup key against the stored
 * workspaces' file lists (never joined into a filesystem path), so unknown or
 * traversal-style paths simply resolve to NOT_FOUND. Read-only (RULE-01).
 */
export async function compareFile(id: string, version: number, filePath: string): Promise<FileComparison> {
  const record = await repository.getProject(id);
  if (!record) throw new ServiceError("NOT_FOUND", `Project ${id} not found`, 404);
  const t = record.transformations.find((x) => x.version === version);
  if (!t) throw new ServiceError("NOT_FOUND", `Transformation version ${version} not found`, 404);
  if (!(await storage.exists(t.storageReference))) {
    throw new ServiceError("NO_OUTPUT", "Stored output for this version is missing.", 409);
  }
  const original = await loadOriginalWorkspace(id);
  const output = await zipToWorkspace(await storage.get(t.storageReference));
  const before = original.list().find((f) => f.path === filePath) ?? null;
  const after = output.list().find((f) => f.path === filePath) ?? null;
  if (!before && !after) throw new ServiceError("NOT_FOUND", "File not found in this project version.", 404);
  const kind = (after ?? before)!.kind;
  if (kind !== "html" && kind !== "css" && kind !== "js") {
    throw new ServiceError("NOT_TEXT", "Only HTML, CSS and JS files can be compared.", 400);
  }
  return {
    path: filePath,
    version,
    original: before?.text ?? null,
    output: after?.text ?? null,
    kind,
  };
}

export function designSystem(version?: string) {
  return getDesignSystem(version);
}

async function loadOriginalWorkspace(id: string): Promise<ProjectWorkspace> {
  const record = await repository.getProject(id);
  if (!record) throw new ServiceError("NOT_FOUND", `Project ${id} not found`, 404);
  if (!(await storage.exists(ORIGINAL_KEY(id)))) {
    throw new ServiceError("NO_UPLOAD", "No uploaded project found. Upload a project first.", 409);
  }
  const buf = await storage.get(ORIGINAL_KEY(id));
  return zipToWorkspace(buf);
}

export class ServiceError extends Error {
  constructor(public code: string, message: string, public httpStatus: number) {
    super(message);
  }
}
