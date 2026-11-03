import type { NextRequest } from "next/server";
import { ok, fail, handleError } from "@/app/lib/api";
import { createProject, listProjects } from "@/app/lib/project-service";

export async function GET() {
  try {
    const projects = await listProjects();
    return ok({ projects });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    let name = "Untitled project";
    try {
      const body = (await request.json()) as { name?: string };
      if (body?.name) name = body.name;
    } catch {
      // body optional
    }
    if (typeof name !== "string" || name.length > 200) {
      return fail("INVALID_NAME", "Project name must be a string up to 200 characters.", 400);
    }
    const project = await createProject(name);
    return ok({ project }, 201);
  } catch (err) {
    return handleError(err);
  }
}
