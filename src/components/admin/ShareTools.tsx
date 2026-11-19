"use client";

import { useState } from "react";
import { Check, Copy, Download, FileText, Lightbulb, RectangleHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function ShareTools({ reviewUrl }: { reviewUrl: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="card lg:col-span-2" aria-labelledby="qr-h">
        <h2 id="qr-h" className="text-base font-semibold text-slate-900">Your QR code</h2>
        <div className="mt-4 flex justify-center rounded-xl bg-slate-50 p-6">
          <div className="relative h-56 w-56 rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200">
            {!loaded && !failed && <div className="absolute inset-2 animate-pulse rounded bg-slate-200" aria-hidden />}
            {failed ? (
              <p role="alert" className="p-4 text-sm text-red-700">Couldn’t load QR code.</p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/api/qr?format=svg"
                alt="QR code linking to the review page"
                width={208}
                height={208}
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
                className="h-full w-full"
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
          <span className="min-w-0 flex-1 truncate px-1 text-sm text-slate-700" title={reviewUrl}>{reviewUrl}</span>
          <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href="/api/qr?format=png&download=1" className="btn-secondary py-2 text-sm">
            <Download className="h-4 w-4" aria-hidden /> PNG
          </a>
          <a href="/api/qr?format=svg&download=1" className="btn-secondary py-2 text-sm">
            <Download className="h-4 w-4" aria-hidden /> SVG
          </a>
        </div>
        <p className="mt-2 text-xs text-slate-500">PNG for WhatsApp and social posts; SVG for print shops (stays sharp at any size).</p>
      </section>

      <div className="space-y-6 lg:col-span-3">
        <section className="card" aria-labelledby="fl-h">
          <h2 id="fl-h" className="text-base font-semibold text-slate-900">Printable flyers</h2>
          <p className="mt-1 text-sm text-slate-600">Ready-to-print PDFs in your brand color with your name and QR code.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FlyerCard
              href="/api/flyer?variant=a6"
              icon={FileText}
              title="A6 card"
              detail="105 × 148 mm"
              use="Counter, billing desk, takeaway bags"
            />
            <FlyerCard
              href="/api/flyer?variant=tent"
              icon={RectangleHorizontal}
              title="Table tent"
              detail="A4, fold on the dashed line"
              use="Dining tables — readable from both sides"
            />
          </div>
        </section>

        <section className="card" aria-labelledby="tips-h">
          <h2 id="tips-h" className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden /> Tips for more reviews
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            <li>Put the table tent on every table and a card next to the billing counter.</li>
            <li>Ask in person when handing over the bill: “It would really help us if you scan this.”</li>
            <li>Share the link on WhatsApp with regular customers after their order.</li>
            <li>Don’t offer discounts or freebies for reviews; it’s against Google’s rules.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function FlyerCard({
  href,
  icon: Icon,
  title,
  detail,
  use,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  use: string;
}) {
  return (
    <div className="flex flex-col rounded-xl p-4 ring-1 ring-slate-200">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-600">{detail}</p>
      <p className="mt-1 flex-1 text-xs text-slate-500">{use}</p>
      <a href={href} className="btn-primary mt-4 bg-slate-900 py-2 text-sm">
        <Download className="h-4 w-4" aria-hidden /> Download PDF
      </a>
    </div>
  );
}
