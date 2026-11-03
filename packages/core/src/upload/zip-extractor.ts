import JSZip from "jszip";
import { ProjectWorkspace, classifyFileKind, type ProjectFile } from "../project/project-files";
import type { ValidationIssue } from "@shared/index";

/**
 * Safe extraction of an uploaded ZIP into a ProjectWorkspace. Treats the archive
 * as untrusted input and enforces:
 *   - path traversal protection (reject "..", absolute, drive-letter paths)
 *   - total decompressed size limit (archive-bomb protection)
 *   - per-file size limit
 *   - max file count
 *   - executable/binary policy (unsupported entries are dropped with a warning)
 */

export interface ExtractLimits {
  maxFiles: number;
  maxTotalBytes: number;
  maxFileBytes: number;
}

export const DEFAULT_LIMITS: ExtractLimits = {
  maxFiles: 500,
  maxTotalBytes: 50 * 1024 * 1024, // 50 MB decompressed
  maxFileBytes: 10 * 1024 * 1024, // 10 MB per file
};

const BLOCKED_EXT = /\.(exe|dll|so|dylib|sh|bat|cmd|ps1|php|py|rb|jar|war|bin|com)$/i;

export interface ExtractResult {
  workspace: ProjectWorkspace;
  issues: ValidationIssue[];
}

function isUnsafePath(path: string): boolean {
  // Absolute / drive-letter / root entries. ZIP tools (including JSZip) often
  // collapse leading "../" sequences into an absolute-looking path, so a path
  // that begins with "/" is the observable signature of an attempted traversal
  // escape and must be rejected.
  if (path === "" || path.startsWith("/") || /^[a-zA-Z]:/.test(path)) return true;
  const parts = path.split("/");
  if (parts.includes("..")) return true;
  if (path.includes("\0")) return true;
  return false;
}

function normalize(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

export async function extractZip(
  data: Buffer | Uint8Array,
  limits: ExtractLimits = DEFAULT_LIMITS,
): Promise<ExtractResult> {
  const issues: ValidationIssue[] = [];
  const workspace = new ProjectWorkspace();

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch (err) {
    issues.push({ level: "error", code: "ZIP_INVALID", message: `Could not read ZIP archive: ${(err as Error).message}` });
    return { workspace, issues };
  }

  // First pass over ALL entries (including directories). ZIP tools collapse a
  // "../../../x" traversal into a root ("/") entry, so the presence of any
  // absolute/root entry is the observable signature of an attempted escape.
  // Treat the archive as untrusted. If ANY entry (file or directory) shows a
  // traversal/absolute-path signature, reject the whole archive rather than
  // trying to salvage individual files — we cannot reliably tell which files
  // belong to the escaped subtree once the ZIP tool has collapsed the names.
  for (const entry of Object.values(zip.files)) {
    const name = normalize(entry.name);
    if (isUnsafePath(name)) {
      issues.push({
        level: "error",
        code: "UNSAFE_PATH",
        message: `Rejected archive: unsafe path "${entry.name}" (possible traversal escape).`,
        path: entry.name,
      });
      return { workspace, issues };
    }
  }

  const entries = Object.values(zip.files).filter((e) => !e.dir);

  if (entries.length > limits.maxFiles) {
    issues.push({ level: "error", code: "TOO_MANY_FILES", message: `Archive contains ${entries.length} files; limit is ${limits.maxFiles}.` });
    return { workspace, issues };
  }

  let total = 0;
  for (const entry of entries) {
    const path = normalize(entry.name);

    if (isUnsafePath(path)) {
      issues.push({ level: "error", code: "UNSAFE_PATH", message: `Rejected unsafe path "${entry.name}".`, path: entry.name });
      continue;
    }
    if (BLOCKED_EXT.test(path)) {
      issues.push({ level: "warning", code: "BLOCKED_FILE", message: `Dropped disallowed file "${path}" per policy.`, path });
      continue;
    }

    const content = await entry.async("uint8array");
    if (content.byteLength > limits.maxFileBytes) {
      issues.push({ level: "error", code: "FILE_TOO_LARGE", message: `File "${path}" (${content.byteLength} bytes) exceeds per-file limit.`, path });
      continue;
    }
    total += content.byteLength;
    if (total > limits.maxTotalBytes) {
      issues.push({ level: "error", code: "ARCHIVE_TOO_LARGE", message: `Decompressed size exceeds ${limits.maxTotalBytes} bytes (possible archive bomb).` });
      return { workspace, issues };
    }

    const kind = classifyFileKind(path);
    const file: ProjectFile = {
      path,
      kind,
      size: content.byteLength,
    };
    if (kind === "html" || kind === "css" || kind === "js") {
      file.text = Buffer.from(content).toString("utf8");
    } else if (kind === "asset") {
      file.binary = Buffer.from(content);
    } else {
      issues.push({ level: "warning", code: "UNSUPPORTED_FILE", message: `Unsupported file type kept as metadata only: "${path}".`, path });
      file.binary = Buffer.from(content);
    }
    workspace.add(file);
  }

  return { workspace, issues };
}
