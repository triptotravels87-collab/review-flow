import { createHash } from "node:crypto";

/** Client IP from Vercel/proxy headers. Never stored raw — only hashed. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || process.env.SESSION_SECRET || "reviewflow";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function ipKey(headers: Headers): string {
  return hashIp(clientIp(headers));
}
