import { prisma } from "@/lib/prisma";
import FeedbackInbox, { type FeedbackItem } from "@/components/admin/FeedbackInbox";
import PageHeader from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  let items: FeedbackItem[] = [];
  let error = false;
  try {
    const rows = await prisma.privateFeedback.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
    items = rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  } catch (err) {
    console.error("admin/feedback: failed to load", err);
    error = true;
  }

  return (
    <>
      <PageHeader
        title="Private feedback"
        description="Messages customers sent only to you. These are never posted to Google."
      />
      <FeedbackInbox items={items} error={error} />
    </>
  );
}
