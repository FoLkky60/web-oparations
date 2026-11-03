import type { NextRequest } from "next/server";
import { ok, fail, handleError } from "@/app/lib/api";
import { config } from "@/app/lib/config";
import { uploadAndStore } from "@/app/lib/project-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return fail("NO_FILE", "Expected multipart form field 'file'.", 400);
    }
    if (file.size > config.maxUploadBytes) {
      return fail("FILE_TOO_LARGE", `Upload exceeds ${config.maxUploadBytes} bytes.`, 413);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name || "upload";
    const isZip = name.toLowerCase().endsWith(".zip") || file.type === "application/zip";

    const { validation, project } = await uploadAndStore(id, {
      filename: name,
      data: buffer,
      singleFile: !isZip,
    });

    const status = validation.valid ? 200 : 422;
    return ok({ validation, project }, status);
  } catch (err) {
    return handleError(err);
  }
}
