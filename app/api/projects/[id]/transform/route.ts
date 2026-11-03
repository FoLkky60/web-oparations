import type { NextRequest } from "next/server";
import { ok, fail, handleError } from "@/app/lib/api";
import { transform } from "@/app/lib/project-service";
import type { TransformationCategory } from "@shared/index";

const VALID: TransformationCategory[] = ["colors", "radius", "spacing", "typography", "components"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let categories: TransformationCategory[] | undefined;
    try {
      const body = (await request.json()) as { categories?: string[] };
      if (Array.isArray(body?.categories)) {
        const invalid = body.categories.filter((c) => !VALID.includes(c as TransformationCategory));
        if (invalid.length) {
          return fail("INVALID_CATEGORY", `Unknown categories: ${invalid.join(", ")}`, 400);
        }
        categories = body.categories as TransformationCategory[];
      }
    } catch {
      // no body -> all categories
    }
    const { report, version } = await transform(id, categories);
    return ok({ report, version }, report.status === "failed" ? 422 : 200);
  } catch (err) {
    return handleError(err);
  }
}
