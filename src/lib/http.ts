import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

export function zodError(err: ZodError) {
  return jsonError(400, "Invalid request", {
    issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
