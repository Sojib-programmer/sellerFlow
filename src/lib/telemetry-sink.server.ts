// Server-side sink for client error telemetry.
//
// Two destinations, both non-blocking for the caller:
//   1. a bounded in-process ring buffer that powers the /diagnostics dashboard
//   2. structured console output, which is what the hosting log pipeline ingests
//      (and, when TELEMETRY_WEBHOOK_URL is set, an outbound forward to an
//      external error tracker such as Sentry's store endpoint or a Slack hook)
//
// The buffer is per-isolate by design: it is the live view, not the archive.
// The console/webhook path is the durable one.

import {
  MAX_BATCH_SIZE,
  normalizeEvent,
  type ErrorEvent,
  type ErrorEventInput,
} from "./telemetry-types";

const RING_CAPACITY = 250;
const ring: ErrorEvent[] = [];

// Cheap abuse guard: an error loop in one browser tab must not be able to flood
// the sink. Counted per fingerprint inside a rolling window.
const RATE_WINDOW_MS = 10_000;
const RATE_LIMIT_PER_WINDOW = 30;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function allow(fingerprint: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(fingerprint);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(fingerprint, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT_PER_WINDOW;
}

function forward(event: ErrorEvent) {
  const webhook = process.env["TELEMETRY_WEBHOOK_URL"];
  if (!webhook) return;
  // Fire and forget — telemetry must never delay or fail the response.
  void fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  }).catch(() => {});
}

export function ingest(inputs: ErrorEventInput[]): { accepted: number; dropped: number } {
  let accepted = 0;
  let dropped = 0;

  for (const input of inputs.slice(0, MAX_BATCH_SIZE)) {
    const event = normalizeEvent(input, crypto.randomUUID(), new Date().toISOString());
    if (!allow(event.fingerprint)) {
      dropped += 1;
      continue;
    }
    ring.push(event);
    if (ring.length > RING_CAPACITY) ring.shift();
    accepted += 1;

    // Single-line structured record so log search can group on fingerprint.
    console.log(
      `[telemetry] ${JSON.stringify({
        level: event.level,
        fingerprint: event.fingerprint,
        route: event.route,
        source: event.source,
        message: event.message,
        release: event.release,
        sessionId: event.sessionId,
        occurredAt: event.occurredAt,
      })}`,
    );
    forward(event);
  }

  return { accepted, dropped };
}

export function readEvents(): ErrorEvent[] {
  return [...ring].reverse();
}
