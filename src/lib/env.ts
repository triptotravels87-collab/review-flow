import { z } from "zod";

export const splitList = (v: string | undefined | null) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
  DAILY_AI_LIMIT: z.coerce.number().int().positive().default(300),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  ANALYTICS_TIMEZONE: z.string().default("UTC"),
});

export type ServerEnv = z.infer<typeof serverSchema>;
let cached: ServerEnv | null = null;

/** Validated server env. Parsed lazily so `next build` works without secrets. */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse({
    ...process.env,
    GEMINI_MODEL: process.env.GEMINI_MODEL || undefined,
    DAILY_AI_LIMIT: process.env.DAILY_AI_LIMIT || undefined,
    ANALYTICS_TIMEZONE: process.env.ANALYTICS_TIMEZONE || undefined,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid server environment: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Business details from env vars (defaults; the Settings row may override some). */
export function envBusiness() {
  const color = process.env.BRAND_COLOR ?? "";
  return {
    name: process.env.BUSINESS_NAME || "Our Business",
    category: process.env.BUSINESS_CATEGORY || "local business",
    city: process.env.BUSINESS_CITY || "",
    googleReviewUrl: process.env.GOOGLE_REVIEW_URL || "",
    keywords: splitList(process.env.BUSINESS_KEYWORDS),
    staff: splitList(process.env.BUSINESS_STAFF),
    services: splitList(process.env.BUSINESS_SERVICES),
    brandColor: HEX_COLOR.test(color) ? color : "#0f766e",
    contact: process.env.CONTACT_EMAIL_OR_PHONE || "",
    logoUrl: process.env.BUSINESS_LOGO_URL || "",
  };
}
