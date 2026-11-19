"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Analytics from "./Analytics";

interface Feedback {
  id: string;
  name: string | null;
  contact: string | null;
  message: string;
  rating: number | null;
  createdAt: string;
}

export default function Dashboard({
  businessName,
  reviewUrl,
  googleReviewUrl,
  feedback,
  feedbackError,
}: {
  businessName: string;
  reviewUrl: string;
  googleReviewUrl: string;
  feedback: Feedback[];
  feedbackError: boolean;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ReviewFlow</p>
            <h1 className="text-lg font-semibold text-slate-900">{businessName}</h1>
          </div>
          <button type="button" onClick={logout} className="btn-secondary px-3 py-2 text-sm">
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {!googleReviewUrl && (
          <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            <strong>GOOGLE_REVIEW_URL is not set.</strong> Customers can’t be sent to Google until you add it to your
            environment variables.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <QrSection reviewUrl={reviewUrl} />
          <FlyerSection />
        </div>

        <Analytics />

        <FeedbackInbox feedback={feedback} error={feedbackError} />

        <SettingsForm />
      </main>
    </div>
  );
}

function QrSection({ reviewUrl }: { reviewUrl: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <section className="card" aria-labelledby="qr-h">
      <h2 id="qr-h" className="text-base font-semibold">QR code</h2>
      <p className="mt-1 break-all text-sm text-slate-600">
        Points to{" "}
        <a href={reviewUrl} target="_blank" rel="noreferrer" className="link">
          {reviewUrl}
        </a>
      </p>
      <div className="mt-4 flex justify-center">
        <div className="relative h-48 w-48">
          {!loaded && !failed && <div className="absolute inset-0 animate-pulse rounded-lg bg-slate-200" aria-hidden />}
          {failed ? (
            <p role="alert" className="text-sm text-red-700">Couldn’t load QR code.</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/api/qr?format=svg"
              alt="QR code linking to the review page"
              width={192}
              height={192}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className="h-48 w-48"
            />
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <a href="/api/qr?format=png&download=1" className="btn-secondary flex-1 py-2 text-sm">Download PNG</a>
        <a href="/api/qr?format=svg&download=1" className="btn-secondary flex-1 py-2 text-sm">Download SVG</a>
      </div>
    </section>
  );
}

function FlyerSection() {
  return (
    <section className="card" aria-labelledby="fl-h">
      <h2 id="fl-h" className="text-base font-semibold">Printable flyers</h2>
      <p className="mt-1 text-sm text-slate-600">
        Brand-colored PDFs with your name, the QR code and “Scan to share your experience”.
      </p>
      <ul className="mt-4 space-y-3">
        <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
          <div>
            <p className="font-medium">A6 flyer</p>
            <p className="text-sm text-slate-600">105 × 148 mm — counters, bills, bags</p>
          </div>
          <a href="/api/flyer?variant=a6" className="btn-secondary px-3 py-2 text-sm">Download</a>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
          <div>
            <p className="font-medium">Table tent</p>
            <p className="text-sm text-slate-600">A4, fold along the dashed line — two-sided</p>
          </div>
          <a href="/api/flyer?variant=tent" className="btn-secondary px-3 py-2 text-sm">Download</a>
        </li>
      </ul>
    </section>
  );
}

function FeedbackInbox({ feedback, error }: { feedback: Feedback[]; error: boolean }) {
  return (
    <section className="card" aria-labelledby="fb-h">
      <h2 id="fb-h" className="text-base font-semibold">
        Private feedback <span className="font-normal text-slate-500">({feedback.length})</span>
      </h2>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">Couldn’t load feedback. Check the database connection.</p>
      ) : feedback.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No private messages yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200">
          {feedback.map((f) => (
            <li key={f.id} className="py-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-slate-900">{f.name || "Anonymous"}</span>
                {f.contact && <span className="text-slate-700">{f.contact}</span>}
                {f.rating && <span className="text-amber-600" aria-label={`${f.rating} stars`}>{"★".repeat(f.rating)}</span>}
                <time dateTime={f.createdAt} className="ml-auto text-xs text-slate-500">
                  {new Date(f.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{f.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type SettingsValues = { keywords: string; staffNames: string; services: string; brandColor: string };

function SettingsForm() {
  const [values, setValues] = useState<SettingsValues | null>(null);
  const [defaults, setDefaults] = useState<SettingsValues | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((d) => {
        setValues(d.settings);
        setDefaults(d.defaults);
        setStatus("idle");
      })
      .catch(() => {
        setStatus("error");
        setError("Couldn’t load settings.");
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!values) return;
    setStatus("saving");
    setError("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setStatus("saved");
    else {
      setStatus("error");
      setError(data.issues?.[0]?.message || data.error || "Couldn’t save.");
    }
  }

  const fields: { key: keyof SettingsValues; label: string; hint: string }[] = [
    { key: "keywords", label: "SEO keywords", hint: "Comma-separated. The AI uses at most 1–2 per draft." },
    { key: "staffNames", label: "Staff names", hint: "Comma-separated. Shown as highlight chips." },
    { key: "services", label: "Services / products", hint: "Comma-separated. Shown as highlight chips." },
    { key: "brandColor", label: "Brand color", hint: "Hex, e.g. #0f766e" },
  ];

  return (
    <section className="card" aria-labelledby="st-h">
      <h2 id="st-h" className="text-base font-semibold">Business settings</h2>
      <p className="mt-1 text-sm text-slate-600">Leave a field empty to use the environment variable default.</p>
      {status === "loading" && <p className="mt-3 text-sm text-slate-500" role="status">Loading…</p>}
      {values && defaults && (
        <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key}>
              <label htmlFor={`set-${f.key}`} className="block text-sm font-medium">{f.label}</label>
              <input
                id={`set-${f.key}`}
                className="input mt-1"
                value={values[f.key]}
                placeholder={defaults[f.key] || "(not set)"}
                onChange={(e) => {
                  setValues({ ...values, [f.key]: e.target.value });
                  setStatus("idle");
                }}
              />
              <p className="mt-1 text-xs text-slate-500">{f.hint}</p>
            </div>
          ))}
          <div className="flex items-center gap-3 md:col-span-2">
            <button type="submit" disabled={status === "saving"} className="btn-primary bg-slate-900 py-2 text-sm">
              {status === "saving" ? "Saving…" : "Save settings"}
            </button>
            {status === "saved" && <span role="status" className="text-sm text-emerald-700">Saved.</span>}
          </div>
        </form>
      )}
      {status === "error" && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
