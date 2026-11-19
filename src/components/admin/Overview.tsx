"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { ArrowRight, Eye, MessageSquareText, MousePointerClick, Percent, ScanLine, Table2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StatsResult } from "@/lib/analytics";
import type { EventTypeName } from "@/lib/constants";
import PageHeader from "./PageHeader";

// Chart palette (validated reference slot 1 + recessive ink). One series at a time => no legend needed.
const SERIES_COLOR = "#2a78d6";
const GRID = "#e5e7eb";
const AXIS_TEXT = "#64748b";

const METRICS: { key: EventTypeName; label: string; noun: string }[] = [
  { key: "SCAN", label: "Visits", noun: "visits" },
  { key: "DRAFTS_VIEWED", label: "Drafts viewed", noun: "draft views" },
  { key: "DRAFT_COPIED", label: "Copied", noun: "copies" },
  { key: "GOOGLE_REDIRECT", label: "Sent to Google", noun: "sent to Google" },
  { key: "PRIVATE_CONTACT", label: "Private", noun: "private messages" },
];

const PRESETS = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "custom", label: "Custom", days: 0 },
] as const;
type PresetId = (typeof PRESETS)[number]["id"];

function localIso(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function rangeFor(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { from: localIso(from), to: localIso(to) };
}
const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", opts);
const fmtNum = (n: number) => n.toLocaleString("en-IN");
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export default function Overview() {
  const [preset, setPreset] = useState<PresetId>("30");
  const [range, setRange] = useState(() => rangeFor(30));
  const [data, setData] = useState<StatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<EventTypeName>("SCAN");
  const [showTable, setShowTable] = useState(false);

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stats?from=${from}&to=${to}`);
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
    void load(range.from, range.to);
  }, [load, range]);

  function choosePreset(id: PresetId) {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id)!;
    if (p.days) setRange(rangeFor(p.days));
  }

  const funnel = data?.funnel ?? [];
  const visitors = funnel[0]?.sessions ?? 0;
  const toGoogle = funnel.find((f) => f.stage === "GOOGLE_REDIRECT")?.sessions ?? 0;
  const metricInfo = METRICS.find((m) => m.key === metric)!;

  const chart = useMemo(() => {
    const rows = (data?.daily ?? []).map((d) => ({ day: d.day, value: d[metric] }));
    const total = rows.reduce((s, r) => s + r.value, 0);
    const best = rows.reduce<{ day: string; value: number } | null>((b, r) => (!b || r.value > b.value ? r : b), null);
    return { rows, total, best };
  }, [data, metric]);

  return (
    <>
      <PageHeader title="Overview" description="How customers move from scanning your QR code to posting on Google.">
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Date range" className="inline-flex rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset === p.id}
                onClick={() => choosePreset(p.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 ${
                  preset === p.id ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setRange({ from: String(f.get("from")), to: String(f.get("to")) });
              }}
            >
              <label className="sr-only" htmlFor="from">From</label>
              <input id="from" name="from" type="date" defaultValue={range.from} className="input w-auto py-1.5 text-sm" />
              <span className="text-slate-400" aria-hidden>–</span>
              <label className="sr-only" htmlFor="to">To</label>
              <input id="to" name="to" type="date" defaultValue={range.to} className="input w-auto py-1.5 text-sm" />
              <button type="submit" className="btn-secondary px-3 py-1.5 text-sm">Apply</button>
            </form>
          )}
        </div>
      </PageHeader>

      {error && (
        <div role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {error}{" "}
          <button type="button" className="link font-medium" onClick={() => load(range.from, range.to)}>
            Try again
          </button>
        </div>
      )}

      {/* Headline numbers */}
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi icon={ScanLine} label="Visits" value={data?.totals.SCAN} hint="QR scans + direct visits" loading={loading && !data} />
        <Kpi icon={MousePointerClick} label="Sent to Google" value={data?.totals.GOOGLE_REDIRECT} hint="Opened the Google review page" loading={loading && !data} />
        <Kpi
          icon={Percent}
          label="Conversion"
          value={data ? `${pct(toGoogle, visitors)}%` : undefined}
          hint={data ? `${fmtNum(toGoogle)} of ${fmtNum(visitors)} visitors` : "Visitors who went to Google"}
          loading={loading && !data}
        />
        <Kpi icon={MessageSquareText} label="Private messages" value={data?.totals.PRIVATE_CONTACT} hint="Sent to you, not Google" loading={loading && !data} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        {/* Daily chart */}
        <section className="card xl:col-span-3" aria-labelledby="daily-h" aria-busy={loading}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="daily-h" className="text-base font-semibold text-slate-900">Daily {metricInfo.noun}</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {data ? (
                  <>
                    <span className="font-semibold text-slate-900">{fmtNum(chart.total)}</span> total
                    {chart.best && chart.best.value > 0 && (
                      <> · best day {fmtDay(chart.best.day, { day: "numeric", month: "short" })} ({fmtNum(chart.best.value)})</>
                    )}
                  </>
                ) : (
                  "Loading…"
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTable((s) => !s)}
              aria-pressed={showTable}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <Table2 className="h-4 w-4" aria-hidden /> {showTable ? "Show chart" : "Show table"}
            </button>
          </div>

          <div role="group" aria-label="Metric" className="mt-4 flex flex-wrap gap-1.5">
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={metric === m.key}
                onClick={() => setMetric(m.key)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                  metric === m.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {m.label}
                {data && <span className={metric === m.key ? "ml-1.5 text-white/70" : "ml-1.5 text-slate-500"}>{fmtNum(data.totals[m.key])}</span>}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {!data ? (
              <div className="h-72 animate-pulse rounded-xl bg-slate-100" aria-hidden />
            ) : chart.total === 0 ? (
              <EmptyChart />
            ) : showTable ? (
              <div className="max-h-72 overflow-auto rounded-lg ring-1 ring-slate-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 text-right font-medium">{metricInfo.label}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...chart.rows].reverse().map((r) => (
                      <tr key={r.day}>
                        <td className="px-3 py-1.5 text-slate-700">{fmtDay(r.day, { weekday: "short", day: "numeric", month: "short" })}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-slate-900">{fmtNum(r.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart.rows} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap={chart.rows.length > 45 ? 1 : "20%"}>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(d: string) => fmtDay(d, { day: "numeric", month: "short" })}
                      tick={{ fontSize: 12, fill: AXIS_TEXT }}
                      tickLine={false}
                      axisLine={{ stroke: GRID }}
                      minTickGap={24}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_TEXT }} tickLine={false} axisLine={false} width={44} />
                    <Tooltip cursor={{ fill: "rgba(15,23,42,0.05)" }} content={<ChartTooltip noun={metricInfo.noun} />} />
                    <Bar dataKey="value" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* Funnel */}
        <section className="card xl:col-span-2" aria-labelledby="funnel-h">
          <h2 id="funnel-h" className="text-base font-semibold text-slate-900">Review funnel</h2>
          <p className="mt-0.5 text-sm text-slate-600">Unique visitors reaching each step</p>
          {!data ? (
            <div className="mt-4 space-y-4" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : visitors === 0 ? (
            <p className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-600">No visitors in this period yet.</p>
          ) : (
            <ol className="mt-5 space-y-4">
              {funnel.map((f, i) => {
                const ofAll = pct(f.sessions, visitors);
                const prev = i > 0 ? funnel[i - 1]!.sessions : 0;
                return (
                  <li key={f.stage}>
                    {i > 0 && (
                      <p className="-mt-1 mb-1.5 flex items-center gap-1 text-xs text-slate-500">
                        <ArrowRight className="h-3 w-3" aria-hidden />
                        {pct(f.sessions, prev)}% continued
                      </p>
                    )}
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-800">{f.label}</span>
                      <span className="tabular-nums text-slate-900">
                        <span className="font-semibold">{fmtNum(f.sessions)}</span>
                        <span className="ml-1.5 text-slate-500">{ofAll}%</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                      <div className="h-3 rounded-full" style={{ width: `${Math.max(ofAll, f.sessions ? 2 : 0)}%`, backgroundColor: SERIES_COLOR }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {data && data.scansBySource.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Where visits came from</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {data.scansBySource.map((s) => (
                  <li key={s.source} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-700">
                      {s.source === "qr" ? <ScanLine className="h-4 w-4 text-slate-400" aria-hidden /> : <Eye className="h-4 w-4 text-slate-400" aria-hidden />}
                      {s.source === "qr" ? "QR code" : s.source === "direct" ? "Direct link" : s.source}
                    </span>
                    <span className="tabular-nums font-medium text-slate-900">{fmtNum(s.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
      {data && <p className="mt-4 text-xs text-slate-500">Dates in {data.timezone}.</p>}
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string | undefined;
  hint: string;
  loading: boolean;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className="rounded-lg bg-slate-100 p-1.5 text-slate-600">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-200" aria-hidden />
      ) : (
        <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
          {typeof value === "number" ? fmtNum(value) : value ?? "–"}
        </p>
      )}
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function ChartTooltip({ active, payload, label, noun }: TooltipProps<number, string> & { noun: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white shadow-lg">
      <p className="text-xs text-slate-300">{fmtDay(String(label), { weekday: "short", day: "numeric", month: "short" })}</p>
      <p className="font-semibold tabular-nums">
        {fmtNum(Number(payload[0]!.value))} {noun}
      </p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-72 flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
      <ScanLine className="h-8 w-8 text-slate-300" aria-hidden />
      <p className="mt-2 text-sm font-medium text-slate-700">Nothing in this period yet</p>
      <p className="mt-1 text-sm text-slate-500">Print your QR code from “QR & flyers” to get started.</p>
    </div>
  );
}
