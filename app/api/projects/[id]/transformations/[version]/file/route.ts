import type { NextRequest } from "next/server";
import { ok, fail, handleError } from "@/app/lib/api";
import { compareFile } from "@/app/lib/project-service";

/**
 * GET /api/projects/:id/transformations/:version/file?path=<file>
 * Returns original vs standardized text of one file. The path is validated by
 * exact lookup against the stored workspace file lists (see compareFile).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  try {
    const { id, version } = await params;
    const v = Number(version);
    if (!Number.isInteger(v)) return fail("INVALID_VERSION", "Version must be an integer.", 400);
    const filePath = request.nextUrl.searchParams.get("path");
    if (!filePath || filePath.length > 500) {
      return fail("INVALID_PATH", "Query parameter 'path' is required (max 500 characters).", 400);
    }
    const file = await compareFile(id, v, filePath);
    return ok({ file });
  } catch (err) {
    return handleError(err);
  }
}
