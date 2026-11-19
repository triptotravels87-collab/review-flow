import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard · ReviewFlow", robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const business = await getBusiness();
  let newFeedback = 0;
  try {
    newFeedback = await prisma.privateFeedback.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
    });
  } catch {
    /* badge is optional */
  }
  return (
    <AdminShell
      businessName={business.name}
      businessCity={business.city}
      brandColor={business.brandColor}
      newFeedback={newFeedback}
      googleConfigured={Boolean(business.googleReviewUrl)}
    >
      {children}
    </AdminShell>
  );
}
