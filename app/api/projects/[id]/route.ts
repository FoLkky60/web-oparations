import { ok, fail, handleError } from "@/app/lib/api";
import { getProjectRecord, deleteProject } from "@/app/lib/project-service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await getProjectRecord(id);
    if (!record) return fail("NOT_FOUND", `Project ${id} not found`, 404);
    return ok(record);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await getProjectRecord(id);
    if (!record) return fail("NOT_FOUND", `Project ${id} not found`, 404);
    await deleteProject(id);
    return ok({ deleted: id });
  } catch (err) {
    return handleError(err);
  }
}
