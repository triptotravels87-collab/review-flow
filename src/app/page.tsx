import { redirect } from "next/navigation";

export default function Home({ searchParams }: { searchParams: { src?: string } }) {
  const src = typeof searchParams.src === "string" ? searchParams.src.slice(0, 20) : "";
  redirect(src ? `/review?src=${encodeURIComponent(src)}` : "/review");
}
