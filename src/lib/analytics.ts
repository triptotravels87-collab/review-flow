import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { EVENT_TYPES, type EventTypeName } from "./constants";

export interface StatsResult {
  from: string;
  to: string;
  timezone: string;
  totals: Record<EventTypeName, number>;
  /** Unique sessions reaching each stage. */
  funnel: { stage: EventTypeName; label: string; sessions: number }[];
  daily: ({ day: string } & Record<EventTypeName, number>)[];
  scansBySource: { source: string; count: number }[];
}

const FUNNEL: { stage: EventTypeName; label: string }[] = [
  { stage: "SCAN", label: "Scanned / visited" },
  { stage: "DRAFTS_VIEWED", label: "Viewed drafts" },
  { stage: "DRAFT_COPIED", label: "Copied a draft" },
  { stage: "GOOGLE_REDIRECT", label: "Went to Google" },
];

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function emptyCounts(): Record<EventTypeName, number> {
  return Object.fromEntries(EVENT_TYPES.map((t) => [t, 0])) as Record<EventTypeName, number>;
}

function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end && out.length < 400) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** `from`/`to` are inclusive YYYY-MM-DD dates in `timezone`. */
export async function getStats(from: string, to: string, timezone: string): Promise<StatsResult> {
  // Coarse UTC window (±1 day covers any timezone offset) lets Postgres use the createdAt index;
  // the exact local-date filter is applied on the converted timestamp.
  const lo = new Date(`${from}T00:00:00Z`);
  lo.setUTCDate(lo.getUTCDate() - 1);
  const hi = new Date(`${to}T00:00:00Z`);
  hi.setUTCDate(hi.getUTCDate() + 2);
  const localDate = Prisma.sql`(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timezone})::date`;
  const where = Prisma.sql`"createdAt" >= ${lo} AND "createdAt" < ${hi}
    AND ${localDate} BETWEEN ${from}::date AND ${to}::date`;

  const [byType, byDay, bySource] = await Promise.all([
    prisma.$queryRaw<{ type: EventTypeName; total: number; sessions: number }[]>`
      SELECT "type"::text AS type, COUNT(*)::int AS total, COUNT(DISTINCT "sessionId")::int AS sessions
      FROM "Event" WHERE ${where} GROUP BY "type"`,
    prisma.$queryRaw<{ day: string; type: EventTypeName; count: number }[]>`
      SELECT to_char(${localDate}, 'YYYY-MM-DD') AS day, "type"::text AS type, COUNT(*)::int AS count
      FROM "Event" WHERE ${where} GROUP BY 1, 2 ORDER BY 1`,
    prisma.$queryRaw<{ source: string | null; count: number }[]>`
      SELECT "source", COUNT(*)::int AS count
      FROM "Event" WHERE ${where} AND "type" = 'SCAN' GROUP BY "source" ORDER BY 2 DESC`,
  ]);

  const totals = emptyCounts();
  const sessions = emptyCounts();
  for (const r of byType) {
    totals[r.type] = Number(r.total);
    sessions[r.type] = Number(r.sessions);
  }

  const dayMap = new Map(eachDay(from, to).map((d) => [d, { day: d, ...emptyCounts() }]));
  for (const r of byDay) {
    const row = dayMap.get(r.day);
    if (row) row[r.type] = Number(r.count);
  }

  return {
    from,
    to,
    timezone,
    totals,
    funnel: FUNNEL.map((f) => ({ ...f, sessions: sessions[f.stage] })),
    daily: [...dayMap.values()],
    scansBySource: bySource.map((r) => ({ source: r.source ?? "unknown", count: Number(r.count) })),
  };
}
