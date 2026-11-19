import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LANGUAGE_CODES } from "@/lib/constants";
import { readJson, zodError, jsonError } from "@/lib/http";
import { ipKey } from "@/lib/ip";
import { rateLimit } from "@/lib/rateLimitDb";
import { TEN_MINUTES } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PRIVATE_CONTACT is recorded server-side by /api/private-feedback.
const Body = z.object({
  type: z.enum(["SCAN", "DRAFTS_VIEWED", "DRAFT_COPIED", "GOOGLE_REDIRECT"]),
  sessionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5).optional(),
  language: z.enum(LANGUAGE_CODES).optional(),
  source: z
    .string()
    .max(20)
    .regex(/^[a-z0-9_-]*$/i)
    .optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);

  try {
    const rl = await rateLimit(`events:${ipKey(req.headers)}`, 120, TEN_MINUTES);
    if (!rl.allowed) return jsonError(429, "Too many events");

    const { type, sessionId, rating, language, source } = parsed.data;
    await prisma.event.create({
      data: { type, sessionId, rating, language, source: type === "SCAN" ? source ?? "direct" : null },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("events: failed to record", err);
    return jsonError(500, "Could not record event");
  }
}
