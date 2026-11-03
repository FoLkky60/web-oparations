/**
 * Centralized, typed runtime configuration. Values are read from the
 * environment once at module load with safe defaults so the platform runs
 * out of the box in the Phase 1 MVP (file-backed, no external services).
 *
 * Secrets (e.g. SESSION_SECRET) are read here but never logged. Only truly
 * invalid values throw; anything missing falls back to a documented default.
 */

export type StorageDriver = "local" | "s3";

export interface AppConfig {
  storageDriver: StorageDriver;
  storageRoot: string;
  sessionSecret: string;
  /** True when SESSION_SECRET fell back to the dev-only default. */
  sessionSecretIsDefault: boolean;
  maxUploadBytes: number;
}

/** Dev-only fallback. MUST be overridden via SESSION_SECRET in production. */
const DEV_SESSION_SECRET = "dev-insecure-session-secret-change-me";

const DEFAULT_MAX_UPLOAD_BYTES = 52428800; // 50 MiB

function readStorageDriver(raw: string | undefined): StorageDriver {
  if (raw === undefined || raw === "") return "local";
  if (raw === "local" || raw === "s3") return raw;
  throw new Error(
    `Invalid STORAGE_DRIVER "${raw}". Expected "local" or "s3".`,
  );
}

function readMaxUploadBytes(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_MAX_UPLOAD_BYTES;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid MAX_UPLOAD_BYTES "${raw}". Expected a positive integer (bytes).`,
    );
  }
  return parsed;
}

function readSessionSecret(raw: string | undefined): {
  value: string;
  isDefault: boolean;
} {
  if (raw && raw.trim() !== "") {
    return { value: raw, isDefault: false };
  }
  // Avoid logging the secret itself; warn only that the default is in use.
  console.warn(
    "[config] SESSION_SECRET is not set; using an insecure dev-only default. Set SESSION_SECRET before deploying.",
  );
  return { value: DEV_SESSION_SECRET, isDefault: true };
}

function loadConfig(): AppConfig {
  const storageDriver = readStorageDriver(process.env.STORAGE_DRIVER);
  const storageRoot =
    process.env.STORAGE_ROOT && process.env.STORAGE_ROOT.trim() !== ""
      ? process.env.STORAGE_ROOT
      : "./storage";
  const { value: sessionSecret, isDefault: sessionSecretIsDefault } =
    readSessionSecret(process.env.SESSION_SECRET);
  const maxUploadBytes = readMaxUploadBytes(process.env.MAX_UPLOAD_BYTES);

  return {
    storageDriver,
    storageRoot,
    sessionSecret,
    sessionSecretIsDefault,
    maxUploadBytes,
  };
}

export const config: AppConfig = loadConfig();
