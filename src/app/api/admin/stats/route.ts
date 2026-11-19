import { NextResponse } from "next/server";
import { z } from "zod";
import { getStats, isValidTimeZone } from "@/lib/analytics";
import { jsonError, zodError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayIn(tz: string): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function minusDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const Query = z
  .object({
    from: z.string().regex(DATE).optional(),
    to: z.string().regex(DATE).optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "`from` must be on or before `to`" });

export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return zodError(parsed.error);

  const envTz = process.env.ANALYTICS_TIMEZONE || "UTC";
  const tz = isValidTimeZone(envTz) ? envTz : "UTC";
  const to = parsed.data.to ?? todayIn(tz);
  const from = parsed.data.from ?? minusDays(to, 29);
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 366) {
    return jsonError(400, "Date range can be at most one year");
  }

  try {
    return NextResponse.json(await getStats(from, to, tz), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("stats: failed", err);
    return jsonError(500, "Could not load analytics");
  }
}
