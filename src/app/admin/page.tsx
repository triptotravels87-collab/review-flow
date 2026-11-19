import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { reviewUrl } from "@/lib/qr";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard · ReviewFlow", robots: { index: false } };

export default async function AdminPage() {
  const business = await getBusiness();
  let feedback: { id: string; name: string | null; contact: string | null; message: string; rating: number | null; createdAt: string }[] = [];
  let feedbackError = false;
  try {
    const rows = await prisma.privateFeedback.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    feedback = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  } catch (err) {
    console.error("admin: failed to load feedback", err);
    feedbackError = true;
  }

  return (
    <Dashboard
      businessName={business.name}
      reviewUrl={reviewUrl()}
      googleReviewUrl={business.googleReviewUrl}
      feedback={feedback}
      feedbackError={feedbackError}
    />
  );
}
