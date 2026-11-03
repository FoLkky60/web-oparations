import { ok, fail, handleError } from "@/app/lib/api";
import { getProjectRecord } from "@/app/lib/project-service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await getProjectRecord(id);
    if (!record) return fail("NOT_FOUND", `Project ${id} not found`, 404);
    const transformations = record.transformations.map((t) => ({
      version: t.version,
      status: t.report.status,
      categories: t.report.categories,
      changeCount: t.report.changes.length,
      createdAt: t.createdAt,
    }));
    return ok({ transformations });
  } catch (err) {
    return handleError(err);
  }
}
