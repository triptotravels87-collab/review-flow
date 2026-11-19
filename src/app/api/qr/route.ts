import { z } from "zod";
import { qrPng, qrSvg } from "@/lib/qr";
import { zodError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({
  format: z.enum(["png", "svg"]).default("png"),
  download: z.enum(["0", "1"]).default("0"),
});

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = Query.safeParse(params);
  if (!parsed.success) return zodError(parsed.error);
  const { format, download } = parsed.data;

  const disposition = download === "1" ? `attachment; filename="review-qr.${format}"` : "inline";
  const headers = { "Content-Disposition": disposition, "Cache-Control": "private, max-age=300" };

  if (format === "svg") {
    return new Response(await qrSvg(), { headers: { ...headers, "Content-Type": "image/svg+xml" } });
  }
  return new Response(new Uint8Array(await qrPng()), { headers: { ...headers, "Content-Type": "image/png" } });
}
