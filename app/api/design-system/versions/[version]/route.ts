import { ok, handleError } from "@/app/lib/api";
import { getVersion } from "@/app/lib/design-system-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ version: string }> },
) {
  try {
    const { version } = await params;
    const ds = await getVersion(version);
    return ok({
      tokens: ds.tokens,
      components: ds.components,
      mappingRules: ds.mappingRules,
    });
  } catch (err) {
    return handleError(err);
  }
}
