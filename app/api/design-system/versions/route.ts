import type { NextRequest } from "next/server";
import { ok, fail, handleError } from "@/app/lib/api";
import { listVersions, createVersion } from "@/app/lib/design-system-service";
import type {
  DesignToken,
  DesignSystemComponent,
  MappingRule,
} from "@shared/index";

export async function GET() {
  try {
    const versions = await listVersions();
    return ok({
      versions: versions.map((v) => ({
        version: v.version,
        active: v.active,
        createdAt: v.createdAt,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

interface CreateVersionBody {
  tokens?: DesignToken[];
  components?: DesignSystemComponent[];
  mappingRules?: MappingRule[];
}

export async function POST(request: NextRequest) {
  try {
    // NOTE: auth/RBAC (ds-admin only) is added in Phase 5. Open for now.
    const body = (await request.json().catch(() => null)) as CreateVersionBody | null;
    if (!body) {
      return fail("INVALID_BODY", "Expected a JSON body.", 400);
    }
    if (
      !Array.isArray(body.tokens) ||
      !Array.isArray(body.components) ||
      !Array.isArray(body.mappingRules)
    ) {
      return fail(
        "INVALID_BODY",
        "Body must include tokens[], components[], and mappingRules[].",
        400,
      );
    }

    const created = await createVersion({
      tokens: body.tokens,
      components: body.components,
      mappingRules: body.mappingRules,
      createdBy: "system",
    });

    return ok({ version: created.version }, 201);
  } catch (err) {
    return handleError(err);
  }
}
