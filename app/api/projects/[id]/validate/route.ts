import { ok, handleError } from "@/app/lib/api";
import { validateStored } from "@/app/lib/project-service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const validation = await validateStored(id);
    return ok({ validation }, validation.valid ? 200 : 422);
  } catch (err) {
    return handleError(err);
  }
}
