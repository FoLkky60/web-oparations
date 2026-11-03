import type { NextRequest } from "next/server";
import { ok, handleError } from "@/app/lib/api";
import { getActiveVersion, getVersion } from "@/app/lib/design-system-service";

export async function GET(request: NextRequest) {
  try {
    const version = request.nextUrl.searchParams.get("version") ?? undefined;
    const ds = version ? await getVersion(version) : await getActiveVersion();
    return ok({ version: ds.version, tokens: ds.tokens });
  } catch (err) {
    return handleError(err);
  }
}
