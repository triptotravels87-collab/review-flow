"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicBusiness } from "@/lib/business";
import { LANGUAGES, MAX_HIGHLIGHTS, type LanguageCode } from "@/lib/constants";
import { copyText, getSessionId, track, trackScanOnce } from "@/lib/client/track";
import PrivateContact from "./PrivateContact";
import { readableTextOn } from "@/lib/color";

type Step = 1 | 2 | 3;

const STAR_LABELS = ["", "Terrible", "Poor", "Okay", "Good", "Excellent"];

export default function ReviewFunnel({
  business,
  genericHighlights,
}: {
  business: PublicBusiness;
  genericHighlights: string[];
}) {
  const [step, setStep] = useState<Step>(1);
  const [rating, setRating] = useState<number>(0);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [drafts, setDrafts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const brandText = readableTextOn(business.brandColor);
  const chips = useMemo(
    () => Array.from(new Set([...business.staff, ...business.services, ...genericHighlights])),
    [business.staff, business.services, genericHighlights],
  );

  useEffect(() => {
    const src = new URLSearchParams(window.location.search).get("src") || "direct";
    getSessionId();
    trackScanOnce(src.slice(0, 20));
  }, []);

  // Move focus to the step heading for screen-reader / keyboard users.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCopied(null);
    try {
      const staffName = highlights.find((h) => business.staff.includes(h));
      const res = await fetch("/api/generate-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          language,
          highlights: highlights.filter((h) => h !== staffName),
          staffName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.drafts)) {
        throw new Error(data.error || "Couldn't generate, try again");
      }
      setDrafts(data.drafts);
      track("DRAFTS_VIEWED", { rating, language });
    } catch (err) {
      setDrafts([]);
      setError(err instanceof Error ? err.message : "Couldn't generate, try again");
    } finally {
      setLoading(false);
    }
  }, [rating, language, highlights, business.staff]);

  function goToDrafts() {
    setStep(3);
    void generate();
  }

  function toggleHighlight(h: string) {
    setHighlights((cur) =>
      cur.includes(h) ? cur.filter((x) => x !== h) : cur.length >= MAX_HIGHLIGHTS ? cur : [...cur, h],
    );
  }

  function goToGoogle() {
    track("GOOGLE_REDIRECT", { rating: rating || undefined, language });
    window.location.href = business.googleReviewUrl;
  }

  async function copyAndContinue(i: number) {
    const text = drafts[i]?.trim();
    if (!text) return;
    const ok = await copyText(text);
    track("DRAFT_COPIED", { rating, language });
    setCopied(i);
    if (!ok) {
      setError("Couldn't copy automatically. Select the text, copy it, then tap “Open Google”.");
      return;
    }
    setTimeout(goToGoogle, 1400);
  }

  const style = { "--brand": business.brandColor } as React.CSSProperties;

  return (
    <div style={style} className="min-h-screen bg-slate-50">
      <header className="px-4 pb-6 pt-8 text-center" style={{ backgroundColor: business.brandColor, color: brandText }}>
        {business.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logoUrl}
            alt=""
            width={64}
            height={64}
            className="mx-auto mb-3 h-16 w-16 rounded-full bg-white object-contain p-1"
          />
        )}
        <p className="text-sm font-medium opacity-90">{business.category}{business.city ? ` · ${business.city}` : ""}</p>
        <h1 className="mt-1 text-2xl font-bold">{business.name}</h1>
      </header>

      <main className="mx-auto max-w-md px-4 pb-10 pt-4">
        <ol className="mb-4 flex justify-center gap-2" aria-label="Progress">
          {[1, 2, 3].map((n) => (
            <li
              key={n}
              aria-current={n === step ? "step" : undefined}
              className={`h-1.5 w-10 rounded-full ${n <= step ? "bg-brand" : "bg-slate-300"}`}
            >
              <span className="sr-only">Step {n} of 3</span>
            </li>
          ))}
        </ol>

        {step === 1 && (
          <section className="card" aria-labelledby="s1">
            <h2 id="s1" ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
              How was your experience?
            </h2>
            <fieldset className="mt-4">
              <legend className="sr-only">Star rating, 1 to 5</legend>
              <div className="flex justify-center gap-1" role="radiogroup">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input
                      type="radio"
                      name="rating"
                      value={n}
                      checked={rating === n}
                      onChange={() => setRating(n)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`block rounded-lg p-1 text-5xl leading-none transition peer-focus-visible:ring-2 peer-focus-visible:ring-slate-900 ${
                        n <= rating ? "text-amber-400" : "text-slate-300"
                      }`}
                    >
                      ★
                    </span>
                    <span className="sr-only">
                      {n} star{n > 1 ? "s" : ""} – {STAR_LABELS[n]}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 h-5 text-center text-sm text-slate-600" aria-live="polite">
                {rating ? STAR_LABELS[rating] : "Tap a star"}
              </p>
            </fieldset>
            <button
              type="button"
              disabled={!rating}
              onClick={() => setStep(2)}
              className="btn-primary mt-5 w-full bg-brand"
              style={{ color: brandText }}
            >
              Next
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="card" aria-labelledby="s2">
            <h2 id="s2" ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
              Anything that stood out? <span className="font-normal text-slate-500">(optional)</span>
            </h2>
            <p className="mt-1 text-sm text-slate-600">Pick up to {MAX_HIGHLIGHTS}.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((h) => {
                const on = highlights.includes(h);
                const disabled = !on && highlights.length >= MAX_HIGHLIGHTS;
                return (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={on}
                    disabled={disabled}
                    onClick={() => toggleHighlight(h)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-40 ${
                      on ? "border-transparent bg-brand" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                    style={on ? { color: brandText } : undefined}
                  >
                    {on ? "✓ " : ""}
                    {h}
                  </button>
                );
              })}
            </div>

            <label htmlFor="language" className="mt-5 block text-sm font-medium text-slate-800">
              Review language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="input mt-1"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                Back
              </button>
              <button type="button" onClick={goToDrafts} className="btn-primary flex-1 bg-brand" style={{ color: brandText }}>
                Write my review
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="s3" aria-busy={loading}>
            <div className="card">
              <h2 id="s3" ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
                Pick a draft and make it yours
              </h2>
              <p className="mt-1 text-sm font-medium text-amber-800">
                Edit this so it reflects your real experience.
              </p>
              <p className="mt-1 text-sm text-slate-600">Paste your review on the next page and tap Post.</p>
            </div>

            {loading && (
              <div className="mt-3 space-y-3" role="status" aria-label="Generating drafts">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="h-3 w-full rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-11/12 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />
                  </div>
                ))}
                <span className="sr-only">Writing drafts…</span>
              </div>
            )}

            {!loading && error && (
              <div role="alert" className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
                {error}
              </div>
            )}

            {!loading && drafts.length > 0 && (
              <ul className="mt-3 space-y-3">
                {drafts.map((d, i) => (
                  <li key={i} className="card">
                    <label htmlFor={`draft-${i}`} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Draft {i + 1}
                    </label>
                    <textarea
                      id={`draft-${i}`}
                      value={d}
                      rows={5}
                      onChange={(e) => setDrafts((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
                      className="input mt-1 resize-y text-[15px] leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={() => copyAndContinue(i)}
                      disabled={!d.trim() || copied !== null}
                      className="btn-primary mt-3 w-full bg-brand"
                      style={{ color: brandText }}
                    >
                      {copied === i ? "Copied! Opening Google…" : "Copy & Continue"}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {copied !== null && (
              <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-center text-sm text-emerald-900 ring-1 ring-emerald-200" aria-live="polite">
                Paste your review on the next page and tap <strong>Post</strong>.{" "}
                <button type="button" onClick={goToGoogle} className="link font-semibold">
                  Open Google
                </button>
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary" disabled={loading}>
                Back
              </button>
              <button type="button" onClick={generate} disabled={loading} className="btn-secondary flex-1">
                {loading ? "Generating…" : "↻ Regenerate"}
              </button>
            </div>
          </section>
        )}

        {/* Shown on every screen, for every rating (Google review policy). */}
        <footer className="mt-8 space-y-2 text-center text-sm text-slate-600">
          {business.googleReviewUrl && (
            <p>
              Prefer to write your own?{" "}
              <a
                href={business.googleReviewUrl}
                onClick={() => track("GOOGLE_REDIRECT", { rating: rating || undefined, language })}
                className="link font-medium text-slate-800"
              >
                Review us on Google
              </a>
            </p>
          )}
          <p>
            <button type="button" onClick={() => setContactOpen(true)} className="link">
              Contact us privately
            </button>
          </p>
        </footer>
      </main>

      <PrivateContact
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        rating={rating || undefined}
        contactInfo={business.contact}
        brandColor={business.brandColor}
      />
    </div>
  );
}
