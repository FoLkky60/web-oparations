import { ok, fail, handleError } from "@/app/lib/api";
import { getProjectRecord } from "@/app/lib/project-service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await getProjectRecord(id);
    if (!record) return fail("NOT_FOUND", `Project ${id} not found`, 404);
    if (!record.analysis) return fail("NO_ANALYSIS", "Project has not been analyzed yet.", 409);
    return ok({ analysis: record.analysis });
  } catch (err) {
    return handleError(err);
  }
}
