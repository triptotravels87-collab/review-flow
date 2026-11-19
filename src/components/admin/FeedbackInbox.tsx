"use client";

import { useMemo, useState } from "react";
import { Inbox, Mail, Phone, Search, Star, UserRound } from "lucide-react";

export interface FeedbackItem {
  id: string;
  name: string | null;
  contact: string | null;
  message: string;
  rating: number | null;
  createdAt: string;
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "low", label: "1–2 ★" },
  { id: "mid", label: "3 ★" },
  { id: "high", label: "4–5 ★" },
  { id: "contact", label: "Wants a reply" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

function matches(f: FeedbackItem, filter: FilterId) {
  switch (filter) {
    case "low":
      return f.rating !== null && f.rating <= 2;
    case "mid":
      return f.rating === 3;
    case "high":
      return f.rating !== null && f.rating >= 4;
    case "contact":
      return Boolean(f.contact);
    default:
      return true;
  }
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function ContactLink({ value }: { value: string }) {
  const isEmail = value.includes("@");
  const digits = value.replace(/[^\d+]/g, "");
  const isPhone = !isEmail && digits.replace(/\D/g, "").length >= 7;
  if (isEmail) {
    return (
      <a href={`mailto:${value}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800 hover:underline">
        <Mail className="h-4 w-4 text-slate-400" aria-hidden /> {value}
      </a>
    );
  }
  if (isPhone) {
    return (
      <a href={`tel:${digits}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800 hover:underline">
        <Phone className="h-4 w-4 text-slate-400" aria-hidden /> {value}
      </a>
    );
  }
  return <span className="text-sm text-slate-800">{value}</span>;
}

export default function FeedbackInbox({ items, error }: { items: FeedbackItem[]; error: boolean }) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [q, setQ] = useState("");

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, items.filter((i) => matches(i, f.id)).length])) as Record<FilterId, number>,
    [items],
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        matches(i, filter) &&
        (!needle || [i.message, i.name ?? "", i.contact ?? ""].some((s) => s.toLowerCase().includes(needle))),
    );
  }, [items, filter, q]);

  if (error) {
    return (
      <div role="alert" className="card text-sm text-red-700">
        Couldn’t load feedback. Check the database connection and refresh.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center py-14 text-center">
        <Inbox className="h-10 w-10 text-slate-300" aria-hidden />
        <p className="mt-3 font-medium text-slate-800">No private messages yet</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          When a customer taps “Contact us privately” on the review page, their message shows up here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                filter === f.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
              <span className={filter === f.id ? "ml-1.5 text-white/70" : "ml-1.5 text-slate-400"}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <label htmlFor="fb-search" className="sr-only">Search feedback</label>
          <input
            id="fb-search"
            type="search"
            placeholder="Search messages, names…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input py-2 pl-9 text-sm"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="card text-center text-sm text-slate-600">No messages match this filter.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((f) => {
            const low = f.rating !== null && f.rating <= 2;
            return (
              <li key={f.id} className={`card border-l-4 ${low ? "border-l-rose-500" : f.rating === 3 ? "border-l-amber-400" : "border-l-slate-200"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-hidden>
                      <UserRound className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{f.name || "Anonymous"}</p>
                      {f.rating !== null && (
                        <p className="flex items-center gap-0.5" aria-label={`Rated ${f.rating} out of 5`}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`h-3.5 w-3.5 ${n <= f.rating! ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                              aria-hidden
                            />
                          ))}
                          {low && <span className="ml-2 rounded bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-rose-700">Needs attention</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  <time dateTime={f.createdAt} title={new Date(f.createdAt).toLocaleString("en-IN")} className="text-xs text-slate-500">
                    {relativeTime(f.createdAt)}
                  </time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{f.message}</p>
                {f.contact && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <ContactLink value={f.contact} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {items.length >= 500 && <p className="mt-4 text-center text-xs text-slate-500">Showing the latest 500 messages.</p>}
    </div>
  );
}
