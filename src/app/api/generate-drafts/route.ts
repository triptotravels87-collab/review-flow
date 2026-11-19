import { NextResponse } from "next/server";
import { GenerateDraftsInput } from "@/lib/drafts";
import { generateDrafts } from "@/lib/llm";
import { getBusiness } from "@/lib/business";
import { GENERIC_HIGHLIGHTS } from "@/lib/constants";
import { serverEnv } from "@/lib/env";
import { jsonError, readJson, zodError } from "@/lib/http";
import { ipKey } from "@/lib/ip";
import { rateLimit } from "@/lib/rateLimitDb";
import { dayKey, ONE_DAY, TEN_MINUTES } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const FRIENDLY_ERROR = "Couldn't generate, try again";

export async function POST(req: Request) {
  const parsed = GenerateDraftsInput.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  const input = parsed.data;

  // Settings + both rate-limit checks run in parallel: one DB round trip instead of three,
  // which keeps the whole request well inside Vercel Hobby's ~10s limit.
  // (A request blocked per-IP still counts toward the daily cap; that is an acceptable trade-off.)
  let business: Awaited<ReturnType<typeof getBusiness>>;
  try {
    const [b, perIp, daily] = await Promise.all([
      getBusiness(),
      rateLimit(`ai:ip:${ipKey(req.headers)}`, 10, TEN_MINUTES),
      rateLimit(dayKey("ai:global"), serverEnv().DAILY_AI_LIMIT, ONE_DAY),
    ]);
    business = b;
    if (!perIp.allowed) {
      return jsonError(429, "Too many requests. Please wait a few minutes and try again.", {
        retryAfter: perIp.resetAt.toISOString(),
      });
    }
    if (!daily.allowed) {
      return jsonError(429, "Drafts are unavailable right now. You can still write your review on Google.");
    }
  } catch (err) {
    console.error("generate-drafts: rate limiter failed", err);
    return jsonError(503, FRIENDLY_ERROR);
  }

  // Only accept known chips / staff names, so free text can't be injected into the prompt.
  const allowed = new Set([...business.staff, ...business.services, ...GENERIC_HIGHLIGHTS]);
  const highlights = input.highlights.filter((h) => allowed.has(h));
  const staffName = input.staffName && business.staff.includes(input.staffName) ? input.staffName : undefined;

  try {
    const drafts = await generateDrafts({ ...input, highlights, staffName }, business);
    return NextResponse.json({ drafts }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError(502, FRIENDLY_ERROR);
  }
}
