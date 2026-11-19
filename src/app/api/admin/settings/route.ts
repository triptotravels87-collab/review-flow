import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { envBusiness, HEX_COLOR } from "@/lib/env";
import { jsonError, readJson, zodError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const csv = z
  .string()
  .max(500)
  .transform((s) =>
    s
      .split(",")
      .map((x) => x.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 20)
      .join(", "),
  );

const Body = z.object({
  keywords: csv,
  staffNames: csv,
  services: csv,
  brandColor: z.union([z.literal(""), z.string().regex(HEX_COLOR, "Use a hex color like #0f766e")]),
});

export async function GET() {
  const env = envBusiness();
  const s = await prisma.settings.findUnique({ where: { id: 1 } }).catch(() => null);
  return NextResponse.json({
    settings: {
      keywords: s?.keywords ?? "",
      staffNames: s?.staffNames ?? "",
      services: s?.services ?? "",
      brandColor: s?.brandColor ?? "",
    },
    defaults: {
      keywords: env.keywords.join(", "),
      staffNames: env.staff.join(", "),
      services: env.services.join(", "),
      brandColor: env.brandColor,
    },
  });
}

export async function PUT(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  // Empty string => fall back to the env var default.
  const data = Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, v || null])) as {
    keywords: string | null;
    staffNames: string | null;
    services: string | null;
    brandColor: string | null;
  };
  try {
    await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    revalidatePath("/review");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("settings: save failed", err);
    return jsonError(500, "Could not save settings");
  }
}
