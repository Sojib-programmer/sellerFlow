// Browser-side error reporting. Installs once from the root route and captures:
//   - uncaught exceptions (window.onerror)
//   - unhandled promise rejections
//   - console.error calls (including React's error-boundary logging)
//   - explicit reports from React error boundaries
//
// Events are scrubbed, deduped by fingerprint, batched, and flushed to
// /api/public/telemetry (sendBeacon on unload so nothing is lost). A rolling
// mirror is kept in sessionStorage so the /diagnostics dashboard can show
// this tab's events even when the server ring buffer lives in another isolate.

import {
  MAX_BATCH_SIZE,
  normalizeEvent,
  type ErrorEvent,
  type ErrorEventInput,
  type ErrorLevel,
  type ExtraValue,
} from "./telemetry-types";

const ENDPOINT = "/api/public/telemetry";
const FLUSH_DELAY_MS = 1_500;
const DEDUPE_WINDOW_MS = 5_000;
const LOCAL_KEY = "sellerflow.telemetry.session";
const LOCAL_LIMIT = 100;

// Marker prefix on our own log output so the console.error hook can never
// re-report what the reporter itself printed (infinite loop guard).
const SELF_LOG_MARKER = "[telemetry:client]";

let installed = false;
let sessionId = "";
let queue: ErrorEventInput[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
const recentByFingerprint = new Map<string, number>();

const release = import.meta.env["VITE_RELEASE"] ?? "v1.0.0-beta";

function makeSessionId(): string {
  try {
    const existing = sessionStorage.getItem("sellerflow.telemetry.sid");
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem("sellerflow.telemetry.sid", id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function readLocal(): ErrorEvent[] {
  try {
    const raw = sessionStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as ErrorEvent[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(event: ErrorEvent) {
  try {
    const next = [event, ...readLocal()].slice(0, LOCAL_LIMIT);
    sessionStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("sellerflow:telemetry"));
  } catch {
    /* storage full or unavailable — server ingest still happened */
  }
}

/** Events captured in this browser session, newest first. */
export function localTelemetry(): ErrorEvent[] {
  return readLocal();
}

export function clearLocalTelemetry() {
  try {
    sessionStorage.removeItem(LOCAL_KEY);
    window.dispatchEvent(new CustomEvent("sellerflow:telemetry"));
  } catch {
    /* ignore */
  }
}

function send(events: ErrorEventInput[], viaBeacon: boolean) {
  const body = JSON.stringify({ events: events.slice(0, MAX_BATCH_SIZE) });
  try {
    if (viaBeacon && typeof navigator.sendBeacon === "function") {
      const ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      if (ok) return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never let reporting throw into app code */
  }
}

function flush(viaBeacon = false) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = undefined;
  }
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  send(batch, viaBeacon);
}

function schedule() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => flush(false), FLUSH_DELAY_MS);
}

function toMessage(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (value instanceof Response) {
    return `Response ${value.status}${value.url ? ` at ${value.url}` : ""}`;
  }
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

export function captureError(
  value: unknown,
  options: { level?: ErrorLevel; source: string; extra?: Record<string, ExtraValue> } = {
    source: "manual",
  },
) {
  if (typeof window === "undefined") return;

  const input: ErrorEventInput = {
    level: options.level ?? "error",
    message: toMessage(value),
    stack: value instanceof Error ? value.stack : undefined,
    route: window.location.pathname,
    source: options.source,
    release,
    sessionId,
    userAgent: navigator.userAgent,
    extra: options.extra,
  };

  const event = normalizeEvent(input, crypto.randomUUID(), new Date().toISOString());

  // Drop repeats of the identical fault inside a short window: an error thrown
  // in a render loop must not turn into thousands of requests.
  const now = Date.now();
  const last = recentByFingerprint.get(event.fingerprint);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return;
  recentByFingerprint.set(event.fingerprint, now);

  writeLocal(event);
  queue.push({
    ...input,
    message: event.message,
    ...(event.stack !== undefined ? { stack: event.stack } : {}),
  });
  if (queue.length >= MAX_BATCH_SIZE) flush(false);
  else schedule();
}

export function installTelemetry() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  sessionId = makeSessionId();

  window.addEventListener("error", (event) => {
    captureError(event.error ?? event.message, {
      source: "window.onerror",
      extra: { filename: event.filename ?? "", line: event.lineno ?? 0 },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    captureError(event.reason, { source: "unhandledrejection" });
  });

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    originalConsoleError(...args);
    const first = args[0];
    if (typeof first === "string" && first.startsWith(SELF_LOG_MARKER)) return;
    const errorArg = args.find((arg) => arg instanceof Error) ?? first;
    captureError(errorArg, { source: "console.error" });
  };

  // Unload is the only chance to ship whatever is still queued.
  window.addEventListener("pagehide", () => flush(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
}
