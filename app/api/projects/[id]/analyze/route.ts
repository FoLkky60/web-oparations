import { ok, handleError } from "@/app/lib/api";
import { analyze } from "@/app/lib/project-service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const analysis = await analyze(id);
    return ok({ analysis }, analysis.status === "completed" ? 200 : 422);
  } catch (err) {
    return handleError(err);
  }
}
