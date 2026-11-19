import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { createSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/constants";
import { serverEnv } from "@/lib/env";
import { jsonError, readJson, zodError } from "@/lib/http";
import { ipKey } from "@/lib/ip";
import { rateLimit } from "@/lib/rateLimitDb";
import { TEN_MINUTES } from "@/lib/rateLimit";

export const runtime = "nodejs";

const Body = z.object({ password: z.string().min(1).max(200) });

const digest = (s: string) => createHash("sha256").update(s).digest();

export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);

  // Brute-force protection: 10 attempts / 10 min per hashed IP.
  try {
    const rl = await rateLimit(`login:${ipKey(req.headers)}`, 10, TEN_MINUTES);
    if (!rl.allowed) return jsonError(429, "Too many attempts. Try again in a few minutes.");
  } catch (err) {
    console.error("login rate limit failed", err);
  }

  const env = serverEnv();
  const ok = timingSafeEqual(digest(parsed.data.password), digest(env.ADMIN_PASSWORD));
  if (!ok) return jsonError(401, "Wrong password");

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
