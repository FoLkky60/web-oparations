import { ok, handleError } from "@/app/lib/api";
import { getActiveVersion } from "@/app/lib/design-system-service";

export async function GET() {
  try {
    const active = await getActiveVersion();
    return ok({
      version: active.version,
      active: active.active,
      createdAt: active.createdAt,
      createdBy: active.createdBy,
      tokens: active.tokens,
      components: active.components,
      mappingRules: active.mappingRules,
    });
  } catch (err) {
    return handleError(err);
  }
}
