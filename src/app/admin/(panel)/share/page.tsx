import { reviewUrl } from "@/lib/qr";
import PageHeader from "@/components/admin/PageHeader";
import ShareTools from "@/components/admin/ShareTools";

export default function SharePage() {
  return (
    <>
      <PageHeader title="QR & flyers" description="Print these and place them where customers can scan after their visit." />
      <ShareTools reviewUrl={reviewUrl()} />
    </>
  );
}
