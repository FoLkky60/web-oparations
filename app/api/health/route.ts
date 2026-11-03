import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "@/app/lib/config";
import { log } from "@/app/lib/log";

/**
 * Health probe. Returns 200 in both healthy and degraded states so a simple
 * liveness check passes while the body still signals readiness. The storage
 * root is probed for writability since the Phase 1 MVP persists all artifacts
 * there (file-backed Repository/Storage).
 */

export const dynamic = "force-dynamic";

function resolveStorageRoot(): string {
  return path.isAbsolute(config.storageRoot)
    ? config.storageRoot
    : path.join(process.cwd(), config.storageRoot);
}

async function storageIsWritable(): Promise<boolean> {
  const root = resolveStorageRoot();
  const probe = path.join(root, ".health-check");
  try {
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(probe, "ok");
    await fs.rm(probe, { force: true });
    return true;
  } catch (err) {
    log("warn", "Storage writability check failed", {
      root,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function GET() {
  const writable = await storageIsWritable();
  return NextResponse.json({
    status: writable ? "ok" : "degraded",
    time: new Date().toISOString(),
  });
}
