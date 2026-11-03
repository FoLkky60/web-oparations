import { ok, fail, handleError } from "@/app/lib/api";
import { getProjectRecord } from "@/app/lib/project-service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; version: string }> }) {
  try {
    const { id, version } = await params;
    const v = Number(version);
    if (!Number.isInteger(v)) return fail("INVALID_VERSION", "Version must be an integer.", 400);
    const record = await getProjectRecord(id);
    if (!record) return fail("NOT_FOUND", `Project ${id} not found`, 404);
    const t = record.transformations.find((x) => x.version === v);
    if (!t) return fail("NOT_FOUND", `Transformation version ${v} not found`, 404);
    return ok({ version: t.version, report: t.report });
  } catch (err) {
    return handleError(err);
  }
}
