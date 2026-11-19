import { describe, expect, it } from "vitest";
import { checkRateLimit, dayKey, MemoryRateLimitStore, TEN_MINUTES } from "@/lib/rateLimit";

describe("checkRateLimit", () => {
  it("allows up to the limit, then blocks", async () => {
    const store = new MemoryRateLimitStore();
    const now = new Date("2026-01-01T10:00:00Z");
    for (let i = 1; i <= 10; i++) {
      const r = await checkRateLimit(store, "ip:a", 10, TEN_MINUTES, now);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(10 - i);
    }
    const blocked = await checkRateLimit(store, "ip:a", 10, TEN_MINUTES, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetAt.toISOString()).toBe("2026-01-01T10:10:00.000Z");
  });

  it("keys are independent", async () => {
    const store = new MemoryRateLimitStore();
    const now = new Date();
    for (let i = 0; i < 3; i++) await checkRateLimit(store, "ip:a", 2, TEN_MINUTES, now);
    expect((await checkRateLimit(store, "ip:a", 2, TEN_MINUTES, now)).allowed).toBe(false);
    expect((await checkRateLimit(store, "ip:b", 2, TEN_MINUTES, now)).allowed).toBe(true);
  });

  it("resets after the window expires", async () => {
    const store = new MemoryRateLimitStore();
    const t0 = new Date("2026-01-01T10:00:00Z");
    for (let i = 0; i < 3; i++) await checkRateLimit(store, "k", 2, TEN_MINUTES, t0);
    const stillBlocked = await checkRateLimit(store, "k", 2, TEN_MINUTES, new Date(t0.getTime() + TEN_MINUTES - 1));
    expect(stillBlocked.allowed).toBe(false);
    const fresh = await checkRateLimit(store, "k", 2, TEN_MINUTES, new Date(t0.getTime() + TEN_MINUTES));
    expect(fresh.allowed).toBe(true);
    expect(fresh.count).toBe(1);
  });

  it("dayKey buckets by UTC day", () => {
    expect(dayKey("ai", new Date("2026-03-05T23:59:59Z"))).toBe("ai:2026-03-05");
    expect(dayKey("ai", new Date("2026-03-06T00:00:00Z"))).toBe("ai:2026-03-06");
  });
});
