import { NextResponse } from "next/server";
import type { ApiError } from "@shared/index";
import { ServiceError } from "./project-service";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function fail(code: string, message: string, status = 400, details?: unknown): NextResponse {
  const body: ApiError = { error: { code, message, details } };
  return NextResponse.json(body, { status });
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof ServiceError) {
    return fail(err.code, err.message, err.httpStatus);
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  return fail("INTERNAL", message, 500);
}
