import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readJson, zodError, jsonError } from "@/lib/http";
import { ipKey } from "@/lib/ip";
import { rateLimit } from "@/lib/rateLimitDb";
import { TEN_MINUTES } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().trim().max(100).optional(),
  contact: z.string().trim().max(150).optional(),
  message: z.string().trim().min(3, "Please write a short message").max(2000),
  rating: z.number().int().min(1).max(5).optional(),
  sessionId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);

  try {
    const rl = await rateLimit(`feedback:${ipKey(req.headers)}`, 5, TEN_MINUTES);
    if (!rl.allowed) return jsonError(429, "Too many messages. Please try again later.");

    const { name, contact, message, rating, sessionId } = parsed.data;
    await prisma.$transaction([
      prisma.privateFeedback.create({
        data: { name: name || null, contact: contact || null, message, rating },
      }),
      prisma.event.create({
        data: { type: "PRIVATE_CONTACT", rating, sessionId: sessionId ?? "unknown" },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("private-feedback: failed", err);
    return jsonError(500, "Couldn't send. Please try again.");
  }
}
