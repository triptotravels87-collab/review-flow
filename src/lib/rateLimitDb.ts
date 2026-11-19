import { prisma } from "./prisma";
import { checkRateLimit, MemoryRateLimitStore, type RateLimitStore } from "./rateLimit";

/** Postgres store: a single atomic INSERT ... ON CONFLICT per hit (safe under concurrency). */
export const prismaRateLimitStore: RateLimitStore = {
  async hit(key, windowMs, now) {
    const cutoff = new Date(now.getTime() - windowMs);
    const rows = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "windowStart")
      VALUES (${key}, 1, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."windowStart" <= ${cutoff} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimit"."windowStart" <= ${cutoff} THEN ${now} ELSE "RateLimit"."windowStart" END
      RETURNING "count", "windowStart"`;
    const row = rows[0]!;
    return { count: Number(row.count), windowStart: new Date(row.windowStart) };
  },
};

// Dev-only fallback so the funnel can be tried before a database is configured.
const devMemoryStore = new MemoryRateLimitStore();
let warnedFallback = false;

export async function rateLimit(key: string, limit: number, windowMs: number) {
  try {
    return await checkRateLimit(prismaRateLimitStore, key, limit, windowMs);
  } catch (err) {
    // In production, fail closed: callers turn this into an error response.
    if (process.env.NODE_ENV === "production") throw err;
    if (!warnedFallback) {
      warnedFallback = true;
      console.warn(
        "rateLimit: database unreachable — using an in-memory limiter (development only). " +
          "Set DATABASE_URL in .env and run `npx prisma migrate deploy`.",
      );
    }
    return checkRateLimit(devMemoryStore, key, limit, windowMs);
  }
}
