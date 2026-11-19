"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ExternalLink, LogOut, MessageSquareText, QrCode, Settings } from "lucide-react";
import { readableTextOn } from "@/lib/color";

const NAV = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/feedback", label: "Private feedback", short: "Feedback", icon: MessageSquareText },
  { href: "/admin/share", label: "QR & flyers", short: "QR", icon: QrCode },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export default function AdminShell({
  businessName,
  businessCity,
  brandColor,
  newFeedback,
  googleConfigured,
  children,
}: {
  businessName: string;
  businessCity: string;
  brandColor: string;
  newFeedback: number;
  googleConfigured: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = businessName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-slate-100/70">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
            style={{ backgroundColor: brandColor, color: readableTextOn(brandColor) }}
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{businessName}</p>
            <p className="truncate text-xs text-slate-500">{businessCity || "ReviewFlow"}</p>
          </div>
        </div>
        <nav aria-label="Dashboard" className="flex-1 space-y-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 ${
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="flex-1">{label}</span>
                {href === "/admin/feedback" && newFeedback > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700"}`}
                    aria-label={`${newFeedback} in the last 7 days`}
                  >
                    {newFeedback}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-slate-200 p-3">
          <a
            href="/review"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <ExternalLink className="h-4 w-4" aria-hidden /> View review page
          </a>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Log out
          </button>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
            style={{ backgroundColor: brandColor, color: readableTextOn(brandColor) }}
            aria-hidden
          >
            {initials}
          </div>
          <p className="truncate font-semibold text-slate-900">{businessName}</p>
        </div>
        <button type="button" onClick={logout} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Log out">
          <LogOut className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <main className="pb-24 lg:pb-10 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {!googleConfigured && (
            <div role="alert" className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <strong>GOOGLE_REVIEW_URL is not set.</strong> Customers can’t be sent to Google until you add it.
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Bottom tabs (mobile) */}
      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV.map(({ href, label, icon: Icon, ...rest }) => {
          const active = isActive(href);
          const short = "short" in rest ? rest.short : label;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-slate-900" : "text-slate-500"}`}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {short}
              {href === "/admin/feedback" && newFeedback > 0 && (
                <span className="absolute right-[calc(50%-18px)] top-1.5 h-2 w-2 rounded-full bg-rose-500" aria-hidden />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
