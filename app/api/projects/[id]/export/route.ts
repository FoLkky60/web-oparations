import type { NextRequest } from "next/server";
import { fail, handleError } from "@/app/lib/api";
import { exportOutput } from "@/app/lib/project-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const versionParam = request.nextUrl.searchParams.get("version");
    const version = versionParam ? Number(versionParam) : undefined;
    const result = await exportOutput(id, version);
    if (!result) {
      return fail("NO_OUTPUT", "No standardized output available. Run a transformation first.", 409);
    }
    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
