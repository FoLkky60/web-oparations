import { ok, handleError } from "@/app/lib/api";
import { getComplianceReport } from "@/app/lib/compliance-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const report = await getComplianceReport(id);
    return ok({ report });
  } catch (err) {
    return handleError(err);
  }
}
