"use client";

import type { EventTypeName } from "@/lib/constants";

const SESSION_KEY = "rf_session_id";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Random per-tab session id kept in sessionStorage (no cookies, no PII). */
export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return uuid();
  }
}

export interface TrackPayload {
  rating?: number;
  language?: string;
  source?: string;
}

/** Fire-and-forget event. Uses sendBeacon so it survives page navigation. */
export function track(type: EventTypeName, data: TrackPayload = {}) {
  const body = JSON.stringify({ type, sessionId: getSessionId(), ...data });
  try {
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      if (ok) return;
    }
  } catch {
    /* fall through to fetch */
  }
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

/** Track SCAN only once per browser-tab session (refreshes don't inflate counts). */
export function trackScanOnce(source: string) {
  try {
    if (sessionStorage.getItem("rf_scanned")) return;
    sessionStorage.setItem("rf_scanned", "1");
  } catch {
    /* ignore */
  }
  track("SCAN", { source });
}

/** Clipboard API with a textarea + execCommand fallback (older iOS/Android webviews). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall back */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
