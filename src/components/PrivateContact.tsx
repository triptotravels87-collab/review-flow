"use client";

import { useEffect, useRef, useState } from "react";
import { getSessionId } from "@/lib/client/track";
import { readableTextOn } from "@/lib/color";

export default function PrivateContact({
  open,
  onClose,
  rating,
  contactInfo,
  brandColor,
}: {
  open: boolean;
  onClose: () => void;
  rating?: number;
  contactInfo: string;
  brandColor: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/private-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          contact: contact || undefined,
          message,
          rating,
          sessionId: getSessionId(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send. Please try again.");
      setStatus("sent");
      setName("");
      setContact("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Couldn't send. Please try again.");
    }
  }

  function close() {
    onClose();
    if (status === "sent") setStatus("idle");
  }

  return (
    <dialog
      ref={ref}
      onClose={close}
      aria-labelledby="pc-title"
      className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 backdrop:bg-slate-900/50"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 id="pc-title" className="text-lg font-semibold">
            Contact us privately
          </h2>
          <button type="button" onClick={close} className="rounded p-1 text-slate-500 hover:text-slate-900 focus-visible:outline focus-visible:outline-2" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          This message goes only to the business owner. It does not replace or affect a public review.
          {contactInfo && (
            <>
              {" "}You can also reach us at <span className="font-medium text-slate-800">{contactInfo}</span>.
            </>
          )}
        </p>

        {status === "sent" ? (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
            Thank you — your message was sent.
            <button type="button" onClick={close} className="btn-secondary mt-3 w-full">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <label htmlFor="pc-name" className="block text-sm font-medium">Name <span className="font-normal text-slate-500">(optional)</span></label>
              <input id="pc-name" className="input mt-1" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <div>
              <label htmlFor="pc-contact" className="block text-sm font-medium">Phone or email <span className="font-normal text-slate-500">(optional, if you want a reply)</span></label>
              <input id="pc-contact" className="input mt-1" maxLength={150} value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
            <div>
              <label htmlFor="pc-message" className="block text-sm font-medium">Message</label>
              <textarea id="pc-message" required minLength={3} maxLength={2000} rows={4} className="input mt-1" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            {status === "error" && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={status === "sending" || message.trim().length < 3}
              className="btn-primary w-full"
              style={{ backgroundColor: brandColor, color: readableTextOn(brandColor) }}
            >
              {status === "sending" ? "Sending…" : "Send privately"}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
