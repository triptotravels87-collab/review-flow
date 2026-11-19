import type { Metadata } from "next";
import { getBusiness, publicBusiness } from "@/lib/business";
import { GENERIC_HIGHLIGHTS } from "@/lib/constants";
import ReviewFunnel from "@/components/ReviewFunnel";

// Business settings can change from the admin; revalidate the page every minute.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBusiness();
  return { title: `Review ${b.name}`, description: `Share your experience at ${b.name}` };
}

export default async function ReviewPage() {
  const business = publicBusiness(await getBusiness());
  return <ReviewFunnel business={business} genericHighlights={GENERIC_HIGHLIGHTS} />;
}
