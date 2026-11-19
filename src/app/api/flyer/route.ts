import { z } from "zod";
import { buildFlyer } from "@/lib/flyer";
import { getBusiness } from "@/lib/business";
import { jsonError, zodError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const Query = z.object({ variant: z.enum(["a6", "tent"]).default("a6") });

export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return zodError(parsed.error);

  try {
    const b = await getBusiness();
    const bytes = await buildFlyer(parsed.data.variant, b.name, b.brandColor);
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="review-flyer-${parsed.data.variant}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("flyer: failed", err);
    return jsonError(500, "Could not generate flyer");
  }
}
