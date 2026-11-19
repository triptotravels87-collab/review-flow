"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Palette, Sparkles, Tags, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Values = { keywords: string; staffNames: string; services: string; brandColor: string };

const HEX = /^#[0-9a-fA-F]{6}$/;

export default function SettingsForm() {
  const router = useRouter();
  const [values, setValues] = useState<Values | null>(null);
  const [defaults, setDefaults] = useState<Values | null>(null);
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
        setError("Couldn’t load settings. Check the database connection and refresh.");
      });
  }, []);

  function update(k: keyof Values, v: string) {
    setValues((cur) => (cur ? { ...cur, [k]: v } : cur));
    setStatus("idle");
  }

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
    if (res.ok) {
      setStatus("saved");
      router.refresh();
    } else {
      setStatus("error");
      setError(data.issues?.[0]?.message || data.error || "Couldn’t save.");
    }
  }

  if (status === "loading" || !values || !defaults) {
    return status === "error" ? (
      <p role="alert" className="card text-sm text-red-700">{error}</p>
    ) : (
      <div className="space-y-4" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  const effectiveColor = HEX.test(values.brandColor) ? values.brandColor : defaults.brandColor;

  return (
    <form onSubmit={save} className="space-y-6">
      <Section icon={Tags} title="Menu & services" description="Shown as chips customers can tap, e.g. your popular dishes. The AI mentions only what they pick.">
        <Field id="services" label="Services / dishes" hint="Comma-separated, e.g. Thali, Chole Bhature, Sweets" value={values.services} placeholder={defaults.services} onChange={(v) => update("services", v)} />
      </Section>

      <Section icon={Users} title="Staff" description="Customers can thank a staff member by name.">
        <Field id="staff" label="Staff first names" hint="Comma-separated" value={values.staffNames} placeholder={defaults.staffNames} onChange={(v) => update("staffNames", v)} />
      </Section>

      <Section icon={Sparkles} title="Search keywords" description="The AI uses at most one or two per draft, only where they read naturally.">
        <Field id="keywords" label="Keywords" hint="Comma-separated, e.g. restaurant in Ghaziabad" value={values.keywords} placeholder={defaults.keywords} onChange={(v) => update("keywords", v)} />
      </Section>

      <Section icon={Palette} title="Brand color" description="Used on the review page, buttons and printed flyers.">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="color-picker" className="sr-only">Pick a color</label>
          <input
            id="color-picker"
            type="color"
            value={effectiveColor}
            onChange={(e) => update("brandColor", e.target.value)}
            className="h-11 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
          />
          <div className="w-40">
            <label htmlFor="color-hex" className="sr-only">Hex color</label>
            <input
              id="color-hex"
              className="input font-mono text-sm"
              value={values.brandColor}
              placeholder={defaults.brandColor}
              onChange={(e) => update("brandColor", e.target.value)}
            />
          </div>
          <span className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: effectiveColor }}>
            Preview button
          </span>
        </div>
      </Section>

      <div className="sticky bottom-20 z-10 flex items-center gap-3 rounded-xl bg-white/90 p-3 shadow-sm ring-1 ring-slate-200 backdrop-blur lg:bottom-4">
        <button type="submit" disabled={status === "saving"} className="btn-primary bg-slate-900 py-2 text-sm">
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
        {status === "saved" && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Saved
          </span>
        )}
        {status === "error" && <span role="alert" className="text-sm text-red-700">{error}</span>}
      </div>
    </form>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card grid gap-4 md:grid-cols-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Icon className="h-4 w-4 text-slate-500" aria-hidden /> {title}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="md:col-span-2">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">{label}</label>
      <input id={id} className="input mt-1" value={value} placeholder={placeholder || "(not set)"} onChange={(e) => onChange(e.target.value)} />
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
