"use client";

import { useCallback, useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsResult } from "@/lib/analytics";

const SERIES = [
  { key: "SCAN", label: "Scans", color: "#2563eb" },
  { key: "DRAFTS_VIEWED", label: "Drafts viewed", color: "#7c3aed" },
  { key: "DRAFT_COPIED", label: "Copied", color: "#d97706" },
  { key: "GOOGLE_REDIRECT", label: "To Google", color: "#059669" },
  { key: "PRIVATE_CONTACT", label: "Private contact", color: "#64748b" },
] as const;

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Analytics() {
  const today = new Date();
  const [to, setTo] = useState(iso(today));
  const [from, setFrom] = useState(iso(new Date(today.getTime() - 29 * 86_400_000)));
  const [data, setData] = useState<StatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stats?from=${f}&to=${t}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.issues?.[0]?.message || json.error || "Could not load analytics");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const top = data?.funnel[0]?.sessions || 0;
  const hasData = data && Object.values(data.totals).some((n) => n > 0);

  return (
    <section className="card" aria-labelledby="an-h" aria-busy={loading}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="an-h" className="text-base font-semibold">Analytics</h2>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void load(from, to);
          }}
        >
          <div>
            <label htmlFor="an-from" className="block text-xs font-medium text-slate-600">From</label>
            <input id="an-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="input py-1.5 text-sm" />
          </div>
          <div>
            <label htmlFor="an-to" className="block text-xs font-medium text-slate-600">To</label>
            <input id="an-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="input py-1.5 text-sm" />
          </div>
          <button type="submit" className="btn-secondary py-1.5 text-sm" disabled={loading}>
            {loading ? "Loading…" : "Apply"}
          </button>
        </form>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {loading && !data && <div className="mt-4 h-64 animate-pulse rounded-xl bg-slate-100" aria-hidden />}

      {data && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SERIES.map((s) => (
              <div key={s.key} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <dt className="text-xs font-medium text-slate-600">{s.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{data.totals[s.key]}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-6 text-sm font-semibold text-slate-800">Funnel (unique sessions)</h3>
          <ol className="mt-2 space-y-2">
            {data.funnel.map((f) => {
              const pct = top ? Math.round((f.sessions / top) * 100) : 0;
              return (
                <li key={f.stage}>
                  <div className="flex justify-between text-sm">
                    <span>{f.label}</span>
                    <span className="tabular-nums text-slate-700">
                      {f.sessions} <span className="text-slate-500">({pct}%)</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 rounded-full bg-slate-100" aria-hidden>
                    <div className="h-2.5 rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>

          <h3 className="mt-6 text-sm font-semibold text-slate-800">Daily activity</h3>
          {hasData ? (
            <div className="mt-2 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} fontSize={12} minTickGap={16} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {SERIES.map((s) => (
                    <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-2 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-600">
              No activity in this date range yet. Print the QR code to get started.
            </p>
          )}

          {data.scansBySource.length > 0 && (
            <p className="mt-4 text-sm text-slate-600">
              Visits by source:{" "}
              {data.scansBySource.map((s, i) => (
                <span key={s.source}>
                  {i > 0 && ", "}
                  <strong className="text-slate-800">{s.source}</strong> {s.count}
                </span>
              ))}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">Dates in {data.timezone}.</p>
        </>
      )}
    </section>
  );
}
