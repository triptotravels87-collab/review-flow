/**
 * Fixed-window rate limiter over a pluggable store.
 * Production uses the Postgres store in rateLimitDb.ts (one atomic upsert per hit).
 */
export interface RateLimitStore {
  /** Atomically increment `key`, starting a new window if the current one expired. */
  hit(key: string, windowMs: number, now: Date): Promise<{ count: number; windowStart: Date }>;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  store: RateLimitStore,
  key: string,
  limit: number,
  windowMs: number,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const { count, windowStart } = await store.hit(key, windowMs, now);
  return {
    allowed: count <= limit,
    count,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(windowStart.getTime() + windowMs),
  };
}

/** In-memory store with the same semantics as the SQL store (used in tests). */
export class MemoryRateLimitStore implements RateLimitStore {
  private rows = new Map<string, { count: number; windowStart: Date }>();
  async hit(key: string, windowMs: number, now: Date) {
    const row = this.rows.get(key);
    if (!row || now.getTime() - row.windowStart.getTime() >= windowMs) {
      const fresh = { count: 1, windowStart: now };
      this.rows.set(key, fresh);
      return { ...fresh };
    }
    row.count += 1;
    return { ...row };
  }
}

/** UTC-day bucket key, used for the global daily AI cap. */
export function dayKey(prefix: string, now: Date = new Date()): string {
  return `${prefix}:${now.toISOString().slice(0, 10)}`;
}

export const TEN_MINUTES = 10 * 60 * 1000;
export const ONE_DAY = 24 * 60 * 60 * 1000;
